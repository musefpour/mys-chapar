import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { migrateLegacyStorage } from "./lib/migrate-legacy-storage";
import { useLocaleStore } from "./stores/locale-store";
import "./styles/global.css";

migrateLegacyStorage();
useLocaleStore.getState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
