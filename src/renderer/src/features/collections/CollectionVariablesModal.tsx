import { useEffect, useRef, useState } from "react";
import type { Collection, KeyValue } from "@shared/types";
import { KeyValueEditor } from "../../shared/ui/KeyValueEditor";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useT } from "../../i18n";

interface CollectionVariablesModalProps {
  open: boolean;
  collection: Collection | null;
  onClose: () => void;
  onSave: (collectionId: string, variables: KeyValue[]) => void;
}

export function CollectionVariablesModal({
  open,
  collection,
  onClose,
  onSave,
}: CollectionVariablesModalProps) {
  const t = useT();
  const [variables, setVariables] = useState<KeyValue[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open && Boolean(collection), { inertBackground: true });

  useEffect(() => {
    if (!open || !collection) return;
    setVariables(structuredClone(collection.variables ?? []));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, collection, onClose]);

  if (!open || !collection) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-card save-modal variables-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-variables-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="collection-variables-title">{t("vars.title", { name: collection.name })}</h2>
            <p>{t("vars.help")}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label={t("common.close")}>
            ✕
          </button>
        </div>

        <div className="variables-modal-body">
          <KeyValueEditor
            items={variables}
            onChange={setVariables}
            keyPlaceholder={t("common.variable")}
            valuePlaceholder={t("common.value")}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-btn flat" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              onSave(collection.id, variables);
              onClose();
            }}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
