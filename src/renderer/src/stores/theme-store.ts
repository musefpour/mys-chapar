import { create } from "zustand";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "mychapar.theme";

function readInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore
  }
  return "light";
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode, options?: { skipCloud?: boolean }) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const theme = readInitialTheme();
  applyTheme(theme);

  return {
    theme,
    setTheme: (next, options) => {
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      set({ theme: next });
      if (!options?.skipCloud) {
        void import("../lib/cloud-sync").then((mod) => mod.queuePreferencesPush());
      }
    },
    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      get().setTheme(next);
    },
  };
});
