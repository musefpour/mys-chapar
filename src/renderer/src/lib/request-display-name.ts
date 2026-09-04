import { ensureHttpUrl } from "@shared/ensure-http-url";

export const DEFAULT_REQUEST_NAME = "Untitled request";

export function isAutoRequestName(name: string | undefined | null): boolean {
  const trimmed = name?.trim() ?? "";
  return !trimmed || trimmed === DEFAULT_REQUEST_NAME;
}

export function nameFromUrl(url: string): string {
  const raw = url.trim().split("#")[0].split("?")[0];
  if (!raw) return "";

  const parsed = parseUrl(raw);
  if (parsed) {
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path && path !== "/") return path;
    return parsed.hostname || parsed.host || "";
  }

  const pathStart = pathIndex(raw);
  if (pathStart !== -1) {
    const path = raw.slice(pathStart).replace(/\/+$/, "");
    if (path && path !== "/") return path;
    const host = raw.slice(0, pathStart).replace(/^https?:\/\//i, "");
    return host || path;
  }

  return raw.replace(/^https?:\/\//i, "");
}

export function requestDisplayName(name: string | undefined | null, url: string): string {
  if (!isAutoRequestName(name)) return name!.trim();
  return nameFromUrl(url) || DEFAULT_REQUEST_NAME;
}

function parseUrl(raw: string): URL | null {
  const candidates = [raw];
  const withScheme = ensureHttpUrl(raw);
  if (withScheme && withScheme !== raw) candidates.push(withScheme);
  if (raw.startsWith("//")) candidates.push(`https:${raw}`);
  for (const candidate of candidates) {
    try {
      return new URL(candidate);
    } catch {
      // try next
    }
  }
  return null;
}

function pathIndex(raw: string): number {
  const scheme = raw.indexOf("://");
  const from = scheme === -1 ? 0 : scheme + 3;
  return raw.indexOf("/", from);
}
