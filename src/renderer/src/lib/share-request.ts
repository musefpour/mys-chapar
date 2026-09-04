import type { HttpRequestDraft } from "@shared/types";
import { ensureHttpUrl } from "@shared/ensure-http-url";
import { applyParamsToUrl } from "@shared/url-query";

export function requestToCurl(request: HttpRequestDraft): string {
  const url = ensureHttpUrl(applyParamsToUrl(request.url, request.params));

  const lines: string[] = [`curl --request ${request.method} '${url.replace(/'/g, `'\\''`)}'`];

  for (const header of request.headers) {
    if (!header.enabled || !header.key.trim()) continue;
    lines.push(`  --header '${header.key.trim()}: ${header.value.replace(/'/g, `'\\''`)}'`);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.body.mode === "raw" && request.body.raw) {
      lines.push(`  --data-raw '${request.body.raw.replace(/'/g, `'\\''`)}'`);
    } else if (request.body.mode === "urlencoded") {
      const body = (request.body.urlencoded ?? [])
        .filter((item) => item.enabled && item.key.trim())
        .map(
          (item) =>
            `${encodeURIComponent(item.key.trim())}=${encodeURIComponent(item.value)}`,
        )
        .join("&");
      if (body) lines.push(`  --data '${body.replace(/'/g, `'\\''`)}'`);
    } else if (request.body.mode === "graphql") {
      const payload = JSON.stringify({
        query: request.body.graphql?.query ?? "",
        variables: (() => {
          try {
            return JSON.parse(request.body.graphql?.variables || "{}");
          } catch {
            return {};
          }
        })(),
      });
      lines.push(`  --data-raw '${payload.replace(/'/g, `'\\''`)}'`);
    }
  }

  return lines.join(" \\\n");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
