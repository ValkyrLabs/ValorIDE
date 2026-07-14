import AdmZip from "adm-zip";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createApplicationSourceArchive } from "./applicationSourcePublish";

describe("createApplicationSourceArchive", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-source-"),
    );
    await fs.mkdir(path.join(workspaceRoot, "src/main/resources/openapi"), {
      recursive: true,
    });
    await fs.mkdir(path.join(workspaceRoot, "src/main/java/example"), {
      recursive: true,
    });
    await fs.mkdir(path.join(workspaceRoot, "frontend/src/thorapi"), {
      recursive: true,
    });
    await fs.mkdir(path.join(workspaceRoot, "frontend/src"), {
      recursive: true,
    });
    await fs.mkdir(path.join(workspaceRoot, "node_modules/example"), {
      recursive: true,
    });
    await fs.mkdir(path.join(workspaceRoot, "target"), { recursive: true });
    await fs.mkdir(path.join(workspaceRoot, "ignored"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "pom.xml"), "<project />");
    await fs.writeFile(
      path.join(workspaceRoot, "src/main/resources/openapi/api-out.yaml"),
      "openapi: 3.0.3\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "src/main/java/example/App.java"),
      "class App {}\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "frontend/package.json"),
      JSON.stringify({
        scripts: { build: "vite build" },
        dependencies: { react: "latest" },
      }),
    );
    await fs.writeFile(
      path.join(workspaceRoot, "frontend/yarn.lock"),
      "# yarn lockfile\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "frontend/src/App.tsx"),
      "export const App = () => null;\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "frontend/src/thorapi/generated.ts"),
      "generated\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "node_modules/example/index.js"),
      "dependency\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "target/app.jar"),
      "build output\n",
    );
    await fs.writeFile(path.join(workspaceRoot, ".env"), "TOKEN=secret\n");
    await fs.writeFile(
      path.join(workspaceRoot, "private.pem"),
      "private key\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, "ignored/notes.txt"),
      "ignored\n",
    );
    await fs.writeFile(
      path.join(workspaceRoot, ".valorideignore"),
      "ignored/\n!node_modules/\n",
    );
  });

  afterEach(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it("packages developer source and excludes generated, build, dependency, and secret files", async () => {
    const result = await createApplicationSourceArchive(
      workspaceRoot,
      "app-1",
      "Sample App",
    );
    const archive = new AdmZip(result.buffer);
    const entries = archive.getEntries().map((entry) => entry.entryName);

    expect(entries).toEqual(
      expect.arrayContaining([
        ".valoride-deploy.json",
        "pom.xml",
        "src/main/java/example/App.java",
        "frontend/package.json",
        "frontend/yarn.lock",
        "frontend/src/App.tsx",
      ]),
    );
    expect(entries).not.toEqual(
      expect.arrayContaining([
        "frontend/src/thorapi/generated.ts",
        "src/main/resources/openapi/api-out.yaml",
        "node_modules/example/index.js",
        "target/app.jar",
        ".env",
        "private.pem",
        "ignored/notes.txt",
      ]),
    );

    const manifest = JSON.parse(archive.readAsText(".valoride-deploy.json"));
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      applicationId: "app-1",
      applicationName: "Sample App",
      runtimeTemplate: "java_spring_boot",
      backendRoot: ".",
      openApiInputPath: "src/main/resources/openapi/api-out.yaml",
      frontendRoot: "frontend",
      thorapiClientPath: "frontend/src/thorapi",
      packageManager: "yarn",
    });
    expect(result.checksumSha256).toBe(
      crypto.createHash("sha256").update(result.buffer).digest("hex"),
    );
  });
});
