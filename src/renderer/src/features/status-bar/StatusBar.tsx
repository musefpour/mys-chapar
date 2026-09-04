import { useCallback, useEffect, useState } from "react";
import { applyCollectionVariables } from "../../lib/resolve-variables";
import { useActiveRequestTab } from "../../stores/request-store";
import { useLibraryStore } from "../../stores/library-store";
import { useConsoleStore } from "../../stores/console-store";
import { useUiStore, type BottomPanelTab } from "../../stores/ui-store";
import { useT } from "../../i18n";

function SidebarToggleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9 4.5v15" />
    </svg>
  );
}

function GitFolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8.5V7a2 2 0 0 1 2-2h4.2L12 7h6a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9z" />
      <circle cx="9.2" cy="14.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="12.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="16.4" r="1.15" fill="currentColor" stroke="none" />
      <path d="M10.3 14.2h3.2M14.8 13.35v1.9" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.4l1.15 6.1L19.4 9.6 13.15 11.7 12 17.9l-1.15-6.2L4.6 9.6l6.25-1.1L12 2.4z" />
      <path d="M18.6 14.2l.55 2.55 2.55.55-2.55.55-.55 2.55-.55-2.55-2.55-.55 2.55-.55.55-2.55z" />
    </svg>
  );
}

function originFromUrl(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function StatusBar() {
  const t = useT();
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const bottomPanelOpen = useUiStore((state) => state.bottomPanelOpen);
  const bottomPanelTab = useUiStore((state) => state.bottomPanelTab);
  const toggleBottomPanel = useUiStore((state) => state.toggleBottomPanel);
  const openBottomPanel = useUiStore((state) => state.openBottomPanel);
  const log = useConsoleStore((state) => state.log);
  const active = useActiveRequestTab();
  const collections = useLibraryStore((state) => state.collections);
  const activeCollectionId = useLibraryStore((state) => state.activeCollectionId);
  const [checking, setChecking] = useState(false);

  const toggleTab = useCallback(
    (tab: BottomPanelTab) => {
      toggleBottomPanel(tab);
    },
    [toggleBottomPanel],
  );

  const checkBaseUrl = useCallback(async () => {
    if (checking) return;
    const collectionId = active.collectionId ?? activeCollectionId;
    const collection = collections.find((item) => item.id === collectionId);
    const resolved = applyCollectionVariables(active.request, collection?.variables ?? []);
    const origin = originFromUrl(resolved.url);

    openBottomPanel("console");

    if (!origin) {
      log({
        level: "error",
        source: "check",
        title: t("status.checkFailed"),
        detail: t("status.invalidUrl", { url: active.request.url || t("status.emptyUrl") }),
      });
      return;
    }

    setChecking(true);
    log({
      level: "info",
      source: "check",
      title: t("status.checkingOrigin", { origin }),
      detail: t("status.probe"),
    });

    try {
      const result = await window.mychapar.fetchText({ url: origin, timeoutMs: 8000 });
      if (result.ok) {
        log({
          level: "info",
          source: "check",
          title: t("status.reachable", { origin }),
          detail: result.finalUrl !== origin ? t("status.resolvedTo", { url: result.finalUrl }) : undefined,
        });
      } else if (result.error.startsWith("HTTP ")) {
        log({
          level: "info",
          source: "check",
          title: t("status.reachable", { origin }),
          detail: result.error,
        });
      } else {
        log({
          level: "error",
          source: "check",
          title: t("status.notReachable", { origin }),
          detail: result.error,
        });
      }
    } catch (error) {
      log({
        level: "error",
        source: "check",
        title: t("status.notReachable", { origin }),
        detail: error instanceof Error ? error.message : t("status.checkError"),
      });
    } finally {
      setChecking(false);
    }
  }, [active.collectionId, active.request, activeCollectionId, checking, collections, log, openBottomPanel, t]);

  const connectGit = useCallback(() => {
    openBottomPanel("console");
    log({
      level: "info",
      source: "git",
      title: t("status.connectGit"),
      detail: t("status.gitSoon"),
    });
  }, [log, openBottomPanel, t]);

  return (
    <footer className="status-bar">
      <button
        type="button"
        className={sidebarCollapsed ? "status-bar-btn icon-only" : "status-bar-btn icon-only active"}
        onClick={toggleSidebar}
        title={sidebarCollapsed ? t("status.showSidebar") : t("status.hideSidebar")}
        aria-label={sidebarCollapsed ? t("status.showSidebar") : t("status.hideSidebar")}
        aria-pressed={!sidebarCollapsed}
      >
        <SidebarToggleIcon />
      </button>
      <button type="button" className="status-bar-btn" onClick={connectGit} title={t("status.connectGit")}>
        <GitFolderIcon />
        <span>{t("status.connectGit")}</span>
      </button>
      <button
        type="button"
        className={bottomPanelOpen && bottomPanelTab === "terminal" ? "status-bar-btn active" : "status-bar-btn"}
        onClick={() => toggleTab("terminal")}
        aria-pressed={bottomPanelOpen && bottomPanelTab === "terminal"}
      >
        {t("status.terminal")}
      </button>
      <button
        type="button"
        className={bottomPanelOpen && bottomPanelTab === "console" ? "status-bar-btn active" : "status-bar-btn"}
        onClick={() => toggleTab("console")}
        aria-pressed={bottomPanelOpen && bottomPanelTab === "console"}
      >
        {t("status.console")}
      </button>
      <button
        type="button"
        className="status-bar-btn"
        onClick={() => void checkBaseUrl()}
        disabled={checking}
        title={t("status.checkUrl")}
      >
        <SparkleIcon />
        <span>{checking ? t("status.checking") : t("status.checkUrl")}</span>
      </button>
    </footer>
  );
}

export function useStatusBarShortcuts(): void {
  const toggleBottomPanel = useUiStore((state) => state.toggleBottomPanel);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key === "`") {
        event.preventDefault();
        toggleBottomPanel("terminal");
      }
      if (event.key.toLowerCase() === "b" && event.shiftKey) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleBottomPanel, toggleSidebar]);
}
