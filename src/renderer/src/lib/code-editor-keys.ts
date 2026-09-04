const INDENT = "        "; // 8 spaces
const INDENT_SIZE = INDENT.length;

export type CodeKeyResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

function lineStart(text: string, index: number): number {
  const pos = text.lastIndexOf("\n", index - 1);
  return pos === -1 ? 0 : pos + 1;
}

function leadingWs(line: string): string {
  const match = /^(?: |\t)*/.exec(line);
  return match ? match[0] : "";
}

function expandTabs(ws: string): string {
  return ws.replaceAll("\t", INDENT);
}

/** Indent/outdent and smart Enter for code / JSON textareas. */
export function handleCodeEditorKey(
  event: { key: string; shiftKey: boolean; preventDefault: () => void },
  value: string,
  selectionStart: number,
  selectionEnd: number,
): CodeKeyResult | null {
  if (event.key === "Tab") {
    event.preventDefault();
    if (selectionStart !== selectionEnd && value.slice(selectionStart, selectionEnd).includes("\n")) {
      return indentSelection(value, selectionStart, selectionEnd, event.shiftKey);
    }
    if (event.shiftKey) {
      return outdentAtCursor(value, selectionStart, selectionEnd);
    }
    const next =
      value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
    const cursor = selectionStart + INDENT_SIZE;
    return { value: next, selectionStart: cursor, selectionEnd: cursor };
  }

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    return insertSmartNewline(value, selectionStart, selectionEnd);
  }

  return null;
}

function indentSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  outdent: boolean,
): CodeKeyResult {
  const start = lineStart(value, selectionStart);
  let end = selectionEnd;
  if (end > start && value[end - 1] === "\n") end -= 1;

  const block = value.slice(start, end);
  const lines = block.split("\n");
  let deltaStart = 0;
  let deltaTotal = 0;

  const nextLines = lines.map((line, index) => {
    if (outdent) {
      const removed = Math.min(INDENT_SIZE, leadingWs(line).length);
      const trimmed =
        line.startsWith(INDENT)
          ? line.slice(INDENT_SIZE)
          : line.slice(0, removed) === " ".repeat(removed)
            ? line.slice(removed)
            : line.replace(/^\t/, "");
      const removedCount = line.length - trimmed.length;
      if (index === 0) deltaStart = -removedCount;
      deltaTotal -= removedCount;
      return trimmed;
    }
    if (index === 0) deltaStart = INDENT_SIZE;
    deltaTotal += INDENT_SIZE;
    return INDENT + line;
  });

  const next = value.slice(0, start) + nextLines.join("\n") + value.slice(end);
  return {
    value: next,
    selectionStart: selectionStart + deltaStart,
    selectionEnd: selectionEnd + deltaTotal,
  };
}

function outdentAtCursor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): CodeKeyResult {
  const start = lineStart(value, selectionStart);
  const line = value.slice(start, selectionStart);
  const ws = leadingWs(line);
  if (!ws) {
    return { value, selectionStart, selectionEnd };
  }
  const remove = Math.min(INDENT_SIZE, ws.length);
  const next = value.slice(0, start) + value.slice(start + remove);
  return {
    value: next,
    selectionStart: Math.max(start, selectionStart - remove),
    selectionEnd: Math.max(start, selectionEnd - remove),
  };
}

function insertSmartNewline(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): CodeKeyResult {
  const start = lineStart(value, selectionStart);
  const linePrefix = value.slice(start, selectionStart);
  const parentIndent = expandTabs(leadingWs(linePrefix));
  const before = value[selectionStart - 1];
  const after = value[selectionEnd];

  const openBracket = before === "{" || before === "[";
  const closeBracket = after === "}" || after === "]";
  const childIndent = openBracket ? parentIndent + INDENT : parentIndent;

  if (openBracket && closeBracket) {
    const insertion = `\n${childIndent}\n${parentIndent}`;
    const next =
      value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
    const cursor = selectionStart + 1 + childIndent.length;
    return { value: next, selectionStart: cursor, selectionEnd: cursor };
  }

  const insertion = `\n${childIndent}`;
  const next =
    value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
  const cursor = selectionStart + insertion.length;
  return { value: next, selectionStart: cursor, selectionEnd: cursor };
}
