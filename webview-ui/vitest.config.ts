import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: [
      {
        find: "@utils/serverValkyraiHost",
        replacement: resolve(__dirname, "./src/utils/serverValkyraiHost"),
      },
      {
        find: "@utils",
        replacement: resolve(__dirname, "./src/utils"),
      },
      {
        find: "@thorapi/model",
        replacement: resolve(__dirname, "./src/thorapi/model"),
      },
      {
        find: "@thorapi/src",
        replacement: resolve(__dirname, "./src/thorapi/src"),
      },
      {
        find: "@thorapi/redux",
        replacement: resolve(__dirname, "./src/thorapi/redux"),
      },
      {
        find: "@thorapi/api",
        replacement: resolve(__dirname, "./src/thorapi/api"),
      },
      {
        find: "@thorapi/services",
        replacement: resolve(__dirname, "./src/services"),
      },
      {
        find: "@thorapi",
        replacement: resolve(__dirname, "./src"),
      },
      {
        find: "@",
        replacement: resolve(__dirname, "./src"),
      },
      {
        find: "@components",
        replacement: resolve(__dirname, "./src/components"),
      },
      {
        find: "@context",
        replacement: resolve(__dirname, "./src/context"),
      },
      {
        find: "@shared",
        replacement: resolve(__dirname, "../src/shared"),
      },
      {
        find: "@valkyr/component-library",
        replacement: resolve(__dirname, "./src/components"),
      },
    ],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  },
});
