import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { promises as fsp } from "fs";

/**
 * Plugin: embed original source contents into emitted sourcemaps
 * so we can symbolicate stack traces even when source files are not present.
 */
function embedSourcesInSourcemaps() {
  return {
    name: "embed-sources-in-sourcemaps",
    async writeBundle() {
      const assetsDir = resolve(__dirname, "build", "assets");
      try {
        const files = await fsp.readdir(assetsDir);
        for (const f of files) {
          if (!f.endsWith(".js.map")) continue;
          const mapPath = resolve(assetsDir, f);
          const raw = await fsp.readFile(mapPath, "utf8");
          const map = JSON.parse(raw);
          if (!Array.isArray(map.sources) || !map.sources.length) continue;

          const needEmbed =
            !Array.isArray(map.sourcesContent) ||
            map.sourcesContent.every((s: any) => s == null);

          if (!needEmbed) continue;

          map.sourcesContent = await Promise.all(
            map.sources.map(async (src: string) => {
              // Try a few candidate paths to find the original file on disk,
              // fall back to null if not found.
              const candidates = [
                resolve(__dirname, src),
                resolve(__dirname, "src", src.replace(/^(\.\.\/)+src\//, "")),
                resolve(__dirname, src.replace(/^(\.\.\/)+/, "")),
              ];
              for (const c of candidates) {
                try {
                  return await fsp.readFile(c, "utf8");
                } catch {
                  // ignore
                }
              }
              return null;
            }),
          );

          await fsp.writeFile(mapPath, JSON.stringify(map), "utf8");
          console.log(`[embed-sources-in-sourcemaps] updated ${mapPath}`);
        }
      } catch (err) {
        console.warn(
          "[embed-sources-in-sourcemaps] failed to embed sources",
          err,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [embedSourcesInSourcemaps()],

  build: {
    outDir: "build",
    // Emit source maps so we can debug minified stack traces in production builds
    sourcemap: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    chunkSizeWarningLimit: 100000,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./webview-ui/src/test/setup.ts"],
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
      process.env.NODE_ENV ??
        (process.env.IS_DEV ? "development" : "production"),
    ),
    "process.env.IS_DEV": JSON.stringify(process.env.IS_DEV),
    "process.env.IS_TEST": JSON.stringify(process.env.IS_TEST),
  },
  resolve: {
    alias: [
      {
        find: "react/jsx-dev-runtime",
        replacement: resolve(
          __dirname,
          "./webview-ui/node_modules/react/jsx-dev-runtime.js",
        ),
      },
      {
        find: "react/jsx-runtime",
        replacement: resolve(
          __dirname,
          "./webview-ui/node_modules/react/jsx-runtime.js",
        ),
      },
      {
        find: "react",
        replacement: resolve(__dirname, "./webview-ui/node_modules/react"),
      },
      {
        find: "react-dom/client",
        replacement: resolve(
          __dirname,
          "./webview-ui/node_modules/react-dom/client.js",
        ),
      },
      {
        find: "react-dom",
        replacement: resolve(
          __dirname,
          "./webview-ui/node_modules/react-dom",
        ),
      },
      {
        find: "@api",
        replacement: resolve(__dirname, "./src/api"),
      },
      {
        find: "@components",
        replacement: resolve(__dirname, "./webview-ui/src/components"),
      },
      {
        find: "@context",
        replacement: resolve(__dirname, "./webview-ui/src/context"),
      },
      {
        find: "@core",
        replacement: resolve(__dirname, "./src/core"),
      },
      {
        find: "@integrations",
        replacement: resolve(__dirname, "./src/integrations"),
      },
      {
        find: "@services",
        replacement: resolve(__dirname, "./src/services"),
      },
      {
        find: "@shared",
        replacement: resolve(__dirname, "./src/shared"),
      },
      {
        find: "@thorapi/model",
        replacement: resolve(
          __dirname,
          "./webview-ui/src/thorapi/model",
        ),
      },
      {
        find: "@thorapi/src",
        replacement: resolve(__dirname, "./webview-ui/src/thorapi/src"),
      },
      {
        find: "@thorapi/redux",
        replacement: resolve(__dirname, "./webview-ui/src/thorapi/redux"),
      },
      {
        find: "@thorapi/api",
        replacement: resolve(__dirname, "./webview-ui/src/thorapi/api"),
      },
      {
        find: "@thorapi",
        replacement: resolve(__dirname, "./webview-ui/src"),
      },
      {
        find: "@utils",
        replacement: resolve(__dirname, "./src/utils"),
      },
      {
        find: "@valkyr/component-library",
        replacement: resolve(__dirname, "./webview-ui/src/components"),
      },
      {
        find: "@valkyrai/openapi-designer",
        replacement: resolve(
          __dirname,
          "../ValkyrAI/packages/component-library/src/openapi-designer",
        ),
      },
    ],
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
