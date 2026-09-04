import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** UI bundle for the VS Code webview (extension host is built separately). */
export default defineConfig({
  root: resolve("src/vscode/webview"),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": resolve("src/renderer"),
      "@shared": resolve("src/shared"),
    },
  },
  build: {
    outDir: resolve("release/vscode-extension/webview"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve("src/vscode/webview/index.html"),
    },
  },
});
