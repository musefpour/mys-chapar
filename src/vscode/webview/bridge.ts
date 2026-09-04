import type { AppMenuCommand, AppPrefs, MenuLabels } from "@shared/app-menu";
import { isAppMenuCommand } from "@shared/app-menu";
import { IPC } from "@shared/types";
import type {
  FetchTextPayload,
  FetchTextResponse,
  MyChaparApi,
  SaveTextFilePayload,
  SaveTextFileResult,
  SendRequestPayload,
  SendRequestResponse,
  ShellInfo,
  ShellRunPayload,
  ShellRunResult,
} from "@shared/types";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface RpcMessage {
  id?: number;
  type?: string;
  payload?: unknown;
  command?: unknown;
  prefs?: AppPrefs;
  ok?: boolean;
  result?: unknown;
  error?: string;
}

const vscode = acquireVsCodeApi();
const pending = new Map<number, Pending>();
const menuListeners = new Set<(command: AppMenuCommand) => void>();
const prefsListeners = new Set<(prefs: AppPrefs) => void>();
const closeTabListeners = new Set<() => void>();
let nextId = 1;
let zoom = 1;

function rpc<T>(type: string, payload?: unknown): Promise<T> {
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
    });
    vscode.postMessage({ id, type, payload });
  });
}

function applyZoom(next: number): void {
  zoom = Math.min(3, Math.max(0.5, Math.round(next * 100) / 100));
  document.documentElement.style.zoom = String(zoom);
}

function runEdit(command: AppMenuCommand): void {
  const map: Partial<Record<AppMenuCommand, string>> = {
    "edit.undo": "undo",
    "edit.redo": "redo",
    "edit.cut": "cut",
    "edit.copy": "copy",
    "edit.paste": "paste",
    "edit.pasteMatch": "paste",
    "edit.delete": "delete",
    "edit.selectAll": "selectAll",
  };
  const name = map[command];
  if (name) document.execCommand(name);
}

function handleHostCommand(command: AppMenuCommand): void {
  if (command === "view.zoomIn") applyZoom(zoom + 0.1);
  else if (command === "view.zoomOut") applyZoom(zoom - 0.1);
  else if (command === "view.resetZoom") applyZoom(1);
  else if (command.startsWith("edit.")) runEdit(command);
  for (const listener of menuListeners) listener(command);
}

window.addEventListener("message", (event: MessageEvent<RpcMessage>) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (typeof message.id === "number" && pending.has(message.id)) {
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (!waiter) return;
    if (message.ok === false) {
      waiter.reject(new Error(message.error || "VS Code host error"));
      return;
    }
    waiter.resolve(message.result);
    return;
  }

  if (message.type === IPC.MENU_COMMAND && isAppMenuCommand(message.command)) {
    handleHostCommand(message.command);
    return;
  }

  if (message.type === IPC.PREFS_CHANGED && message.prefs) {
    for (const listener of prefsListeners) listener(message.prefs);
    return;
  }

  if (message.type === IPC.CLOSE_ACTIVE_TAB) {
    for (const listener of closeTabListeners) listener();
  }
});

function installVsCodeBridge(): void {
  const init = window.__MYCHAPAR_INIT__;
  const api: MyChaparApi = {
    sendRequest: (payload: SendRequestPayload): Promise<SendRequestResponse> =>
      rpc(IPC.SEND_REQUEST, payload),
    cancelRequest: (requestId: string): void => {
      vscode.postMessage({ type: IPC.CANCEL_REQUEST, payload: requestId });
    },
    fetchText: (payload: FetchTextPayload): Promise<FetchTextResponse> =>
      rpc(IPC.FETCH_TEXT, payload),
    saveTextFile: (payload: SaveTextFilePayload): Promise<SaveTextFileResult> =>
      rpc(IPC.SAVE_TEXT_FILE, payload),
    platform: init?.platform,
    arch: init?.arch,
    osRelease: init?.osRelease,
    vscodeVersion: init?.vscodeVersion,
    getShellInfo: (): Promise<ShellInfo> => rpc(IPC.SHELL_INFO),
    runShell: (payload: ShellRunPayload): Promise<ShellRunResult> => rpc(IPC.SHELL_RUN, payload),
    onCloseActiveTab: (callback) => {
      closeTabListeners.add(callback);
      return () => {
        closeTabListeners.delete(callback);
      };
    },
    invokeMenu: (command: AppMenuCommand) => rpc(IPC.MENU_INVOKE, command),
    onMenuCommand: (callback) => {
      menuListeners.add(callback);
      return () => {
        menuListeners.delete(callback);
      };
    },
    setMenuLabels: (labels: MenuLabels) => {
      vscode.postMessage({ type: IPC.MENU_SET_LABELS, payload: labels });
    },
    getPrefs: (): Promise<AppPrefs> => rpc(IPC.GET_PREFS),
    setPrefs: (patch: Partial<AppPrefs>): Promise<AppPrefs> => rpc(IPC.SET_PREFS, patch),
    onPrefsChanged: (callback) => {
      prefsListeners.add(callback);
      return () => {
        prefsListeners.delete(callback);
      };
    },
  };

  window.mychapar = api;
}

installVsCodeBridge();
