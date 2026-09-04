import { useEffect, useMemo, useRef, useState } from "react";
import { RequestWorkspace } from "./features/request-builder/RequestWorkspace";
import { Sidebar } from "./features/sidebar/Sidebar";
import { CodePanel } from "./features/code-panel/CodePanel";
import { VariablesPanel } from "./features/variables-panel/VariablesPanel";
import { StatusBar, useStatusBarShortcuts } from "./features/status-bar/StatusBar";
import { useActiveRequestTab } from "./stores/request-store";
import { useLibraryStore } from "./stores/library-store";
import { useThemeStore } from "./stores/theme-store";
import { useUiStore } from "./stores/ui-store";
import { useFocusTrap } from "./shared/ui/useFocusTrap";
import { AuthEntry } from "./features/auth/AuthEntry";
import { useAuthStore } from "./stores/auth-store";
import { LanguageMenu } from "./features/i18n/LanguageMenu";
import { AppMenu } from "./features/app-menu/AppMenu";
import { useMenuCommands } from "./features/app-menu/useMenuCommands";
import { buildMenuLabels } from "./features/app-menu/menu-labels";
import { SettingsModal } from "./features/settings/SettingsModal";
import { UpdateRequiredModal } from "./features/update/UpdateRequiredModal";
import {
  APP_VERSION,
  isAppBlockedByForceUpdate,
  shouldShowUpdateModal,
  useUpdateStore,
} from "./stores/update-store";
import { useT } from "./i18n";

function isMacDesktop(): boolean {
  return window.mychapar?.platform === "darwin" && Boolean(window.mychapar?.electronVersion);
}

function CodeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 16l-4-4 4-4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M14 4l-4 16" />
    </svg>
  );
}

/** Key/value list glyph — matches Postman-style Variables tab icon. */
function VariablesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3.5" y="4.5" width="5.5" height="2.2" rx="0.6" />
      <rect x="3.5" y="10.9" width="5.5" height="2.2" rx="0.6" />
      <path
        d="M4.6 17.2 L8 20.6 M8 17.2 L4.6 20.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="12" y="4.5" width="8.5" height="2.2" rx="0.6" />
      <rect x="12" y="10.9" width="8.5" height="2.2" rx="0.6" />
      <rect x="12" y="17.6" width="8.5" height="2.2" rx="0.6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M21 14.5A8.5 8.5 0 1110.5 3 7 7 0 0021 14.5z" />
    </svg>
  );
}

function WorkspaceMenuIcon({ kind }: { kind: "personal" | "team" }) {
  if (kind === "team") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.1" />
        <circle cx="16.2" cy="9.2" r="2.4" />
        <path d="M3.8 18.5c.6-3 2.8-4.6 5.2-4.6s4.6 1.6 5.2 4.6" />
        <path d="M13.4 18.5c.35-1.7 1.5-2.9 3-2.9 1.4 0 2.4.9 2.8 2.3" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.2 18.8c.8-3.4 3.3-5.2 6.8-5.2s6 1.8 6.8 5.2" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function TitlebarWorkspaceMenu() {
  const t = useT();
  const workspaces = useLibraryStore((state) => state.workspaces);
  const activeWorkspaceId = useLibraryStore((state) => state.activeWorkspaceId);
  const setActiveWorkspaceId = useLibraryStore((state) => state.setActiveWorkspaceId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, open);

  const active = useMemo(
    () => workspaces.find((item) => item.id === activeWorkspaceId) ?? workspaces[0] ?? null,
    [workspaces, activeWorkspaceId],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={open ? "titlebar-menu is-open" : "titlebar-menu"} ref={rootRef}>
      <button
        type="button"
        className={open ? "titlebar-menu-trigger open" : "titlebar-menu-trigger"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={active?.name ?? t("workspace")}
      >
        <span className="titlebar-menu-icon">
          <WorkspaceMenuIcon kind={active?.kind ?? "personal"} />
        </span>
        <span className="titlebar-menu-label">{active?.name ?? t("workspace")}</span>
        <span className="titlebar-menu-chevron">
          <ChevronDownIcon />
        </span>
      </button>
      {open && (
        <div
          className="titlebar-menu-dismiss"
          aria-hidden="true"
          onPointerDown={() => setOpen(false)}
        />
      )}
      {open && (
        <div className="titlebar-menu-dropdown" role="menu">
          {workspaces.map((workspace) => {
            const selected = workspace.id === (active?.id ?? null);
            return (
              <button
                key={workspace.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={selected ? "titlebar-menu-item selected" : "titlebar-menu-item"}
                onClick={() => {
                  setActiveWorkspaceId(workspace.id);
                  setOpen(false);
                }}
              >
                <span className="titlebar-menu-item-icon">
                  <WorkspaceMenuIcon kind={workspace.kind} />
                </span>
                <span className="titlebar-menu-item-label">{workspace.name}</span>
                <span className="titlebar-menu-item-meta">
                  {workspace.collections.length === 1
                    ? t("workspace.collectionsOne", { count: workspace.collections.length })
                    : t("workspace.collectionsMany", { count: workspace.collections.length })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const t = useT();
  const userId = useAuthStore((state) => state.user?.id);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const rightPanel = useUiStore((state) => state.rightPanel);
  const setRightPanel = useUiStore((state) => state.setRightPanel);
  const [macDesktop] = useState(isMacDesktop);
  const active = useActiveRequestTab();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const sidebarOnRight = useUiStore((state) => state.sidebarOnRight);
  const toast = useUiStore((state) => state.toast);
  const hydratePrefs = useUiStore((state) => state.hydratePrefs);
  const updateGate = useUpdateStore((state) => state.gate);
  const checkOnStartup = useUpdateStore((state) => state.checkOnStartup);
  const dismissSoftUpdate = useUpdateStore((state) => state.dismissSoftUpdate);
  useStatusBarShortcuts();
  useMenuCommands();

  useEffect(() => {
    void checkOnStartup();
  }, [checkOnStartup]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!userId) return;
    void import("./lib/cloud-sync").then((mod) => mod.hydrateFromCloud());
  }, [userId]);

  useEffect(() => {
    window.mychapar?.setMenuLabels?.(buildMenuLabels(t));
  }, [t]);

  useEffect(() => {
    void window.mychapar?.getPrefs?.().then(hydratePrefs);
    const unsub = window.mychapar?.onPrefsChanged?.(hydratePrefs);
    return () => unsub?.();
  }, [hydratePrefs]);

  useEffect(() => {
    if (macDesktop) {
      document.documentElement.dataset.platform = "darwin";
    } else {
      delete document.documentElement.dataset.platform;
    }
  }, [macDesktop]);

  useEffect(() => {
    const blockReload = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (key === "f5" || (mod && key === "r" && !event.altKey && !event.shiftKey)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", blockReload, true);
    return () => window.removeEventListener("keydown", blockReload, true);
  }, []);

  const togglePanel = (panel: "code" | "variables") => {
    setRightPanel(rightPanel === panel ? null : panel);
  };

  const bodyClass = [
    "app-body",
    rightPanel ? "with-code-panel" : "",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    sidebarOnRight ? "sidebar-end" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const forceBlocked = isAppBlockedByForceUpdate(updateGate);
  const showUpdateModal = shouldShowUpdateModal(updateGate);
  const updateConfig = updateGate.kind === "required" ? updateGate.config : null;
  const stillChecking = updateGate.kind === "idle" || updateGate.kind === "checking";

  if (stillChecking) {
    return <div className="app-shell app-shell-blocked" aria-busy="true" />;
  }

  if (forceBlocked && updateConfig) {
    return (
      <div className="app-shell app-shell-blocked">
        <UpdateRequiredModal
          open
          force
          localVersion={APP_VERSION}
          remoteVersion={updateConfig.version}
          onClose={() => undefined}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="titlebar-leading">
          <AppMenu />
          <TitlebarWorkspaceMenu />
        </div>
        <div className="header-actions">
          <AuthEntry />
          <LanguageMenu />
          <button
            type="button"
            className={rightPanel === "code" ? "header-icon-btn active" : "header-icon-btn"}
            onClick={() => togglePanel("code")}
            aria-pressed={rightPanel === "code"}
            title={t("header.codeSnippet")}
            aria-label={t("header.codeSnippet")}
          >
            <CodeIcon />
          </button>
          <button
            type="button"
            className={
              rightPanel === "variables" ? "header-icon-btn active" : "header-icon-btn"
            }
            onClick={() => togglePanel("variables")}
            aria-pressed={rightPanel === "variables"}
            title={t("header.variables")}
            aria-label={t("header.variables")}
          >
            <VariablesIcon />
          </button>
          <button
            type="button"
            className="header-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("header.switchLight") : t("header.switchDark")}
            title={theme === "dark" ? t("header.lightMode") : t("header.darkMode")}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>
      <div className={bodyClass}>
        <Sidebar />
        <main className="app-main">
          <RequestWorkspace />
        </main>
        {rightPanel === "code" && (
          <CodePanel request={active.request} onClose={() => setRightPanel(null)} />
        )}
        {rightPanel === "variables" && (
          <VariablesPanel
            request={active.request}
            collectionId={active.collectionId}
            onClose={() => setRightPanel(null)}
          />
        )}
      </div>
      <StatusBar />
      <SettingsModal />
      {showUpdateModal && updateConfig ? (
        <UpdateRequiredModal
          open
          force={false}
          localVersion={APP_VERSION}
          remoteVersion={updateConfig.version}
          onClose={dismissSoftUpdate}
        />
      ) : null}
      {toast && (
        <div className="app-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
