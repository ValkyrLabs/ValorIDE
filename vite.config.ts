import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
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
  plugins: [react(), tailwindcss(), embedSourcesInSourcemaps()],

  build: {
    outDir: "build",
    // Emit source maps so we can debug minified stack traces in production builds
    sourcemap: true,
    ...
  },
  ...
});