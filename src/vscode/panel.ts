import { readFileSync } from "node:fs";
import { homedir, release } from "node:os";
import { join } from "node:path";
import * as vscode from "vscode";
import {
  DEFAULT_APP_PREFS,
  HELP_LINKS,
  isAppMenuCommand,
  type AppPrefs,
  type RegionId,
} from "@shared/app-menu";
import { fetchTextResource } from "@shared/fetch-text";
import { sendHttpRequest } from "@shared/send-http-request";
import {
  IPC,
  type FetchTextPayload,
  type SaveTextFilePayload,
  type SendRequestPayload,
  type ShellRunPayload,
} from "@shared/types";
import { ShellSession } from "./shell";

const VIEW_TYPE = "mychapar.panel";
const PREFS_KEY = "mychapar.prefs";

interface WebviewRpc {
  id?: number;
  type?: string;
  payload?: unknown;
}

const panels = new Set<vscode.WebviewPanel>();

export function openChaparPanel(context: vscode.ExtensionContext): void {
  const existing = [...panels][0];
  if (existing) {
    existing.reveal(vscode.ViewColumn.One);
    return;
  }
  createChaparPanel(context);
}

export function createChaparPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    "MYs Chapar",
    vscode.ViewColumn.One,
    webviewOptions(context),
  );
  applyIcon(context, panel);
  bindPanel(context, panel);
  return panel;
}

export function restoreChaparPanel(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
): void {
  panel.webview.options = webviewOptions(context);
  applyIcon(context, panel);
  bindPanel(context, panel);
}

function applyIcon(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): void {
  const icon = vscode.Uri.joinPath(context.extensionUri, "icons", "icon128.png");
  panel.iconPath = { light: icon, dark: icon };
}

function webviewOptions(
  context: vscode.ExtensionContext,
): vscode.WebviewPanelOptions & vscode.WebviewOptions {
  return {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, "webview"),
      vscode.Uri.joinPath(context.extensionUri, "icons"),
    ],
  };
}

function bindPanel(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): void {
  panels.add(panel);
  const shell = new ShellSession(workspaceCwd());
  const controllers = new Map<string, AbortController>();
  panel.webview.html = renderWebviewHtml(context, panel.webview);

  const disposable = panel.webview.onDidReceiveMessage(async (message: WebviewRpc) => {
    await handleMessage(context, panel, shell, controllers, message);
  });

  panel.onDidDispose(() => {
    disposable.dispose();
    panels.delete(panel);
    for (const controller of controllers.values()) controller.abort();
    controllers.clear();
  });
}

async function handleMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  shell: ShellSession,
  controllers: Map<string, AbortController>,
  message: WebviewRpc,
): Promise<void> {
  if (!message || typeof message !== "object" || !message.type) return;

  if (message.type === IPC.CANCEL_REQUEST) {
    const requestId = String(message.payload ?? "");
    const controller = controllers.get(requestId);
    if (controller) {
      controller.abort();
      controllers.delete(requestId);
    }
    return;
  }

  if (message.type === IPC.MENU_SET_LABELS) {
    return;
  }

  if (typeof message.id !== "number") return;

  try {
    const result = await dispatch(context, panel, shell, controllers, message.type, message.payload);
    await panel.webview.postMessage({ id: message.id, ok: true, result });
  } catch (error) {
    await panel.webview.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : "VS Code host error",
    });
  }
}

async function dispatch(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  shell: ShellSession,
  controllers: Map<string, AbortController>,
  type: string,
  payload: unknown,
): Promise<unknown> {
  switch (type) {
    case IPC.SEND_REQUEST:
      return sendFromHost(payload as SendRequestPayload, controllers);
    case IPC.FETCH_TEXT:
      return fetchTextResource(payload as FetchTextPayload);
    case IPC.SHELL_INFO:
      return shell.info();
    case IPC.SHELL_RUN:
      return shell.run((payload as ShellRunPayload) ?? { command: "" });
    case IPC.SAVE_TEXT_FILE:
      return saveTextFile(payload as SaveTextFilePayload);
    case IPC.GET_PREFS:
      return loadPrefs(context);
    case IPC.SET_PREFS: {
      const next = savePrefs(context, payload);
      await panel.webview.postMessage({ type: IPC.PREFS_CHANGED, prefs: next });
      return next;
    }
    case IPC.MENU_INVOKE:
      await handleMenu(context, panel, payload);
      return undefined;
    case IPC.CLIPBOARD_READ_TEXT:
      return vscode.env.clipboard.readText();
    case IPC.CLIPBOARD_WRITE_TEXT:
      await vscode.env.clipboard.writeText(typeof payload === "string" ? payload : String(payload ?? ""));
      return undefined;
    default:
      throw new Error(`Unknown message: ${type}`);
  }
}

async function sendFromHost(
  payload: SendRequestPayload,
  controllers: Map<string, AbortController>,
) {
  const requestId = payload.request.id;
  const controller = new AbortController();
  controllers.set(requestId, controller);
  try {
    const response = await sendHttpRequest(payload.request, controller.signal);
    return { ok: true, response };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown request error";
    const cancelled =
      errMessage.toLowerCase().includes("abort") ||
      (error instanceof DOMException && error.name === "AbortError");
    return {
      ok: false,
      error: cancelled ? "Request cancelled" : errMessage,
    };
  } finally {
    controllers.delete(requestId);
  }
}

async function saveTextFile(payload: SaveTextFilePayload) {
  const filters = payload.filters?.map((filter) => ({
    name: filter.name,
    extensions: filter.extensions,
  }));
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(join(workspaceCwd() || homedir(), payload.defaultName)),
    filters: filters?.length
      ? Object.fromEntries(filters.map((filter) => [filter.name, filter.extensions]))
      : undefined,
  });
  if (!uri) return { ok: false, cancelled: true };
  try {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(payload.content, "utf8"));
    return { ok: true, path: uri.fsPath };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not write file",
    };
  }
}

async function handleMenu(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  payload: unknown,
): Promise<void> {
  if (!isAppMenuCommand(payload)) return;
  const command = payload;

  switch (command) {
    case "file.newWindow":
      createChaparPanel(context);
      return;
    case "file.closeWindow":
    case "file.exit":
      panel.dispose();
      return;
    case "view.fullScreen":
      await vscode.commands.executeCommand("workbench.action.toggleFullScreen");
      return;
    case "view.toggleDevTools":
      await vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools");
      return;
    case "help.docs":
      await vscode.env.openExternal(vscode.Uri.parse(HELP_LINKS.docs));
      return;
    case "help.github":
      await vscode.env.openExternal(vscode.Uri.parse(HELP_LINKS.github));
      return;
    case "help.twitter":
      // Twitter / X link is disabled until an official account exists.
      return;
    case "help.support":
      await vscode.env.openExternal(vscode.Uri.parse(HELP_LINKS.support));
      return;
    case "help.clearCacheReload":
      panel.webview.html = renderWebviewHtml(context, panel.webview);
      return;
    case "help.toggleHwAccel": {
      const prefs = loadPrefs(context);
      const next = savePrefs(context, { hardwareAcceleration: !prefs.hardwareAcceleration });
      await panel.webview.postMessage({ type: IPC.PREFS_CHANGED, prefs: next });
      await vscode.window.showInformationMessage(
        "Hardware acceleration in VS Code is controlled by the editor, not MYs Chapar.",
      );
      return;
    }
    default:
      await panel.webview.postMessage({ type: IPC.MENU_COMMAND, command });
  }
}

function loadPrefs(context: vscode.ExtensionContext): AppPrefs {
  const stored = context.globalState.get<Partial<AppPrefs>>(PREFS_KEY);
  return {
    hardwareAcceleration: stored?.hardwareAcceleration !== false,
    region: parseRegion(stored?.region),
  };
}

function savePrefs(context: vscode.ExtensionContext, patch: unknown): AppPrefs {
  const current = loadPrefs(context);
  const next: AppPrefs = {
    ...current,
    ...(patch && typeof patch === "object" ? (patch as Partial<AppPrefs>) : {}),
  };
  if (patch && typeof patch === "object" && "region" in patch) {
    next.region = parseRegion((patch as Partial<AppPrefs>).region);
  }
  void context.globalState.update(PREFS_KEY, next);
  return next;
}

function parseRegion(value: unknown): RegionId {
  if (value === "eu" || value === "asia" || value === "us") return value;
  return DEFAULT_APP_PREFS.region;
}

function workspaceCwd(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? homedir();
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export function renderWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
): string {
  const webviewRoot = vscode.Uri.joinPath(context.extensionUri, "webview");
  const htmlPath = join(webviewRoot.fsPath, "index.html");
  const nonce = getNonce();
  const init = {
    platform: process.platform,
    arch: process.arch,
    osRelease: release(),
    vscodeVersion: vscode.version,
  };

  let html = readFileSync(htmlPath, "utf8");
  html = html.replace(/(?:src|href)="(\.\/[^"]+)"/g, (full, relative: string) => {
    const attr = full.startsWith("src") ? "src" : "href";
    const cleaned = relative.replace(/^\.\//, "");
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, ...cleaned.split("/")));
    return `${attr}="${uri}"`;
  });
  html = html.replace(/\scrossorigin(?:="[^"]*")?/g, "");
  html = html.replace(/<script/g, `<script nonce="${nonce}"`);

  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`,
    `connect-src http: https: ${webview.cspSource}`,
  ].join("; ");

  const inject = [
    `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    `<script nonce="${nonce}">window.__MYCHAPAR_INIT__ = ${JSON.stringify(init)};</script>`,
  ].join("\n    ");

  if (html.includes("</head>")) {
    html = html.replace("</head>", `    ${inject}\n  </head>`);
  } else {
    html = inject + html;
  }

  return html;
}
