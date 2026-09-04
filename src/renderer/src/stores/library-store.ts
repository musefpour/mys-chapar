import { nanoid } from "nanoid";
import { create } from "zustand";
import type {
  Collection,
  CollectionFolderNode,
  CollectionNode,
  CollectionRequestNode,
  HistoryEntry,
  HttpRequestDraft,
  KeyValue,
  ResponseSnapshot,
  Workspace,
  WorkspaceKind,
} from "@shared/types";
import { defaultCollectionVariables } from "../lib/resolve-variables";

const COLLECTIONS_KEY = "mychapar.collections";
const WORKSPACES_KEY = "mychapar.workspaces";
const ACTIVE_WORKSPACE_KEY = "mychapar.active-workspace";
const HISTORY_KEY = "mychapar.history";
const MAX_HISTORY = 100;

const MY_WORKSPACE_NAME = "My Workspace";
const TEAM_WORKSPACE_NAME = "Team Workspace";

function nowIso(): string {
  return new Date().toISOString();
}

function createEmptyCollection(name = "My Collection"): Collection {
  return {
    id: nanoid(10),
    name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    favorite: false,
    variables: defaultCollectionVariables(),
    children: [],
  };
}

function createWorkspace(
  name: string,
  kind: WorkspaceKind,
  collections?: Collection[],
): Workspace {
  const cols = collections?.length ? collections : [createEmptyCollection()];
  return {
    id: nanoid(10),
    name,
    kind,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    collections: cols,
    activeCollectionId: cols[0]?.id ?? null,
  };
}

function cloneRequest(request: HttpRequestDraft, name?: string): HttpRequestDraft {
  const cloned = structuredClone(request);
  // Drop in-memory file payloads — they are large and session-only.
  if (cloned.body.binaryBase64) {
    delete cloned.body.binaryBase64;
  }
  if (cloned.body.formdata) {
    cloned.body.formdata = cloned.body.formdata.map((item) => {
      if (!item.fileBase64) return item;
      const { fileBase64: _drop, ...rest } = item;
      return rest;
    });
  }
  return {
    ...cloned,
    id: nanoid(10),
    name: name ?? request.name,
  };
}

function createRequestNode(
  request: HttpRequestDraft,
  name?: string,
  lastResponse?: ResponseSnapshot | null,
): CollectionRequestNode {
  const finalName = name?.trim() || request.name || `${request.method} ${request.url}`;
  return {
    id: nanoid(10),
    type: "request",
    name: finalName,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    request: cloneRequest(request, finalName),
    ...(lastResponse ? { lastResponse } : {}),
  };
}

function createFolderNode(name: string): CollectionFolderNode {
  return {
    id: nanoid(10),
    type: "folder",
    name: name.trim() || "New module",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    children: [],
  };
}

function sortNodes(nodes: CollectionNode[], dir: number): CollectionNode[] {
  const next = nodes.map((node) =>
    node.type === "folder" ? { ...node, children: sortNodes(node.children, dir) } : node,
  );
  next.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name) * dir;
  });
  return next;
}

function remapCollectionIds(collection: Collection): Collection {
  const remapNodes = (nodes: CollectionNode[]): CollectionNode[] =>
    nodes.map((node) => {
      if (node.type === "folder") {
        return {
          ...node,
          id: nanoid(10),
          children: remapNodes(node.children),
        };
      }
      return {
        ...node,
        id: nanoid(10),
        request: {
          ...node.request,
          id: nanoid(10),
        },
      };
    });

  return {
    ...collection,
    id: nanoid(10),
    variables: (collection.variables ?? []).map((item) => ({
      ...item,
      id: nanoid(8),
    })),
    children: remapNodes(collection.children),
  };
}

function migrateCollection(raw: Collection): Collection {
  const variables =
    Array.isArray(raw.variables) && raw.variables.length
      ? raw.variables
      : defaultCollectionVariables();

  if (Array.isArray(raw.children)) {
    return {
      ...raw,
      favorite: Boolean(raw.favorite),
      variables,
      children: raw.children,
      items: undefined,
    };
  }

  const legacyItems = raw.items ?? [];
  return {
    id: raw.id,
    name: raw.name,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    favorite: Boolean(raw.favorite),
    variables,
    children: legacyItems.map((item) => ({
      id: item.id,
      type: "request" as const,
      name: item.name,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      request: item.request,
    })),
  };
}

function ensureRequiredWorkspaces(workspaces: Workspace[]): Workspace[] {
  const byName = new Map(workspaces.map((item) => [item.name, item]));
  const next = [...workspaces];

  if (!byName.has(MY_WORKSPACE_NAME)) {
    next.unshift(createWorkspace(MY_WORKSPACE_NAME, "personal"));
  } else {
    const mine = byName.get(MY_WORKSPACE_NAME)!;
    if (mine.kind !== "personal") {
      const index = next.findIndex((item) => item.id === mine.id);
      next[index] = { ...mine, kind: "personal" };
    }
  }

  if (!byName.has(TEAM_WORKSPACE_NAME)) {
    next.push(createWorkspace(TEAM_WORKSPACE_NAME, "team"));
  } else {
    const team = byName.get(TEAM_WORKSPACE_NAME)!;
    if (team.kind !== "team") {
      const index = next.findIndex((item) => item.id === team.id);
      next[index] = { ...team, kind: "team" };
    }
  }

  return next.map((workspace) => {
    const collections = (workspace.collections ?? []).map(migrateCollection);
    const ensured =
      collections.length > 0 ? collections : [createEmptyCollection()];
    const activeCollectionId =
      ensured.some((item) => item.id === workspace.activeCollectionId)
        ? workspace.activeCollectionId
        : ensured[0].id;
    return {
      ...workspace,
      kind: workspace.kind === "team" ? "team" : "personal",
      collections: ensured,
      activeCollectionId,
    };
  });
}

function loadLegacyCollections(): Collection[] | null {
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Collection[];
    if (!Array.isArray(parsed)) return null;
    return parsed.map(migrateCollection);
  } catch {
    return null;
  }
}

interface WorkspacePersist {
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

function loadWorkspaces(): WorkspacePersist {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspacePersist> | Workspace[];
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.workspaces)
          ? parsed.workspaces
          : [];
      const workspaces = ensureRequiredWorkspaces(list);
      const savedActive =
        (!Array.isArray(parsed) && parsed.activeWorkspaceId) ||
        localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const activeWorkspaceId =
        workspaces.some((item) => item.id === savedActive)
          ? (savedActive as string)
          : workspaces[0].id;
      persistWorkspaces(workspaces, activeWorkspaceId);
      return { workspaces, activeWorkspaceId };
    }

    const legacy = loadLegacyCollections();
    const my = createWorkspace(
      MY_WORKSPACE_NAME,
      "personal",
      legacy?.length ? legacy : undefined,
    );
    const team = createWorkspace(TEAM_WORKSPACE_NAME, "team");
    const workspaces = [my, team];
    persistWorkspaces(workspaces, my.id);
    try {
      localStorage.removeItem(COLLECTIONS_KEY);
    } catch {
      // ignore
    }
    return { workspaces, activeWorkspaceId: my.id };
  } catch {
    const my = createWorkspace(MY_WORKSPACE_NAME, "personal");
    const team = createWorkspace(TEAM_WORKSPACE_NAME, "team");
    return { workspaces: [my, team], activeWorkspaceId: my.id };
  }
}

function persistWorkspaces(workspaces: Workspace[], activeWorkspaceId: string): void {
  try {
    const payload: WorkspacePersist = { workspaces, activeWorkspaceId };
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(payload));
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).code === 22);
    if (quota) {
      throw new Error(
        "Browser storage is full. Delete an unused collection and import again (large OpenAPI specs need more space).",
      );
    }
    throw error;
  }
  void import("../lib/cloud-sync").then((mod) => mod.queueLibraryPush());
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function persistHistory(history: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).code === 22);
    if (quota) {
      throw new Error("Storage is full. Clear some history and try again.");
    }
    throw error;
  }
}

function historySummary(
  response: ResponseSnapshot,
): NonNullable<HistoryEntry["response"]> {
  return {
    status: response.status,
    statusText: response.statusText,
    timeMs: response.timeMs,
    sizeBytes: response.sizeBytes,
  };
}

function mapNodes(
  nodes: CollectionNode[],
  mapper: (node: CollectionNode, parents: CollectionFolderNode[]) => CollectionNode | null,
  parents: CollectionFolderNode[] = [],
): CollectionNode[] {
  const result: CollectionNode[] = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      const nextChildren = mapNodes(node.children, mapper, [...parents, node]);
      const mapped = mapper({ ...node, children: nextChildren }, parents);
      if (mapped) result.push(mapped);
    } else {
      const mapped = mapper(node, parents);
      if (mapped) result.push(mapped);
    }
  }
  return result;
}

function findFolder(
  nodes: CollectionNode[],
  folderId: string,
): CollectionFolderNode | null {
  for (const node of nodes) {
    if (node.type === "folder") {
      if (node.id === folderId) return node;
      const nested = findFolder(node.children, folderId);
      if (nested) return nested;
    }
  }
  return null;
}

function listFolders(nodes: CollectionNode[], path: string[] = []): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];
  for (const node of nodes) {
    if (node.type === "folder") {
      const label = [...path, node.name].join(" / ");
      result.push({ id: node.id, label });
      result.push(...listFolders(node.children, [...path, node.name]));
    }
  }
  return result;
}

function collectRequests(nodes: CollectionNode[]): CollectionRequestNode[] {
  const result: CollectionRequestNode[] = [];
  for (const node of nodes) {
    if (node.type === "request") result.push(node);
    else result.push(...collectRequests(node.children));
  }
  return result;
}

export function getCollectionFolders(collection: Collection): Array<{ id: string; label: string }> {
  return listFolders(collection.children);
}

export function flattenCollectionRequests(collection: Collection): CollectionRequestNode[] {
  return collectRequests(collection.children);
}

type SidebarTab = "collections" | "history";

interface ActiveSlice {
  collections: Collection[];
  activeCollectionId: string | null;
}

function sliceFromWorkspace(workspace: Workspace): ActiveSlice {
  return {
    collections: workspace.collections,
    activeCollectionId: workspace.activeCollectionId,
  };
}

interface LibraryState {
  sidebarTab: SidebarTab;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  collections: Collection[];
  activeCollectionId: string | null;
  history: HistoryEntry[];
  setSidebarTab: (tab: SidebarTab) => void;
  setActiveWorkspaceId: (id: string) => void;
  setActiveCollectionId: (id: string) => void;
  createCollection: (name?: string) => string;
  importCollection: (input: {
    name: string;
    variables?: KeyValue[];
    children: CollectionNode[];
  }) => string;
  renameCollection: (id: string, name: string) => void;
  toggleCollectionFavorite: (id: string) => void;
  duplicateCollection: (id: string) => string | null;
  sortCollectionChildren: (id: string, order?: "asc" | "desc") => void;
  deleteCollection: (id: string) => void;
  createFolder: (collectionId: string, name?: string, parentFolderId?: string | null) => string;
  renameFolder: (collectionId: string, folderId: string, name: string) => void;
  deleteFolder: (collectionId: string, folderId: string) => void;
  saveRequestToCollection: (
    collectionId: string,
    request: HttpRequestDraft,
    options?: {
      folderId?: string | null;
      name?: string;
      lastResponse?: ResponseSnapshot | null;
      requestNodeId?: string | null;
    },
  ) => string;
  saveLastResponse: (
    collectionId: string,
    requestNodeId: string,
    response: ResponseSnapshot | null,
  ) => void;
  setCollectionVariables: (collectionId: string, variables: KeyValue[]) => void;
  renameRequestNode: (collectionId: string, requestNodeId: string, name: string) => void;
  removeRequestNode: (collectionId: string, requestNodeId: string) => void;
  getRequestNode: (collectionId: string, requestNodeId: string) => CollectionRequestNode | null;
  pushHistory: (
    request: HttpRequestDraft,
    result:
      | { ok: true; response: ResponseSnapshot }
      | { ok: false; error: string },
    meta?: {
      workspaceId?: string | null;
      collectionId?: string | null;
      requestNodeId?: string | null;
    },
  ) => string;
  applyCloudSnapshot: (
    workspaces: Workspace[],
    activeWorkspaceId: string,
    history: HistoryEntry[],
  ) => void;
  saveResponseToHistory: (
    entryId: string | null,
    request: HttpRequestDraft,
    response: ResponseSnapshot,
  ) => string;
  clearHistory: () => void;
  removeHistoryEntry: (id: string) => void;
}

function commitWorkspaceUpdate(
  workspaces: Workspace[],
  activeWorkspaceId: string,
  updater: (workspace: Workspace) => Workspace,
): { workspaces: Workspace[]; active: ActiveSlice } {
  const workspacesNext = workspaces.map((workspace) =>
    workspace.id === activeWorkspaceId
      ? { ...updater(workspace), updatedAt: nowIso() }
      : workspace,
  );
  const activeWorkspace =
    workspacesNext.find((item) => item.id === activeWorkspaceId) ?? workspacesNext[0];
  persistWorkspaces(workspacesNext, activeWorkspace.id);
  return {
    workspaces: workspacesNext,
    active: sliceFromWorkspace(activeWorkspace),
  };
}

export const useLibraryStore = create<LibraryState>((set, get) => {
  const loaded = loadWorkspaces();
  const activeWorkspace =
    loaded.workspaces.find((item) => item.id === loaded.activeWorkspaceId) ??
    loaded.workspaces[0];
  const active = sliceFromWorkspace(activeWorkspace);

  return {
    sidebarTab: "collections",
    workspaces: loaded.workspaces,
    activeWorkspaceId: activeWorkspace.id,
    collections: active.collections,
    activeCollectionId: active.activeCollectionId,
    history: loadHistory(),

    setSidebarTab: (tab) => set({ sidebarTab: tab }),

    setActiveWorkspaceId: (id) => {
      const state = get();
      if (state.activeWorkspaceId === id) return;
      const target = state.workspaces.find((item) => item.id === id);
      if (!target) return;

      // Persist current selection into the workspace being left
      const workspaces = state.workspaces.map((workspace) =>
        workspace.id === state.activeWorkspaceId
          ? {
              ...workspace,
              collections: state.collections,
              activeCollectionId: state.activeCollectionId,
              updatedAt: nowIso(),
            }
          : workspace,
      );
      persistWorkspaces(workspaces, target.id);
      const next = workspaces.find((item) => item.id === target.id) ?? target;
      set({
        workspaces,
        activeWorkspaceId: next.id,
        ...sliceFromWorkspace(next),
        sidebarTab: "collections",
      });
    },

    setActiveCollectionId: (id) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        activeCollectionId: id,
      }));
      set({
        workspaces: committed.workspaces,
        activeCollectionId: id,
        collections: committed.active.collections,
      });
    },

    createCollection: (name = "New Collection") => {
      const collection: Collection = {
        id: nanoid(10),
        name: name.trim() || "New Collection",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        favorite: false,
        variables: defaultCollectionVariables(),
        children: [],
      };
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: [collection, ...workspace.collections],
        activeCollectionId: collection.id,
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: collection.id,
      });
      return collection.id;
    },

    importCollection: (input) => {
      const collection: Collection = {
        id: nanoid(10),
        name: input.name.trim() || "Imported Collection",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        favorite: false,
        variables:
          Array.isArray(input.variables) && input.variables.length
            ? input.variables
            : defaultCollectionVariables(),
        children: input.children ?? [],
      };
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: [collection, ...workspace.collections],
        activeCollectionId: collection.id,
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: collection.id,
      });
      return collection.id;
    },

    renameCollection: (id, name) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) =>
          collection.id === id
            ? { ...collection, name: name.trim() || collection.name, updatedAt: nowIso() }
            : collection,
        ),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    toggleCollectionFavorite: (id) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) =>
          collection.id === id
            ? { ...collection, favorite: !collection.favorite, updatedAt: nowIso() }
            : collection,
        ),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    duplicateCollection: (id) => {
      const source = get().collections.find((collection) => collection.id === id);
      if (!source) return null;
      const clone = structuredClone(source) as Collection;
      const remapped = remapCollectionIds(clone);
      remapped.name = `${source.name} Copy`;
      remapped.favorite = false;
      remapped.createdAt = nowIso();
      remapped.updatedAt = nowIso();
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: [remapped, ...workspace.collections],
        activeCollectionId: remapped.id,
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: remapped.id,
      });
      return remapped.id;
    },

    sortCollectionChildren: (id, order = "asc") => {
      const dir = order === "desc" ? -1 : 1;
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== id) return collection;
          return {
            ...collection,
            updatedAt: nowIso(),
            children: sortNodes(collection.children, dir),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    deleteCollection: (id) => {
      void import("../lib/cloud-sync").then((mod) => mod.queueCollectionDelete(id));
      const { workspaces, activeWorkspaceId, collections } = get();
      let collectionsNext = collections.filter((collection) => collection.id !== id);
      if (!collectionsNext.length) {
        collectionsNext = [createEmptyCollection()];
      }
      const activeCollectionId =
        get().activeCollectionId === id
          ? collectionsNext[0].id
          : get().activeCollectionId;
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: collectionsNext,
        activeCollectionId,
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    createFolder: (collectionId, name = "New module", parentFolderId = null) => {
      const folder = createFolderNode(name);
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        activeCollectionId: collectionId,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== collectionId) return collection;
          if (!parentFolderId) {
            return {
              ...collection,
              updatedAt: nowIso(),
              children: [folder, ...collection.children],
            };
          }
          return {
            ...collection,
            updatedAt: nowIso(),
            children: mapNodes(collection.children, (node) => {
              if (node.type === "folder" && node.id === parentFolderId) {
                return {
                  ...node,
                  updatedAt: nowIso(),
                  children: [folder, ...node.children],
                };
              }
              return node;
            }),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: collectionId,
      });
      return folder.id;
    },

    renameFolder: (collectionId, folderId, name) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== collectionId) return collection;
          return {
            ...collection,
            updatedAt: nowIso(),
            children: mapNodes(collection.children, (node) => {
              if (node.type === "folder" && node.id === folderId) {
                return { ...node, name: name.trim() || node.name, updatedAt: nowIso() };
              }
              return node;
            }),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    deleteFolder: (collectionId, folderId) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== collectionId) return collection;
          return {
            ...collection,
            updatedAt: nowIso(),
            children: mapNodes(collection.children, (node) =>
              node.type === "folder" && node.id === folderId ? null : node,
            ),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    saveRequestToCollection: (collectionId, request, options) => {
      const folderId = options?.folderId ?? null;
      const existingId = options?.requestNodeId ?? null;
      const nodeId = existingId || nanoid(10);
      const { workspaces, activeWorkspaceId } = get();

      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        activeCollectionId: collectionId,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== collectionId) return collection;
          if (existingId) {
            return {
              ...collection,
              updatedAt: nowIso(),
              children: mapNodes(collection.children, (current) => {
                if (current.type === "request" && current.id === existingId) {
                  const name = options?.name?.trim() || current.name;
                  return {
                    ...current,
                    name,
                    updatedAt: nowIso(),
                    request: cloneRequest(request, name),
                    lastResponse:
                      options?.lastResponse !== undefined
                        ? options.lastResponse
                        : current.lastResponse,
                  };
                }
                return current;
              }),
            };
          }
          const node = createRequestNode(request, options?.name, options?.lastResponse);
          node.id = nodeId;
          if (!folderId) {
            return {
              ...collection,
              updatedAt: nowIso(),
              children: [node, ...collection.children],
            };
          }
          const folder = findFolder(collection.children, folderId);
          if (!folder) {
            return {
              ...collection,
              updatedAt: nowIso(),
              children: [node, ...collection.children],
            };
          }
          return {
            ...collection,
            updatedAt: nowIso(),
            children: mapNodes(collection.children, (current) => {
              if (current.type === "folder" && current.id === folderId) {
                return {
                  ...current,
                  updatedAt: nowIso(),
                  children: [node, ...current.children],
                };
              }
              return current;
            }),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: collectionId,
      });
      return nodeId;
    },

    saveLastResponse: (collectionId, requestNodeId, response) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== collectionId) return collection;
          return {
            ...collection,
            updatedAt: nowIso(),
            children: mapNodes(collection.children, (current) => {
              if (current.type === "request" && current.id === requestNodeId) {
                return {
                  ...current,
                  updatedAt: nowIso(),
                  lastResponse: response,
                };
              }
              return current;
            }),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    setCollectionVariables: (collectionId, variables) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) =>
          collection.id === collectionId
            ? { ...collection, variables, updatedAt: nowIso() }
            : collection,
        ),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    renameRequestNode: (collectionId, requestNodeId, name) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== collectionId) return collection;
          return {
            ...collection,
            updatedAt: nowIso(),
            children: mapNodes(collection.children, (node) => {
              if (node.type === "request" && node.id === requestNodeId) {
                const nextName = name.trim() || node.name;
                return {
                  ...node,
                  name: nextName,
                  updatedAt: nowIso(),
                  request: { ...node.request, name: nextName },
                };
              }
              return node;
            }),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    removeRequestNode: (collectionId, requestNodeId) => {
      const { workspaces, activeWorkspaceId } = get();
      const committed = commitWorkspaceUpdate(workspaces, activeWorkspaceId, (workspace) => ({
        ...workspace,
        collections: workspace.collections.map((collection) => {
          if (collection.id !== collectionId) return collection;
          return {
            ...collection,
            updatedAt: nowIso(),
            children: mapNodes(collection.children, (node) =>
              node.type === "request" && node.id === requestNodeId ? null : node,
            ),
          };
        }),
      }));
      set({
        workspaces: committed.workspaces,
        collections: committed.active.collections,
        activeCollectionId: committed.active.activeCollectionId,
      });
    },

    getRequestNode: (collectionId, requestNodeId) => {
      const collection = get().collections.find((item) => item.id === collectionId);
      if (!collection) return null;
      return (
        collectRequests(collection.children).find((item) => item.id === requestNodeId) ?? null
      );
    },

    pushHistory: (request, result, meta) => {
      const entry: HistoryEntry = {
        id: nanoid(10),
        createdAt: nowIso(),
        request: cloneRequest(request),
        workspaceId: meta?.workspaceId ?? get().activeWorkspaceId,
        collectionId: meta?.collectionId ?? null,
        requestNodeId: meta?.requestNodeId ?? null,
        ...(result.ok
          ? { response: historySummary(result.response), savedResponse: structuredClone(result.response) }
          : { error: result.error }),
      };
      const history = [entry, ...get().history].slice(0, MAX_HISTORY);
      persistHistory(history);
      set({ history });
      void import("../lib/cloud-sync").then((mod) => mod.queueHistoryPush(entry));
      return entry.id;
    },

    saveResponseToHistory: (entryId, request, response) => {
      const snapshot = structuredClone(response);
      const summary = historySummary(snapshot);
      const existing = entryId
        ? get().history.find((entry) => entry.id === entryId)
        : undefined;
      if (existing) {
        const history = get().history.map((entry) =>
          entry.id === existing.id
            ? {
                ...entry,
                request: cloneRequest(request, request.name),
                response: summary,
                savedResponse: snapshot,
                error: undefined,
              }
            : entry,
        );
        persistHistory(history);
        set({ history });
        const updated = history.find((item) => item.id === existing.id);
        if (updated) {
          void import("../lib/cloud-sync").then((mod) => mod.queueHistoryPush(updated));
        }
        return existing.id;
      }
      const entry: HistoryEntry = {
        id: nanoid(10),
        createdAt: nowIso(),
        request: cloneRequest(request, request.name),
        response: summary,
        savedResponse: snapshot,
      };
      const history = [entry, ...get().history].slice(0, MAX_HISTORY);
      persistHistory(history);
      set({ history });
      void import("../lib/cloud-sync").then((mod) => mod.queueHistoryPush(entry));
      return entry.id;
    },

    clearHistory: () => {
      persistHistory([]);
      set({ history: [] });
      void import("../lib/cloud-sync").then((mod) => mod.queueHistoryClear());
    },

    removeHistoryEntry: (id) => {
      const history = get().history.filter((entry) => entry.id !== id);
      persistHistory(history);
      set({ history });
      void import("../lib/cloud-sync").then((mod) => mod.queueHistoryDelete(id));
    },

    applyCloudSnapshot: (workspaces, activeWorkspaceId, history) => {
      persistWorkspaces(workspaces, activeWorkspaceId);
      persistHistory(history);
      const active =
        workspaces.find((item) => item.id === activeWorkspaceId) ?? workspaces[0];
      set({
        workspaces,
        activeWorkspaceId: active.id,
        ...sliceFromWorkspace(active),
        history,
      });
    },
  };
});
