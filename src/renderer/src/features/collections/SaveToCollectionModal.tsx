import { useEffect, useMemo, useRef, useState } from "react";
import type { Collection, HttpRequestDraft } from "@shared/types";
import { getCollectionFolders } from "../../stores/library-store";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { requestDisplayName } from "../../lib/request-display-name";
import { useT } from "../../i18n";

interface SaveToCollectionModalProps {
  open: boolean;
  request: HttpRequestDraft;
  collections: Collection[];
  activeCollectionId: string | null;
  onClose: () => void;
  onCreateCollection: (name: string) => string;
  onCreateFolder: (collectionId: string, name: string) => string;
  onSave: (
    collectionId: string,
    requestName: string,
    folderId: string | null,
  ) => void;
}

export function SaveToCollectionModal({
  open,
  request,
  collections,
  activeCollectionId,
  onClose,
  onCreateCollection,
  onCreateFolder,
  onSave,
}: SaveToCollectionModalProps) {
  const t = useT();
  const defaultName = useMemo(
    () => requestDisplayName(request.name, request.url),
    [request.name, request.url],
  );

  const [requestName, setRequestName] = useState(defaultName);
  const [collectionId, setCollectionId] = useState(activeCollectionId ?? "");
  const [folderId, setFolderId] = useState<string>("");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, { inertBackground: true });

  const filteredCollections = useMemo(() => {
    const q = collectionQuery.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((collection) => collection.name.toLowerCase().includes(q));
  }, [collections, collectionQuery]);

  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === collectionId) ?? null,
    [collections, collectionId],
  );

  const folders = useMemo(
    () => (selectedCollection ? getCollectionFolders(selectedCollection) : []),
    [selectedCollection],
  );

  useEffect(() => {
    if (!open) return;
    setRequestName(defaultName);
    setCollectionId(activeCollectionId ?? collections[0]?.id ?? "");
    setFolderId("");
    setCollectionQuery("");
    setNewCollectionName("");
    setNewFolderName("");
    setCreatingCollection(false);
    setCreatingFolder(false);
    setError(null);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, defaultName, activeCollectionId, collections, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!filteredCollections.length) {
      setCollectionId("");
      return;
    }
    if (!filteredCollections.some((collection) => collection.id === collectionId)) {
      setCollectionId(filteredCollections[0].id);
      setFolderId("");
    }
  }, [open, filteredCollections, collectionId]);

  if (!open) return null;

  const createCollectionAndSelect = () => {
    const name = newCollectionName.trim();
    if (!name) {
      setError(t("save.collectionNameRequired"));
      return;
    }
    const id = onCreateCollection(name);
    setCollectionId(id);
    setFolderId("");
    setCreatingCollection(false);
    setNewCollectionName("");
    setError(null);
  };

  const createFolderAndSelect = () => {
    if (!collectionId) {
      setError(t("save.selectCollectionFirst"));
      return;
    }
    const name = newFolderName.trim();
    if (!name) {
      setError(t("save.moduleNameRequired"));
      return;
    }
    const id = onCreateFolder(collectionId, name);
    setFolderId(id);
    setCreatingFolder(false);
    setNewFolderName("");
    setError(null);
  };

  const submit = () => {
    const name = requestName.trim();
    if (!name) {
      setError(t("save.requestNameRequired"));
      return;
    }
    if (!collectionId) {
      setError(t("save.selectCollection"));
      return;
    }
    onSave(collectionId, name, folderId || null);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-card save-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-collection-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="save-collection-title">{t("save.title")}</h2>
            <p>{t("save.subtitle")}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label={t("common.close")}>
            ✕
          </button>
        </div>

        <label className="field-label">
          {t("save.requestName")}
          <input
            className="modal-input"
            value={requestName}
            onChange={(event) => setRequestName(event.target.value)}
            placeholder={t("save.untitled")}
            autoFocus
          />
        </label>

        <div className="collection-picker">
          <div className="collection-picker-head">
            <span>{t("sidebar.collections")}</span>
            <button
              type="button"
              className="secondary-btn flat tiny"
              onClick={() => {
                setCreatingCollection((value) => !value);
                setError(null);
              }}
            >
              {creatingCollection ? t("save.cancelNew") : t("sidebar.newCollection")}
            </button>
          </div>

          <input
            className="modal-input"
            value={collectionQuery}
            onChange={(event) => setCollectionQuery(event.target.value)}
            placeholder={t("sidebar.searchCollections")}
          />

          {creatingCollection && (
            <div className="new-collection-row">
              <input
                className="modal-input"
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder={t("save.collectionName")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") createCollectionAndSelect();
                }}
              />
              <button type="button" className="primary-btn compact" onClick={createCollectionAndSelect}>
                {t("common.create")}
              </button>
            </div>
          )}

          <div className="collection-list">
            {!collections.length && (
              <p className="sidebar-empty">{t("save.noCollections")}</p>
            )}
            {!!collections.length && !filteredCollections.length && (
              <p className="sidebar-empty">{t("save.noMatchQuery", { query: collectionQuery.trim() })}</p>
            )}
            {filteredCollections.map((collection) => (
              <label
                key={collection.id}
                className={
                  collectionId === collection.id
                    ? "collection-option selected"
                    : "collection-option"
                }
              >
                <input
                  type="radio"
                  name="save-collection"
                  checked={collectionId === collection.id}
                  onChange={() => {
                    setCollectionId(collection.id);
                    setFolderId("");
                  }}
                />
                <span className="collection-option-text">
                  <strong>{collection.name}</strong>
                  <small>{t("save.modulesCount", { count: getCollectionFolders(collection).length })}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="collection-picker">
          <div className="collection-picker-head">
            <span>{t("save.moduleFolder")}</span>
            <button
              type="button"
              className="secondary-btn flat tiny"
              disabled={!collectionId}
              onClick={() => {
                setCreatingFolder((value) => !value);
                setError(null);
              }}
            >
              {creatingFolder ? t("common.cancel") : t("save.newModule")}
            </button>
          </div>

          {creatingFolder && (
            <div className="new-collection-row">
              <input
                className="modal-input"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder={t("save.moduleName")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") createFolderAndSelect();
                }}
              />
              <button type="button" className="primary-btn compact" onClick={createFolderAndSelect}>
                {t("common.create")}
              </button>
            </div>
          )}

          <select
            className="modal-input"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            disabled={!collectionId}
          >
            <option value="">Root of collection</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-btn flat" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="primary-btn" onClick={submit}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
