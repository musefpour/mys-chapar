import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import os from "node:os";
import {
  IPC,
  type AuthEmailPayload,
  type AuthOAuthResult,
  type AuthOAuthStartPayload,
  type CloudFetchPayload,
  type CloudFetchResult,
  type FetchTextPayload,
  type FetchTextResponse,
  type MyChaparApi,
  type SaveTextFilePayload,
  type SaveTextFileResult,
  type SendRequestPayload,
  type SendRequestResponse,
  type ShellInfo,
  type ShellRunPayload,
  type ShellRunResult,
} from "@shared/types";
import {
  isAppMenuCommand,
  type AppMenuCommand,
  type AppPrefs,
  type MenuLabels,
} from "@shared/app-menu";

const api: MyChaparApi = {
  sendRequest: (payload: SendRequestPayload): Promise<SendRequestResponse> =>
    ipcRenderer.invoke(IPC.SEND_REQUEST, payload),
  cancelRequest: (requestId: string): void => {
    ipcRenderer.send(IPC.CANCEL_REQUEST, requestId);
  },
  fetchText: (payload: FetchTextPayload): Promise<FetchTextResponse> =>
    ipcRenderer.invoke(IPC.FETCH_TEXT, payload),
  saveTextFile: (payload: SaveTextFilePayload): Promise<SaveTextFileResult> =>
    ipcRenderer.invoke(IPC.SAVE_TEXT_FILE, payload),
  startOAuth: (payload: AuthOAuthStartPayload): Promise<AuthOAuthResult> =>
    ipcRenderer.invoke(IPC.AUTH_OAUTH_START, payload),
  authEmail: (payload: AuthEmailPayload): Promise<AuthOAuthResult> =>
    ipcRenderer.invoke(IPC.AUTH_EMAIL, payload),
  cloudFetch: (payload: CloudFetchPayload): Promise<CloudFetchResult> =>
    ipcRenderer.invoke(IPC.CLOUD_FETCH, payload),
  platform: process.platform,
  arch: process.arch,
  osRelease: os.release(),
  electronVersion: process.versions.electron,
  getShellInfo: (): Promise<ShellInfo> => ipcRenderer.invoke(IPC.SHELL_INFO),
  runShell: (payload: ShellRunPayload): Promise<ShellRunResult> =>
    ipcRenderer.invoke(IPC.SHELL_RUN, payload),
  onCloseActiveTab: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC.CLOSE_ACTIVE_TAB, listener);
    return () => {
      ipcRenderer.removeListener(IPC.CLOSE_ACTIVE_TAB, listener);
    };
  },
  invokeMenu: (command: AppMenuCommand) => ipcRenderer.invoke(IPC.MENU_INVOKE, command),
  onMenuCommand: (callback) => {
    const listener = (_event: IpcRendererEvent, command: unknown) => {
      if (isAppMenuCommand(command)) callback(command);
    };
    ipcRenderer.on(IPC.MENU_COMMAND, listener);
    return () => {
      ipcRenderer.removeListener(IPC.MENU_COMMAND, listener);
    };
  },
  setMenuLabels: (labels: MenuLabels) => {
    ipcRenderer.send(IPC.MENU_SET_LABELS, labels);
  },
  getPrefs: (): Promise<AppPrefs> => ipcRenderer.invoke(IPC.GET_PREFS),
  setPrefs: (patch: Partial<AppPrefs>): Promise<AppPrefs> =>
    ipcRenderer.invoke(IPC.SET_PREFS, patch),
  onPrefsChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, prefs: AppPrefs) => {
      callback(prefs);
    };
    ipcRenderer.on(IPC.PREFS_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.PREFS_CHANGED, listener);
    };
  },
};

contextBridge.exposeInMainWorld("mychapar", api);
