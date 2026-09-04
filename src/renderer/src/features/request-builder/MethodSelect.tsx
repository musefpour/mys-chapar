import { useEffect, useRef, useState } from "react";
import type { HttpMethod } from "@shared/types";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useT } from "../../i18n";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

interface MethodSelectProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export function MethodSelect({ value, onChange }: MethodSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, open);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="method-select-wrap" ref={rootRef}>
      <button
        type="button"
        className={`method-select method-${value.toLowerCase()}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value}</span>
        <span className="method-select-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul className="method-menu" role="listbox" aria-label={t("request.httpMethod")}>
          {METHODS.map((method) => (
            <li key={method} role="option" aria-selected={method === value}>
              <button
                type="button"
                className={`method-menu-item method-${method.toLowerCase()}${
                  method === value ? " is-active" : ""
                }`}
                onClick={() => {
                  onChange(method);
                  setOpen(false);
                }}
              >
                {method}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
