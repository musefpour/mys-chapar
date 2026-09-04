import { create } from "zustand";
import { APP_VERSION } from "@shared/app-version";
import { fetchAppConfig, type AppConfig } from "../lib/app-config-client";

export type UpdateGate =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok" }
  | {
      kind: "required";
      force: boolean;
      config: AppConfig;
      dismissed: boolean;
    }
  | { kind: "error"; message: string };

interface UpdateState {
  gate: UpdateGate;
  checkOnStartup: () => Promise<void>;
  checkNow: () => Promise<"latest" | "required" | "error">;
  dismissSoftUpdate: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  gate: { kind: "idle" },

  checkOnStartup: async () => {
    set({ gate: { kind: "checking" } });
    const result = await fetchAppConfig();
    if (!result.ok) {
      // Fail open on startup so offline / API issues don't brick the app.
      set({ gate: { kind: "ok" } });
      return;
    }
    if (result.needsUpdate) {
      set({
        gate: {
          kind: "required",
          force: result.config.forceUpdate,
          config: result.config,
          dismissed: false,
        },
      });
      return;
    }
    set({ gate: { kind: "ok" } });
  },

  checkNow: async () => {
    const result = await fetchAppConfig();
    if (!result.ok) {
      set({ gate: { kind: "error", message: result.error } });
      return "error";
    }
    if (result.needsUpdate) {
      set({
        gate: {
          kind: "required",
          force: result.config.forceUpdate,
          config: result.config,
          dismissed: false,
        },
      });
      return "required";
    }
    set({ gate: { kind: "ok" } });
    return "latest";
  },

  dismissSoftUpdate: () => {
    const gate = get().gate;
    if (gate.kind !== "required" || gate.force) return;
    set({ gate: { ...gate, dismissed: true } });
  },
}));

export function isAppBlockedByForceUpdate(gate: UpdateGate): boolean {
  return gate.kind === "required" && gate.force;
}

export function shouldShowUpdateModal(gate: UpdateGate): boolean {
  return gate.kind === "required" && !gate.dismissed;
}

export { APP_VERSION };
