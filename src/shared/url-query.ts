import { nanoid } from "nanoid";
import type { KeyValue } from "./types";

function kv(key = "", value = "", enabled = true): KeyValue {
  return { id: nanoid(8), key, value, enabled };
}

export function splitUrlQuery(url: string): { base: string; query: string; hash: string } {
  const hashIndex = url.indexOf("#");
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const rest = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const qIndex = rest.indexOf("?");
  if (qIndex === -1) return { base: rest, query: "", hash };
  return { base: rest.slice(0, qIndex), query: rest.slice(qIndex + 1), hash };
}

function encodeQueryPart(value: string): string {
  if (!value) return "";
  if (!/\{\{/.test(value)) return encodeURIComponent(value);
  return value
    .split(/(\{\{\s*[^}]+\s*\}\})/g)
    .map((part) => (/^\{\{/.test(part) ? part : encodeURIComponent(part)))
    .join("");
}

function decodeQueryPart(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function paramsToQuery(params: KeyValue[]): string {
  return params
    .filter((item) => item.enabled && item.key.trim())
    .map(
      (item) =>
        `${encodeQueryPart(item.key.trim())}=${encodeQueryPart(item.value)}`,
    )
    .join("&");
}

export function applyParamsToUrl(url: string, params: KeyValue[]): string {
  const { base, hash } = splitUrlQuery(url);
  const query = paramsToQuery(params);
  if (!query) return `${base}${hash}`;
  return `${base}?${query}${hash}`;
}

export function parseQueryString(query: string): Array<{ key: string; value: string }> {
  if (!query) return [];
  return query
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return { key: decodeQueryPart(part), value: "" };
      return {
        key: decodeQueryPart(part.slice(0, eq)),
        value: decodeQueryPart(part.slice(eq + 1)),
      };
    });
}

export function paramsFromUrl(url: string, existing: KeyValue[]): KeyValue[] {
  const { query } = splitUrlQuery(url);
  const parsed = parseQueryString(query);
  const unused = existing.filter((item) => item.enabled && item.key.trim());
  const next: KeyValue[] = [];

  for (const pair of parsed) {
    const index = unused.findIndex((item) => item.key === pair.key);
    if (index !== -1) {
      const match = unused.splice(index, 1)[0];
      next.push({ ...match, value: pair.value, enabled: true });
    } else {
      next.push(kv(pair.key, pair.value));
    }
  }

  for (const item of existing) {
    if (!item.enabled && item.key.trim()) next.push(item);
  }

  const blank = existing.find((item) => !item.key.trim() && !item.value.trim());
  next.push(blank ?? kv());
  return next;
}
