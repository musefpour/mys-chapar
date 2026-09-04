import { useEffect, useRef } from "react";
import { useT } from "../../i18n";
import { useFocusTrap } from "./useFocusTrap";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  extraLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onExtra?: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  extraLabel,
  danger = true,
  onClose,
  onConfirm,
  onExtra,
}: ConfirmModalProps) {
  const t = useT();
  const resolvedConfirm = confirmLabel ?? t("common.delete");
  const resolvedCancel = cancelLabel ?? t("common.cancel");
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, { inertBackground: true });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-card name-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="confirm-modal-title">{title}</h2>
            <p>{message}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label={t("common.close")}>
            ✕
          </button>
        </div>

        <div className="modal-actions">
          {extraLabel && (
            <button
              type="button"
              className="secondary-btn flat modal-action-start"
              onClick={() => {
                onExtra?.();
                onClose();
              }}
            >
              {extraLabel}
            </button>
          )}
          <button type="button" className="secondary-btn flat" onClick={onClose}>
            {resolvedCancel}
          </button>
          <button
            type="button"
            className={danger ? "danger-btn" : "primary-btn"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
