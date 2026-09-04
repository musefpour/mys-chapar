import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { HttpRequestDraft } from "@shared/types";
import {
  generateSnippet,
  SNIPPET_TARGETS,
  type SnippetId,
} from "../../lib/codegen";
import { highlightCurlHtml } from "../../lib/highlight-curl";
import { escapeHtml } from "../../lib/highlight-json";
import { copyText } from "../../lib/share-request";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useT } from "../../i18n";

const LANG_KEY = "mychapar.code-snippet-lang";

function readLang(): SnippetId {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw && SNIPPET_TARGETS.some((t) => t.id === raw)) return raw as SnippetId;
  } catch {
    // ignore
  }
  return "curl";
}

interface CodePanelProps {
  request: HttpRequestDraft;
  onClose: () => void;
}

export function CodePanel({ request, onClose }: CodePanelProps) {
  const t = useT();
  const [lang, setLang] = useState<SnippetId>(readLang);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useFocusTrap(menuRef, pickerOpen);

  const selected = useMemo(
    () => SNIPPET_TARGETS.find((t) => t.id === lang) ?? SNIPPET_TARGETS[3],
    [lang],
  );

  const code = useMemo(() => {
    try {
      return generateSnippet(lang, request);
    } catch (error) {
      return `// ${t("code.generateFailed")}\n// ${error instanceof Error ? error.message : String(error)}`;
    }
  }, [lang, request, t]);

  const highlightedHtml = useMemo(() => {
    if (lang === "curl") return highlightCurlHtml(code);
    return escapeHtml(code);
  }, [code, lang]);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    if (!pickerOpen || !triggerRef.current) {
      setMenuPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const onCopy = async () => {
    const ok = await copyText(code);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <aside className="code-panel" aria-label={t("code.panel")}>
      <div className="code-panel-header">
        <div className="code-panel-title">
          <span className="code-panel-icon">&lt;/&gt;</span>
          <div>
            <strong>{t("code.title")}</strong>
            <small>{t("code.subtitle")}</small>
          </div>
        </div>
        <button type="button" className="ghost-btn" onClick={onClose} aria-label={t("code.close")}>
          ✕
        </button>
      </div>

      <div className="code-panel-toolbar">
        <button
          ref={triggerRef}
          type="button"
          className="code-lang-trigger"
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
        >
          <span>{selected.label}</span>
          <span className="code-lang-caret">▾</span>
        </button>
        <button
          type="button"
          className={copied ? "icon-btn compact copied" : "icon-btn compact"}
          onClick={() => void onCopy()}
          title={copied ? t("common.copied") : t("common.copy")}
          aria-label={copied ? t("common.copied") : t("common.copy")}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      <pre className={lang === "curl" ? "code-panel-pre curl-highlight" : "code-panel-pre"}>
        <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      </pre>

      {pickerOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="code-lang-menu"
            role="listbox"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          >
            {SNIPPET_TARGETS.map((target) => (
              <button
                key={target.id}
                type="button"
                role="option"
                aria-selected={target.id === lang}
                className={
                  target.id === lang ? "code-lang-option selected" : "code-lang-option"
                }
                onClick={() => {
                  setLang(target.id);
                  setPickerOpen(false);
                }}
              >
                <span className="code-lang-check" aria-hidden>
                  {target.id === lang ? "✓" : ""}
                </span>
                <span>{target.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </aside>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 012-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
