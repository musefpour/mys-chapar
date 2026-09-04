import { nanoid } from "nanoid";
import { create } from "zustand";
import type {
  BodyMode,
  FormDataItem,
  HttpMethod,
  HttpRequestDraft,
  KeyValue,
  RequestBody,
  ResponseSnapshot,
} from "@shared/types";
import { parseCurl } from "../lib/parse-curl";
import { applyCollectionVariables } from "../lib/resolve-variables";
import { useConsoleStore } from "./console-store";
import { useLibraryStore } from "./library-store";
import { applyParamsToUrl, paramsFromUrl } from "@shared/url-query";

function kv(key = "", value = ""): KeyValue {
  return { id: nanoid(8), key, value, enabled: true };
}

function formItem(): FormDataItem {
  return {
    id: nanoid(8),
    key: "",
    value: "",
    enabled: true,
    type: "text",
  };
}

export function createDefaultRequest(): HttpRequestDraft {
  return {
    id: nanoid(10),
    name: "Untitled request",
    method: "GET",
    url: "",
    params: [kv()],
    headers: [kv("Accept", "application/json")],
    body: {
      mode: "none",
      raw: "",
      rawLanguage: "json",
      urlencoded: [kv()],
      formdata: [formItem()],
      binaryPath: undefined,
      binaryFileName: undefined,
      graphql: {
        query: "",
        variables: "",
      },
    },
  };
}

export interface RequestTabState {
  id: string;
  request: HttpRequestDraft;
  response: ResponseSnapshot | null;
  error: string | null;
  isSending: boolean;
  pinned: boolean;
  /** Collection that owns variables for this tab (when opened/saved from a collection) */
  collectionId: string | null;
  /** Collection request node this tab is bound to */
  requestNodeId: string | null;
  /** History entry this tab was opened from / last sent as */
  historyEntryId: string | null;
}

function createTab(
  request?: HttpRequestDraft,
  collectionId: string | null = null,
  options?: {
    requestNodeId?: string | null;
    historyEntryId?: string | null;
    response?: ResponseSnapshot | null;
  },
): RequestTabState {
  return {
    id: nanoid(10),
    request: request ? normalizeLoadedRequest(request) : createDefaultRequest(),
    response: options?.response ?? null,
    error: null,
    isSending: false,
    pinned: false,
    collectionId,
    requestNodeId: options?.requestNodeId ?? null,
    historyEntryId: options?.historyEntryId ?? null,
  };
}

function normalizeLoadedRequest(request: HttpRequestDraft): HttpRequestDraft {
  const defaults = createDefaultRequest().body;
  return {
    ...structuredClone(request),
    id: request.id || nanoid(10),
    body: {
      ...defaults,
      ...structuredClone(request.body),
      formdata: request.body.formdata?.length
        ? structuredClone(request.body.formdata)
        : defaults.formdata,
      urlencoded: request.body.urlencoded?.length
        ? structuredClone(request.body.urlencoded)
        : defaults.urlencoded,
      graphql: request.body.graphql ?? defaults.graphql,
    },
  };
}

function mapActiveTab(
  state: RequestState,
  updater: (tab: RequestTabState) => RequestTabState,
): Partial<RequestState> {
  return {
    tabs: state.tabs.map((tab) =>
      tab.id === state.activeTabId ? updater(tab) : tab,
    ),
  };
}

function patchActiveRequest(
  state: RequestState,
  patch: Partial<HttpRequestDraft>,
): Partial<RequestState> {
  return mapActiveTab(state, (tab) => ({
    ...tab,
    request: { ...tab.request, ...patch },
  }));
}

function patchActiveBody(
  state: RequestState,
  patch: Partial<RequestBody>,
): Partial<RequestState> {
  return mapActiveTab(state, (tab) => ({
    ...tab,
    request: {
      ...tab.request,
      body: { ...tab.request.body, ...patch },
    },
  }));
}

interface RequestState {
  tabs: RequestTabState[];
  activeTabId: string;
  navStack: string[];
  navIndex: number;
  openNewTab: () => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  togglePinTab: (tabId: string) => void;
  setActiveTab: (tabId: string, fromHistory?: boolean) => void;
  activateAdjacentTab: (direction: 1 | -1) => void;
  goBack: () => void;
  goForward: () => void;
  openRequestInTab: (
    request: HttpRequestDraft,
    collectionId?: string | null,
    options?: {
      requestNodeId?: string | null;
      historyEntryId?: string | null;
      response?: ResponseSnapshot | null;
    },
  ) => void;
  setTabCollectionId: (collectionId: string | null, requestNodeId?: string | null) => void;
  setTabHistoryEntryId: (historyEntryId: string | null) => void;
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setName: (name: string) => void;
  setParams: (params: KeyValue[]) => void;
  setHeaders: (headers: KeyValue[]) => void;
  setBodyMode: (mode: BodyMode) => void;
  setRawBody: (raw: string) => void;
  setRawLanguage: (language: NonNullable<RequestBody["rawLanguage"]>) => void;
  setUrlencoded: (items: KeyValue[]) => void;
  setFormdata: (items: FormDataItem[]) => void;
  setBinary: (file: { path?: string; name: string; base64?: string } | null) => void;
  setGraphqlQuery: (query: string) => void;
  setGraphqlVariables: (variables: string) => void;
  importFromCurl: (curl: string) => string | null;
  send: () => Promise<void>;
  cancel: () => void;
}

const TABS_KEY = "mychapar.open-tabs";

function stripFilePayloads(request: HttpRequestDraft): HttpRequestDraft {
  const next = structuredClone(request);
  if (next.body.binaryBase64) delete next.body.binaryBase64;
  if (next.body.formdata) {
    next.body.formdata = next.body.formdata.map((item) => {
      if (!item.fileBase64) return item;
      const { fileBase64: _drop, ...rest } = item;
      return rest;
    });
  }
  return next;
}

function loadPersistedSession(): Pick<RequestState, "tabs" | "activeTabId"> | null {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      tabs?: RequestTabState[];
      activeTabId?: string;
    };
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return null;
    const tabs = parsed.tabs.map((tab) => ({
      id: tab.id || nanoid(10),
      request: normalizeLoadedRequest(tab.request),
      response: tab.response ?? null,
      error: tab.error ?? null,
      isSending: false,
      pinned: Boolean(tab.pinned),
      collectionId: tab.collectionId ?? null,
      requestNodeId: tab.requestNodeId ?? null,
      historyEntryId: tab.historyEntryId ?? null,
    }));
    const activeTabId =
      tabs.find((tab) => tab.id === parsed.activeTabId)?.id ?? tabs[0].id;
    return { tabs, activeTabId };
  } catch {
    return null;
  }
}

function persistSession(state: Pick<RequestState, "tabs" | "activeTabId">): void {
  try {
    const payload = {
      activeTabId: state.activeTabId,
      tabs: state.tabs.map((tab) => ({
        id: tab.id,
        request: stripFilePayloads(tab.request),
        response: tab.response,
        error: tab.error,
        isSending: false,
        pinned: Boolean(tab.pinned),
        collectionId: tab.collectionId,
        requestNodeId: tab.requestNodeId ?? null,
        historyEntryId: tab.historyEntryId ?? null,
      })),
    };
    localStorage.setItem(TABS_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function orderPinnedTabs(tabs: RequestTabState[]): RequestTabState[] {
  const pinned: RequestTabState[] = [];
  const rest: RequestTabState[] = [];
  for (const tab of tabs) {
    if (tab.pinned) pinned.push(tab);
    else rest.push(tab);
  }
  return [...pinned, ...rest];
}

const restored = loadPersistedSession();
const initialTab = createTab();
const bootTabs = restored?.tabs ? orderPinnedTabs(restored.tabs) : [initialTab];
const bootActiveId = restored?.activeTabId ?? bootTabs[0].id;

function pushNav(
  state: Pick<RequestState, "navStack" | "navIndex">,
  tabId: string,
): Pick<RequestState, "navStack" | "navIndex"> {
  const stack = state.navStack.slice(0, state.navIndex + 1);
  if (stack[stack.length - 1] === tabId) {
    return { navStack: stack, navIndex: stack.length - 1 };
  }
  stack.push(tabId);
  if (stack.length > 50) stack.shift();
  return { navStack: stack, navIndex: stack.length - 1 };
}

export const useRequestStore = create<RequestState>((set, get) => ({
  tabs: bootTabs,
  activeTabId: bootActiveId,
  navStack: [bootActiveId],
  navIndex: 0,

  openNewTab: () => {
    const tab = createTab();
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
      ...pushNav(state, tab.id),
    }));
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      const fresh = createTab();
      set({ tabs: [fresh], activeTabId: fresh.id });
      return;
    }
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    const nextTabs = tabs.filter((tab) => tab.id !== tabId);
    let nextActive = activeTabId;
    if (activeTabId === tabId) {
      const fallback = nextTabs[Math.max(0, index - 1)] ?? nextTabs[0];
      nextActive = fallback.id;
    }
    set({ tabs: nextTabs, activeTabId: nextActive });
  },

  closeOtherTabs: (tabId) => {
    const keep = get().tabs.find((tab) => tab.id === tabId);
    if (!keep) return;
    set({ tabs: [keep], activeTabId: keep.id });
  },

  closeAllTabs: () => {
    const fresh = createTab();
    set({ tabs: [fresh], activeTabId: fresh.id });
  },

  togglePinTab: (tabId) => {
    set((state) => {
      if (!state.tabs.some((tab) => tab.id === tabId)) return state;
      const tabs = state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab,
      );
      return { tabs: orderPinnedTabs(tabs) };
    });
  },

  setActiveTab: (tabId, fromHistory = false) => {
    if (!get().tabs.some((tab) => tab.id === tabId)) return;
    set((state) => ({
      activeTabId: tabId,
      ...(fromHistory ? {} : pushNav(state, tabId)),
    }));
  },

  activateAdjacentTab: (direction) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex((tab) => tab.id === activeTabId);
    if (index < 0 || tabs.length === 0) return;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    get().setActiveTab(next.id);
  },

  goBack: () => {
    const { navStack, navIndex, tabs } = get();
    let index = navIndex - 1;
    while (index >= 0 && !tabs.some((tab) => tab.id === navStack[index])) {
      index -= 1;
    }
    if (index < 0) return;
    set({ navIndex: index, activeTabId: navStack[index] });
  },

  goForward: () => {
    const { navStack, navIndex, tabs } = get();
    let index = navIndex + 1;
    while (index < navStack.length && !tabs.some((tab) => tab.id === navStack[index])) {
      index += 1;
    }
    if (index >= navStack.length) return;
    set({ navIndex: index, activeTabId: navStack[index] });
  },

  openRequestInTab: (request, collectionId = null, options) => {
    const requestNodeId = options?.requestNodeId ?? null;
    const historyEntryId = options?.historyEntryId ?? null;
    if (historyEntryId) {
      const existing = get().tabs.find((tab) => tab.historyEntryId === historyEntryId);
      if (existing) {
        set((state) => ({
          activeTabId: existing.id,
          tabs: state.tabs.map((tab) =>
            tab.id === existing.id
              ? {
                  ...tab,
                  request: normalizeLoadedRequest(structuredClone(request)),
                  response: options?.response ?? tab.response,
                  error: null,
                  historyEntryId,
                }
              : tab,
          ),
          ...pushNav(state, existing.id),
        }));
        return;
      }
    }
    if (requestNodeId) {
      const existing = get().tabs.find((tab) => tab.requestNodeId === requestNodeId);
      if (existing) {
        set((state) => ({
          activeTabId: existing.id,
          tabs: state.tabs.map((tab) =>
            tab.id === existing.id
              ? {
                  ...tab,
                  request: normalizeLoadedRequest(structuredClone(request)),
                  response: tab.response ?? options?.response ?? null,
                  collectionId,
                  requestNodeId,
                  historyEntryId: historyEntryId ?? tab.historyEntryId,
                }
              : tab,
          ),
          ...pushNav(state, existing.id),
        }));
        return;
      }
    }
    const tab = createTab(structuredClone(request), collectionId, {
      requestNodeId,
      historyEntryId,
      response: options?.response ?? null,
    });
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
      ...pushNav(state, tab.id),
    }));
  },

  setTabCollectionId: (collectionId, requestNodeId) =>
    set((state) =>
      mapActiveTab(state, (tab) => ({
        ...tab,
        collectionId,
        requestNodeId: requestNodeId ?? tab.requestNodeId,
      })),
    ),

  setTabHistoryEntryId: (historyEntryId) =>
    set((state) => mapActiveTab(state, (tab) => ({ ...tab, historyEntryId }))),

  setMethod: (method) => set((state) => patchActiveRequest(state, { method })),
  setUrl: (url) =>
    set((state) =>
      mapActiveTab(state, (tab) => ({
        ...tab,
        request: {
          ...tab.request,
          url,
          params: paramsFromUrl(url, tab.request.params),
        },
      })),
    ),
  setName: (name) => set((state) => patchActiveRequest(state, { name })),
  setParams: (params) =>
    set((state) =>
      mapActiveTab(state, (tab) => ({
        ...tab,
        request: {
          ...tab.request,
          params,
          url: applyParamsToUrl(tab.request.url, params),
        },
      })),
    ),
  setHeaders: (headers) => set((state) => patchActiveRequest(state, { headers })),
  setBodyMode: (mode) => set((state) => patchActiveBody(state, { mode })),
  setRawBody: (raw) => set((state) => patchActiveBody(state, { raw })),
  setRawLanguage: (rawLanguage) =>
    set((state) => patchActiveBody(state, { rawLanguage })),
  setUrlencoded: (urlencoded) =>
    set((state) => patchActiveBody(state, { urlencoded })),
  setFormdata: (formdata) => set((state) => patchActiveBody(state, { formdata })),
  setBinary: (file) =>
    set((state) =>
      patchActiveBody(state, {
        binaryPath: file?.path,
        binaryFileName: file?.name,
        binaryBase64: file?.base64,
      }),
    ),
  setGraphqlQuery: (query) =>
    set((state) => {
      const tab = state.tabs.find((item) => item.id === state.activeTabId);
      return patchActiveBody(state, {
        graphql: {
          query,
          variables: tab?.request.body.graphql?.variables ?? "",
        },
      });
    }),
  setGraphqlVariables: (variables) =>
    set((state) => {
      const tab = state.tabs.find((item) => item.id === state.activeTabId);
      return patchActiveBody(state, {
        graphql: {
          query: tab?.request.body.graphql?.query ?? "",
          variables,
        },
      });
    }),

  importFromCurl: (curl) => {
    const parsed = parseCurl(curl);
    if (!parsed.ok) return parsed.error;
    const defaults = createDefaultRequest();
    const request: HttpRequestDraft = {
      ...defaults,
      ...parsed.request,
      id: nanoid(10),
      name: "Imported from cURL",
      body: {
        ...defaults.body,
        ...parsed.request.body,
      },
    };
    const tab = createTab(request);
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    return null;
  },

  send: async () => {
    const state = get();
    const tab = state.tabs.find((item) => item.id === state.activeTabId);
    if (!tab || tab.isSending) return;
    const tabId = tab.id;
    const library = useLibraryStore.getState();
    const collectionId = tab.collectionId ?? library.activeCollectionId;
    const collection = library.collections.find((item) => item.id === collectionId);
    const variables = collection?.variables ?? [];
    const request = applyCollectionVariables(tab.request, variables);

    set({
      tabs: state.tabs.map((item) =>
        item.id === tabId ? { ...item, isSending: true, error: null } : item,
      ),
    });

    useConsoleStore.getState().log({
      level: "info",
      source: "http",
      title: `${request.method} ${request.url}`,
      detail: "Sending request",
    });

    try {
      const result = await window.mychapar.sendRequest({ request });
      if (result.ok) {
        const historyEntryId = useLibraryStore.getState().pushHistory(request, result, {
          workspaceId: library.activeWorkspaceId,
          collectionId: tab.collectionId,
          requestNodeId: tab.requestNodeId,
        });
        const { status, statusText, timeMs, sizeBytes } = result.response;
        useConsoleStore.getState().log({
          level: status >= 400 ? "error" : "info",
          source: "http",
          title: `${request.method} ${request.url}  →  ${status} ${statusText}`,
          detail: `${timeMs} ms · ${sizeBytes} bytes`,
        });
        set((current) => ({
          tabs: current.tabs.map((item) =>
            item.id === tabId
              ? {
                  ...item,
                  response: result.response,
                  error: null,
                  isSending: false,
                  historyEntryId,
                }
              : item,
          ),
        }));
        if (tab.collectionId && tab.requestNodeId) {
          useLibraryStore
            .getState()
            .saveLastResponse(tab.collectionId, tab.requestNodeId, result.response);
        } else if (tab.collectionId) {
          const requestNodeId = useLibraryStore.getState().saveRequestToCollection(
            tab.collectionId,
            request,
            { lastResponse: result.response },
          );
          set((current) => ({
            tabs: current.tabs.map((item) =>
              item.id === tabId ? { ...item, requestNodeId, collectionId: tab.collectionId } : item,
            ),
          }));
        }
      } else {
        const historyEntryId = useLibraryStore.getState().pushHistory(request, result, {
          workspaceId: library.activeWorkspaceId,
          collectionId: tab.collectionId,
          requestNodeId: tab.requestNodeId,
        });
        useConsoleStore.getState().log({
          level: "error",
          source: "http",
          title: `${request.method} ${request.url}`,
          detail: result.error,
        });
        set((current) => ({
          tabs: current.tabs.map((item) =>
            item.id === tabId
              ? {
                  ...item,
                  response: null,
                  error: result.error,
                  isSending: false,
                  historyEntryId,
                }
              : item,
          ),
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Send failed";
      const historyEntryId = useLibraryStore.getState().pushHistory(request, { ok: false, error: message }, {
        workspaceId: library.activeWorkspaceId,
        collectionId: tab.collectionId,
        requestNodeId: tab.requestNodeId,
      });
      useConsoleStore.getState().log({
        level: "error",
        source: "http",
        title: `${request.method} ${request.url}`,
        detail: message,
      });
      set((current) => ({
        tabs: current.tabs.map((item) =>
          item.id === tabId
            ? { ...item, response: null, error: message, isSending: false, historyEntryId }
            : item,
        ),
      }));
    }
  },

  cancel: () => {
    const state = get();
    const tab = state.tabs.find((item) => item.id === state.activeTabId);
    if (!tab) return;
    window.mychapar.cancelRequest(tab.request.id);
    useConsoleStore.getState().log({
      level: "warn",
      source: "http",
      title: `${tab.request.method} ${tab.request.url}`,
      detail: "Request cancelled",
    });
    set({
      tabs: state.tabs.map((item) =>
        item.id === tab.id
          ? { ...item, isSending: false, error: "Request cancelled" }
          : item,
      ),
    });
  },
}));

let persistTimer: ReturnType<typeof setTimeout> | null = null;
useRequestStore.subscribe((state) => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistSession(state);
  }, 200);
});

export function useActiveRequestTab(): RequestTabState {
  return useRequestStore((state) => {
    const tab = state.tabs.find((item) => item.id === state.activeTabId);
    return tab ?? state.tabs[0];
  });
}

export function isTabSaved(tab: RequestTabState): boolean {
  return Boolean(tab.collectionId);
}
