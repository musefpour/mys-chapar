/**
 * Auth API adapter — talks to mychapar-backend-java `/api/v1/auth`.
 * Function signatures stay as in docs/AUTH.md.
 */
import { resolveApiBaseUrl } from "@shared/api-base";
import { LOCALE_STORAGE_KEY } from "../i18n/locales";
import { useLocaleStore } from "../stores/locale-store";

export type AuthProvider = "google" | "email";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: AuthProvider;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const SESSION_KEY = "mychapar.auth.session";
const USERS_KEY = "mychapar.auth.users";

const API_BASE = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

interface BackendAuthBody {
  status?: boolean;
  code?: number;
  message?: string;
  user?: Partial<AuthUser> | null;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAuthProvider(value: unknown): value is AuthProvider {
  return value === "google" || value === "email";
}

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession> & Partial<AuthUser>;
    if (parsed.user?.id && parsed.user.email) {
      return {
        user: parsed.user as AuthUser,
        accessToken: parsed.accessToken ?? "",
        refreshToken: parsed.refreshToken ?? "",
        expiresAt: parsed.expiresAt ?? 0,
      };
    }
    if (parsed.id && parsed.email) {
      return {
        user: {
          id: parsed.id,
          email: parsed.email,
          name: parsed.name ?? parsed.email,
          avatarUrl: parsed.avatarUrl,
          provider: isAuthProvider(parsed.provider) ? parsed.provider : "email",
        },
        accessToken: "",
        refreshToken: "",
        expiresAt: 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function persistSession(session: AuthSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USERS_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function getAccessToken(): string | null {
  const token = readSession()?.accessToken;
  return token ? token : null;
}

function codeFromMessage(message: string | undefined): string | null {
  if (!message) return null;
  const match = message.match(/\[([a-z_]+)\]\s*$/i);
  return match ? match[1].toLowerCase() : null;
}

function errorFromBackend(body: BackendAuthBody | null, fallback: string): Error {
  const code = codeFromMessage(body?.message);
  if (code === "email_taken") return new Error("An account with this email already exists");
  if (code === "invalid_credentials") return new Error("Email or password is incorrect");
  if (code === "weak_password") {
    return new Error("Password must be at least 8 characters and include a letter and a number");
  }
  if (code === "not_implemented") {
    return new Error(fallback);
  }
  if (code === "oauth_denied") return new Error("Sign in was cancelled");
  if (code === "oauth_mismatch") return new Error("OAuth state mismatch");
  const clean = body?.message?.replace(/\s*\[[a-z_]+\]\s*$/i, "").trim();
  return new Error(clean || fallback);
}

async function authRequest(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<BackendAuthBody> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Cannot reach the auth server");
  }

  let body: BackendAuthBody | null = null;
  try {
    body = (await response.json()) as BackendAuthBody;
  } catch {
    body = null;
  }

  if (!response.ok || body?.status === false) {
    throw errorFromBackend(body, fallback);
  }
  return body ?? {};
}

function sessionFromBody(body: BackendAuthBody, fallbackProvider: AuthProvider): AuthSession {
  const email = body.user?.email?.trim();
  if (!email || !body.user?.id) {
    throw new Error("Sign in failed");
  }
  const user: AuthUser = {
    id: body.user.id,
    email,
    name: body.user.name?.trim() || email,
    avatarUrl: body.user.avatarUrl || undefined,
    provider: isAuthProvider(body.user.provider) ? body.user.provider : fallbackProvider,
  };
  const expiresIn = typeof body.expiresIn === "number" && body.expiresIn > 0 ? body.expiresIn : 10800;
  return {
    user,
    accessToken: body.accessToken ?? "",
    refreshToken: body.refreshToken ?? "",
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

function persistHostSession(result: {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}): AuthUser {
  const session: AuthSession = {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + result.expiresIn * 1000,
  };
  persistSession(session);
  return session.user;
}

function resolveClientLocale(): string {
  try {
    const fromStore = useLocaleStore.getState().locale;
    if (fromStore) return fromStore;
  } catch {
    // ignore
  }
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved?.trim()) return saved.trim();
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    const fromDom =
      document.documentElement.dataset.locale || document.documentElement.lang;
    if (fromDom?.trim()) return fromDom.trim();
  }
  return "en";
}

export async function signInWithProvider(provider: Exclude<AuthProvider, "email">): Promise<AuthUser> {
  if (!window.mychapar?.startOAuth) {
    throw new Error(
      "Sign in with Google needs the auth backend. See docs/AUTH.md.",
    );
  }
  const locale = resolveClientLocale();
  const result = await window.mychapar.startOAuth({ provider, locale });
  return persistHostSession(result);
}

function rethrowHostError(error: unknown): never {
  const raw = error instanceof Error ? error.message : "Sign in failed";
  const match = raw.match(/Error invoking remote method '[^']+':\s*([\s\S]+)$/);
  throw new Error((match ? match[1] : raw).trim() || "Sign in failed");
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  if (window.mychapar?.authEmail) {
    try {
      const result = await window.mychapar.authEmail({
        action: "login",
        email: normalizeEmail(email),
        password,
      });
      return persistHostSession(result);
    } catch (error) {
      rethrowHostError(error);
    }
  }
  const body = await authRequest(
    "/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email: normalizeEmail(email), password }),
    },
    "Sign in failed",
  );
  const session = sessionFromBody(body, "email");
  persistSession(session);
  return session.user;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  if (window.mychapar?.authEmail) {
    try {
      const result = await window.mychapar.authEmail({
        action: "register",
        name: name.trim(),
        email: normalizeEmail(email),
        password,
      });
      return persistHostSession(result);
    } catch (error) {
      rethrowHostError(error);
    }
  }
  const body = await authRequest(
    "/v1/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        email: normalizeEmail(email),
        password,
      }),
    },
    "Sign in failed",
  );
  const session = sessionFromBody(body, "email");
  persistSession(session);
  return session.user;
}

export async function logoutFromServer(refreshToken?: string | null): Promise<void> {
  const token = refreshToken ?? readSession()?.refreshToken;
  if (!token) return;
  try {
    if (window.mychapar?.authEmail) {
      await window.mychapar.authEmail({
        action: "logout",
        refreshToken: token,
      });
      return;
    }
    await authRequest(
      "/v1/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken: token }),
      },
      "Sign in failed",
    );
  } catch {
    // still clear local session
  }
}
