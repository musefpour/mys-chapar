import { nanoid } from "nanoid";
import type {
  BodyMode,
  FormDataItem,
  HttpMethod,
  HttpRequestDraft,
  KeyValue,
} from "@shared/types";

const METHODS = new Set<HttpMethod>([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

function kv(key = "", value = "", enabled = true): KeyValue {
  return { id: nanoid(8), key, value, enabled };
}

function formItem(
  key = "",
  value = "",
  type: FormDataItem["type"] = "text",
  extra: Partial<Pick<FormDataItem, "fileName" | "filePath">> = {},
): FormDataItem {
  return {
    id: nanoid(8),
    key,
    value,
    enabled: true,
    type,
    ...extra,
  };
}

/** Strip matching surrounding quotes and unescape common sequences. */
function stripWrappingQuotes(value: string): string {
  let text = value.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1);
  }
  return text.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}

function basenamePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

/**
 * Parse a single curl -F/--form value: name=content | name=@file | name=<file
 * Optional ;type=… and ;filename=… suffixes are supported for file fields.
 */
function parseFormField(raw: string, asString: boolean): FormDataItem {
  const eq = raw.indexOf("=");
  if (eq <= 0) {
    return formItem(raw.trim(), "");
  }

  const key = raw.slice(0, eq).trim();
  let content = raw.slice(eq + 1);

  if (!asString && (content.startsWith("@") || content.startsWith("<"))) {
    const isFileUpload = content.startsWith("@");
    let rest = content.slice(1);

    // Split trailing ;type= / ;filename= from path (path may be quoted)
    let filePath = rest;
    let fileName: string | undefined;
    const suffixMatch = rest.match(
      /^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^;]+)(.*)$/,
    );
    if (suffixMatch) {
      filePath = stripWrappingQuotes(suffixMatch[1] ?? rest);
      const suffixes = suffixMatch[2] ?? "";
      const filenameMatch = suffixes.match(/;\s*filename=([^;]+)/i);
      if (filenameMatch?.[1]) {
        fileName = stripWrappingQuotes(filenameMatch[1].trim());
      }
    } else {
      filePath = stripWrappingQuotes(rest);
    }

    if (isFileUpload) {
      return formItem(key, fileName || basenamePath(filePath), "file", {
        filePath,
        fileName: fileName || basenamePath(filePath),
      });
    }

    // name=<file → treat as text placeholder noting the source path
    return formItem(key, filePath, "text");
  }

  return formItem(key, stripWrappingQuotes(content), "text");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value.replace(/\+/g, " ");
  }
}

function normalizeCurlInput(input: string): string {
  let text = input.replace(/^\uFEFF/, "").trim();

  // Strip shell prompts / wrappers
  text = text.replace(/^\$+\s*/gm, "");
  text = text.replace(/^PS\s+[^>]*>\s*/gim, "");
  text = text.replace(/^curl\.exe\b/i, "curl");

  // Keep only from first curl occurrence if extra text was copied
  const curlIndex = text.search(/\bcurl\b/i);
  if (curlIndex > 0) text = text.slice(curlIndex);

  // Join bash line continuations, preserve other content for tokenizer
  text = text.replace(/\\\r?\n/g, " ");

  // Normalize odd quotes sometimes copied from docs
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  return text.trim();
}

/** Tokenize a curl argument string, respecting quotes and nested spaces. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  const push = () => {
    if (!current) return;
    tokens.push(current);
    current = "";
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (quote === '"' && char === "\\") {
      escaped = true;
      continue;
    }

    // bash $'...' ANSI-C quoting: treat like single quotes after consuming $
    if (!quote && char === "$" && input[i + 1] === "'") {
      quote = "'";
      i += 1;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      push();
      continue;
    }

    current += char;
  }

  push();
  return tokens;
}

function splitHeader(raw: string): { key: string; value: string } | null {
  const index = raw.indexOf(":");
  if (index <= 0) return null;
  return {
    key: raw.slice(0, index).trim(),
    value: raw.slice(index + 1).trim(),
  };
}

function isHttpMethod(value: string): value is HttpMethod {
  return METHODS.has(value.toUpperCase() as HttpMethod);
}

function detectRawLanguage(
  body: string,
  contentType: string | undefined,
): HttpRequestDraft["body"]["rawLanguage"] {
  const type = contentType?.toLowerCase() ?? "";
  if (type.includes("json")) return "json";
  if (type.includes("xml")) return "xml";
  if (type.includes("html")) return "html";
  const trimmed = body.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return "json";
  }
  return "text";
}

function looksLikeUrl(token: string): boolean {
  return (
    /^https?:\/\//i.test(token) ||
    /^\/\//.test(token) ||
    /^[\w.-]+\.[a-z]{2,}([/:?]|$)/i.test(token) ||
    /^localhost(:\d+)?([/?#]|$)/i.test(token) ||
    /^\d{1,3}(\.\d{1,3}){3}(:\d+)?([/?#]|$)/.test(token) ||
    /^[\w.-]+:\d{2,5}([/?#]|$)/i.test(token) ||
    token.startsWith("/")
  );
}

function parseUrlParts(rawUrl: string): { url: string; params: KeyValue[] } {
  let candidate = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;

  try {
    const parsed = new URL(candidate);
    const params: KeyValue[] = [];
    parsed.searchParams.forEach((value, key) => {
      params.push(kv(key, value));
    });
    parsed.search = "";
    return {
      url: parsed.toString(),
      params: params.length ? params : [kv()],
    };
  } catch {
    const q = candidate.indexOf("?");
    if (q === -1) return { url: candidate, params: [kv()] };
    const base = candidate.slice(0, q);
    const query = candidate.slice(q + 1);
    const params = query
      .split("&")
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf("=");
        if (eq === -1) return kv(safeDecode(part), "");
        return kv(safeDecode(part.slice(0, eq)), safeDecode(part.slice(eq + 1)));
      });
    return { url: base, params: params.length ? params : [kv()] };
  }
}

function splitFlag(token: string): { flag: string; inline?: string } {
  // -XPOST / -X GET already separate / --header=value
  if (token.startsWith("--")) {
    const eq = token.indexOf("=");
    if (eq > 1) {
      return { flag: token.slice(0, eq), inline: token.slice(eq + 1) };
    }
    return { flag: token };
  }

  const match = token.match(/^-X([A-Za-z]+)$/);
  if (match) {
    return { flag: "-X", inline: match[1] };
  }

  return { flag: token };
}

export interface ParseCurlResult {
  ok: true;
  request: Omit<HttpRequestDraft, "id" | "name">;
}

export interface ParseCurlError {
  ok: false;
  error: string;
}

export type ParseCurlResponse = ParseCurlResult | ParseCurlError;

export function parseCurl(input: string): ParseCurlResponse {
  try {
    return parseCurlUnsafe(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse cURL";
    return { ok: false, error: message };
  }
}

function parseCurlUnsafe(input: string): ParseCurlResponse {
  const cleaned = normalizeCurlInput(input);
  if (!cleaned) {
    return { ok: false, error: "cURL is empty" };
  }

  if (!/\bcurl\b/i.test(cleaned) && !looksLikeUrl(cleaned.split(/\s+/)[0] ?? "")) {
    // Allow pasting bare URL, otherwise require curl
    if (!looksLikeUrl(cleaned)) {
      return { ok: false, error: "Paste a valid cURL command starting with curl" };
    }
  }

  const withoutCurl = cleaned.replace(/^\s*curl\b/i, "").trim();
  const tokens = tokenize(withoutCurl || cleaned);
  if (!tokens.length) {
    return { ok: false, error: "Could not parse cURL" };
  }

  let method: HttpMethod | null = null;
  let url = "";
  const headers: KeyValue[] = [];
  const dataParts: string[] = [];
  const formParts: FormDataItem[] = [];
  let dataIsUrlEncoded = false;
  let user: string | null = null;
  let getWithData = false;

  const takeValue = (
    index: number,
    inline?: string,
  ): { value: string; next: number } | null => {
    if (inline != null && inline !== "") {
      return { value: inline, next: index };
    }
    const next = tokens[index + 1];
    if (!next || next.startsWith("-")) return null;
    return { value: next, next: index + 1 };
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const rawToken = tokens[i];
    const { flag, inline } = splitFlag(rawToken);

    if (flag === "-X" || flag === "--request") {
      const taken = takeValue(i, inline);
      if (!taken || !isHttpMethod(taken.value)) {
        return { ok: false, error: "Invalid method in -X/--request" };
      }
      method = taken.value.toUpperCase() as HttpMethod;
      i = taken.next;
      continue;
    }

    if (flag === "-H" || flag === "--header") {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing header value" };
      const header = splitHeader(taken.value);
      if (!header) return { ok: false, error: `Invalid header: ${taken.value}` };
      headers.push(kv(header.key, header.value));
      i = taken.next;
      continue;
    }

    if (
      flag === "-d" ||
      flag === "--data" ||
      flag === "--data-raw" ||
      flag === "--data-binary" ||
      flag === "--data-ascii"
    ) {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing data value" };
      dataParts.push(taken.value);
      i = taken.next;
      continue;
    }

    if (flag === "--data-urlencode") {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing --data-urlencode value" };
      dataIsUrlEncoded = true;
      dataParts.push(taken.value);
      i = taken.next;
      continue;
    }

    if (flag === "-F" || flag === "--form" || flag === "--form-string") {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing --form value" };
      formParts.push(parseFormField(taken.value, flag === "--form-string"));
      i = taken.next;
      continue;
    }

    if (flag === "-u" || flag === "--user") {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing --user value" };
      user = taken.value;
      i = taken.next;
      continue;
    }

    if (flag === "--url") {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing --url value" };
      url = taken.value;
      i = taken.next;
      continue;
    }

    if (flag === "-G" || flag === "--get") {
      getWithData = true;
      continue;
    }

    if (flag === "-A" || flag === "--user-agent") {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing user-agent" };
      headers.push(kv("User-Agent", taken.value));
      i = taken.next;
      continue;
    }

    if (flag === "-e" || flag === "--referer") {
      const taken = takeValue(i, inline);
      if (!taken) return { ok: false, error: "Missing referer" };
      headers.push(kv("Referer", taken.value));
      i = taken.next;
      continue;
    }

    if (
      flag === "-I" ||
      flag === "--head"
    ) {
      method = "HEAD";
      continue;
    }

    // Boolean / ignored flags (including combined short flags like -skL)
    if (
      flag === "-s" ||
      flag === "--silent" ||
      flag === "-S" ||
      flag === "--show-error" ||
      flag === "-i" ||
      flag === "--include" ||
      flag === "-k" ||
      flag === "--insecure" ||
      flag === "-L" ||
      flag === "--location" ||
      flag === "-v" ||
      flag === "--verbose" ||
      flag === "-n" ||
      flag === "--netrc" ||
      flag === "--compressed" ||
      flag === "-#" ||
      flag === "--progress-bar" ||
      /^-[A-Za-z]{2,}$/.test(flag)
    ) {
      continue;
    }

    if (flag.startsWith("--") || flag.startsWith("-")) {
      const maybeValue = tokens[i + 1];
      if (
        maybeValue &&
        !maybeValue.startsWith("-") &&
        !looksLikeUrl(maybeValue)
      ) {
        i += 1;
      }
      continue;
    }

    if (!url && looksLikeUrl(rawToken)) {
      url = rawToken.replace(/^['"]|['"]$/g, "");
    }
  }

  if (!url) {
    // last chance: first http(s) token anywhere
    const fallback = tokens.find((token) => /^https?:\/\//i.test(token));
    if (fallback) url = fallback.replace(/^['"]|['"]$/g, "");
  }

  if (!url) {
    return { ok: false, error: "No URL found in cURL. Make sure the command includes https://..." };
  }

  if (user) {
    try {
      const encoded = btoa(unescape(encodeURIComponent(user)));
      headers.push(kv("Authorization", `Basic ${encoded}`));
    } catch {
      headers.push(kv("Authorization", `Basic ${user}`));
    }
  }

  const contentType = headers.find(
    (item) => item.key.toLowerCase() === "content-type",
  )?.value;

  let bodyMode: BodyMode = "none";
  let raw = "";
  let urlencoded: KeyValue[] = [kv()];
  let formdata: FormDataItem[] = [formItem()];
  const joinedData = dataParts.join("&");
  const hasForm = formParts.length > 0;

  // multipart (-F/--form) wins over -d when both appear
  if (hasForm) {
    bodyMode = "formdata";
    formdata = [...formParts, formItem()];
  } else if (joinedData) {
    const looksJson =
      contentType?.toLowerCase().includes("json") ||
      joinedData.trim().startsWith("{") ||
      joinedData.trim().startsWith("[");

    const looksUrlEncoded =
      !looksJson &&
      (dataIsUrlEncoded ||
        contentType?.toLowerCase().includes("application/x-www-form-urlencoded") ||
        (joinedData.includes("=") && !joinedData.trim().startsWith("<")));

    if (looksUrlEncoded) {
      bodyMode = "urlencoded";
      urlencoded = joinedData
        .split("&")
        .filter(Boolean)
        .map((part) => {
          const eq = part.indexOf("=");
          if (eq === -1) return kv(safeDecode(part), "");
          return kv(safeDecode(part.slice(0, eq)), safeDecode(part.slice(eq + 1)));
        });
      if (!urlencoded.length) urlencoded = [kv()];
    } else {
      bodyMode = "raw";
      raw = joinedData;
    }
  }

  if (!method) {
    method = (joinedData || hasForm) && !getWithData ? "POST" : "GET";
  }

  if (getWithData && joinedData && !hasForm) {
    const extra = joinedData
      .split("&")
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf("=");
        if (eq === -1) return kv(safeDecode(part), "");
        return kv(safeDecode(part.slice(0, eq)), safeDecode(part.slice(eq + 1)));
      });
    const parts = parseUrlParts(url);
    return {
      ok: true,
      request: {
        method: "GET",
        url: parts.url,
        params: [...parts.params.filter((p) => p.key), ...extra, kv()],
        headers: headers.length ? headers : [kv()],
        body: {
          mode: "none",
          raw: "",
          rawLanguage: "text",
          urlencoded: [kv()],
          formdata: [formItem()],
        },
      },
    };
  }

  const parts = parseUrlParts(url);

  return {
    ok: true,
    request: {
      method,
      url: parts.url,
      params: parts.params,
      headers: headers.length ? headers : [kv()],
      body: {
        mode: bodyMode,
        raw,
        rawLanguage: detectRawLanguage(raw, contentType),
        urlencoded,
        formdata,
      },
    },
  };
}
