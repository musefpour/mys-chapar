import { create } from "zustand";
import {
  loginWithEmail,
  logoutFromServer,
  persistSession,
  readSession,
  registerWithEmail,
  signInWithProvider,
  type AuthProvider,
  type AuthUser,
} from "../lib/auth-client";
import { stopCloudSync } from "../lib/cloud-sync";
import { useLibraryStore } from "./library-store";
import { useRequestStore } from "./request-store";

interface AuthState {
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

function clearLocalUserData(): void {
  stopCloudSync();
  persistSession(null);
  useLibraryStore.getState().resetOfflineDefaults();
  useRequestStore.getState().closeAllTabs();
}

async function runAuth(
  set: (partial: Partial<AuthState>) => void,
  action: () => Promise<AuthUser>,
): Promise<void> {
  set({ busy: true, error: null });
  try {
    const user = await action();
    set({ user, busy: false, error: null });
  } catch (error) {
    set({
      busy: false,
      error: error instanceof Error ? error.message : "Sign in failed",
    });
    throw error;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readSession()?.user ?? null,
  busy: false,
  error: null,

  signInWithGoogle: () => runAuth(set, () => signInWithProvider("google")),
  signInWithEmail: (email, password) =>
    runAuth(set, () => loginWithEmail(email, password)),
  signUpWithEmail: (name, email, password) =>
    runAuth(set, () => registerWithEmail(name, email, password)),

  signOut: () => {
    const refreshToken = readSession()?.refreshToken ?? null;
    clearLocalUserData();
    set({ user: null, error: null, busy: false });
    void logoutFromServer(refreshToken);
  },
  clearError: () => set({ error: null }),
}));

export type { AuthProvider, AuthUser };
