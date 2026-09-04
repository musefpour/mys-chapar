import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useAuthStore } from "../../stores/auth-store";
import { useT } from "../../i18n";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.9H12z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.2 18.8c.8-3.4 3.3-5.2 6.8-5.2s6 1.8 6.8 5.2" />
    </svg>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isStrongPassword(value: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);
}

function mapAuthError(
  t: (
    key:
      | "auth.oauthUnavailable"
      | "auth.invalidCredentials"
      | "auth.emailTaken"
      | "auth.failed"
      | "auth.weakPassword"
      | "auth.serverUnreachable"
      | "auth.oauthCancelled"
      | "auth.oauthMismatch",
    vars?: Record<string, string | number>,
  ) => string,
  message: string | null,
): string | null {
  if (!message) return null;
  if (/Google/i.test(message) && /auth backend|not available/i.test(message)) {
    return t("auth.oauthUnavailable", { provider: "Google" });
  }
  if (message === "Email or password is incorrect") return t("auth.invalidCredentials");
  if (message === "An account with this email already exists") return t("auth.emailTaken");
  if (message === "Password must be at least 8 characters and include a letter and a number") {
    return t("auth.weakPassword");
  }
  if (message === "Cannot reach the auth server") return t("auth.serverUnreachable");
  if (message === "Sign in was cancelled") return t("auth.oauthCancelled");
  if (message === "OAuth state mismatch") return t("auth.oauthMismatch");
  if (message === "Sign in failed") return t("auth.failed");
  return message;
}

export function AuthEntry() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const signUpWithEmail = useAuthStore((state) => state.signUpWithEmail);
  const signOut = useAuthStore((state) => state.signOut);

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, { inertBackground: true });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    clearError();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, clearError]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const submitEmail = async () => {
    setFormError(null);
    clearError();
    if (mode === "signup" && !name.trim()) {
      setFormError(t("auth.nameRequired"));
      return;
    }
    if (!isValidEmail(email)) {
      setFormError(t("auth.emailInvalid"));
      return;
    }
    if (!isStrongPassword(password)) {
      setFormError(t("auth.weakPassword"));
      return;
    }
    try {
      if (mode === "signup") {
        await signUpWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
      setOpen(false);
      setPassword("");
    } catch {
      // store.error is shown
    }
  };

  const runGoogle = async () => {
    setFormError(null);
    try {
      await signInWithGoogle();
      setOpen(false);
    } catch {
      // store.error is shown
    }
  };

  if (user) {
    return (
      <div className="header-auth" ref={menuRef}>
        <button
          type="button"
          className="header-auth-btn is-user"
          onClick={() => setMenuOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={user.email}
        >
          <span className="header-auth-avatar" aria-hidden>
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="header-auth-label">{user.name || user.email}</span>
        </button>
        {menuOpen && (
          <div className="titlebar-menu-dropdown header-auth-menu" role="menu">
            <div className="header-auth-meta">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <button
              type="button"
              role="menuitem"
              className="titlebar-menu-item"
              onClick={() => {
                signOut();
                setMenuOpen(false);
              }}
            >
              {t("auth.signOut")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="header-auth-btn"
        onClick={() => {
          setMode("signin");
          setOpen(true);
        }}
      >
        <UserIcon />
        <span>{t("auth.signIn")}</span>
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            className="modal-card auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="auth-modal-title">{mode === "signup" ? t("auth.createAccount") : t("auth.signIn")}</h2>
                <p>{t("auth.subtitle")}</p>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setOpen(false)} aria-label={t("common.close")}>
                ✕
              </button>
            </div>

            <div className="auth-providers">
              <button
                type="button"
                className="auth-provider-btn google"
                disabled={busy}
                onClick={() => void runGoogle()}
              >
                <GoogleIcon />
                {t("auth.continueGoogle")}
              </button>
            </div>

            <div className="auth-divider" role="separator">
              <span>{t("auth.orEmail")}</span>
            </div>

            {mode === "signup" && (
              <label className="field-label">
                {t("auth.name")}
                <input
                  className="modal-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  autoComplete="name"
                />
              </label>
            )}
            <label className="field-label">
              {t("auth.email")}
              <input
                className="modal-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="field-label">
              {t("auth.password")}
              <input
                className="modal-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitEmail();
                }}
              />
            </label>

            {(formError || error) && (
              <p className="form-error">{formError || mapAuthError(t, error)}</p>
            )}

            <button
              type="button"
              className="primary-btn auth-submit"
              disabled={busy}
              onClick={() => void submitEmail()}
            >
              {busy ? t("common.pleaseWait") : mode === "signup" ? t("auth.createAccount") : t("auth.signIn")}
            </button>

            <p className="auth-switch">
              {mode === "signup" ? t("auth.hasAccount") : t("auth.noAccount")}{" "}
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => {
                  setMode(mode === "signup" ? "signin" : "signup");
                  setFormError(null);
                  clearError();
                }}
              >
                {mode === "signup" ? t("auth.signIn") : t("auth.createAccount")}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
