import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    outDir: "build",
    // Emit source maps so we can debug minified stack traces in production builds
    sourcemap: true,
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
    "process.env": {
      NODE_ENV: JSON.stringify(
        process.env.IS_DEV ? "development" : "production",
      ),
      IS_DEV: JSON.stringify(process.env.IS_DEV),
      IS_TEST: JSON.stringify(process.env.IS_TEST),
    },
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
    dedupe: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  },
});
