import { BrowserWindow, Menu, type Input, type MenuItemConstructorOptions } from "electron";
import {
  DEFAULT_MENU_LABELS,
  mergeMenuLabels,
  type AppMenuCommand,
  type MenuLabels,
} from "@shared/app-menu";

export type MenuCommandHandler = (
  win: BrowserWindow | null,
  command: AppMenuCommand,
) => void;

let currentLabels: MenuLabels = { ...DEFAULT_MENU_LABELS };
let dispatch: MenuCommandHandler = () => undefined;

function isMac(): boolean {
  return process.platform === "darwin";
}

function send(
  command: AppMenuCommand,
): MenuItemConstructorOptions["click"] {
  return (_item, browserWindow) => {
    const win =
      browserWindow instanceof BrowserWindow
        ? browserWindow
        : BrowserWindow.getFocusedWindow();
    dispatch(win, command);
  };
}

export function setMenuCommandHandler(handler: MenuCommandHandler): void {
  dispatch = handler;
}

/** Native menu is only the macOS app menu (Quit / Hide). File/Edit/View/Help live in the in-app icon. */
export function installAppMenu(labels?: Partial<MenuLabels> | null): void {
  currentLabels = mergeMenuLabels(labels);
  const l = currentLabels;
  if (!isMac()) {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        role: "appMenu",
        submenu: [
          { label: l.about, click: send("help.about") },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
    ]),
  );
}

function commandOrControl(input: Input): boolean {
  return isMac() ? Boolean(input.meta) : Boolean(input.control);
}

function keyOf(input: Input): string {
  if (input.key.length === 1) return input.key.toLowerCase();
  return input.key;
}

/** Map a keydown to an in-app menu command. Edit shortcuts stay with Chromium. */
export function menuCommandFromInput(input: Input): AppMenuCommand | null {
  if (input.type !== "keyDown" || input.isAutoRepeat) return null;

  const key = keyOf(input);
  const mod = commandOrControl(input);
  const alt = Boolean(input.alt);
  const shift = Boolean(input.shift);

  if (input.control && !input.meta && !alt && key === "Tab") {
    return shift ? "view.prevTab" : "view.nextTab";
  }

  if (alt && !mod && !shift && (key === "ArrowLeft" || key === "Left")) return "view.goBack";
  if (alt && !mod && !shift && (key === "ArrowRight" || key === "Right")) return "view.goForward";

  if (!mod) {
    if (key === "F11") return "view.fullScreen";
    if (key === "F12") return "view.toggleDevTools";
    return null;
  }

  if (alt && !shift) {
    if (key === "v") return "view.toggleTwoPane";
    if (key === "m") return "view.toggleWorkbench";
    if (key === "\\") return "view.toggleRightSidebar";
    if (key === "s") return "view.swapSidebars";
    if (key === "r") return "view.resetLayout";
    if (key === "c") return "view.showConsole";
    if (key === "w") return "file.forceCloseTab";
    if (key === "i") return "view.toggleDevTools";
    return null;
  }

  if (shift && !alt) {
    if (key === "n") return "file.newWindow";
    if (key === "w") return "file.closeWindow";
    if (key === "r") return null;
    if (key === "i") return "view.toggleDevTools";
    return null;
  }

  if (alt || shift) return null;

  if (key === "n") return "file.new";
  if (key === "t") return "file.newTab";
  if (key === "o") return "file.importOpenapi";
  if (key === ",") return "file.settings";
  if (key === "w") return "file.closeTab";
  if (key === "F4") return "file.closeTab";
  if (key === "l") return "view.focusUrl";
  if (key === "\\") return "view.toggleLeftSidebar";
  if (key === "=" || key === "+") return "view.zoomIn";
  if (key === "-") return "view.zoomOut";
  if (key === "0") return "view.resetZoom";
  if (key === "r") return null;
  return null;
}

export function currentMenuLabels(): MenuLabels {
  return currentLabels;
}

export function zoomStep(win: BrowserWindow, delta: number): void {
  const next = win.webContents.getZoomLevel() + delta;
  win.webContents.setZoomLevel(Math.min(5, Math.max(-5, next)));
}
