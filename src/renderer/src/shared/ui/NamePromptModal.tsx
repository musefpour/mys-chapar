import { useEffect, useRef, useState } from "react";
import { useT } from "../../i18n";
import { useFocusTrap } from "./useFocusTrap";

export interface NamePromptState {
  title: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}

interface NamePromptModalProps {
  open: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

export function NamePromptModal({
  open,
  title,
  label,
  defaultValue = "",
  confirmLabel,
  onClose,
  onConfirm,
}: NamePromptModalProps) {
  const t = useT();
  const resolvedLabel = label ?? t("common.name");
  const resolvedConfirm = confirmLabel ?? t("common.create");
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, { inertBackground: true });

  useEffect(() => {
    if (!open) return;
    setValue(defaultValue);
    setError(null);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, defaultValue, onClose]);

  if (!open) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t("name.required"));
      return;
    }
    onConfirm(trimmed);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-card name-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="name-prompt-title">{title}</h2>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label={t("common.close")}>
            ✕
          </button>
        </div>

        <label className="field-label">
          {resolvedLabel}
          <input
            ref={inputRef}
            className="modal-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder={defaultValue || t("common.name")}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-btn flat" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="primary-btn" onClick={submit}>
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
