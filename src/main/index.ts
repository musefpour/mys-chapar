import { BrowserWindow, app, dialog, ipcMain, nativeImage, shell, type Input, type NativeImage } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  HELP_LINKS,
  isAppMenuCommand,
  type AppMenuCommand,
  type MenuLabels,
} from "@shared/app-menu";
import { IPC } from "@shared/types";
import { registerFetchTextIpc } from "./ipc/fetch-text.handler";
import { registerAuthIpc } from "./ipc/auth.handler";
import { registerCloudIpc } from "./ipc/cloud.handler";
import { registerRequestIpc } from "./ipc/request.handler";
import { registerSaveFileIpc } from "./ipc/save-file.handler";
import { registerShellIpc } from "./ipc/shell.handler";
import {
  currentMenuLabels,
  installAppMenu,
  menuCommandFromInput,
  setMenuCommandHandler,
  zoomStep,
} from "./menu";
import { applyHardwareAcceleration, loadPrefs, savePrefs } from "./prefs";
import { APP_AUTHOR, APP_NAME } from "@shared/app-version";

applyHardwareAcceleration();
app.setName(APP_NAME);

function broadcastPrefs(): void {
  const prefs = loadPrefs();
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.PREFS_CHANGED, prefs);
  }
}

function isReloadShortcut(input: Input): boolean {
  if (input.type !== "keyDown") return false;
  const key = input.key.toLowerCase();
  if (key === "f5") return true;
  const mod = input.meta || input.control;
  if (!mod) return false;
  return key === "r" && !input.alt && !input.shift;
}

function isNewRunnerShortcut(input: Input): boolean {
  if (input.type !== "keyDown") return false;
  if (input.key.toLowerCase() !== "r") return false;
  if (!input.shift || input.alt) return false;
  return Boolean(input.meta || input.control);
}

function focusedWindow(win?: BrowserWindow | null): BrowserWindow | null {
  return win ?? BrowserWindow.getFocusedWindow();
}

async function handleMenuCommand(
  win: BrowserWindow | null,
  command: AppMenuCommand,
): Promise<void> {
  const target = focusedWindow(win);

  switch (command) {
    case "file.newWindow":
      createWindow();
      return;
    case "file.closeWindow":
      target?.close();
      return;
    case "file.exit":
      app.quit();
      return;
    case "edit.undo":
      target?.webContents.undo();
      return;
    case "edit.redo":
      target?.webContents.redo();
      return;
    case "edit.cut":
      target?.webContents.cut();
      return;
    case "edit.copy":
      target?.webContents.copy();
      return;
    case "edit.paste":
      target?.webContents.paste();
      return;
    case "edit.pasteMatch":
      target?.webContents.pasteAndMatchStyle();
      return;
    case "edit.delete":
      target?.webContents.delete();
      return;
    case "edit.selectAll":
      target?.webContents.selectAll();
      return;
    case "view.fullScreen":
      if (target) target.setFullScreen(!target.isFullScreen());
      return;
    case "view.zoomIn":
      if (target) zoomStep(target, 0.5);
      return;
    case "view.zoomOut":
      if (target) zoomStep(target, -0.5);
      return;
    case "view.resetZoom":
      target?.webContents.setZoomLevel(0);
      return;
    case "view.toggleDevTools":
      target?.webContents.toggleDevTools();
      return;
    case "help.clearCacheReload":
      if (!target) return;
      await target.webContents.session.clearCache();
      target.webContents.reload();
      return;
    case "help.toggleHwAccel": {
      const prefs = loadPrefs();
      savePrefs({ hardwareAcceleration: !prefs.hardwareAcceleration });
      installAppMenu(currentMenuLabels());
      broadcastPrefs();
      const labels = currentMenuLabels();
      if (target) {
        await dialog.showMessageBox(target, {
          type: "info",
          title: labels.restartTitle,
          message: labels.restartTitle,
          detail: labels.restartHwAccel,
        });
      } else {
        await dialog.showMessageBox({
          type: "info",
          title: labels.restartTitle,
          message: labels.restartTitle,
          detail: labels.restartHwAccel,
        });
      }
      return;
    }
    case "help.docs":
      void shell.openExternal(HELP_LINKS.docs);
      return;
    case "help.github":
      void shell.openExternal(HELP_LINKS.github);
      return;
    case "help.twitter":
      void shell.openExternal(HELP_LINKS.twitter);
      return;
    case "help.support":
      void shell.openExternal(HELP_LINKS.support);
      return;
    case "help.about": {
      const win = target ?? BrowserWindow.getAllWindows()[0] ?? null;
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
        win.webContents.send(IPC.MENU_COMMAND, command);
      } else {
        app.showAboutPanel();
      }
      return;
    }
    default:
      target?.webContents.send(IPC.MENU_COMMAND, command);
  }
}

function resolveAppIconPath(): string | undefined {
  const candidates = [
    join(process.resourcesPath, "icon.png"),
    join(process.resourcesPath, "build", "icon.png"),
    join(__dirname, "../../build/icon.png"),
    join(app.getAppPath(), "build", "icon.png"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function resolveAppIcon(): NativeImage | undefined {
  const iconPath = resolveAppIconPath();
  if (!iconPath) return undefined;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? undefined : image;
}

function configureAboutPanel(): void {
  app.setName(APP_NAME);
  const iconPath = resolveAppIconPath();
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    copyright: `Copyright © ${APP_AUTHOR}`,
    credits:
      `A desktop HTTP client for building, sending, and organizing API requests.\n\nCreated by ${APP_AUTHOR}`,
    authors: [APP_AUTHOR],
    ...(iconPath ? { iconPath } : {}),
  });
}

function createWindow(): void {
  const icon = resolveAppIcon();
  const isMac = process.platform === "darwin";
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: APP_NAME,
    backgroundColor: "#f9f9f9",
    show: false,
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    ...(isMac
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 14, y: 12 },
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (isReloadShortcut(input) || isNewRunnerShortcut(input)) {
      event.preventDefault();
      return;
    }
    const command = menuCommandFromInput(input);
    if (!command) return;
    event.preventDefault();
    void handleMenuCommand(mainWindow, command);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function registerMenuIpc(): void {
  setMenuCommandHandler((win, command) => {
    void handleMenuCommand(win, command);
  });

  ipcMain.handle(IPC.MENU_INVOKE, async (event, command: unknown) => {
    if (!isAppMenuCommand(command)) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    await handleMenuCommand(win, command);
  });

  ipcMain.on(IPC.MENU_SET_LABELS, (_event, labels: Partial<MenuLabels> | undefined) => {
    installAppMenu(labels);
  });

  ipcMain.handle(IPC.GET_PREFS, () => loadPrefs());

  ipcMain.handle(IPC.SET_PREFS, (_event, patch: unknown) => {
    const next = savePrefs(
      patch && typeof patch === "object" ? (patch as Partial<ReturnType<typeof loadPrefs>>) : {},
    );
    installAppMenu(currentMenuLabels());
    broadcastPrefs();
    return next;
  });
}

app.whenReady().then(() => {
  configureAboutPanel();
  const icon = resolveAppIcon();
  if (icon && process.platform === "darwin" && app.dock) {
    app.dock.setIcon(icon);
  }

  installAppMenu();
  registerMenuIpc();
  registerRequestIpc();
  registerFetchTextIpc();
  registerAuthIpc();
  registerCloudIpc();
  registerShellIpc();
  registerSaveFileIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
