const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");
const tsconfigPathsPlugin = require("@esbuild-plugins/tsconfig-paths"); // Renamed variable

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const cleanStaleSourceMaps = {
  name: "clean-stale-source-maps",
  setup(build) {
    build.onStart(() => {
      if (!production) {
        return;
      }

      const extensionSourceMap = path.join(
        __dirname,
        "dist",
        "extension.js.map",
      );
      if (fs.existsSync(extensionSourceMap)) {
        fs.rmSync(extensionSourceMap, { force: true });
      }
    });
  },
};

const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        );
      });
      console.log("[watch] build finished");
    });
  },
};

const copyWasmFiles = {
  name: "copy-wasm-files",
  setup(build) {
    build.onEnd(() => {
      // tree sitter
      const sourceDir = path.join(__dirname, "node_modules", "web-tree-sitter");
      const targetDir = path.join(__dirname, "dist");

      // Copy tree-sitter.wasm
      fs.copyFileSync(
        path.join(sourceDir, "tree-sitter.wasm"),
        path.join(targetDir, "tree-sitter.wasm"),
      );

      // Copy language-specific WASM files
      const languageWasmDir = path.join(
        __dirname,
        "node_modules",
        "tree-sitter-wasms",
        "out",
      );
      const languages = [
        "typescript",
        "tsx",
        "python",
        "rust",
        "javascript",
        "go",
        "cpp",
        "c",
        "c_sharp",
        "ruby",
        "java",
        "php",
        "swift",
        "kotlin",
      ];

      languages.forEach((lang) => {
        const filename = `tree-sitter-${lang}.wasm`;
        fs.copyFileSync(
          path.join(languageWasmDir, filename),
          path.join(targetDir, filename),
        );
      });
    });
  },
};

const extensionConfig = {
  bundle: true,
  minify: production,
  treeShaking: true,
  sourcemap: !production,
  sourcesContent: false,
  logLevel: "silent",
  drop: production ? ["console", "debugger"] : [],
  define: {
    "process.env.IS_DEV": JSON.stringify(!production),
    "process.env.NODE_ENV": JSON.stringify(
      production ? "production" : "development",
    ),
  },
  plugins: [
    cleanStaleSourceMaps,
    copyWasmFiles,
    /*tsconfigPathsPlugin.default({ tsconfig: "./tsconfig.json" }), // Use .default*/
    /* add to the end of plugins array */
    esbuildProblemMatcherPlugin,
    {
      name: "alias-plugin",
      setup(build) {
        build.onResolve({ filter: /^pkce-challenge$/ }, (args) => {
          return {
            path: path.resolve(
              "node_modules/pkce-challenge/dist/index.browser.js",
            ),
            namespace: "file",
          };
        });
      },
    },
    {
      name: "build-stats",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0 && production) {
            const stats = fs.statSync("dist/extension.js");
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✓ Built dist/extension.js (${sizeKB} KB)`);
          }
        });
      },
    },
  ],
  entryPoints: ["src/extension.ts"],
  format: "cjs",
  platform: "node",
  outfile: "dist/extension.js",
  external: ["vscode"],
};

async function main() {
  const extensionCtx = await esbuild.context(extensionConfig);
  if (watch) {
    await extensionCtx.watch();
  } else {
    await extensionCtx.rebuild();
    await extensionCtx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
