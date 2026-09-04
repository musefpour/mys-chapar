import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { handleCodeEditorKey } from "../../lib/code-editor-keys";
import { highlightJsonHtml } from "../../lib/highlight-json";
import { JsonTree, tryParseJsonValue } from "../../shared/ui/JsonTree";
import { useT } from "../../i18n";

interface RawBodyEditorProps {
  value: string;
  language: "json" | "text" | "xml" | "html" | "javascript";
  onChange: (value: string) => void;
  error?: string | null;
  compact?: boolean;
}

export function RawBodyEditor({ value, language, onChange, error, compact = false }: RawBodyEditorProps) {
  const t = useT();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const [treeView, setTreeView] = useState(false);

  const canTree = language === "json" || language === "javascript";
  const parsed = useMemo(() => (canTree ? tryParseJsonValue(value) : null), [canTree, value]);
  const treeReady = parsed !== null && typeof parsed === "object";

  useEffect(() => {
    if (!treeReady && treeView) setTreeView(false);
  }, [treeReady, treeView]);

  const highlighted = useMemo(() => {
    return highlightJsonHtml(value || "");
  }, [value]);

  const syncScroll = () => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  };

  useEffect(() => {
    syncScroll();
  }, [value]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    const pending = pendingSelection.current;
    if (!el || !pending) return;
    el.setSelectionRange(pending.start, pending.end);
    pendingSelection.current = null;
  }, [value]);

  return (
    <div className={compact ? "raw-body-wrap compact" : "raw-body-wrap"}>
      <div className="raw-body-tools">
        {error ? <span className="raw-error">{error}</span> : <span />}
        {canTree ? (
          <button
            type="button"
            className={treeView ? "raw-view-btn active" : "raw-view-btn"}
            disabled={!treeReady}
            title={
              treeReady
                ? treeView
                  ? t("request.editJson")
                  : t("request.treeJson")
                : t("request.treeJsonHint")
            }
            onClick={() => setTreeView((v) => !v)}
          >
            {treeView ? t("request.editJson") : t("request.treeJson")}
          </button>
        ) : null}
      </div>

      {treeView && treeReady ? (
        <JsonTree
          value={parsed}
          toolbar
          expandLabel={t("response.expandAll")}
          collapseLabel={t("response.collapseAll")}
        />
      ) : (
        <div className="raw-code-shell">
          <pre
            ref={highlightRef}
            className="raw-code-highlight"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
          />
          <textarea
            ref={textareaRef}
            className="raw-code-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            onKeyDown={(event) => {
              const el = event.currentTarget;
              const result = handleCodeEditorKey(
                event,
                value,
                el.selectionStart,
                el.selectionEnd,
              );
              if (!result) return;
              pendingSelection.current = {
                start: result.selectionStart,
                end: result.selectionEnd,
              };
              onChange(result.value);
            }}
          />
        </div>
      )}
    </div>
  );
}
