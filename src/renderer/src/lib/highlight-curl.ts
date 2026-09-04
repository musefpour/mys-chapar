import { escapeHtml } from "./highlight-json";

/** Soft syntax highlight for cURL. Returns safe HTML. */
export function highlightCurlHtml(input: string): string {
  const escaped = escapeHtml(input);
  return escaped.replace(
    /('(?:\\'|[^'])*')|("(?:\\.|[^"\\])*")|(--[\w-]+)|(\bcurl\b)|(\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b)|(\\)/g,
    (
      match,
      singleQuoted: string | undefined,
      doubleQuoted: string | undefined,
      flag: string | undefined,
      curl: string | undefined,
      method: string | undefined,
      backslash: string | undefined,
    ) => {
      if (singleQuoted != null || doubleQuoted != null || method != null) {
        return `<span class="curl-value">${match}</span>`;
      }
      if (flag != null || curl != null) {
        return `<span class="curl-key">${match}</span>`;
      }
      if (backslash != null) {
        return `<span class="curl-punct">${match}</span>`;
      }
      return match;
    },
  );
}
