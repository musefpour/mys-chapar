import { useEffect, useRef, useState } from "react";
import { LOCALES, useT, type MessageKey } from "../../i18n";
import { useLocaleStore } from "../../stores/locale-store";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.8 3.8 6 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-6-3.8-9s1.3-6.2 3.8-9z" />
    </svg>
  );
}

export function LanguageMenu() {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, open);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="titlebar-menu language-menu" ref={rootRef}>
      <button
        type="button"
        className={open ? "header-icon-btn active" : "header-icon-btn"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language.choose")}
        title={t("language")}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon />
      </button>
      {open && (
        <div className="titlebar-menu-dropdown language-menu-dropdown" role="menu">
          {LOCALES.map((item) => {
            const selected = item.id === locale;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={selected ? "titlebar-menu-item selected" : "titlebar-menu-item"}
                onClick={() => {
                  setLocale(item.id);
                  setOpen(false);
                }}
              >
                <span className="titlebar-menu-item-label">{item.nativeName}</span>
                <span className="titlebar-menu-item-meta">{t(`lang.${item.id}` as MessageKey)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
