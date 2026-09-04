/**
 * If URL has no http/https scheme, prefix `http://`.
 * Leaves http(s) and other real schemes (mailto, data, ftp://, …) alone.
 * Treats `localhost:1200/...` and `host:port/...` as host+port, not as a URI scheme.
 */
export function ensureHttpUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("//")) return `http:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // host:port[/path?query] — digit after colon means port, not scheme
  if (/^[a-zA-Z0-9_.-]+:\d/.test(trimmed)) {
    return `http://${trimmed}`;
  }

  // Other absolute schemes: mailto:, data:, ftp://, ws://, file:, …
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}
