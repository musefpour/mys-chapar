import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useT } from "../../i18n";

interface CurlImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (curl: string) => string | null;
}

const SAMPLE = `curl --request POST 'https://httpbin.org/post' \\
  --header 'Content-Type: application/json' \\
  --header 'Accept: application/json' \\
  --data-raw '{"hello":"MYs Chapar"}'`;

export function CurlImportModal({ open, onClose, onImport }: CurlImportModalProps) {
  const t = useT();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  useFocusTrap(dialogRef, open, { inertBackground: true });

  const submit = () => {
    const trimmed = valueRef.current.trim();
    if (!trimmed) {
      setError(t("curl.pasteFirst"));
      return;
    }
    const resultError = onImport(trimmed);
    if (resultError) {
      setError(resultError);
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValue("");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
    // submit reads latest value via valueRef; onImport/onClose are stable enough for modal lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, onImport]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-card curl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="curl-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="curl-import-title">{t("curl.title")}</h2>
            <p>{t("curl.help")}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label={t("common.close")}>
            ✕
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className="curl-input"
          value={value}
          onChange={(event) => {
            setError(null);
            setValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.stopPropagation();
              submit();
            }
          }}
          spellCheck={false}
          placeholder={SAMPLE}
        />

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn flat"
            onClick={() => {
              setValue(SAMPLE);
              setError(null);
            }}
          >
            {t("openapi.insertSample")}
          </button>
          <div className="modal-actions-right">
            <button type="button" className="secondary-btn flat" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={submit}
              title={t("openapi.shortcut")}
            >
              {t("curl.import")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
