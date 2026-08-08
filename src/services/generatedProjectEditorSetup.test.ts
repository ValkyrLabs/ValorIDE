import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import { prepareGeneratedProjectForEditor } from "./generatedProjectEditorSetup";

const readJson = async (filename: string) =>
  JSON.parse(await readFile(filename, "utf8"));

describe("generated project editor setup", () => {
  it("registers generated TypeScript sources and bundled JAR libraries", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "valoride-editor-"));
    const ui = path.join(root, "ui");
    const client = path.join(root, "typescript-redux-query");
    const components = path.join(root, "bundle-assets", "component-library");
    await Promise.all([
      mkdir(ui, { recursive: true }),
      mkdir(path.join(client, "src"), { recursive: true }),
      mkdir(path.join(client, "model"), { recursive: true }),
      mkdir(path.join(client, "redux"), { recursive: true }),
      mkdir(path.join(client, "utils"), { recursive: true }),
      mkdir(path.join(components, "components"), { recursive: true }),
      mkdir(path.join(root, "libs"), { recursive: true }),
      mkdir(path.join(root, "spring-server", "target"), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(
        path.join(ui, "tsconfig.json"),
        `{
  // Generated TypeScript configuration may legitimately be JSONC.
  "include": ["src",],
}
`,
      ),
      writeFile(
        path.join(client, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {}, include: ["src"] }),
      ),
      writeFile(path.join(root, "libs", "downloaded-client.jar"), "jar"),
      writeFile(path.join(components, "index.ts"), "export {};"),
      writeFile(
        path.join(root, "spring-server", "target", "application.jar"),
        "build output",
      ),
      writeFile(
        path.join(root, "thorapi-artifact-layout.json"),
        JSON.stringify({
          sourceRoots: [
            { path: "spring-server", kind: "backend-source" },
            { path: "ui", kind: "frontend-host-source" },
            {
              path: "typescript-redux-query",
              kind: "frontend-rtk-source",
            },
            { path: "../../outside", kind: "frontend-rtk-source" },
          ],
          assetRoots: [
            {
              path: "bundle-assets/component-library",
              kind: "core-component-library",
            },
          ],
        }),
      ),
    ]);

    const result = await prepareGeneratedProjectForEditor(root);
    const settings = await readJson(result.settingsFile);
    const workspace = await readJson(result.workspaceFile);
    const uiConfig = await readJson(path.join(ui, "tsconfig.json"));
    const clientConfig = await readJson(path.join(client, "tsconfig.json"));

    expect(result.modules).toEqual(
      expect.arrayContaining([
        "spring-server",
        "ui",
        "typescript-redux-query",
        "bundle-assets/component-library",
      ]),
    );
    expect(result.modules).not.toContain("../../outside");
    expect(settings["java.configuration.updateBuildConfiguration"]).toBe(
      "automatic",
    );
    expect(settings["java.project.referencedLibraries"]).toContain(
      "libs/downloaded-client.jar",
    );
    expect(settings["java.project.referencedLibraries"]).not.toContain(
      "spring-server/target/application.jar",
    );
    expect(workspace.folders).toEqual([
      { name: path.basename(root), path: ".." },
    ]);
    expect(uiConfig.compilerOptions.paths["@thorapi/model"]).toEqual([
      "../typescript-redux-query/model",
    ]);
    expect(uiConfig.compilerOptions.paths["@valkyrai/thorapi"]).toEqual([
      "../typescript-redux-query/src/index.ts",
    ]);
    expect(uiConfig.compilerOptions.paths["@valkyr/component-library"]).toEqual(
      ["../bundle-assets/component-library/index.ts"],
    );
    expect(
      uiConfig.compilerOptions.paths["@valkyr/component-library/*"],
    ).toEqual(["../bundle-assets/component-library/components/*"]);
    expect(uiConfig.include).toEqual(
      expect.arrayContaining([
        "src",
        "../typescript-redux-query",
        "../bundle-assets/component-library",
      ]),
    );
    expect(clientConfig.include).toEqual(
      expect.arrayContaining(["src", "model", "redux", "utils"]),
    );
  });

  it("preserves JSONC settings and object-form Java library metadata", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "valoride-editor-"));
    await mkdir(path.join(root, ".vscode"), { recursive: true });
    const originalSettings = `{
  // Developer-owned setting must remain byte-for-byte intact.
  "editor.formatOnSave": true,
  "java.project.referencedLibraries": {
    "include": ["vendor/**/*.jar"],
    "exclude": ["vendor/private.jar"],
    "sources": { "vendor/sdk.jar": "vendor/sdk-sources.jar" },
  },
}\n`;
    await writeFile(
      path.join(root, ".vscode", "settings.json"),
      originalSettings,
    );

    const result = await prepareGeneratedProjectForEditor(root);
    const preserved = await readFile(result.settingsFile, "utf8");
    const workspace = await readJson(result.workspaceFile);
    const libraries = workspace.settings["java.project.referencedLibraries"];

    expect(preserved).toBe(originalSettings);
    expect(workspace.settings["editor.formatOnSave"]).toBe(true);
    expect(workspace.settings["java.import.maven.enabled"]).toBe(true);
    expect(libraries.include).toEqual(
      expect.arrayContaining(["vendor/**/*.jar", "lib/**/*.jar"]),
    );
    expect(libraries.exclude).toEqual(["vendor/private.jar"]);
    expect(libraries.sources).toEqual({
      "vendor/sdk.jar": "vendor/sdk-sources.jar",
    });
  });
});
