import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** UI bundle for the Chrome extension (background is built separately). */
export default defineConfig({
  root: resolve("src/extension"),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": resolve("src/renderer"),
      "@shared": resolve("src/shared"),
    },
  },
  build: {
    outDir: resolve("release/chrome-extension"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve("src/extension/index.html"),
    },
  },
});
