import { create } from "zustand";
import { DEFAULT_APP_PREFS, type RegionId } from "@shared/app-menu";

export type BottomPanelTab = "console" | "terminal" | "issues";
export type RightPanel = "code" | "variables" | null;
export type ImportDialog = "curl" | "openapi" | null;
export type SettingsSection =
  | "general"
  | "themes"
  | "shortcuts"
  | "data"
  | "addons"
  | "certificates"
  | "proxy"
  | "update"
  | "about";

const SIDEBAR_KEY = "mychapar.sidebar-collapsed";
const PANEL_OPEN_KEY = "mychapar.bottom-panel-open";
const PANEL_TAB_KEY = "mychapar.bottom-panel-tab";
const PANEL_RATIO_KEY = "mychapar.bottom-panel-ratio";
const TWO_PANE_KEY = "mychapar.two-pane";
const SIDEBAR_END_KEY = "mychapar.sidebar-end";
const RIGHT_PANEL_KEY = "mychapar.right-panel";

export const BOTTOM_MIN_RATIO = 0.16;
export const BOTTOM_MAX_RATIO = 0.55;

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // ignore
  }
  return fallback;
}

function readTab(): BottomPanelTab {
  try {
    const raw = localStorage.getItem(PANEL_TAB_KEY);
    if (raw === "console" || raw === "terminal" || raw === "issues") return raw;
  } catch {
    // ignore
  }
  return "terminal";
}

function readRatio(): number {
  try {
    const value = Number(localStorage.getItem(PANEL_RATIO_KEY));
    if (Number.isFinite(value) && value >= BOTTOM_MIN_RATIO && value <= BOTTOM_MAX_RATIO) {
      return value;
    }
  } catch {
    // ignore
  }
  return 0.28;
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function readRightPanel(): RightPanel {
  try {
    const raw = localStorage.getItem(RIGHT_PANEL_KEY);
    if (raw === "code" || raw === "variables") return raw;
    if (localStorage.getItem("mychapar.code-panel-open") === "1") return "code";
  } catch {
    // ignore
  }
  return null;
}

interface UiState {
  sidebarCollapsed: boolean;
  sidebarOnRight: boolean;
  twoPane: boolean;
  rightPanel: RightPanel;
  bottomPanelOpen: boolean;
  bottomPanelTab: BottomPanelTab;
  bottomPanelRatio: number;
  settingsOpen: boolean;
  settingsSection: SettingsSection;
  aboutOpen: boolean;
  importDialog: ImportDialog;
  pendingNewCollection: boolean;
  toast: string | null;
  hardwareAcceleration: boolean;
  region: RegionId;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOnRight: (onRight: boolean) => void;
  toggleSidebarSide: () => void;
  setTwoPane: (twoPane: boolean) => void;
  toggleTwoPane: () => void;
  setRightPanel: (panel: RightPanel) => void;
  toggleRightPanel: (panel?: Exclude<RightPanel, null>) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setBottomPanelRatio: (ratio: number) => void;
  openBottomPanel: (tab: BottomPanelTab) => void;
  toggleBottomPanel: (tab: BottomPanelTab) => void;
  closeBottomPanel: () => void;
  setSettingsOpen: (open: boolean) => void;
  setSettingsSection: (section: SettingsSection) => void;
  openSettings: (section?: SettingsSection) => void;
  setAboutOpen: (open: boolean) => void;
  setImportDialog: (kind: ImportDialog) => void;
  requestNewCollection: () => void;
  clearPendingNewCollection: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setHardwareAcceleration: (enabled: boolean) => void;
  setRegion: (region: RegionId) => void;
  hydratePrefs: (prefs: { hardwareAcceleration: boolean; region: RegionId }) => void;
  resetLayout: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: readBool(SIDEBAR_KEY, false),
  sidebarOnRight: readBool(SIDEBAR_END_KEY, false),
  twoPane: readBool(TWO_PANE_KEY, false),
  rightPanel: readRightPanel(),
  bottomPanelOpen: readBool(PANEL_OPEN_KEY, false),
  bottomPanelTab: readTab(),
  bottomPanelRatio: readRatio(),
  settingsOpen: false,
  settingsSection: "general",
  aboutOpen: false,
  importDialog: null,
  pendingNewCollection: false,
  toast: null,
  hardwareAcceleration: DEFAULT_APP_PREFS.hardwareAcceleration,
  region: DEFAULT_APP_PREFS.region,

  setSidebarCollapsed: (collapsed) => {
    write(SIDEBAR_KEY, collapsed ? "1" : "0");
    set({ sidebarCollapsed: collapsed });
  },

  toggleSidebar: () => {
    get().setSidebarCollapsed(!get().sidebarCollapsed);
  },

  setSidebarOnRight: (onRight) => {
    write(SIDEBAR_END_KEY, onRight ? "1" : "0");
    set({ sidebarOnRight: onRight });
  },

  toggleSidebarSide: () => {
    get().setSidebarOnRight(!get().sidebarOnRight);
  },

  setTwoPane: (twoPane) => {
    write(TWO_PANE_KEY, twoPane ? "1" : "0");
    set({ twoPane });
  },

  toggleTwoPane: () => {
    get().setTwoPane(!get().twoPane);
  },

  setRightPanel: (panel) => {
    try {
      if (panel) localStorage.setItem(RIGHT_PANEL_KEY, panel);
      else localStorage.removeItem(RIGHT_PANEL_KEY);
      localStorage.setItem("mychapar.code-panel-open", panel === "code" ? "1" : "0");
    } catch {
      // ignore
    }
    set({ rightPanel: panel });
  },

  toggleRightPanel: (panel = "code") => {
    const current = get().rightPanel;
    get().setRightPanel(current ? null : panel);
  },

  setBottomPanelOpen: (open) => {
    write(PANEL_OPEN_KEY, open ? "1" : "0");
    set({ bottomPanelOpen: open });
  },

  setBottomPanelTab: (tab) => {
    write(PANEL_TAB_KEY, tab);
    set({ bottomPanelTab: tab });
  },

  setBottomPanelRatio: (ratio) => {
    const clamped = Math.min(BOTTOM_MAX_RATIO, Math.max(BOTTOM_MIN_RATIO, ratio));
    write(PANEL_RATIO_KEY, String(clamped));
    set({ bottomPanelRatio: clamped });
  },

  openBottomPanel: (tab) => {
    write(PANEL_TAB_KEY, tab);
    write(PANEL_OPEN_KEY, "1");
    set({ bottomPanelTab: tab, bottomPanelOpen: true });
  },

  toggleBottomPanel: (tab) => {
    const { bottomPanelOpen, bottomPanelTab } = get();
    if (bottomPanelOpen && bottomPanelTab === tab) {
      get().closeBottomPanel();
      return;
    }
    get().openBottomPanel(tab);
  },

  closeBottomPanel: () => {
    write(PANEL_OPEN_KEY, "0");
    set({ bottomPanelOpen: false });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSettingsSection: (section) => set({ settingsSection: section }),
  openSettings: (section) =>
    set({
      settingsOpen: true,
      settingsSection: section ?? "general",
    }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setImportDialog: (kind) => set({ importDialog: kind }),
  requestNewCollection: () => set({ pendingNewCollection: true }),
  clearPendingNewCollection: () => set({ pendingNewCollection: false }),

  showToast: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: message });
    toastTimer = setTimeout(() => {
      toastTimer = null;
      set({ toast: null });
    }, 1800);
  },

  clearToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    set({ toast: null });
  },

  setHardwareAcceleration: (enabled) => set({ hardwareAcceleration: enabled }),
  setRegion: (region) => set({ region }),
  hydratePrefs: (prefs) =>
    set({
      hardwareAcceleration: prefs.hardwareAcceleration,
      region: prefs.region,
    }),

  resetLayout: () => {
    get().setSidebarCollapsed(false);
    get().setSidebarOnRight(false);
    get().setTwoPane(false);
    get().setRightPanel(null);
    get().closeBottomPanel();
  },
}));
