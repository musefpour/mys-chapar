import { nanoid } from "nanoid";
import { create } from "zustand";

export type ConsoleLevel = "info" | "warn" | "error";
export type ConsoleSource = "http" | "system" | "check" | "git";

export interface ConsoleEntry {
  id: string;
  ts: number;
  level: ConsoleLevel;
  source: ConsoleSource;
  title: string;
  detail?: string;
}

const MAX_ENTRIES = 400;

interface ConsoleState {
  entries: ConsoleEntry[];
  log: (entry: Omit<ConsoleEntry, "id" | "ts"> & { ts?: number }) => void;
  clear: () => void;
  clearIssues: () => void;
}

export const useConsoleStore = create<ConsoleState>((set, get) => ({
  entries: [],

  log: (entry) => {
    const next: ConsoleEntry = {
      id: nanoid(8),
      ts: entry.ts ?? Date.now(),
      level: entry.level,
      source: entry.source,
      title: entry.title,
      detail: entry.detail,
    };
    const entries = [...get().entries, next].slice(-MAX_ENTRIES);
    set({ entries });
  },

  clear: () => set({ entries: [] }),

  clearIssues: () =>
    set({
      entries: get().entries.filter((item) => item.level === "info"),
    }),
}));

export function isIssueEntry(entry: ConsoleEntry): boolean {
  return entry.level === "warn" || entry.level === "error";
}
