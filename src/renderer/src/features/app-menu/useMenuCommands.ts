import { useEffect } from "react";
import type { AppMenuCommand, RegionId } from "@shared/app-menu";
import { isAppMenuCommand } from "@shared/app-menu";
import { useRequestStore } from "../../stores/request-store";
import { useUiStore } from "../../stores/ui-store";
import { useT } from "../../i18n";
import { requestCloseTab, requestFocusUrl } from "./menu-bridge";

function regionFromCommand(command: AppMenuCommand): RegionId | null {
  if (command === "help.region.us") return "us";
  if (command === "help.region.eu") return "eu";
  if (command === "help.region.asia") return "asia";
  return null;
}

export function useMenuCommands(): void {
  const t = useT();

  useEffect(() => {
    const run = (command: AppMenuCommand) => {
      const ui = useUiStore.getState();
      const requests = useRequestStore.getState();

      switch (command) {
        case "file.new":
          ui.requestNewCollection();
          return;
        case "file.newTab":
          requests.openNewTab();
          return;
        case "file.newRunnerTab":
          return;
        case "file.importOpenapi":
          ui.setImportDialog("openapi");
          return;
        case "file.importCurl":
          ui.setImportDialog("curl");
          return;
        case "file.settings":
          ui.openSettings("general");
          return;
        case "file.closeTab":
          requestCloseTab(false);
          return;
        case "file.forceCloseTab":
          requestCloseTab(true);
          return;
        case "view.toggleLeftSidebar":
          ui.toggleSidebar();
          return;
        case "view.toggleTwoPane":
          ui.toggleTwoPane();
          return;
        case "view.toggleWorkbench":
          ui.toggleBottomPanel(ui.bottomPanelTab);
          return;
        case "view.toggleRightSidebar":
          ui.toggleRightPanel(ui.rightPanel === "variables" ? "variables" : "code");
          return;
        case "view.swapSidebars":
          ui.toggleSidebarSide();
          return;
        case "view.resetLayout":
          ui.resetLayout();
          window.mychapar?.invokeMenu?.("view.resetZoom");
          return;
        case "view.goBack":
          requests.goBack();
          return;
        case "view.goForward":
          requests.goForward();
          return;
        case "view.nextTab":
          requests.activateAdjacentTab(1);
          return;
        case "view.prevTab":
          requests.activateAdjacentTab(-1);
          return;
        case "view.focusUrl":
          requestFocusUrl();
          return;
        case "view.showConsole":
          ui.openBottomPanel("console");
          return;
        case "help.checkUpdates":
          void import("../../stores/update-store").then(async ({ useUpdateStore }) => {
            const outcome = await useUpdateStore.getState().checkNow();
            if (outcome === "latest") ui.showToast(t("menu.upToDate"));
            else if (outcome === "error") ui.showToast(t("settings.updateFailed"));
          });
          return;
        case "help.about":
          ui.openSettings("about");
          return;
        case "help.region.us":
        case "help.region.eu":
        case "help.region.asia": {
          const region = regionFromCommand(command);
          if (!region) return;
          ui.setRegion(region);
          void window.mychapar?.setPrefs?.({ region }).then(() => {
            ui.showToast(t("menu.regionSaved"));
          });
          if (!window.mychapar?.setPrefs) ui.showToast(t("menu.regionSaved"));
          return;
        }
        default:
          return;
      }
    };

    const unsub = window.mychapar?.onMenuCommand?.(run);

    const onDom = (event: Event) => {
      const command = (event as CustomEvent<unknown>).detail;
      if (isAppMenuCommand(command)) run(command);
    };
    window.addEventListener("mychapar:menu", onDom);

    return () => {
      unsub?.();
      window.removeEventListener("mychapar:menu", onDom);
    };
  }, [t]);
}
