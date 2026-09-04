import { useMemo, useState } from "react";
import type { HttpRequestDraft, KeyValue } from "@shared/types";
import {
  extractUsedVariableNames,
  variablesToMap,
} from "../../lib/resolve-variables";
import { useLibraryStore } from "../../stores/library-store";
import { useT } from "../../i18n";

interface VariablesPanelProps {
  request: HttpRequestDraft;
  collectionId: string | null;
  onClose: () => void;
}

export function VariablesPanel({ request, collectionId, onClose }: VariablesPanelProps) {
  const t = useT();
  const [allOpen, setAllOpen] = useState(true);
  const collections = useLibraryStore((state) => state.collections);
  const activeCollectionId = useLibraryStore((state) => state.activeCollectionId);
  const setCollectionVariables = useLibraryStore((state) => state.setCollectionVariables);

  const resolvedCollectionId = collectionId ?? activeCollectionId;
  const collection =
    collections.find((item) => item.id === resolvedCollectionId) ?? null;
  const variables = collection?.variables ?? [];

  const usedNames = useMemo(() => extractUsedVariableNames(request), [request]);
  const valueMap = useMemo(() => variablesToMap(variables), [variables]);

  const usedRows = usedNames.map((name) => ({
    key: name,
    value: Object.prototype.hasOwnProperty.call(valueMap, name)
      ? valueMap[name]
      : undefined,
    resolved: Object.prototype.hasOwnProperty.call(valueMap, name),
  }));

  const definedVariables = variables.filter((item) => item.key.trim());

  const updateVariableValue = (id: string, value: string) => {
    if (!collection) return;
    const next = variables.map((item) =>
      item.id === id ? { ...item, value } : item,
    );
    setCollectionVariables(collection.id, next);
  };

  return (
    <aside className="code-panel variables-panel" aria-label={t("vars.panelTitle")}>
      <div className="code-panel-header">
        <div className="code-panel-title">
          <span className="code-panel-icon variables-panel-icon" aria-hidden>
            <VariablesGlyph />
          </span>
          <div>
            <strong>{t("vars.panelTitle")}</strong>
            <small>
              {usedRows.length === 0
                ? t("vars.noneUsed")
                : usedRows.length === 1
                  ? t("vars.usedOne", { count: usedRows.length })
                  : t("vars.usedMany", { count: usedRows.length })}
            </small>
          </div>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={onClose}
          aria-label={t("vars.closePanel")}
        >
          ✕
        </button>
      </div>

      <div className="variables-panel-body">
        {usedRows.length > 0 && (
          <section className="variables-section">
            <h3 className="variables-section-title">{t("vars.usedInRequest")}</h3>
            <div className="variables-table" role="table" aria-label={t("vars.usedTable")}>
              {usedRows.map((row) => (
                <div className="variables-row" role="row" key={row.key}>
                  <span className="variables-key" role="cell" title={`{{${row.key}}}`}>
                    {row.key}
                  </span>
                  <span
                    className={
                      row.resolved ? "variables-value" : "variables-value is-missing"
                    }
                    role="cell"
                    title={row.resolved ? row.value : t("vars.undefined")}
                  >
                    {row.resolved
                      ? row.value || "—"
                      : t("vars.undefined")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          type="button"
          className="variables-accordion-trigger"
          aria-expanded={allOpen}
          onClick={() => setAllOpen((v) => !v)}
        >
          <span className={allOpen ? "variables-caret open" : "variables-caret"}>▾</span>
          {t("vars.all")}
        </button>

        {allOpen && (
          <div className="variables-accordion">
            <section className="variables-block">
              <div className="variables-block-head">
                <span className="variables-badge env" aria-hidden>
                  E
                </span>
                <div>
                  <strong>{t("vars.environment")}</strong>
                  <p>
                    {t("vars.noEnvironment")}
                    <span className="variables-hint">{t("vars.laterUpdate")}</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="variables-block">
              <div className="variables-block-head">
                <span className="variables-badge collection" aria-hidden>
                  C
                </span>
                <div>
                  <strong>{t("vars.collection")}</strong>
                  <p>
                    {collection
                      ? collection.name
                      : t("vars.noCollection")}
                  </p>
                </div>
              </div>

              {collection && (
                <div
                  className="variables-table"
                  role="table"
                  aria-label={t("vars.collectionTable")}
                >
                  {definedVariables.length === 0 ? (
                    <p className="variables-empty">{t("vars.noneDefined")}</p>
                  ) : (
                    definedVariables.map((item) => (
                      <VariableEditableRow
                        key={item.id}
                        item={item}
                        onChange={(value) => updateVariableValue(item.id, value)}
                      />
                    ))
                  )}
                </div>
              )}
            </section>

            <section className="variables-block is-disabled" aria-disabled="true">
              <div className="variables-block-head">
                <span className="variables-badge vault" aria-hidden>
                  <VaultGlyph />
                </span>
                <div>
                  <strong>{t("vars.vault")}</strong>
                  <p>
                    {t("vars.vaultHelp")}
                    <span className="variables-hint">{t("vars.comingSoon")}</span>
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}

function VariableEditableRow({
  item,
  onChange,
}: {
  item: KeyValue;
  onChange: (value: string) => void;
}) {
  const t = useT();
  return (
    <div className="variables-row is-editable" role="row">
      <span
        className={item.enabled ? "variables-key" : "variables-key is-disabled"}
        role="cell"
        title={item.key}
      >
        {item.key}
      </span>
      <input
        className="variables-value-input"
        role="cell"
        value={item.value}
        disabled={!item.enabled}
        placeholder={t("vars.enterValue")}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${t("common.value")} ${item.key}`}
      />
    </div>
  );
}

function VariablesGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3.5" y="4.5" width="5.5" height="2.2" rx="0.6" />
      <rect x="3.5" y="10.9" width="5.5" height="2.2" rx="0.6" />
      <path
        d="M4.6 17.2 L8 20.6 M8 17.2 L4.6 20.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="12" y="4.5" width="8.5" height="2.2" rx="0.6" />
      <rect x="12" y="10.9" width="8.5" height="2.2" rx="0.6" />
      <rect x="12" y="17.6" width="8.5" height="2.2" rx="0.6" />
    </svg>
  );
}

function VaultGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 10h16v10H4z" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}
