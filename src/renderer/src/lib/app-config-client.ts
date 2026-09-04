/**
 * AppConfig — version / force-update from mychapar-backend-java
 * GET /api/m/v1/appconfig/byPlatform
 */
import { APP_VERSION } from "@shared/app-version";
import { resolveApiBaseUrl } from "@shared/api-base";
import { getAccessToken } from "./auth-client";
import { useLocaleStore } from "../stores/locale-store";

const API_BASE = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

/** Matches backend PlatformEnums for desktop Electron. */
export const APP_CONFIG_PLATFORM = "WEB";

export interface AppConfig {
  version: string;
  forceUpdate: boolean;
  platform?: string;
  appUrl?: string;
  urldescription?: string;
}

export type AppConfigCheck =
  | { ok: true; status: number; config: AppConfig; needsUpdate: boolean }
  | { ok: false; status: number; error: string };

interface AppConfigItemRaw {
  version?: string;
  forceupdate?: boolean;
  forceUpdate?: boolean;
  platform?: string;
  appUrl?: string;
  urldescription?: string;
}

interface AppConfigEnvelope {
  status?: boolean | number;
  code?: number;
  message?: string;
  item?: AppConfigItemRaw | null;
}

function buildAppdataHeader(): string {
  const culture = useLocaleStore.getState().locale || "en";
  const payload = JSON.stringify({
    platform: APP_CONFIG_PLATFORM,
    culture,
  });
  return btoa(payload);
}

function normalizeConfig(item: AppConfigItemRaw): AppConfig | null {
  const version = typeof item.version === "string" ? item.version.trim() : "";
  if (!version) return null;
  const forceUpdate = Boolean(item.forceUpdate ?? item.forceupdate);
  return {
    version,
    forceUpdate,
    platform: item.platform,
    appUrl: item.appUrl,
    urldescription: item.urldescription,
  };
}

export function versionsDiffer(localVersion: string, remoteVersion: string): boolean {
  return localVersion.trim() !== remoteVersion.trim();
}

export async function fetchAppConfig(): Promise<AppConfigCheck> {
  const path = "/m/v1/appconfig/byPlatform";
  const token = getAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    appdata: buildAppdataHeader(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE}${path}`, { method: "GET", headers });
    let body: AppConfigEnvelope | null = null;
    try {
      body = (await response.json()) as AppConfigEnvelope;
    } catch {
      body = null;
    }

    if (!response.ok || body?.status === false) {
      return {
        ok: false,
        status: response.status,
        error: body?.message?.trim() || "Could not check for updates",
      };
    }

    const config = body?.item ? normalizeConfig(body.item) : null;
    if (!config) {
      return { ok: false, status: response.status, error: "App config is missing" };
    }

    return {
      ok: true,
      status: response.status,
      config,
      needsUpdate: versionsDiffer(APP_VERSION, config.version),
    };
  } catch {
    return { ok: false, status: 0, error: "Cannot reach the update server" };
  }
}
