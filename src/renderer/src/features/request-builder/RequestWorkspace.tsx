import { useCallback, useEffect, useRef, useState } from "react";
import { useLibraryStore } from "../../stores/library-store";
import {
  isTabSaved,
  useActiveRequestTab,
  useRequestStore,
} from "../../stores/request-store";
import { KeyValueEditor } from "../../shared/ui/KeyValueEditor";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { ResponseViewer } from "../response-viewer/ResponseViewer";
import { SaveToCollectionModal } from "../collections/SaveToCollectionModal";
import { BodyEditor } from "./BodyEditor";
import { MethodSelect } from "./MethodSelect";
import { RequestTabsBar } from "./RequestTabsBar";
import { BottomPanel } from "../bottom-panel/BottomPanel";
import { useUiStore, BOTTOM_MIN_RATIO, BOTTOM_MAX_RATIO } from "../../stores/ui-store";
import { registerCloseTabHandler, registerFocusUrlHandler } from "../app-menu/menu-bridge";
import {
  DEFAULT_REQUEST_NAME,
  isAutoRequestName,
  requestDisplayName,
} from "../../lib/request-display-name";
import { useT } from "../../i18n";

const SPLIT_KEY = "mychapar.request-response-split";
const MIN_RATIO = 0.22;
const MAX_RATIO = 0.78;

type EditorTab = "params" | "headers" | "body";

function readSplitRatio(): number {
  try {
    const raw = localStorage.getItem(SPLIT_KEY);
    const value = raw ? Number(raw) : 0.55;
    if (Number.isFinite(value) && value >= MIN_RATIO && value <= MAX_RATIO) {
      return value;
    }
  } catch {
    // ignore
  }
  return 0.55;
}

export function RequestWorkspace() {
  const t = useT();
  const [editorTab, setEditorTab] = useState<EditorTab>("params");
  const [saveOpen, setSaveOpen] = useState(false);
  const [unsavedTabId, setUnsavedTabId] = useState<string | null>(null);
  const closeQueueRef = useRef<string[]>([]);
  const unsavedHandledRef = useRef(false);
  const saveForCloseRef = useRef(false);
  const unsavedTabIdRef = useRef<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [requestRatio, setRequestRatio] = useState(readSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const bottomPanelOpen = useUiStore((state) => state.bottomPanelOpen);
  const bottomPanelRatio = useUiStore((state) => state.bottomPanelRatio);
  const setBottomPanelRatio = useUiStore((state) => state.setBottomPanelRatio);
  const twoPane = useUiStore((state) => state.twoPane);

  const active = useActiveRequestTab();
  const { request, response, error, isSending } = active;

  const setMethod = useRequestStore((state) => state.setMethod);
  const setUrl = useRequestStore((state) => state.setUrl);
  const setName = useRequestStore((state) => state.setName);
  const setParams = useRequestStore((state) => state.setParams);
  const setHeaders = useRequestStore((state) => state.setHeaders);
  const setBodyMode = useRequestStore((state) => state.setBodyMode);
  const setRawBody = useRequestStore((state) => state.setRawBody);
  const setRawLanguage = useRequestStore((state) => state.setRawLanguage);
  const setUrlencoded = useRequestStore((state) => state.setUrlencoded);
  const setFormdata = useRequestStore((state) => state.setFormdata);
  const setBinary = useRequestStore((state) => state.setBinary);
  const setGraphqlQuery = useRequestStore((state) => state.setGraphqlQuery);
  const setGraphqlVariables = useRequestStore((state) => state.setGraphqlVariables);
  const send = useRequestStore((state) => state.send);
  const cancel = useRequestStore((state) => state.cancel);

  const collections = useLibraryStore((state) => state.collections);
  const activeCollectionId = useLibraryStore((state) => state.activeCollectionId);
  const saveRequestToCollection = useLibraryStore((state) => state.saveRequestToCollection);
  const saveResponseToHistory = useLibraryStore((state) => state.saveResponseToHistory);
  const createCollection = useLibraryStore((state) => state.createCollection);
  const createFolder = useLibraryStore((state) => state.createFolder);
  const setSidebarTab = useLibraryStore((state) => state.setSidebarTab);
  const showToast = useUiStore((state) => state.showToast);
  const setTabCollectionId = useRequestStore((state) => state.setTabCollectionId);
  const setTabHistoryEntryId = useRequestStore((state) => state.setTabHistoryEntryId);
  const closeTab = useRequestStore((state) => state.closeTab);
  const tabs = useRequestStore((state) => state.tabs);
  const activeTabId = useRequestStore((state) => state.activeTabId);
  const unsavedTab = unsavedTabId
    ? (tabs.find((tab) => tab.id === unsavedTabId) ?? null)
    : null;

  const updateRatioFromClient = useCallback((clientX: number, clientY: number) => {
    const root = splitRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    if (twoPane) {
      if (rect.width <= 0) return;
      const next = (clientX - rect.left) / rect.width;
      setRequestRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
      return;
    }
    if (rect.height <= 0) return;
    const next = (clientY - rect.top) / rect.height;
    setRequestRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
  }, [twoPane]);

  const updateBottomRatioFromClientY = useCallback((clientY: number) => {
    const root = outerRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    if (rect.height <= 0) return;
    const next = (rect.bottom - clientY) / rect.height;
    setBottomPanelRatio(next);
  }, [setBottomPanelRatio]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      updateRatioFromClient(event.clientX, event.clientY);
    };

    const onUp = () => setIsDragging(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.classList.add("is-resizing-split");

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.classList.remove("is-resizing-split");
    };
  }, [isDragging, updateRatioFromClient]);

  useEffect(() => {
    if (!isDraggingBottom) return;

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      updateBottomRatioFromClientY(event.clientY);
    };

    const onUp = () => setIsDraggingBottom(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.classList.add("is-resizing-split");

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.classList.remove("is-resizing-split");
    };
  }, [isDraggingBottom, updateBottomRatioFromClientY]);

  useEffect(() => {
    if (isDragging) return;
    try {
      localStorage.setItem(SPLIT_KEY, String(requestRatio));
    } catch {
      // ignore
    }
  }, [requestRatio, isDragging]);

  const processCloseQueue = useCallback(() => {
    if (unsavedTabIdRef.current || saveForCloseRef.current) return;
    const store = useRequestStore.getState();
    while (closeQueueRef.current.length) {
      const id = closeQueueRef.current[0];
      const tab = store.tabs.find((item) => item.id === id);
      if (!tab) {
        closeQueueRef.current.shift();
        continue;
      }
      if (isTabSaved(tab)) {
        closeQueueRef.current.shift();
        store.closeTab(id);
        continue;
      }
      unsavedHandledRef.current = false;
      store.setActiveTab(id);
      unsavedTabIdRef.current = id;
      setUnsavedTabId(id);
      return;
    }
  }, []);

  const enqueueClose = useCallback(
    (tabIds: string[]) => {
      const queued = new Set(closeQueueRef.current);
      for (const id of tabIds) {
        if (!queued.has(id)) {
          closeQueueRef.current.push(id);
          queued.add(id);
        }
      }
      processCloseQueue();
    },
    [processCloseQueue],
  );

  const closeActiveTab = useCallback(() => {
    if (unsavedTabIdRef.current || saveForCloseRef.current || saveOpen) return;
    enqueueClose([useRequestStore.getState().activeTabId]);
  }, [enqueueClose, saveOpen]);

  const forceCloseActiveTab = useCallback(() => {
    const id = useRequestStore.getState().activeTabId;
    closeQueueRef.current = closeQueueRef.current.filter((item) => item !== id);
    unsavedTabIdRef.current = null;
    setUnsavedTabId(null);
    closeTab(id);
  }, [closeTab]);

  unsavedTabIdRef.current = unsavedTabId;

  useEffect(() => {
    if (unsavedTabId || saveOpen) return;
    processCloseQueue();
  }, [unsavedTabId, saveOpen, tabs, processCloseQueue]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      if (isSending) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[role='dialog'], .modal-root, .modal-overlay")) return;

      event.preventDefault();
      void send();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSending, send]);

  useEffect(() => {
    return registerCloseTabHandler((force) => {
      if (force) forceCloseActiveTab();
      else closeActiveTab();
    });
  }, [closeActiveTab, forceCloseActiveTab]);

  useEffect(() => {
    return registerFocusUrlHandler(() => {
      const input = urlInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    });
  }, []);

  useEffect(() => {
    const unsub = window.mychapar?.onCloseActiveTab?.(closeActiveTab);
    if (unsub) return unsub;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "w" || key === "f4") {
        event.preventDefault();
        closeActiveTab();
        return;
      }
      if (key === "l") {
        event.preventDefault();
        const input = urlInputRef.current;
        if (!input) return;
        input.focus();
        input.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeActiveTab]);

  return (
    <div className="workspace-shell">
      <RequestTabsBar
        onCloseTab={(tabId) => enqueueClose([tabId])}
        onCloseOtherTabs={(tabId) =>
          enqueueClose(
            useRequestStore.getState().tabs.filter((tab) => tab.id !== tabId).map((tab) => tab.id),
          )
        }
        onCloseAllTabs={() =>
          enqueueClose(useRequestStore.getState().tabs.map((tab) => tab.id))
        }
      />

      <div
        className={
          isDragging || isDraggingBottom
            ? "workspace-stack is-dragging"
            : "workspace-stack"
        }
        ref={outerRef}
        style={
          bottomPanelOpen
            ? {
                gridTemplateRows: `minmax(0, ${1 - bottomPanelRatio}fr) 10px minmax(0, ${bottomPanelRatio}fr)`,
              }
            : undefined
        }
      >
        <div
          className={[
            "workspace",
            isDragging ? "is-dragging" : "",
            twoPane ? "two-pane" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          ref={splitRef}
          style={
            twoPane
              ? {
                  gridTemplateColumns: `minmax(0, ${requestRatio}fr) 10px minmax(0, ${1 - requestRatio}fr)`,
                  gridTemplateRows: "minmax(0, 1fr)",
                }
              : {
                  gridTemplateRows: `minmax(0, ${requestRatio}fr) 10px minmax(0, ${1 - requestRatio}fr)`,
                }
          }
        >
          <section className="request-pane">
          <div className="request-meta-bar">
            <input
              className="request-name-input"
              value={
                isAutoRequestName(request.name)
                  ? requestDisplayName(request.name, request.url)
                  : request.name
              }
              onChange={(event) => {
                const next = event.target.value;
                setName(next.trim() ? next : DEFAULT_REQUEST_NAME);
              }}
              placeholder={requestDisplayName("", request.url) || DEFAULT_REQUEST_NAME}
            />
            <button
              type="button"
              className="icon-btn compact"
              onClick={() => setSaveOpen(true)}
              title={t("request.save")}
              aria-label={t("request.save")}
            >
              <SaveIcon />
            </button>
          </div>

          <div className="url-bar">
            <MethodSelect value={request.method} onChange={setMethod} />
            <input
              ref={urlInputRef}
              className="url-input"
              value={request.url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t("request.urlPlaceholder")}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
            />
            {isSending ? (
              <button type="button" className="secondary-btn flat cancel-btn" onClick={cancel}>
                {t("request.cancel")}
              </button>
            ) : (
              <button
                type="button"
                className="primary-btn"
                onClick={() => void send()}
                title={t("request.sendHint")}
              >
                {t("request.send")}
              </button>
            )}
          </div>

          <div className="tabs">
            {(["params", "headers", "body"] as EditorTab[]).map((item) => (
              <button
                key={item}
                type="button"
                className={editorTab === item ? "tab active" : "tab"}
                onClick={() => setEditorTab(item)}
              >
                {item === "params"
                  ? t("request.params")
                  : item === "headers"
                    ? t("request.headers")
                    : t("request.body")}
              </button>
            ))}
          </div>

          <div className="tab-panel">
            {editorTab === "params" && (
              <KeyValueEditor items={request.params} onChange={setParams} />
            )}
            {editorTab === "headers" && (
              <KeyValueEditor items={request.headers} onChange={setHeaders} />
            )}
            {editorTab === "body" && (
              <BodyEditor
                body={request.body}
                onModeChange={setBodyMode}
                onRawChange={setRawBody}
                onRawLanguageChange={setRawLanguage}
                onUrlencodedChange={setUrlencoded}
                onFormdataChange={setFormdata}
                onBinaryChange={setBinary}
                onGraphqlQueryChange={setGraphqlQuery}
                onGraphqlVariablesChange={setGraphqlVariables}
              />
            )}
          </div>
        </section>

        <div
          className="split-resizer"
          role="separator"
          aria-orientation={twoPane ? "vertical" : "horizontal"}
          aria-label={t("request.resizePanes")}
          aria-valuemin={Math.round(MIN_RATIO * 100)}
          aria-valuemax={Math.round(MAX_RATIO * 100)}
          aria-valuenow={Math.round(requestRatio * 100)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
            setIsDragging(true);
            updateRatioFromClient(event.clientX, event.clientY);
          }}
          onKeyDown={(event) => {
            const shrink = twoPane ? "ArrowLeft" : "ArrowUp";
            const grow = twoPane ? "ArrowRight" : "ArrowDown";
            if (event.key === shrink) {
              event.preventDefault();
              setRequestRatio((value) => Math.max(MIN_RATIO, value - 0.03));
            }
            if (event.key === grow) {
              event.preventDefault();
              setRequestRatio((value) => Math.min(MAX_RATIO, value + 0.03));
            }
          }}
        >
          <span className="split-resizer-grip" />
        </div>

        <section className="response-pane">
          <ResponseViewer
            response={response}
            error={error}
            isSending={isSending}
            requestUrl={request.url}
            onSaveResponse={() => {
              if (!response) return;
              try {
                const entryId = saveResponseToHistory(
                  active.historyEntryId,
                  request,
                  response,
                );
                setTabHistoryEntryId(entryId);
                showToast(t("response.saved"));
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : t("response.saveFailed");
                showToast(message);
              }
            }}
          />
        </section>
        </div>

        {bottomPanelOpen && (
          <>
            <div
              className="split-resizer"
              role="separator"
              aria-orientation="horizontal"
              aria-label={t("request.resizeBottom")}
              aria-valuemin={Math.round(BOTTOM_MIN_RATIO * 100)}
              aria-valuemax={Math.round(BOTTOM_MAX_RATIO * 100)}
              aria-valuenow={Math.round(bottomPanelRatio * 100)}
              tabIndex={0}
              onPointerDown={(event) => {
                event.preventDefault();
                (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                setIsDraggingBottom(true);
                updateBottomRatioFromClientY(event.clientY);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setBottomPanelRatio(bottomPanelRatio + 0.03);
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setBottomPanelRatio(bottomPanelRatio - 0.03);
                }
              }}
            >
              <span className="split-resizer-grip" />
            </div>
            <BottomPanel />
          </>
        )}
      </div>

        <SaveToCollectionModal
          open={saveOpen}
          request={request}
          collections={collections}
          activeCollectionId={activeCollectionId}
          onClose={() => {
            setSaveOpen(false);
            if (saveForCloseRef.current) {
              closeQueueRef.current = [];
              saveForCloseRef.current = false;
            }
          }}
          onCreateCollection={createCollection}
          onCreateFolder={createFolder}
          onSave={(collectionId, requestName, folderId) => {
            const tabId = activeTabId;
            setName(requestName);
            const nodeId = saveRequestToCollection(
              collectionId,
              { ...request, name: requestName },
              {
                folderId,
                name: requestName,
                lastResponse: response,
                requestNodeId: active.requestNodeId,
              },
            );
            setTabCollectionId(collectionId, nodeId);
            setSidebarTab("collections");
            setSaveOpen(false);
            showToast(t("sidebar.requestAdded"));
            if (saveForCloseRef.current) {
              closeQueueRef.current = closeQueueRef.current.filter((id) => id !== tabId);
              saveForCloseRef.current = false;
              closeTab(tabId);
            }
          }}
        />

        <ConfirmModal
          open={Boolean(unsavedTab)}
          title={t("request.saveTitle")}
          message={t("request.saveMsg", {
            name: requestDisplayName(unsavedTab?.request.name, unsavedTab?.request.url ?? ""),
          })}
          confirmLabel={t("common.save")}
          extraLabel={t("common.dontSave")}
          cancelLabel={t("common.cancel")}
          danger={false}
          onClose={() => {
            if (!unsavedHandledRef.current) {
              closeQueueRef.current = [];
            }
            unsavedHandledRef.current = false;
            unsavedTabIdRef.current = null;
            setUnsavedTabId(null);
          }}
          onConfirm={() => {
            unsavedHandledRef.current = true;
            unsavedTabIdRef.current = null;
            saveForCloseRef.current = true;
            setSaveOpen(true);
          }}
          onExtra={() => {
            unsavedHandledRef.current = true;
            const id = unsavedTabId;
            unsavedTabIdRef.current = null;
            if (id) {
              closeQueueRef.current = closeQueueRef.current.filter((item) => item !== id);
              closeTab(id);
            }
          }}
        />
    </div>
  );
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 3h11l3 3v15H5V3z" />
      <path d="M8 3v6h8V3" />
      <path d="M8 17h8" />
    </svg>
  );
}
