import type { FetchTextPayload, FetchTextResponse } from "./types";
import { ensureHttpUrl } from "./ensure-http-url";

/** Fetch a remote text document (OpenAPI etc.) — shared by desktop IPC and Chrome extension. */
export async function fetchTextResource(
  payload: FetchTextPayload,
): Promise<FetchTextResponse> {
  const raw = typeof payload?.url === "string" ? payload.url.trim() : "";
  if (!raw) {
    return { ok: false, error: "URL is required" };
  }

  let url: string;
  try {
    url = ensureHttpUrl(raw);
    new URL(url);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  const controller = new AbortController();
  const timeoutMs =
    typeof payload.timeoutMs === "number" && payload.timeoutMs > 0
      ? payload.timeoutMs
      : 30_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json, application/yaml, text/yaml, text/plain, */*",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status} ${response.statusText || ""}`.trim(),
      };
    }

    const body = await response.text();
    return {
      ok: true,
      body,
      contentType: response.headers.get("content-type"),
      finalUrl: response.url || url,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Request timed out" };
    }
    const message = error instanceof Error ? error.message : "Fetch failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
