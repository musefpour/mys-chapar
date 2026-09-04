import { useEffect, useRef } from "react";
import logoUrl from "../../assets/logo.png";
import { APP_VERSION } from "@shared/app-version";
import { useT } from "../../i18n";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useUiStore } from "../../stores/ui-store";

export function AboutModal() {
  const t = useT();
  const open = useUiStore((state) => state.aboutOpen);
  const setAboutOpen = useUiStore((state) => state.setAboutOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, { inertBackground: true });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAboutOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setAboutOpen]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => setAboutOpen(false)}>
      <div
        ref={dialogRef}
        className="modal-card about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="ghost-btn about-close"
          onClick={() => setAboutOpen(false)}
          aria-label={t("common.close")}
        >
          ✕
        </button>
        <img className="about-logo" src={logoUrl} alt="" width={96} height={96} />
        <h2 id="about-title">{t("about.title")}</h2>
        <p className="about-version">{t("about.version", { version: APP_VERSION })}</p>
        <p className="about-description">{t("about.description")}</p>
        <p className="about-creator">{t("about.creator")}</p>
      </div>
    </div>
  );
}
