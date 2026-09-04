import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { URL } from "node:url";
import { ipcMain, shell } from "electron";
import { resolveApiBaseUrl } from "@shared/api-base";
import {
  IPC,
  type AuthEmailPayload,
  type AuthOAuthResult,
  type AuthOAuthStartPayload,
  type AuthProvider,
  type AuthUser,
} from "@shared/types";
import { oauthCallbackPage } from "../oauth-callback-page";
import { loadPrefs } from "../prefs";

const API_BASE = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
const DEFAULT_REDIRECT_URI =
  process.env.OAUTH_REDIRECT_URI ?? "http://127.0.0.1:53789/oauth/callback";
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

interface BackendAuthBody {
  status?: boolean;
  code?: number;
  message?: string;
  authorizeUrl?: string;
  user?: Partial<AuthUser> | null;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function createState(): string {
  return base64Url(randomBytes(24));
}

function isAuthProvider(value: unknown): value is AuthProvider {
  return value === "google" || value === "email";
}

function errorFromBackend(body: BackendAuthBody | null, fallback: string): Error {
  const message = body?.message ?? fallback;
  if (/email_taken/i.test(message)) return new Error("An account with this email already exists");
  if (/invalid_credentials/i.test(message)) return new Error("Email or password is incorrect");
  if (/weak_password/i.test(message)) {
    return new Error("Password must be at least 8 characters and include a letter and a number");
  }
  if (/oauth_denied/i.test(message)) return new Error("Sign in was cancelled");
  if (/oauth_mismatch/i.test(message)) return new Error("OAuth state mismatch");
  if (/not_implemented/i.test(message)) return new Error(fallback);
  const clean = message.replace(/\s*\[[a-z_]+\]\s*$/i, "").trim();
  return new Error(clean || fallback);
}

async function fetchJson(url: string, init?: RequestInit): Promise<BackendAuthBody> {
  let response: Response;
  try {
    response = await fetch(url, init);
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
    throw errorFromBackend(body, "Sign in failed");
  }
  return body ?? {};
}

function waitForOAuthCallback(
  redirectUri: string,
  expectedState: string,
  locale?: string,
): Promise<{ code: string; state: string }> {
  const target = new URL(redirectUri);
  const port = Number(target.port) || (target.protocol === "https:" ? 443 : 80);
  const hostname = target.hostname;
  const pathname = target.pathname || "/";

  return new Promise((resolve, reject) => {
    let settled = false;
    let server: Server | null = null;
    const timeout = setTimeout(() => finish(() => reject(new Error("Sign in was cancelled"))), OAUTH_TIMEOUT_MS);

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server?.close();
      action();
    };

    server = createServer((req, res) => {
      const reqUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
      if (reqUrl.pathname !== pathname) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const code = reqUrl.searchParams.get("code");
      const state = reqUrl.searchParams.get("state");
      const error = reqUrl.searchParams.get("error");

      let pageKind: "success" | "cancelled" | "mismatch" = "success";
      if (error) pageKind = "cancelled";
      else if (!code || !state || state !== expectedState) pageKind = "mismatch";

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(oauthCallbackPage(pageKind, locale));

      if (error) {
        finish(() => reject(new Error("Sign in was cancelled")));
        return;
      }
      if (!code || !state || state !== expectedState) {
        finish(() => reject(new Error("OAuth state mismatch")));
        return;
      }
      finish(() => resolve({ code, state }));
    });

    server.on("error", (error) => {
      finish(() => reject(error instanceof Error ? error : new Error("Sign in failed")));
    });

    server.listen(port, hostname, () => {
      // ready
    });
  });
}

function sessionFromBody(body: BackendAuthBody, provider: AuthProvider): AuthOAuthResult {
  const source = body.user ?? (body as { item?: Partial<AuthUser> | null }).item;
  const email = source?.email?.trim();
  if (!email || !source?.id) {
    throw new Error("Sign in failed");
  }
  const user: AuthUser = {
    id: source.id,
    email,
    name: source.name?.trim() || email,
    avatarUrl: source.avatarUrl || undefined,
    provider: isAuthProvider(source.provider) ? source.provider : provider,
  };
  const expiresIn = typeof body.expiresIn === "number" && body.expiresIn > 0 ? body.expiresIn : 10800;
  return {
    user,
    accessToken: body.accessToken ?? "",
    refreshToken: body.refreshToken ?? "",
    expiresIn,
  };
}

function resolveOAuthLocale(explicit?: string): string {
  const fromPayload = explicit?.trim();
  if (fromPayload) return fromPayload;
  try {
    return loadPrefs().locale?.trim() || "en";
  } catch {
    return "en";
  }
}

async function startGoogleOAuth(locale?: string): Promise<AuthOAuthResult> {
  const redirectUri = DEFAULT_REDIRECT_URI;
  const state = createState();
  const { verifier, challenge } = createPkcePair();
  const uiLocale = resolveOAuthLocale(locale);

  const startUrl = new URL(`${API_BASE}/v1/auth/oauth/google/start`);
  startUrl.searchParams.set("code_challenge", challenge);
  startUrl.searchParams.set("redirect_uri", redirectUri);
  startUrl.searchParams.set("state", state);

  const startBody = await fetchJson(startUrl.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const authorizeUrl = startBody.authorizeUrl;
  if (!authorizeUrl) {
    throw new Error("Sign in failed");
  }

  const callbackPromise = waitForOAuthCallback(redirectUri, state, uiLocale);
  await shell.openExternal(authorizeUrl);
  const callback = await callbackPromise;

  const callbackBody = await fetchJson(`${API_BASE}/v1/auth/oauth/google/callback`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: callback.code,
      codeVerifier: verifier,
      redirectUri,
      state: callback.state,
    }),
  });

  return sessionFromBody(callbackBody, "google");
}

async function startEmailAuth(payload: AuthEmailPayload): Promise<AuthOAuthResult> {
  const path =
    payload.action === "register"
      ? "/v1/auth/register"
      : payload.action === "logout"
        ? "/v1/auth/logout"
        : "/v1/auth/login";

  const json = await fetchJson(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      refreshToken: payload.refreshToken,
    }),
  });

  if (payload.action === "logout") {
    return {
      user: { id: "", email: "", name: "", provider: "email" },
      accessToken: "",
      refreshToken: "",
      expiresIn: 0,
    };
  }

  return sessionFromBody(json, "email");
}

export function registerAuthIpc(): void {
  ipcMain.handle(
    IPC.AUTH_OAUTH_START,
    async (_event, payload: AuthOAuthStartPayload): Promise<AuthOAuthResult> => {
      if (!payload || payload.provider !== "google") {
        throw new Error("Sign in failed");
      }
      return startGoogleOAuth(payload.locale);
    },
  );

  ipcMain.handle(
    IPC.AUTH_EMAIL,
    async (_event, payload: AuthEmailPayload): Promise<AuthOAuthResult> => {
      if (!payload || (payload.action !== "login" && payload.action !== "register" && payload.action !== "logout")) {
        throw new Error("Sign in failed");
      }
      return startEmailAuth(payload);
    },
  );
}
