import { useLayoutEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { FormDataItem } from "@shared/types";
import { fileToBase64, getDesktopFilePath } from "../../lib/file-payload";
import { useT } from "../../i18n";

interface FormDataEditorProps {
  items: FormDataItem[];
  onChange: (items: FormDataItem[]) => void;
}

function emptyItem(): FormDataItem {
  return {
    id: nanoid(8),
    key: "",
    value: "",
    enabled: true,
    type: "text",
  };
}

function isBlank(item: FormDataItem): boolean {
  if (item.key.trim()) return false;
  if (item.type === "file") {
    return !item.fileName && !item.filePath && !item.fileBase64 && !item.value.trim();
  }
  return !item.value.trim();
}

function normalizeRows(items: FormDataItem[]): FormDataItem[] {
  const filled = items.filter((item) => !isBlank(item));
  const last = items[items.length - 1];
  if (last && isBlank(last)) {
    return [...filled, last];
  }
  return [...filled, emptyItem()];
}

function sameRows(a: FormDataItem[], b: FormDataItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, index) => {
    const other = b[index];
    return (
      row.id === other.id &&
      row.key === other.key &&
      row.value === other.value &&
      row.enabled === other.enabled &&
      row.type === other.type &&
      row.fileName === other.fileName &&
      row.filePath === other.filePath &&
      row.fileBase64 === other.fileBase64
    );
  });
}

function DragHandleIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
      <circle cx="3" cy="3" r="1.2" fill="currentColor" />
      <circle cx="7" cy="3" r="1.2" fill="currentColor" />
      <circle cx="3" cy="8" r="1.2" fill="currentColor" />
      <circle cx="7" cy="8" r="1.2" fill="currentColor" />
      <circle cx="3" cy="13" r="1.2" fill="currentColor" />
      <circle cx="7" cy="13" r="1.2" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function FormDataEditor({ items, onChange }: FormDataEditorProps) {
  const t = useT();
  const dragFrom = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const normalized = normalizeRows(items);
    if (!sameRows(items, normalized)) {
      onChange(normalized);
    }
  }, [items, onChange]);

  const commit = (next: FormDataItem[]) => {
    onChange(normalizeRows(next));
  };

  const update = (id: string, patch: Partial<FormDataItem>) => {
    commit(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const remove = (id: string) => {
    commit(items.filter((item) => item.id !== id));
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
      return;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  return (
    <div className="kv-table-wrap">
      <table className="kv-table formdata-table">
        <thead>
          <tr>
            <th className="kv-col-handle" />
            <th className="kv-col-check" />
            <th className="kv-col-key">{t("common.key")}</th>
            <th className="kv-col-type">{t("common.type")}</th>
            <th className="kv-col-value">{t("common.value")}</th>
            <th className="kv-col-actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const blank = isBlank(item);
            return (
              <tr
                key={item.id}
                className={[
                  "kv-table-row",
                  dragOverIndex === index ? "drag-over" : "",
                  blank ? "is-blank" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragFrom.current != null) {
                    reorder(dragFrom.current, index);
                  }
                  dragFrom.current = null;
                  setDragOverIndex(null);
                }}
                onDragLeave={() => {
                  setDragOverIndex((current) => (current === index ? null : current));
                }}
              >
                <td className="kv-col-handle">
                  <button
                    type="button"
                    className="kv-drag-handle"
                    draggable
                    title={t("request.dragReorder")}
                    aria-label={t("request.dragReorder")}
                    onDragStart={() => {
                      dragFrom.current = index;
                    }}
                    onDragEnd={() => {
                      dragFrom.current = null;
                      setDragOverIndex(null);
                    }}
                  >
                    <DragHandleIcon />
                  </button>
                </td>
                <td className="kv-col-check">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) => update(item.id, { enabled: event.target.checked })}
                    aria-label={t("request.includeRow", { key: item.key || "row" })}
                  />
                </td>
                <td className="kv-col-key">
                  <input
                    className="kv-cell-input"
                    value={item.key}
                    placeholder={t("common.key")}
                    onChange={(event) => update(item.id, { key: event.target.value })}
                  />
                </td>
                <td className="kv-col-type">
                  <select
                    className="kv-cell-select"
                    value={item.type}
                    aria-label={t("common.type")}
                    onChange={(event) =>
                      update(item.id, {
                        type: event.target.value as FormDataItem["type"],
                        value: "",
                        fileName: undefined,
                        filePath: undefined,
                        fileBase64: undefined,
                      })
                    }
                  >
                    <option value="text">{t("request.formText")}</option>
                    <option value="file">{t("request.formFile")}</option>
                  </select>
                </td>
                <td className="kv-col-value">
                  {item.type === "text" ? (
                    <input
                      className="kv-cell-input"
                      value={item.value}
                      placeholder={t("common.value")}
                      onChange={(event) => update(item.id, { value: event.target.value })}
                    />
                  ) : (
                    <label className="kv-file-picker">
                      <span>{item.fileName || t("request.selectFile")}</span>
                      <input
                        type="file"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const path = getDesktopFilePath(file);
                          const fileBase64 = path ? undefined : await fileToBase64(file);
                          update(item.id, {
                            fileName: file.name,
                            filePath: path,
                            fileBase64,
                            value: file.name,
                          });
                        }}
                      />
                    </label>
                  )}
                </td>
                <td className="kv-col-actions">
                  {!blank && (
                    <button
                      type="button"
                      className="kv-delete-btn"
                      title={t("request.deleteRow")}
                      aria-label={t("request.deleteRow")}
                      onClick={() => remove(item.id)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
