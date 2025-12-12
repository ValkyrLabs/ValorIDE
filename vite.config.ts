/// <reference types="vite/types/importMeta.d.ts" />

import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": process.env,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    alias: {
      "@": path.resolve(__dirname, "webview-ui/src"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@": path.resolve(__dirname, "webview-ui/src/"),
      "@utils": path.resolve(__dirname, "src/utils"),
    },
  },
  // assetsInclude: ["**/*.yaml"],
});
