export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Soft syntax highlight for JSON-like text. Returns safe HTML. */
export function highlightJsonHtml(input: string): string {
  const escaped = escapeHtml(input);
  return escaped.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, stringToken: string | undefined, isKey: string | undefined, literal: string | undefined) => {
      if (stringToken != null) {
        if (isKey != null) {
          return `<span class="tok-key">${stringToken}</span>${isKey}`;
        }
        return `<span class="tok-string">${stringToken}</span>`;
      }
      if (literal != null) {
        return `<span class="tok-literal">${literal}</span>`;
      }
      return `<span class="tok-number">${match}</span>`;
    },
  );
}

export function beautifyRawBody(
  raw: string,
  language: "json" | "text" | "xml" | "html" | "javascript" = "json",
): { ok: true; value: string } | { ok: false; error: string } {
  const text = raw ?? "";
  if (!text.trim()) {
    return { ok: false, error: "Body is empty" };
  }
  if (language === "json" || language === "javascript") {
    try {
      return { ok: true, value: JSON.stringify(JSON.parse(text), null, 2) };
    } catch {
      return { ok: false, error: "Invalid JSON — cannot beautify" };
    }
  }

  if (language === "xml" || language === "html") {
    try {
      return { ok: true, value: prettyMarkup(text) };
    } catch {
      return { ok: false, error: "Could not beautify markup" };
    }
  }

  return { ok: true, value: text };
}

function prettyMarkup(input: string): string {
  const normalized = input.replace(/>\s*</g, ">\n<").trim();
  const lines = normalized.split("\n");
  let indent = 0;
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<\//.test(trimmed)) indent = Math.max(indent - 1, 0);
    out.push(`${"  ".repeat(indent)}${trimmed}`);
    if (
      /^<[^!?][^>]*[^/]>$/.test(trimmed) &&
      !/^<(br|hr|img|input|meta|link|source|area|base|col|embed|wbr)\b/i.test(trimmed)
    ) {
      indent += 1;
    }
  }

  return out.join("\n");
}
