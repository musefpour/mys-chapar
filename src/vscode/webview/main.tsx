import "./bridge";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../../renderer/src/App";
import { migrateLegacyStorage } from "../../renderer/src/lib/migrate-legacy-storage";
import { useLocaleStore } from "../../renderer/src/stores/locale-store";
import "../../renderer/src/styles/global.css";

migrateLegacyStorage();
useLocaleStore.getState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
