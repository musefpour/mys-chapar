import type { FormDataItem, HttpRequestDraft, KeyValue, ResponseSnapshot } from "./types";
import { ensureHttpUrl } from "./ensure-http-url";
import { applyParamsToUrl } from "./url-query";

function enabledPairs(items: KeyValue[]): Array<[string, string]> {
  return items
    .filter((item) => item.enabled && item.key.trim().length > 0)
    .map((item) => [item.key.trim(), item.value]);
}

function buildUrl(rawUrl: string, params: KeyValue[]): URL {
  return new URL(ensureHttpUrl(applyParamsToUrl(rawUrl, params)));
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildFormData(items: FormDataItem[]): FormData {
  const form = new FormData();
  for (const item of items) {
    if (!item.enabled || !item.key.trim()) continue;
    if (item.type === "file") {
      if (!item.fileBase64) continue;
      const bytes = base64ToUint8Array(item.fileBase64);
      const fileName = item.fileName || "file";
      form.append(item.key.trim(), new Blob([bytes]), fileName);
    } else {
      form.append(item.key.trim(), item.value);
    }
  }
  return form;
}

/**
 * Browser-safe HTTP sender (Chrome extension service worker + desktop app after file hydrate).
 * Expects file/binary payloads as base64 (`fileBase64` / `binaryBase64`).
 */
export async function sendHttpRequest(
  request: HttpRequestDraft,
  signal?: AbortSignal,
): Promise<ResponseSnapshot> {
  if (!request.url.trim()) {
    throw new Error("URL is required");
  }

  let url: URL;
  try {
    url = buildUrl(request.url.trim(), request.params);
  } catch {
    throw new Error("Invalid URL");
  }

  const headers = new Headers();
  for (const [key, value] of enabledPairs(request.headers)) {
    headers.set(key, value);
  }

  let body: RequestInit["body"];
  const canHaveBody = request.method !== "GET" && request.method !== "HEAD";

  if (canHaveBody) {
    switch (request.body.mode) {
      case "raw": {
        body = request.body.raw ?? "";
        if (!headers.has("content-type")) {
          const language = request.body.rawLanguage ?? "json";
          const contentType =
            language === "json"
              ? "application/json"
              : language === "xml"
                ? "application/xml"
                : language === "html"
                  ? "text/html"
                  : language === "javascript"
                    ? "application/javascript"
                    : "text/plain";
          headers.set("content-type", contentType);
        }
        break;
      }
      case "urlencoded": {
        const form = new URLSearchParams();
        for (const [key, value] of enabledPairs(request.body.urlencoded ?? [])) {
          form.append(key, value);
        }
        body = form.toString();
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/x-www-form-urlencoded");
        }
        break;
      }
      case "formdata": {
        body = buildFormData(request.body.formdata ?? []);
        headers.delete("content-type");
        break;
      }
      case "binary": {
        if (!request.body.binaryBase64) {
          throw new Error("Select a binary file first");
        }
        body = new Blob([base64ToUint8Array(request.body.binaryBase64)]);
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/octet-stream");
        }
        break;
      }
      case "graphql": {
        let variables: unknown = {};
        const rawVars = request.body.graphql?.variables?.trim() || "{}";
        try {
          variables = JSON.parse(rawVars);
        } catch {
          throw new Error("GraphQL variables must be valid JSON");
        }
        body = JSON.stringify({
          query: request.body.graphql?.query ?? "",
          variables,
        });
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
        break;
      }
      case "none":
      default:
        body = undefined;
    }
  }

  const started = performance.now();
  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
    signal,
    redirect: "follow",
  });
  const timeMs = Math.round(performance.now() - started);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");
  const bodyText = new TextDecoder("utf-8").decode(bytes);

  return {
    status: response.status,
    statusText: response.statusText,
    headers: headersToObject(response.headers),
    body: bodyText,
    contentType,
    timeMs,
    sizeBytes: bytes.byteLength,
  };
}
