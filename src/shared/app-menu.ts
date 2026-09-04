export const APP_MENU_COMMANDS = [
  "file.new",
  "file.newTab",
  "file.newRunnerTab",
  "file.newWindow",
  "file.importOpenapi",
  "file.importCurl",
  "file.settings",
  "file.closeWindow",
  "file.closeTab",
  "file.forceCloseTab",
  "file.exit",
  "edit.undo",
  "edit.redo",
  "edit.cut",
  "edit.copy",
  "edit.paste",
  "edit.pasteMatch",
  "edit.delete",
  "edit.selectAll",
  "view.fullScreen",
  "view.zoomIn",
  "view.zoomOut",
  "view.resetZoom",
  "view.toggleLeftSidebar",
  "view.toggleTwoPane",
  "view.toggleWorkbench",
  "view.toggleRightSidebar",
  "view.swapSidebars",
  "view.resetLayout",
  "view.goBack",
  "view.goForward",
  "view.nextTab",
  "view.prevTab",
  "view.focusUrl",
  "view.showConsole",
  "view.toggleDevTools",
  "help.checkUpdates",
  "help.clearCacheReload",
  "help.toggleHwAccel",
  "help.region.us",
  "help.region.eu",
  "help.region.asia",
  "help.docs",
  "help.github",
  "help.twitter",
  "help.support",
  "help.about",
] as const;

export type AppMenuCommand = (typeof APP_MENU_COMMANDS)[number];

const COMMAND_SET = new Set<string>(APP_MENU_COMMANDS);

export function isAppMenuCommand(value: unknown): value is AppMenuCommand {
  return typeof value === "string" && COMMAND_SET.has(value);
}

export type RegionId = "us" | "eu" | "asia";

export interface AppPrefs {
  hardwareAcceleration: boolean;
  region: RegionId;
}

export const DEFAULT_APP_PREFS: AppPrefs = {
  hardwareAcceleration: true,
  region: "us",
};

export const HELP_LINKS = {
  docs: "https://gitlab.abriment.com/mychapar/mychapar-web-electron",
  github: "https://gitlab.abriment.com/mychapar/mychapar-web-electron",
  twitter: "https://x.com",
  support: "https://gitlab.abriment.com/mychapar/mychapar-web-electron/-/issues",
} as const;

export const MAIN_MENU_COMMANDS = new Set<AppMenuCommand>([
  "file.newWindow",
  "file.closeWindow",
  "file.exit",
  "edit.undo",
  "edit.redo",
  "edit.cut",
  "edit.copy",
  "edit.paste",
  "edit.pasteMatch",
  "edit.delete",
  "edit.selectAll",
  "view.fullScreen",
  "view.zoomIn",
  "view.zoomOut",
  "view.resetZoom",
  "view.toggleDevTools",
  "help.clearCacheReload",
  "help.toggleHwAccel",
  "help.docs",
  "help.github",
  "help.twitter",
  "help.support",
]);

export type MenuLabels = {
  file: string;
  edit: string;
  view: string;
  help: string;
  new: string;
  newTab: string;
  newRunnerTab: string;
  newWindow: string;
  import: string;
  importOpenapi: string;
  importCurl: string;
  settings: string;
  closeWindow: string;
  closeTab: string;
  forceCloseTab: string;
  exit: string;
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  pasteMatch: string;
  delete: string;
  selectAll: string;
  fullScreen: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  toggleLeftSidebar: string;
  toggleTwoPane: string;
  toggleWorkbench: string;
  toggleRightSidebar: string;
  swapSidebars: string;
  resetLayout: string;
  goBack: string;
  goForward: string;
  nextTab: string;
  prevTab: string;
  showConsole: string;
  developer: string;
  toggleDevTools: string;
  checkUpdates: string;
  clearCache: string;
  hwAccel: string;
  region: string;
  regionUs: string;
  regionEu: string;
  regionAsia: string;
  docs: string;
  github: string;
  twitter: string;
  support: string;
  about: string;
  restartTitle: string;
  restartHwAccel: string;
};

export const DEFAULT_MENU_LABELS: MenuLabels = {
  file: "File",
  edit: "Edit",
  view: "View",
  help: "Help",
  new: "New...",
  newTab: "New Tab",
  newRunnerTab: "New Runner Tab",
  newWindow: "New Window",
  import: "Import...",
  importOpenapi: "OpenAPI / Swagger...",
  importCurl: "cURL...",
  settings: "Settings",
  closeWindow: "Close Window",
  closeTab: "Close Tab",
  forceCloseTab: "Force Close Tab",
  exit: "Exit",
  undo: "Undo",
  redo: "Redo",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  pasteMatch: "Paste and Match Style",
  delete: "Delete",
  selectAll: "Select All",
  fullScreen: "Toggle Full Screen",
  zoomIn: "Zoom In",
  zoomOut: "Zoom Out",
  resetZoom: "Reset Zoom",
  toggleLeftSidebar: "Toggle Left Sidebar",
  toggleTwoPane: "Toggle Two-Pane View",
  toggleWorkbench: "Toggle Workbench",
  toggleRightSidebar: "Toggle Right Sidebar",
  swapSidebars: "Swap Left and Right Sidebar",
  resetLayout: "Reset Layout",
  goBack: "Go Back",
  goForward: "Go Forward",
  nextTab: "Next Tab",
  prevTab: "Previous Tab",
  showConsole: "Show Console",
  developer: "Developer",
  toggleDevTools: "Toggle Developer Tools",
  checkUpdates: "Check for Updates",
  clearCache: "Clear Cache and Reload",
  hwAccel: "Disable Hardware Acceleration",
  region: "Region Preference for New Accounts",
  regionUs: "United States",
  regionEu: "Europe",
  regionAsia: "Asia Pacific",
  docs: "Documentation",
  github: "GitHub",
  twitter: "Twitter",
  support: "Support",
  about: "About MYs Chapar",
  restartTitle: "Restart required",
  restartHwAccel: "Hardware acceleration changes take effect after you restart MYs Chapar.",
};

export function mergeMenuLabels(partial?: Partial<MenuLabels> | null): MenuLabels {
  if (!partial) return { ...DEFAULT_MENU_LABELS };
  return { ...DEFAULT_MENU_LABELS, ...partial };
}
