import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type {
  Collection,
  CollectionFolderNode,
  CollectionNode,
  CollectionRequestNode,
  HistoryEntry,
  HttpRequestDraft,
} from "@shared/types";
import {
  flattenCollectionRequests,
  useLibraryStore,
} from "../../stores/library-store";
import { useRequestStore, createDefaultRequest } from "../../stores/request-store";
import { copyText, requestToCurl } from "../../lib/share-request";
import { CollectionVariablesModal } from "../collections/CollectionVariablesModal";
import { CurlImportModal } from "../curl-import/CurlImportModal";
import { OpenApiImportModal } from "../openapi-import/OpenApiImportModal";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { NamePromptModal } from "../../shared/ui/NamePromptModal";
import { useFocusTrap } from "../../shared/ui/useFocusTrap";
import { useT } from "../../i18n";
import { useLocaleStore } from "../../stores/locale-store";
import { useUiStore } from "../../stores/ui-store";

function collectFolderIds(nodes: CollectionNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.type !== "folder") continue;
    ids.push(node.id);
    ids.push(...collectFolderIds(node.children));
  }
  return ids;
}

function CollectionsCubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.8L3.8 7.4v9.2L12 21.2l8.2-4.6V7.4L12 2.8z" />
      <path d="M12 21.2V12" />
      <path d="M3.8 7.4L12 12l8.2-4.6" />
    </svg>
  );
}

function HistoryClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7" />
      <path d="M3.5 4.8v4.2h4.2" />
      <path d="M12 8.2v4.3l3.1 1.9" />
    </svg>
  );
}

function ImportCurlIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M8 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
    </svg>
  );
}

function ImportSwaggerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7.5h16" />
      <path d="M4 12h16" />
      <path d="M4 16.5h10" />
      <path d="M17 14.5v5" />
      <path d="m15 17.5 2 2 2-2" />
    </svg>
  );
}

function FilterLinesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

type NamePrompt =
  | { kind: "new-collection" }
  | { kind: "new-module"; collectionId: string; parentFolderId?: string | null }
  | { kind: "rename-collection"; id: string; current: string }
  | { kind: "rename-folder"; collectionId: string; folderId: string; current: string }
  | { kind: "rename-request"; collectionId: string; requestId: string; current: string };

type ConfirmPrompt =
  | { kind: "delete-collection"; id: string; name: string }
  | { kind: "delete-folder"; collectionId: string; folderId: string; name: string }
  | { kind: "delete-request"; collectionId: string; requestId: string; name: string }
  | { kind: "clear-history" };

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, "") || parsed.host;
  } catch {
    return url;
  }
}

function methodClass(method: string): string {
  return `method-tag method-${method.toLowerCase()}`;
}

function formatTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale);
  } catch {
    return iso;
  }
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h6l2 2h10v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <path d="M3 7V5a2 2 0 012-2h4l2 2" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 120ms" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.8l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.6l1-6.1-4.4-4.3 6.1-.9L12 2.8z" />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.8l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.6l1-6.1-4.4-4.3 6.1-.9L12 2.8z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function useFixedMenu(open: boolean, buttonRef: RefObject<HTMLButtonElement | null>) {
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = 420;
      const gap = 4;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      );
      const openUp = rect.bottom + gap + menuHeight > window.innerHeight;
      const top = openUp ? Math.max(8, rect.top - menuHeight - gap) : rect.bottom + gap;
      setMenuPos({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, buttonRef]);

  return menuPos;
}

export function Sidebar() {
  const t = useT();
  const {
    sidebarTab,
    setSidebarTab,
    collections,
    activeCollectionId,
    setActiveCollectionId,
    createCollection,
    importCollection,
    renameCollection,
    toggleCollectionFavorite,
    duplicateCollection,
    sortCollectionChildren,
    deleteCollection,
    createFolder,
    renameFolder,
    deleteFolder,
    saveRequestToCollection,
    removeRequestNode,
    renameRequestNode,
    setCollectionVariables,
    history,
    clearHistory,
    removeHistoryEntry,
  } = useLibraryStore();

  const openRequestInTab = useRequestStore((state) => state.openRequestInTab);
  const importFromCurl = useRequestStore((state) => state.importFromCurl);
  const [variablesCollectionId, setVariablesCollectionId] = useState<string | null>(null);
  const [namePrompt, setNamePrompt] = useState<NamePrompt | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<ConfirmPrompt | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const curlOpen = useUiStore((state) => state.importDialog === "curl");
  const openapiOpen = useUiStore((state) => state.importDialog === "openapi");
  const setImportDialog = useUiStore((state) => state.setImportDialog);
  const pendingNewCollection = useUiStore((state) => state.pendingNewCollection);
  const clearPendingNewCollection = useUiStore((state) => state.clearPendingNewCollection);
  const variablesCollection =
    collections.find((collection) => collection.id === variablesCollectionId) ?? null;

  useEffect(() => {
    if (!pendingNewCollection) return;
    setNamePrompt({ kind: "new-collection" });
    clearPendingNewCollection();
  }, [pendingNewCollection, clearPendingNewCollection]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1400);
  };

  const namePromptConfig = (() => {
    if (!namePrompt) return null;
    switch (namePrompt.kind) {
      case "new-collection":
        return {
          title: t("sidebar.newCollectionTitle"),
          defaultValue: t("sidebar.newCollectionDefault"),
          confirmLabel: t("common.create"),
        };
      case "new-module":
        return {
          title: t("sidebar.newFolder"),
          defaultValue: t("sidebar.newFolder"),
          confirmLabel: t("common.create"),
        };
      case "rename-collection":
        return {
          title: t("sidebar.renameCollection"),
          defaultValue: namePrompt.current,
          confirmLabel: t("common.rename"),
        };
      case "rename-folder":
        return {
          title: t("sidebar.renameFolder"),
          defaultValue: namePrompt.current,
          confirmLabel: t("common.rename"),
        };
      case "rename-request":
        return {
          title: t("sidebar.renameRequest"),
          defaultValue: namePrompt.current,
          confirmLabel: t("common.rename"),
        };
    }
  })();

  const confirmConfig = (() => {
    if (!confirmPrompt) return null;
    switch (confirmPrompt.kind) {
      case "delete-collection":
        return {
          title: t("sidebar.deleteCollection"),
          message: t("sidebar.deleteCollectionMsg", { name: confirmPrompt.name }),
        };
      case "delete-folder":
        return {
          title: t("sidebar.deleteModule"),
          message: t("sidebar.deleteModuleMsg", { name: confirmPrompt.name }),
        };
      case "delete-request":
        return {
          title: t("sidebar.deleteRequest"),
          message: t("sidebar.deleteRequestMsg", { name: confirmPrompt.name }),
        };
      case "clear-history":
        return {
          title: t("sidebar.clearHistory"),
          message: t("sidebar.clearHistoryMsg"),
          confirmLabel: t("common.clear"),
        };
    }
  })();

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          type="button"
          className={sidebarTab === "collections" ? "sidebar-tab active" : "sidebar-tab"}
          onClick={() => setSidebarTab("collections")}
          title={t("sidebar.collections")}
          aria-label={t("sidebar.collections")}
          aria-pressed={sidebarTab === "collections"}
        >
          <CollectionsCubeIcon />
        </button>
        <button
          type="button"
          className={sidebarTab === "history" ? "sidebar-tab active" : "sidebar-tab"}
          onClick={() => setSidebarTab("history")}
          title={t("sidebar.history")}
          aria-label={t("sidebar.history")}
          aria-pressed={sidebarTab === "history"}
        >
          <HistoryClockIcon />
        </button>
      </div>

      {sidebarTab === "collections" ? (
        <CollectionsTreePanel
          collections={collections}
          activeCollectionId={activeCollectionId}
          onSelectCollection={setActiveCollectionId}
          onCreateCollection={() => setNamePrompt({ kind: "new-collection" })}
          onImportCurl={() => setImportDialog("curl")}
          onImportOpenApi={() => setImportDialog("openapi")}
          onDeleteCollection={(id, name) =>
            setConfirmPrompt({ kind: "delete-collection", id, name })
          }
          onEditVariables={(collectionId) => setVariablesCollectionId(collectionId)}
          onCreateFolder={(collectionId, parentFolderId) =>
            setNamePrompt({ kind: "new-module", collectionId, parentFolderId })
          }
          onAddRequest={(collectionId) => {
            const draft = createDefaultRequest();
            draft.name = "New request";
            draft.url = "{{baseUrl}}";
            const nodeId = saveRequestToCollection(collectionId, draft, { name: draft.name });
            openRequestInTab(draft, collectionId, { requestNodeId: nodeId });
            showToast(t("sidebar.requestAdded"));
          }}
          onRenameCollection={(id, current) =>
            setNamePrompt({ kind: "rename-collection", id, current })
          }
          onToggleFavorite={(id) => toggleCollectionFavorite(id)}
          onDuplicateCollection={(id) => {
            const nextId = duplicateCollection(id);
            if (nextId) showToast(t("sidebar.collectionDuplicated"));
          }}
          onSortCollection={(id) => {
            sortCollectionChildren(id, "asc");
            showToast(t("sidebar.sortedAz"));
          }}
          onShareCollection={async (id) => {
            const collection = collections.find((item) => item.id === id);
            if (!collection) return;
            const ok = await copyText(JSON.stringify(collection, null, 2));
            showToast(ok ? t("sidebar.jsonCopied") : t("common.copyFailed"));
          }}
          onCopyCollectionLink={async (id) => {
            const ok = await copyText(`mychapar://collection/${id}`);
            showToast(ok ? t("sidebar.linkCopied") : t("common.copyFailed"));
          }}
          onRenameFolder={(collectionId, folderId, current) =>
            setNamePrompt({ kind: "rename-folder", collectionId, folderId, current })
          }
          onDeleteFolder={(collectionId, folderId, name) =>
            setConfirmPrompt({ kind: "delete-folder", collectionId, folderId, name })
          }
          onOpenRequest={(node, collectionId) =>
            openRequestInTab(node.request, collectionId, {
              requestNodeId: node.id,
              response: node.lastResponse ?? null,
            })
          }
          onRenameRequest={(collectionId, requestId, current) =>
            setNamePrompt({ kind: "rename-request", collectionId, requestId, current })
          }
          onDeleteRequest={(collectionId, requestId, name) =>
            setConfirmPrompt({ kind: "delete-request", collectionId, requestId, name })
          }
        />
      ) : (
        <HistoryPanel
          history={history}
          onOpen={(entry) =>
            openRequestInTab(entry.request, null, {
              historyEntryId: entry.id,
              response: entry.savedResponse ?? null,
            })
          }
          onDelete={removeHistoryEntry}
          onClear={() => setConfirmPrompt({ kind: "clear-history" })}
        />
      )}

      <CollectionVariablesModal
        open={Boolean(variablesCollection)}
        collection={variablesCollection}
        onClose={() => setVariablesCollectionId(null)}
        onSave={setCollectionVariables}
      />

      <CurlImportModal
        open={curlOpen}
        onClose={() => setImportDialog(null)}
        onImport={(curl) => {
          const importError = importFromCurl(curl);
          if (!importError) showToast("cURL imported in new tab");
          return importError;
        }}
      />

      <OpenApiImportModal
        open={openapiOpen}
        onClose={() => setImportDialog(null)}
        onImport={(draft) => {
          try {
            importCollection({
              name: draft.name,
              variables: draft.variables,
              children: draft.children,
            });
            showToast(
              `Imported ${draft.stats.requests} requests in ${draft.stats.folders} modules`,
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : t("sidebar.importSaveFailed");
            throw new Error(message);
          }
        }}
      />

      <NamePromptModal
        open={Boolean(namePrompt && namePromptConfig)}
        title={namePromptConfig?.title ?? ""}
        defaultValue={namePromptConfig?.defaultValue ?? ""}
        confirmLabel={namePromptConfig?.confirmLabel ?? t("common.create")}
        onClose={() => setNamePrompt(null)}
        onConfirm={(value) => {
          if (!namePrompt) return;
          switch (namePrompt.kind) {
            case "new-collection":
              createCollection(value);
              break;
            case "new-module":
              createFolder(namePrompt.collectionId, value, namePrompt.parentFolderId ?? null);
              break;
            case "rename-collection":
              renameCollection(namePrompt.id, value);
              break;
            case "rename-folder":
              renameFolder(namePrompt.collectionId, namePrompt.folderId, value);
              break;
            case "rename-request":
              renameRequestNode(namePrompt.collectionId, namePrompt.requestId, value);
              break;
          }
        }}
      />

      <ConfirmModal
        open={Boolean(confirmPrompt && confirmConfig)}
        title={confirmConfig?.title ?? ""}
        message={confirmConfig?.message ?? ""}
        confirmLabel={confirmConfig && "confirmLabel" in confirmConfig ? confirmConfig.confirmLabel : t("common.delete")}
        onClose={() => setConfirmPrompt(null)}
        onConfirm={() => {
          if (!confirmPrompt) return;
          switch (confirmPrompt.kind) {
            case "delete-collection":
              deleteCollection(confirmPrompt.id);
              break;
            case "delete-folder":
              deleteFolder(confirmPrompt.collectionId, confirmPrompt.folderId);
              break;
            case "delete-request":
              removeRequestNode(confirmPrompt.collectionId, confirmPrompt.requestId);
              break;
            case "clear-history":
              clearHistory();
              break;
          }
        }}
      />

      {toast && <div className="sidebar-toast">{toast}</div>}
    </aside>
  );
}

interface CollectionsTreePanelProps {
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onCreateCollection: () => void;
  onImportCurl: () => void;
  onImportOpenApi: () => void;
  onDeleteCollection: (id: string, name: string) => void;
  onEditVariables: (collectionId: string) => void;
  onCreateFolder: (collectionId: string, parentFolderId?: string | null) => void;
  onAddRequest: (collectionId: string) => void;
  onRenameCollection: (id: string, current: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicateCollection: (id: string) => void;
  onSortCollection: (id: string) => void;
  onShareCollection: (id: string) => void;
  onCopyCollectionLink: (id: string) => void;
  onRenameFolder: (collectionId: string, folderId: string, current: string) => void;
  onDeleteFolder: (collectionId: string, folderId: string, name: string) => void;
  onOpenRequest: (node: CollectionRequestNode, collectionId: string) => void;
  onRenameRequest: (collectionId: string, requestId: string, current: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string, name: string) => void;
}

function CollectionsTreePanel({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onImportCurl,
  onImportOpenApi,
  onDeleteCollection,
  onEditVariables,
  onCreateFolder,
  onAddRequest,
  onRenameCollection,
  onToggleFavorite,
  onDuplicateCollection,
  onSortCollection,
  onShareCollection,
  onCopyCollectionLink,
  onRenameFolder,
  onDeleteFolder,
  onOpenRequest,
  onRenameRequest,
  onDeleteRequest,
}: CollectionsTreePanelProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Expand all collections by default
    setExpanded((prev) => {
      const next = { ...prev };
      for (const collection of collections) {
        if (next[collection.id] == null) next[collection.id] = true;
      }
      return next;
    });
  }, [collections]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filterNodes = (nodes: CollectionNode[]): CollectionNode[] => {
      const result: CollectionNode[] = [];
      for (const node of nodes) {
        if (node.type === "folder") {
          const children = filterNodes(node.children);
          if (node.name.toLowerCase().includes(q) || children.length) {
            result.push({ ...node, children });
          }
        } else if (
          node.name.toLowerCase().includes(q) ||
          node.request.url.toLowerCase().includes(q) ||
          node.request.method.toLowerCase().includes(q)
        ) {
          result.push(node);
        }
      }
      return result;
    };

    const list = !q
      ? [...collections]
      : (collections
          .map((collection) => {
            const children = filterNodes(collection.children);
            if (collection.name.toLowerCase().includes(q) || children.length) {
              return { ...collection, children };
            }
            return null;
          })
          .filter(Boolean) as Collection[]);

    return list.sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));
  }, [collections, query]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setFolderTreeExpanded = (folderIds: string[], open: boolean, alsoOpenId?: string) => {
    setExpanded((prev) => {
      const next = { ...prev };
      if (alsoOpenId) next[alsoOpenId] = true;
      for (const id of folderIds) next[id] = open;
      return next;
    });
  };

  return (
    <div className="sidebar-body tree-body">
      <div className="sidebar-toolbar">
        <span className="sidebar-count">
          {collections.length === 1
            ? t("workspace.collectionsOne", { count: collections.length })
            : t("workspace.collectionsMany", { count: collections.length })}
        </span>
        <div className="sidebar-toolbar-actions">
          <button
            type="button"
            className="icon-btn soft"
            title={t("sidebar.importSwagger")}
            aria-label={t("sidebar.importSwagger")}
            onClick={onImportOpenApi}
          >
            <ImportSwaggerIcon />
          </button>
          <button
            type="button"
            className="icon-btn soft"
            title={t("sidebar.importCurl")}
            aria-label={t("sidebar.importCurl")}
            onClick={onImportCurl}
          >
            <ImportCurlIcon />
          </button>
          <button type="button" className="icon-btn" title={t("sidebar.newCollection")} onClick={onCreateCollection}>
            +
          </button>
        </div>
      </div>

      <label className="sidebar-search-shell">
        <span className="sidebar-search-icon" aria-hidden="true">
          <FilterLinesIcon />
        </span>
        <input
          className="sidebar-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("sidebar.searchCollections")}
        />
      </label>

      <div className="sidebar-list tree-list">
        {!filtered.length && <p className="sidebar-empty">{t("sidebar.noMatch")}</p>}
        {filtered.map((collection) => {
          const open = expanded[collection.id] ?? true;
          const active = collection.id === activeCollectionId;
          return (
            <div key={collection.id} className="tree-collection">
              <CollectionRow
                collection={collection}
                active={active}
                expanded={open}
                onToggle={() => toggle(collection.id)}
                onSelect={() => {
                  onSelectCollection(collection.id);
                  setExpanded((prev) => ({ ...prev, [collection.id]: true }));
                }}
                onAddRequest={() => onAddRequest(collection.id)}
                onAddFolder={() => onCreateFolder(collection.id, null)}
                onEditVariables={() => onEditVariables(collection.id)}
                onExpandAllFolders={() =>
                  setFolderTreeExpanded(collectFolderIds(collection.children), true, collection.id)
                }
                onCollapseAllFolders={() =>
                  setFolderTreeExpanded(collectFolderIds(collection.children), false, collection.id)
                }
                onRename={() => onRenameCollection(collection.id, collection.name)}
                onToggleFavorite={() => onToggleFavorite(collection.id)}
                onDuplicate={() => onDuplicateCollection(collection.id)}
                onSort={() => onSortCollection(collection.id)}
                onShare={() => void onShareCollection(collection.id)}
                onCopyLink={() => void onCopyCollectionLink(collection.id)}
                onDelete={() => onDeleteCollection(collection.id, collection.name)}
              />

              {open && (
                <div className="tree-children">
                  {!collection.children.length && (
                    <p className="tree-empty">Empty — add a module or save a request.</p>
                  )}
                  {collection.children.map((node) => (
                    <TreeNode
                      key={node.id}
                      collectionId={collection.id}
                      node={node}
                      depth={1}
                      expanded={expanded}
                      onToggle={toggle}
                      onExpandFolderTree={(folder) =>
                        setFolderTreeExpanded(
                          [folder.id, ...collectFolderIds(folder.children)],
                          true,
                        )
                      }
                      onCollapseFolderTree={(folder) =>
                        setFolderTreeExpanded(collectFolderIds(folder.children), false, folder.id)
                      }
                      onCreateFolder={onCreateFolder}
                      onRenameFolder={onRenameFolder}
                      onDeleteFolder={onDeleteFolder}
                      onOpenRequest={onOpenRequest}
                      onRenameRequest={onRenameRequest}
                      onDeleteRequest={onDeleteRequest}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CollectionRow({
  collection,
  active,
  expanded,
  onToggle,
  onSelect,
  onAddRequest,
  onAddFolder,
  onEditVariables,
  onExpandAllFolders,
  onCollapseAllFolders,
  onRename,
  onToggleFavorite,
  onDuplicate,
  onSort,
  onShare,
  onCopyLink,
  onDelete,
}: {
  collection: Collection;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddRequest: () => void;
  onAddFolder: () => void;
  onEditVariables: () => void;
  onExpandAllFolders: () => void;
  onCollapseAllFolders: () => void;
  onRename: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onSort: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuPos = useFixedMenu(menuOpen, buttonRef);
  const favorited = Boolean(collection.favorite);
  useFocusTrap(menuRef, menuOpen);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <div className={menuOpen ? "tree-collection-row menu-open" : "tree-collection-row"}>
      <div className={active ? "tree-row collection active" : "tree-row collection"}>
        <button type="button" className="tree-toggle" onClick={onToggle}>
          <ChevronIcon open={expanded} />
        </button>
        <button type="button" className="tree-main" onClick={onSelect}>
          <span className="sidebar-item-text">
            <span className="tree-label">{collection.name}</span>
            <small>{flattenCollectionRequests(collection).length} requests</small>
          </span>
        </button>
        <div className={favorited ? "tree-actions has-favorite" : "tree-actions"}>
          <button
            type="button"
            className={favorited ? "ghost-btn star-btn is-on" : "ghost-btn star-btn"}
            title={favorited ? t("sidebar.favoriteRemove") : t("sidebar.favoriteAdd")}
            aria-label={favorited ? t("sidebar.favoriteRemove") : t("sidebar.favoriteAdd")}
            aria-pressed={favorited}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          >
            <StarIcon filled={favorited} />
          </button>
          <button
            ref={buttonRef}
            type="button"
            className="ghost-btn settings-btn"
            title={t("common.more")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <MoreIcon />
          </button>
        </div>
      </div>

      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="tree-menu collection-menu"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onAddRequest();
                close();
              }}
            >
              {t("sidebar.addRequest")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onAddFolder();
                close();
              }}
            >
              {t("sidebar.addFolder")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onEditVariables();
                close();
              }}
            >
              {t("sidebar.addVariable")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onExpandAllFolders();
                close();
              }}
            >
              {t("sidebar.expandFolders")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onCollapseAllFolders();
                close();
              }}
            >
              {t("sidebar.collapseFolders")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              disabled
              title={t("common.comingSoon", { label: t("sidebar.run") })}
            >
              {t("sidebar.run")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onShare();
                close();
              }}
            >
              {t("sidebar.share")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onCopyLink();
                close();
              }}
            >
              {t("sidebar.copyLink")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              disabled
              title={t("common.comingSoon", { label: t("sidebar.move") })}
            >
              {t("sidebar.move")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              disabled
              title={t("common.comingSoon", { label: t("sidebar.fork") })}
            >
              {t("sidebar.fork")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onRename();
                close();
              }}
            >
              {t("common.rename")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDuplicate();
                close();
              }}
            >
              {t("sidebar.duplicate")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onSort();
                close();
              }}
            >
              {t("sidebar.sort")}
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item-danger"
              onClick={() => {
                onDelete();
                close();
              }}
            >
              <TrashIcon />
              <span>{t("common.delete")}</span>
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              disabled
              title={t("common.comingSoon", { label: t("common.more") })}
            >
              {t("common.more")}
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

interface TreeNodeProps {
  collectionId: string;
  node: CollectionNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onExpandFolderTree: (folder: CollectionFolderNode) => void;
  onCollapseFolderTree: (folder: CollectionFolderNode) => void;
  onCreateFolder: (collectionId: string, parentFolderId?: string | null) => void;
  onRenameFolder: (collectionId: string, folderId: string, current: string) => void;
  onDeleteFolder: (collectionId: string, folderId: string, name: string) => void;
  onOpenRequest: (node: CollectionRequestNode, collectionId: string) => void;
  onRenameRequest: (collectionId: string, requestId: string, current: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string, name: string) => void;
}

function TreeNode({
  collectionId,
  node,
  depth,
  expanded,
  onToggle,
  onExpandFolderTree,
  onCollapseFolderTree,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenRequest,
  onRenameRequest,
  onDeleteRequest,
}: TreeNodeProps) {
  if (node.type === "folder") {
    return (
      <FolderRow
        collectionId={collectionId}
        folder={node}
        depth={depth}
        expanded={expanded}
        onToggle={onToggle}
        onExpandFolderTree={onExpandFolderTree}
        onCollapseFolderTree={onCollapseFolderTree}
        onCreateFolder={onCreateFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
        onOpenRequest={onOpenRequest}
        onRenameRequest={onRenameRequest}
        onDeleteRequest={onDeleteRequest}
      />
    );
  }

  return (
    <RequestRow
      collectionId={collectionId}
      node={node}
      depth={depth}
      onOpenRequest={onOpenRequest}
      onRenameRequest={onRenameRequest}
      onDeleteRequest={onDeleteRequest}
    />
  );
}

function FolderRow({
  collectionId,
  folder,
  depth,
  expanded,
  onToggle,
  onExpandFolderTree,
  onCollapseFolderTree,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenRequest,
  onRenameRequest,
  onDeleteRequest,
}: {
  collectionId: string;
  folder: CollectionFolderNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onExpandFolderTree: (folder: CollectionFolderNode) => void;
  onCollapseFolderTree: (folder: CollectionFolderNode) => void;
  onCreateFolder: (collectionId: string, parentFolderId?: string | null) => void;
  onRenameFolder: (collectionId: string, folderId: string, current: string) => void;
  onDeleteFolder: (collectionId: string, folderId: string, name: string) => void;
  onOpenRequest: (node: CollectionRequestNode, collectionId: string) => void;
  onRenameRequest: (collectionId: string, requestId: string, current: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string, name: string) => void;
}) {
  const t = useT();
  const open = expanded[folder.id] ?? true;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuPos = useFixedMenu(menuOpen, buttonRef);
  useFocusTrap(menuRef, menuOpen);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const hasNestedFolders = folder.children.some((child) => child.type === "folder");

  return (
    <div className={menuOpen ? "tree-folder menu-open" : "tree-folder"}>
      <div className="tree-row folder" style={{ paddingInlineStart: 8 + depth * 12 }}>
        <button type="button" className="tree-toggle" onClick={() => onToggle(folder.id)}>
          <ChevronIcon open={open} />
        </button>
        <button type="button" className="tree-main" onClick={() => onToggle(folder.id)}>
          <span className="folder-icon">
            <FolderIcon />
          </span>
          <span className="tree-label">{folder.name}</span>
        </button>
        <div className="tree-actions">
          <button
            type="button"
            className="ghost-btn"
            title={t("sidebar.addSubmodule")}
            onClick={() => onCreateFolder(collectionId, folder.id)}
          >
            +
          </button>
          <button
            type="button"
            className="ghost-btn"
            title={t("sidebar.renameModule")}
            onClick={() => onRenameFolder(collectionId, folder.id, folder.name)}
          >
            ✎
          </button>
          <button
            ref={buttonRef}
            type="button"
            className="ghost-btn settings-btn"
            title={t("common.more")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <MoreIcon />
          </button>
        </div>
      </div>
      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="tree-menu folder-menu"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              role="menuitem"
              disabled={!hasNestedFolders}
              onClick={() => {
                onExpandFolderTree(folder);
                close();
              }}
            >
              {t("sidebar.expandFolders")}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!hasNestedFolders}
              onClick={() => {
                onCollapseFolderTree(folder);
                close();
              }}
            >
              {t("sidebar.collapseFolders")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onRenameFolder(collectionId, folder.id, folder.name);
                close();
              }}
            >
              {t("common.rename")}
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item-danger"
              onClick={() => {
                onDeleteFolder(collectionId, folder.id, folder.name);
                close();
              }}
            >
              <TrashIcon />
              <span>{t("common.delete")}</span>
            </button>
          </div>,
          document.body,
        )}
      {open &&
        folder.children.map((child) => (
          <TreeNode
            key={child.id}
            collectionId={collectionId}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onExpandFolderTree={onExpandFolderTree}
            onCollapseFolderTree={onCollapseFolderTree}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onOpenRequest={onOpenRequest}
            onRenameRequest={onRenameRequest}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
    </div>
  );
}

function RequestRow({
  collectionId,
  node,
  depth,
  onOpenRequest,
  onRenameRequest,
  onDeleteRequest,
}: {
  collectionId: string;
  node: CollectionRequestNode;
  depth: number;
  onOpenRequest: (node: CollectionRequestNode, collectionId: string) => void;
  onRenameRequest: (collectionId: string, requestId: string, current: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string, name: string) => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(menuRef, menuOpen);

  useLayoutEffect(() => {
    if (!menuOpen || !buttonRef.current) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 220;
      const gap = 4;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      );
      const openUp = rect.bottom + gap + menuHeight > window.innerHeight;
      const top = openUp
        ? Math.max(8, rect.top - menuHeight - gap)
        : rect.bottom + gap;
      setMenuPos({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const share = async (mode: "curl" | "json") => {
    const text =
      mode === "curl"
        ? requestToCurl(node.request)
        : JSON.stringify(
            {
              name: node.name,
              request: node.request,
              sharedAt: new Date().toISOString(),
              source: "MYs Chapar",
            },
            null,
            2,
          );
    const ok = await copyText(text);
    setToast(ok ? (mode === "curl" ? t("sidebar.curlCopied") : t("sidebar.jsonItemCopied")) : t("common.copyFailed"));
    setMenuOpen(false);
    window.setTimeout(() => setToast(null), 1200);
  };

  return (
    <div className={menuOpen ? "tree-request-wrap menu-open" : "tree-request-wrap"}>
      <div className="tree-row request" style={{ paddingInlineStart: 8 + depth * 12 }}>
        <button
          type="button"
          className="tree-main request-main"
          onClick={() => onOpenRequest(node, collectionId)}
          title={node.request.url}
        >
          <span className={methodClass(node.request.method)}>{node.request.method}</span>
          <span className="sidebar-item-text">
            <span className="tree-label">{node.name}</span>
            <small>{shortUrl(node.request.url)}</small>
          </span>
        </button>
        <div className="tree-actions">
          <button
            ref={buttonRef}
            type="button"
            className="ghost-btn settings-btn"
            title={t("common.more")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <MoreIcon />
          </button>
        </div>
      </div>
      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="tree-menu"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => onOpenRequest(node, collectionId)}
            >
              {t("common.open")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onRenameRequest(collectionId, node.id, node.name);
                setMenuOpen(false);
              }}
            >
              {t("common.rename")}
            </button>
            <div className="menu-sep" />
            <button type="button" role="menuitem" onClick={() => void share("curl")}>
              {t("sidebar.shareCurl")}
            </button>
            <button type="button" role="menuitem" onClick={() => void share("json")}>
              {t("sidebar.shareJson")}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              className="menu-item-danger"
              onClick={() => {
                onDeleteRequest(collectionId, node.id, node.name);
                setMenuOpen(false);
              }}
            >
              <TrashIcon />
              <span>{t("common.delete")}</span>
            </button>
          </div>,
          document.body,
        )}
      {toast && <div className="tree-toast">{toast}</div>}
    </div>
  );
}

function HistoryPanel({
  history,
  onOpen,
  onDelete,
  onClear,
}: {
  history: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const t = useT();
  const locale = useLocaleStore((state) => state.locale);
  return (
    <div className="sidebar-body">
      <div className="sidebar-toolbar">
        <span className="sidebar-count">{t("sidebar.historyEntries", { count: history.length })}</span>
        <button
          type="button"
          className="secondary-btn flat tiny"
          disabled={!history.length}
          onClick={() => onClear()}
        >
          {t("common.clear")}
        </button>
      </div>

      <div className="sidebar-list">
        {!history.length && <p className="sidebar-empty">{t("sidebar.historyEmpty")}</p>}
        {history.map((entry) => (
          <div key={entry.id} className="sidebar-item">
            <button
              type="button"
              className="sidebar-item-main"
              onClick={() => onOpen(entry)}
              title={entry.request.url}
            >
              <span className={methodClass(entry.request.method)}>{entry.request.method}</span>
              <span className="sidebar-item-text">
                <strong>{shortUrl(entry.request.url)}</strong>
                <small>
                  {entry.response
                    ? `${entry.response.status} · ${entry.response.timeMs} ms`
                    : entry.error || t("common.failed")}
                  {" · "}
                  {formatTime(entry.createdAt, locale)}
                </small>
              </span>
            </button>
            <button type="button" className="ghost-btn" title={t("sidebar.remove")} onClick={() => onDelete(entry.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
