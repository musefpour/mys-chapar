import { app } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_APP_PREFS,
  type AppPrefs,
  type RegionId,
} from "@shared/app-menu";

function prefsPath(): string {
  return join(app.getPath("userData"), "app-prefs.json");
}

function parseRegion(value: unknown): RegionId {
  if (value === "eu" || value === "asia" || value === "us") return value;
  return DEFAULT_APP_PREFS.region;
}

function parseLocale(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return DEFAULT_APP_PREFS.locale ?? "en";
}

export function loadPrefs(): AppPrefs {
  try {
    const raw = JSON.parse(readFileSync(prefsPath(), "utf8")) as Partial<AppPrefs>;
    return {
      hardwareAcceleration: raw.hardwareAcceleration !== false,
      region: parseRegion(raw.region),
      locale: parseLocale(raw.locale),
    };
  } catch {
    return { ...DEFAULT_APP_PREFS };
  }
}

export function savePrefs(patch: Partial<AppPrefs>): AppPrefs {
  const next: AppPrefs = { ...loadPrefs(), ...patch };
  if (patch.region !== undefined) next.region = parseRegion(patch.region);
  if (patch.locale !== undefined) next.locale = parseLocale(patch.locale);
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(prefsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

/** Must run before `app.whenReady()`. */
export function applyHardwareAcceleration(): void {
  try {
    if (!loadPrefs().hardwareAcceleration) {
      app.disableHardwareAcceleration();
    }
  } catch {
    // userData path may be unavailable in tests
  }
}
