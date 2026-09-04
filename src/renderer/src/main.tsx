import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installUiSelectionGuard } from "./lib/block-ui-selection";
import { migrateLegacyStorage } from "./lib/migrate-legacy-storage";
import { useLocaleStore } from "./stores/locale-store";
import "./styles/global.css";

migrateLegacyStorage();
useLocaleStore.getState();
// Mirror UI locale into main-process prefs (OAuth callback HTML).
void window.mychapar?.setPrefs?.({ locale: useLocaleStore.getState().locale });
installUiSelectionGuard();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
