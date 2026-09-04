import { useEffect, useRef } from "react";
import { useT } from "../../i18n";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";

interface UpdateRequiredModalProps {
  open: boolean;
  force: boolean;
  remoteVersion: string;
  localVersion: string;
  onClose: () => void;
}

export function UpdateRequiredModal({
  open,
  force,
  remoteVersion,
  localVersion,
  onClose,
}: UpdateRequiredModalProps) {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, { inertBackground: true });

  useEffect(() => {
    if (!open || force) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, force, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop update-required-backdrop"
      role="presentation"
      onClick={force ? undefined : onClose}
    >
      <div
        ref={dialogRef}
        className="modal-card name-prompt-modal update-required-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="update-required-title"
        aria-describedby="update-required-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="update-required-title">{t("update.requiredTitle")}</h2>
            <p id="update-required-message">
              {t("update.requiredMessage", {
                current: localVersion,
                latest: remoteVersion,
              })}
            </p>
          </div>
          {!force ? (
            <button
              type="button"
              className="ghost-btn"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              ✕
            </button>
          ) : null}
        </div>

        {!force ? (
          <div className="modal-actions">
            <button type="button" className="secondary-btn flat" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        ) : (
          <p className="update-required-force-hint">{t("update.forceHint")}</p>
        )}
      </div>
    </div>
  );
}
