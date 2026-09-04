import type {
  Collection,
  HistoryEntry,
  HttpRequestDraft,
  KeyValue,
  ResponseSnapshot,
  Workspace,
  WorkspaceKind,
} from "@shared/types";
import { getAccessToken } from "./auth-client";
import { cloudItem, cloudItems, cloudJson } from "./cloud-client";
import { defaultCollectionVariables } from "./resolve-variables";
import { useLibraryStore } from "../stores/library-store";
import { useThemeStore } from "../stores/theme-store";
import { useLocaleStore } from "../stores/locale-store";
import { isLocaleId } from "../i18n/locales";

interface CloudWorkspace {
  id: string;
  name: string;
  kind?: string;
  /** Some backends expose workspace kind as `type`. */
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

function workspaceKindOf(dto: Pick<CloudWorkspace, "kind" | "type"> | null | undefined): WorkspaceKind {
  const raw = (dto?.kind ?? dto?.type ?? "").toString().trim().toLowerCase();
  return raw === "team" ? "team" : "personal";
}

interface CloudCollection {
  id: string;
  workspaceId?: string;
  name?: string;
  favorite?: boolean;
  description?: string;
  payload?: {
    children?: Collection["children"];
    variables?: KeyValue[];
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CloudHistory {
  id: string;
  workspaceId?: string;
  collectionId?: string;
  requestNodeId?: string;
  request?: HttpRequestDraft;
  response?: ResponseSnapshot | HistoryEntry["response"];
  error?: string;
  createdAt?: string;
}

interface CloudPreferences {
  theme?: string;
  activeWorkspaceId?: string;
  locale?: string;
  settings?: Record<string, unknown>;
}

let hydrating = false;
let hydrateGeneration = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Cancel pending pushes and invalidate an in-flight hydrate (call on sign-out). */
export function stopCloudSync(): void {
  hydrateGeneration += 1;
  hydrating = false;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

function isLoggedIn(): boolean {
  return Boolean(getAccessToken());
}

function isCloudWorkspaceId(id: string): boolean {
  return id.startsWith("ws_");
}

function isPlaceholderCollection(collection: Collection): boolean {
  return (
    (collection.children?.length ?? 0) === 0 &&
    /^(My Collection|New Collection)$/i.test(collection.name.trim())
  );
}

function collectionPayload(collection: Collection): CloudCollection["payload"] {
  return {
    children: collection.children ?? [],
    variables: collection.variables ?? defaultCollectionVariables(),
  };
}

function collectionFromCloud(dto: CloudCollection): Collection | null {
  if (!dto?.id) return null;
  const payload = dto.payload ?? {};
  return {
    id: dto.id,
    name: dto.name?.trim() || "Collection",
    favorite: Boolean(dto.favorite),
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? dto.createdAt ?? new Date().toISOString(),
    variables: Array.isArray(payload.variables) && payload.variables.length
      ? payload.variables
      : defaultCollectionVariables(),
    children: Array.isArray(payload.children) ? payload.children : [],
  };
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

function historyFromCloud(dto: CloudHistory): HistoryEntry | null {
  if (!dto?.id || !dto.request) return null;
  const raw = dto.response;
  const isFull =
    raw != null &&
    typeof raw === "object" &&
    "body" in raw &&
    "headers" in raw;
  const full = isFull ? (raw as ResponseSnapshot) : null;
  return {
    id: dto.id,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    request: dto.request,
    error: dto.error,
    workspaceId: dto.workspaceId,
    collectionId: dto.collectionId ?? null,
    requestNodeId: dto.requestNodeId ?? null,
    ...(full
      ? { response: historySummary(full), savedResponse: full }
      : raw
        ? { response: raw as HistoryEntry["response"] }
        : {}),
  };
}

async function upsertCollection(workspaceId: string, collection: Collection): Promise<void> {
  const body = {
    id: collection.id,
    name: collection.name,
    favorite: Boolean(collection.favorite),
    payload: collectionPayload(collection),
  };
  const put = await cloudJson("PUT", `/v1/collections/${collection.id}`, body);
  if (put.status === 404 || put.status === 0) {
    await cloudJson("POST", `/v1/workspaces/${workspaceId}/collections`, body);
  }
}

async function ensureWorkspace(
  local: Workspace,
  server: CloudWorkspace[],
): Promise<CloudWorkspace | null> {
  const byId = server.find((item) => item.id === local.id);
  if (byId) return byId;
  const kind: WorkspaceKind = local.kind === "team" ? "team" : "personal";
  const byKind = server.find((item) => workspaceKindOf(item) === kind);
  if (byKind) return byKind;
  const created = await cloudJson<CloudWorkspace>("POST", "/v1/workspaces", {
    name: local.name,
    kind,
  });
  return cloudItem(created);
}

export async function hydrateFromCloud(): Promise<void> {
  if (!isLoggedIn() || hydrating) return;
  const generation = ++hydrateGeneration;
  hydrating = true;
  try {
    const local = useLibraryStore.getState();
    const wsResult = await cloudJson<CloudWorkspace>("GET", "/v1/workspaces");
    if (generation !== hydrateGeneration || !isLoggedIn()) return;
    let serverWorkspaces = wsResult.ok ? cloudItems(wsResult) : [];
    let nextWorkspaces: Workspace[] = local.workspaces;
    let activeWorkspaceId = local.activeWorkspaceId;

    if (wsResult.ok) {
      const personalLocal =
        local.workspaces.find((item) => item.kind === "personal") ?? local.workspaces[0];
      const teamLocal =
        local.workspaces.find((item) => item.kind === "team") ??
        ({
          id: "local_team",
          name: "Team Workspace",
          kind: "team",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          collections: [],
          activeCollectionId: null,
        } satisfies Workspace);

      if (personalLocal) {
        const mapped = await ensureWorkspace(personalLocal, serverWorkspaces);
        if (mapped && !serverWorkspaces.some((item) => item.id === mapped.id)) {
          serverWorkspaces = [...serverWorkspaces, mapped];
        }
      }
      // Always keep a Team Workspace after sign-in (even when still empty).
      {
        const mapped = await ensureWorkspace(teamLocal, serverWorkspaces);
        if (mapped && !serverWorkspaces.some((item) => item.id === mapped.id)) {
          serverWorkspaces = [...serverWorkspaces, mapped];
        }
      }

      if (serverWorkspaces.length) {
        const kindTarget = (kind: WorkspaceKind): CloudWorkspace =>
          serverWorkspaces.find((item) => workspaceKindOf(item) === kind) ?? serverWorkspaces[0];

        for (const workspace of local.workspaces) {
          const target = isCloudWorkspaceId(workspace.id)
            ? serverWorkspaces.find((item) => item.id === workspace.id) ?? kindTarget(workspace.kind)
            : kindTarget(workspace.kind);
          for (const collection of workspace.collections) {
            if (isPlaceholderCollection(collection)) continue;
            await upsertCollection(target.id, collection);
          }
        }

        for (const entry of local.history) {
          const target =
            (entry.workspaceId && serverWorkspaces.find((item) => item.id === entry.workspaceId)) ||
            kindTarget("personal");
          await cloudJson("POST", "/v1/history", {
            id: entry.id,
            workspaceId: target.id,
            collectionId: entry.collectionId ?? undefined,
            requestNodeId: entry.requestNodeId ?? undefined,
            request: entry.request,
            response: entry.savedResponse ?? entry.response ?? undefined,
            error: entry.error,
            createdAt: entry.createdAt,
          });
        }

        nextWorkspaces = [];
        for (const remote of serverWorkspaces) {
          const list = await cloudJson<CloudCollection>(
            "GET",
            `/v1/workspaces/${remote.id}/collections`,
          );
          const collections = cloudItems(list)
            .map(collectionFromCloud)
            .filter((item): item is Collection => item !== null);
          const ensured = collections.length
            ? collections
            : [
                {
                  id: `local_${remote.id}`,
                  name: "My Collection",
                  createdAt: remote.createdAt ?? new Date().toISOString(),
                  updatedAt: remote.updatedAt ?? new Date().toISOString(),
                  favorite: false,
                  variables: defaultCollectionVariables(),
                  children: [],
                } satisfies Collection,
              ];
          nextWorkspaces.push({
            id: remote.id,
            name: remote.name,
            kind: workspaceKindOf(remote),
            createdAt: remote.createdAt ?? new Date().toISOString(),
            updatedAt: remote.updatedAt ?? new Date().toISOString(),
            collections: ensured,
            activeCollectionId: ensured[0]?.id ?? null,
          });
        }

        // Safety net: if the API omitted team (e.g. older accounts), keep one in the UI.
        if (!nextWorkspaces.some((item) => item.kind === "team")) {
          const created = await ensureWorkspace(teamLocal, serverWorkspaces);
          if (created) {
            nextWorkspaces.push({
              id: created.id,
              name: created.name || "Team Workspace",
              kind: "team",
              createdAt: created.createdAt ?? new Date().toISOString(),
              updatedAt: created.updatedAt ?? new Date().toISOString(),
              collections: [
                {
                  id: `local_${created.id}`,
                  name: "My Collection",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  favorite: false,
                  variables: defaultCollectionVariables(),
                  children: [],
                },
              ],
              activeCollectionId: `local_${created.id}`,
            });
          }
        }
      }
    }

    // Always pull history from the server after sign-in (independent of workspace sync).
    const historyResult = await cloudJson<CloudHistory>("GET", "/v1/history");
    let mergedHistory = local.history;
    if (historyResult.ok) {
      const remoteHistory = cloudItems(historyResult)
        .map(historyFromCloud)
        .filter((item): item is HistoryEntry => item !== null);
      const byId = new Map<string, HistoryEntry>();
      for (const entry of remoteHistory) byId.set(entry.id, entry);
      // Keep any local-only entries that failed to upload earlier.
      for (const entry of local.history) {
        if (!byId.has(entry.id)) byId.set(entry.id, entry);
      }
      mergedHistory = [...byId.values()]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 100);
    }

    const prefs = await cloudJson<CloudPreferences>("GET", "/v1/users/me/preferences");
    if (generation !== hydrateGeneration || !isLoggedIn()) return;
    const prefItem = cloudItem(prefs);
    if (nextWorkspaces.length) {
      activeWorkspaceId =
        nextWorkspaces.find((item) => item.id === prefItem?.activeWorkspaceId)?.id ??
        nextWorkspaces.find((item) => item.kind === "personal")?.id ??
        nextWorkspaces[0].id;
    }

    useLibraryStore.getState().applyCloudSnapshot(nextWorkspaces, activeWorkspaceId, mergedHistory);

    if (prefItem?.theme === "light" || prefItem?.theme === "dark") {
      useThemeStore.getState().setTheme(prefItem.theme, { skipCloud: true });
    }
    if (prefItem?.locale && isLocaleId(prefItem.locale)) {
      useLocaleStore.getState().setLocale(prefItem.locale, { skipCloud: true });
    }
  } finally {
    if (generation === hydrateGeneration) hydrating = false;
  }
}

async function flushLibrary(): Promise<void> {
  if (!isLoggedIn() || hydrating) return;
  const state = useLibraryStore.getState();
  for (const workspace of state.workspaces) {
    if (!isCloudWorkspaceId(workspace.id)) continue;
    for (const collection of workspace.collections) {
      if (isPlaceholderCollection(collection)) continue;
      await upsertCollection(workspace.id, collection);
    }
  }
  await cloudJson("PUT", "/v1/users/me/preferences", {
    theme: useThemeStore.getState().theme,
    locale: useLocaleStore.getState().locale,
    activeWorkspaceId: state.activeWorkspaceId,
  });
}

export function queueLibraryPush(): void {
  if (!isLoggedIn() || hydrating) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void flushLibrary();
  }, 500);
}

export function queueHistoryPush(entry: HistoryEntry): void {
  if (!isLoggedIn() || hydrating) return;
  const workspaceId = entry.workspaceId ?? useLibraryStore.getState().activeWorkspaceId;
  if (!isCloudWorkspaceId(workspaceId)) return;
  void cloudJson("POST", "/v1/history", {
    id: entry.id,
    workspaceId,
    collectionId: entry.collectionId ?? undefined,
    requestNodeId: entry.requestNodeId ?? undefined,
    request: entry.request,
    response: entry.savedResponse ?? entry.response ?? undefined,
    error: entry.error,
    createdAt: entry.createdAt,
  });
}

export function queueHistoryDelete(id: string): void {
  if (!isLoggedIn() || hydrating) return;
  void cloudJson("DELETE", `/v1/history/${id}`);
}

export function queueHistoryClear(): void {
  if (!isLoggedIn() || hydrating) return;
  const workspaceId = useLibraryStore.getState().activeWorkspaceId;
  const query = isCloudWorkspaceId(workspaceId) ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
  void cloudJson("DELETE", `/v1/history${query}`);
}

export function queueCollectionDelete(id: string): void {
  if (!isLoggedIn() || hydrating) return;
  void cloudJson("DELETE", `/v1/collections/${id}`);
}

export function queuePreferencesPush(): void {
  if (!isLoggedIn() || hydrating) return;
  void cloudJson("PUT", "/v1/users/me/preferences", {
    theme: useThemeStore.getState().theme,
    locale: useLocaleStore.getState().locale,
    activeWorkspaceId: useLibraryStore.getState().activeWorkspaceId,
  });
}
