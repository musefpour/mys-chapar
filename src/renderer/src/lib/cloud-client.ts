import { resolveApiBaseUrl } from "@shared/api-base";
import { getAccessToken } from "./auth-client";

const API_BASE = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export type CloudMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface CloudEnvelope<T> {
  status?: boolean | number;
  code?: number;
  message?: string;
  item?: T;
  items?: T[];
  totalRow?: number;
}

export interface CloudResult<T> {
  ok: boolean;
  status: number;
  data: CloudEnvelope<T> | null;
}

function asEnvelope<T>(json: unknown): CloudEnvelope<T> | null {
  if (!json || typeof json !== "object") return null;
  return json as CloudEnvelope<T>;
}

export async function cloudJson<T>(
  method: CloudMethod,
  path: string,
  body?: unknown,
): Promise<CloudResult<T>> {
  const token = getAccessToken();
  if (!token) {
    return { ok: false, status: 401, data: null };
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (window.mychapar?.cloudFetch) {
    const result = await window.mychapar.cloudFetch({
      method,
      path: normalized,
      accessToken: token,
      body,
    });
    const data = asEnvelope<T>(result.json);
    const failed = data?.status === false;
    return { ok: result.ok && !failed, status: result.status, data };
  }

  try {
    const response = await fetch(`${API_BASE}${normalized}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined || method === "GET" ? undefined : JSON.stringify(body),
    });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    const data = asEnvelope<T>(json);
    const failed = data?.status === false;
    return { ok: response.ok && !failed, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export function cloudItems<T>(result: CloudResult<T>): T[] {
  return Array.isArray(result.data?.items) ? result.data.items : [];
}

export function cloudItem<T>(result: CloudResult<T>): T | null {
  return result.data?.item ?? null;
}
