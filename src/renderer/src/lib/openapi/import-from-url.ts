import { ensureHttpUrl } from "@shared/ensure-http-url";
import {
  OPENAPI_FALLBACK_PATHS,
  parseOpenApiDocument,
  type OpenApiImportDraft,
  type ParseOpenApiResult,
} from "./parse-openapi";

function looksLikeHtml(body: string, contentType: string | null): boolean {
  const trimmed = body.trimStart().slice(0, 32).toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) return true;
  // Gateways sometimes label OpenAPI JSON as text/html — trust the body first.
  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("openapi") ||
    trimmed.startsWith("swagger")
  ) {
    return false;
  }
  const ct = (contentType ?? "").toLowerCase();
  return ct.includes("text/html");
}

function looksLikeOpenApi(body: string): boolean {
  const head = body.trimStart().slice(0, 800);
  return (
    /"openapi"\s*:/.test(head) ||
    /"swagger"\s*:/.test(head) ||
    /^openapi\s*:/m.test(head) ||
    /^swagger\s*:/m.test(head)
  );
}

function stripTrailingSlashes(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function looksLikeSwaggerUiUrl(url: string): boolean {
  try {
    const path = stripTrailingSlashes(new URL(url).pathname.toLowerCase());
    return (
      path.includes("swagger-ui") ||
      path.endsWith("/swagger") ||
      path.endsWith("/swagger/index.html") ||
      /\/docs$/.test(path) ||
      /\/docs\/index\.html$/.test(path)
    );
  } catch {
    return false;
  }
}

/** Directory that serves swagger-initializer.js for a Swagger UI URL. */
function swaggerUiDirectory(url: string): string {
  const parsed = new URL(ensureHttpUrl(url));
  let path = parsed.pathname;
  if (/\/index\.html$/i.test(path)) {
    path = path.replace(/\/index\.html$/i, "/");
  } else if (!path.endsWith("/")) {
    path = `${path}/`;
  }
  parsed.pathname = path;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

/**
 * Prefix before /swagger or /docs — e.g. /api/swagger/ → /api
 * so we can try /api/openapi (FastAPI / custom gateways).
 */
function swaggerPathPrefix(url: string): string {
  try {
    const path = stripTrailingSlashes(new URL(url).pathname);
    const stripped = path.replace(
      /\/(swagger-ui|swagger|docs)(\/index\.html)?$/i,
      "",
    );
    return stripped === "/" ? "" : stripped;
  } catch {
    return "";
  }
}

function timeoutForUrl(url: string): number {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (
      path.includes("api-docs") ||
      path.includes("openapi") ||
      path.endsWith("/openapi") ||
      path.endsWith("swagger.json") ||
      path.endsWith("swagger.yaml")
    ) {
      return 90_000;
    }
    if (path.endsWith(".js") || path.includes("swagger-config")) {
      return 20_000;
    }
  } catch {
    // ignore
  }
  return 15_000;
}

async function fetchText(url: string) {
  return window.mychapar.fetchText({ url, timeoutMs: timeoutForUrl(url) });
}

/** Pull configUrl / url values from swagger-initializer.js (SpringDoc injects configUrl). */
function extractSpecUrlsFromInitializer(js: string, baseUrl: string): string[] {
  const found: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw?.trim()) return;
    try {
      const absolute = new URL(raw.trim(), baseUrl).toString();
      if (!found.includes(absolute)) found.push(absolute);
    } catch {
      // ignore
    }
  };

  const configUrl = js.match(/["']configUrl["']\s*:\s*["']([^"']+)["']/i);
  push(configUrl?.[1]);

  const urlMatch = js.match(/["']url["']\s*:\s*["']([^"']+)["']/i);
  const urlValue = urlMatch?.[1];
  if (urlValue && !(configUrl && /petstore\.swagger\.io/i.test(urlValue))) {
    push(urlValue);
  }

  return found;
}

/** SpringDoc / common primary paths — try these before noisy fallbacks that often return 401. */
const SPRING_PRIMARY_PATHS = [
  "/v3/api-docs/swagger-config",
  "/v3/api-docs",
] as const;

function prefixSpecCandidates(origin: string, prefix: string): string[] {
  if (!prefix) return [];
  return [
    `${origin}${prefix}/openapi`,
    `${origin}${prefix}/v3/api-docs/swagger-config`,
    `${origin}${prefix}/v3/api-docs`,
    `${origin}${prefix}/swagger.json`,
    `${origin}${prefix}/swagger/v1/swagger.json`,
    `${origin}${prefix}/openapi.json`,
  ];
}

function candidateUrls(inputUrl: string): string[] {
  const normalized = ensureHttpUrl(inputUrl.trim());
  const urls: string[] = [];
  const add = (url: string) => {
    if (url && !urls.includes(url)) urls.push(url);
  };

  try {
    const parsed = new URL(normalized);
    const origin = parsed.origin;
    const swaggerUi = looksLikeSwaggerUiUrl(normalized);
    const path = parsed.pathname.toLowerCase();

    if (swaggerUi) {
      const dir = swaggerUiDirectory(normalized);
      add(new URL("swagger-initializer.js", dir).toString());
      for (const item of prefixSpecCandidates(origin, swaggerPathPrefix(normalized))) {
        add(item);
      }
      for (const p of SPRING_PRIMARY_PATHS) add(`${origin}${p}`);
      for (const p of OPENAPI_FALLBACK_PATHS) add(`${origin}${p}`);
      add(normalized);
    } else if (
      path.includes("api-docs") ||
      path.includes("openapi") ||
      path.endsWith(".json") ||
      path.endsWith(".yaml") ||
      path.endsWith(".yml")
    ) {
      add(normalized);
      for (const p of SPRING_PRIMARY_PATHS) add(`${origin}${p}`);
    } else {
      add(normalized);
      for (const p of SPRING_PRIMARY_PATHS) add(`${origin}${p}`);
      for (const p of OPENAPI_FALLBACK_PATHS) add(`${origin}${p}`);
    }
  } catch {
    add(normalized);
  }

  return urls;
}

function looksLikeApiErrorJson(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return false;
    if ("openapi" in parsed || "swagger" in parsed) return false;
    if ("url" in parsed || "urls" in parsed) return false;
    return (
      ("status" in parsed && "message" in parsed) ||
      ("error" in parsed && ("status" in parsed || "path" in parsed))
    );
  } catch {
    return false;
  }
}

function parseSwaggerConfig(
  body: string,
): { url?: string; urls?: Array<{ url?: string }> } | null {
  try {
    const parsed = JSON.parse(body) as {
      url?: string;
      urls?: Array<{ url?: string }>;
      openapi?: unknown;
      swagger?: unknown;
      status?: unknown;
      message?: unknown;
    };
    if (!parsed || typeof parsed !== "object") return null;
    if ("openapi" in parsed || "swagger" in parsed) return null;
    // Auth / framework error payloads must not be treated as swagger-config.
    if (
      !("url" in parsed) &&
      !("urls" in parsed) &&
      ("status" in parsed || "message" in parsed)
    ) {
      return null;
    }
    if (typeof parsed.url !== "string" && !Array.isArray(parsed.urls)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export type ImportOpenApiFromUrlResult =
  | { ok: true; draft: OpenApiImportDraft; sourceUrl: string }
  | { ok: false; error: string };

export async function importOpenApiFromUrl(
  inputUrl: string,
): Promise<ImportOpenApiFromUrlResult> {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a Swagger / OpenAPI URL" };
  }

  if (typeof window.mychapar?.fetchText !== "function") {
    return {
      ok: false,
      error: "App bridge is outdated — restart MYs Chapar (npm run dev) and try again",
    };
  }

  const queue = candidateUrls(trimmed);
  const attempted = new Set<string>();
  let lastError = "Could not fetch OpenAPI document";
  let sawUnauthorized = false;

  const enqueue = (url: string, front = false) => {
    if (!url || attempted.has(url) || queue.includes(url)) return;
    if (front) queue.unshift(url);
    else queue.push(url);
  };

  while (queue.length) {
    const url = queue.shift()!;
    if (attempted.has(url)) continue;
    attempted.add(url);

    const fetched = await fetchText(url);
    if (!fetched.ok) {
      lastError = fetched.error;
      if (/401|403|unauthorized|forbidden/i.test(fetched.error)) {
        sawUnauthorized = true;
      }
      continue;
    }

    if (looksLikeApiErrorJson(fetched.body)) {
      lastError = "Server returned an error JSON instead of OpenAPI";
      if (/401|احراز|unauthorized|auth/i.test(fetched.body)) {
        sawUnauthorized = true;
        lastError = "HTTP 401 — this path requires authentication";
      }
      continue;
    }

    // swagger-initializer.js → discover configUrl / url
    if (/\.js(\?|$)/i.test(url) || /swagger-initializer/i.test(url)) {
      const discovered = extractSpecUrlsFromInitializer(fetched.body, fetched.finalUrl);
      for (const item of discovered.reverse()) {
        enqueue(item, true);
      }
      if (discovered.length) continue;
      lastError = "Could not find OpenAPI URL inside swagger-initializer.js";
      continue;
    }

    if (looksLikeHtml(fetched.body, fetched.contentType) && !looksLikeOpenApi(fetched.body)) {
      lastError = "URL returned an HTML page, not an OpenAPI document";
      try {
        const discovered = extractSpecUrlsFromInitializer(fetched.body, fetched.finalUrl);
        const origin = new URL(fetched.finalUrl).origin;
        const dir = swaggerUiDirectory(fetched.finalUrl);
        const next = [
          ...discovered,
          new URL("swagger-initializer.js", dir).toString(),
          ...prefixSpecCandidates(origin, swaggerPathPrefix(fetched.finalUrl)),
        ];
        // unshift in reverse so `next[0]` is tried first
        for (const item of next.reverse()) {
          enqueue(item, true);
        }
      } catch {
        // ignore
      }
      continue;
    }

    // swagger-config JSON → follow url / urls[]
    const maybeConfig = parseSwaggerConfig(fetched.body);
    if (maybeConfig) {
      const nested =
        (typeof maybeConfig.url === "string" && maybeConfig.url) ||
        maybeConfig.urls?.find((item) => typeof item?.url === "string")?.url;
      if (nested) {
        try {
          const absolute = new URL(nested, fetched.finalUrl).toString();
          // Always try the resolved docs URL next, even if it was already queued later.
          if (attempted.has(absolute)) {
            // already tried
          } else if (queue.includes(absolute)) {
            // move to front
            const idx = queue.indexOf(absolute);
            if (idx >= 0) queue.splice(idx, 1);
            queue.unshift(absolute);
          } else {
            queue.unshift(absolute);
          }
          continue;
        } catch {
          lastError = "Invalid URL inside swagger-config";
          continue;
        }
      }
    }

    if (!looksLikeOpenApi(fetched.body)) {
      lastError = "Fetched content is not an OpenAPI/Swagger document";
      continue;
    }

    const parsed: ParseOpenApiResult = parseOpenApiDocument(fetched.body, {
      docUrl: fetched.finalUrl,
    });
    if (parsed.ok) {
      return { ok: true, draft: parsed.draft, sourceUrl: fetched.finalUrl };
    }
    lastError = parsed.error;
  }

  if (sawUnauthorized && /401|auth/i.test(lastError)) {
    return {
      ok: false,
      error:
        "Could not import: some paths need auth. Try the direct docs URL instead, e.g. https://api.example.com/v3/api-docs",
    };
  }

  return { ok: false, error: lastError };
}
