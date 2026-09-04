import type { HttpRequestDraft, KeyValue } from "@shared/types";
import { ensureHttpUrl } from "@shared/ensure-http-url";
import { applyParamsToUrl } from "@shared/url-query";

export interface NormalizedRequest {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  body: string | null;
  bodyMode: string;
  contentType: string | null;
}

function enabledPairs(items: KeyValue[]): Array<{ key: string; value: string }> {
  return items
    .filter((item) => item.enabled && item.key.trim())
    .map((item) => ({ key: item.key.trim(), value: item.value }));
}

export function normalizeRequest(request: HttpRequestDraft): NormalizedRequest {
  const url = ensureHttpUrl(applyParamsToUrl(request.url.trim() || "example.com", request.params));

  const headers = enabledPairs(request.headers);
  let body: string | null = null;
  let contentType: string | null =
    headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? null;

  const mode = request.body.mode;
  if (mode === "raw" && request.body.raw) {
    body = request.body.raw;
    if (!contentType) {
      const lang = request.body.rawLanguage ?? "text";
      contentType =
        lang === "json"
          ? "application/json"
          : lang === "xml"
            ? "application/xml"
            : lang === "html"
              ? "text/html"
              : lang === "javascript"
                ? "application/javascript"
                : "text/plain";
      headers.push({ key: "Content-Type", value: contentType });
    }
  } else if (mode === "urlencoded") {
    body = (request.body.urlencoded ?? [])
      .filter((item) => item.enabled && item.key.trim())
      .map(
        (item) =>
          `${encodeURIComponent(item.key.trim())}=${encodeURIComponent(item.value)}`,
      )
      .join("&");
    if (!contentType) {
      contentType = "application/x-www-form-urlencoded";
      headers.push({ key: "Content-Type", value: contentType });
    }
  } else if (mode === "graphql") {
    const variables = (() => {
      try {
        return JSON.parse(request.body.graphql?.variables || "{}");
      } catch {
        return {};
      }
    })();
    body = JSON.stringify({
      query: request.body.graphql?.query ?? "",
      variables,
    });
    if (!contentType) {
      contentType = "application/json";
      headers.push({ key: "Content-Type", value: contentType });
    }
  } else if (mode === "formdata") {
    body = (request.body.formdata ?? [])
      .filter((item) => item.enabled && item.key.trim())
      .map((item) =>
        item.type === "file"
          ? `${item.key.trim()}=@${item.fileName || "file"}`
          : `${item.key.trim()}=${item.value}`,
      )
      .join("\n");
    contentType = contentType ?? "multipart/form-data";
  } else if (mode === "binary") {
    body = request.body.binaryFileName
      ? `@${request.body.binaryFileName}`
      : "@file.bin";
  }

  return {
    method: request.method,
    url,
    headers,
    body: body && body.length ? body : null,
    bodyMode: mode,
    contentType,
  };
}

export function escSingle(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function escDouble(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export function escBacktick(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

export function indent(text: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

export function hasBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}
