import { ipcMain } from "electron";
import { resolveApiBaseUrl } from "@shared/api-base";
import { IPC, type CloudFetchPayload, type CloudFetchResult } from "@shared/types";

const API_BASE = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);

export function registerCloudIpc(): void {
  ipcMain.handle(
    IPC.CLOUD_FETCH,
    async (_event, payload: CloudFetchPayload): Promise<CloudFetchResult> => {
      if (!payload?.path || !payload.method || !payload.accessToken) {
        return { ok: false, status: 400, json: { message: "Invalid cloud request" } };
      }
      const path = payload.path.startsWith("/") ? payload.path : `/${payload.path}`;
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          method: payload.method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${payload.accessToken}`,
          },
          body:
            payload.body === undefined || payload.method === "GET" || payload.method === "HEAD"
              ? undefined
              : JSON.stringify(payload.body),
        });
        let json: unknown = null;
        try {
          json = await response.json();
        } catch {
          json = null;
        }
        return { ok: response.ok, status: response.status, json };
      } catch {
        return { ok: false, status: 0, json: { message: "Cannot reach the auth server" } };
      }
    },
  );
}
