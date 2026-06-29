import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

const stripUnsafeGlobalEval = () => ({
  name: "strip-unsafe-global-eval",
  generateBundle(_options: unknown, bundle: Record<string, any>) {
    for (const output of Object.values(bundle)) {
      if (output?.type !== "chunk" || typeof output.code !== "string") {
        continue;
      }
      output.code = output.code
        .replace(
          /try\{return new Function\("return this"\)\(\)\}catch\{return\{\}\}/g,
          "return globalThis",
        )
        .replace(
          /try\{return Function\("return this"\)\(\)\}catch\{return\{\}\}/g,
          "return globalThis",
        )
        .replace(
          /Function\("return this"\)\(\)/g,
          "globalThis",
        );
    }
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), stripUnsafeGlobalEval()],

  build: {
    outDir: "build",
    // Keep production packages lean by default.
    // Opt in with WEBVIEW_SOURCEMAP=true when debugging bundle traces.
    sourcemap: process.env.WEBVIEW_SOURCEMAP === "true",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
    chunkSizeWarningLimit: 100000,
  },
  server: {
    port: 25463,
    hmr: {
      host: "localhost",
      protocol: "ws",
    },
    cors: {
      origin: "*",
      methods: "*",
      allowedHeaders: "*",
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.IS_DEV ? "development" : "production",
    ),
    "process.env.IS_DEV": JSON.stringify(process.env.IS_DEV),
    "process.env.IS_TEST": JSON.stringify(process.env.IS_TEST),
  },
  resolve: {
    alias: [
      {
        find: "@valkyrai/openapi-designer",
        replacement: resolve(
          __dirname,
          "../../ValkyrAI/packages/component-library/src/openapi-designer",
        ),
      },
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
        find: "@thorapi",
        replacement: resolve(__dirname, "./src"),
      },
      {
        find: "@valkyr/component-library",
        replacement: resolve(__dirname, "./src/components"),
      },
    ],
    // Ensure all dependencies share the same React singleton (fixes hooks issues)
    dedupe: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react-redux",
    ],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  },
});
