import { it } from "@jest/globals";
import AdmZip from "adm-zip";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createApplicationSourceArchive, publishApplicationSource, SOURCE_PUBLICATION_MARKER } from "./applicationSourcePublish";
import { getSecret } from "@core/storage/state";
import { getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
import { installGeneratedProject } from "./generatedProjectInstall";
import { execFile } from "child_process";
import { promisify } from "util";

// Git metadata is a read-only unit fixture; this suite never creates or writes a repository.
jest.mock("child_process", () => {
  const execFile = jest.fn();
  (execFile as any)[jest.requireActual<typeof import("util")>("util").promisify.custom] = jest.fn();
  return { ...jest.requireActual("child_process"), execFile };
});
jest.mock("@core/storage/state", () => ({ getSecret: jest.fn() }));
jest.mock("@utils/path", () => ({ getWorkspacePath: jest.fn() }));
jest.mock("@utils/serverValkyraiHost", () => ({ getValkyraiBasePath: jest.fn() }));
jest.mock("./valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: jest.fn(),
  ValkyrLabsApiError: class extends Error { constructor(message: string, public status: number) { super(message); } },
}));

describe("createApplicationSourceArchive", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.realpath(await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-source-"),
    ));
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
        "src/main/resources/openapi/api-out.yaml",
        "frontend/package.json",
        "frontend/yarn.lock",
        "frontend/src/App.tsx",
      ]),
    );
    expect(entries).not.toEqual(
      expect.arrayContaining([
        "frontend/src/thorapi/generated.ts",
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

  it("publishes the generated Boot module with authored workflow, adapter and deployment sources", async () => {
    await fs.mkdir(path.join(workspaceRoot, "spring-server/src/main/resources"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "spring-server/pom.xml"), "<project><artifactId>server</artifactId></project>");
    await fs.writeFile(path.join(workspaceRoot, "spring-server/src/main/resources/openapi.yaml"), "openapi: 3.0.3\n");
    for (const relative of ["workflow/module-draft.json", "runtime/dependencies.json", "runtime/render_clips.py", "clipping-service.openapi.json", "artifacts/generated-0.1.3-draft.zip", ".valoride-generation.json", ".valoride-blueprint.json"]) {
      await fs.mkdir(path.dirname(path.join(workspaceRoot, relative)), { recursive: true });
      await fs.writeFile(path.join(workspaceRoot, relative), relative);
    }
    const result = await createApplicationSourceArchive(workspaceRoot, "app-1", "Clipping App");
    const archive = new AdmZip(result.buffer);
    expect(result.manifest).toMatchObject({ backendRoot: "spring-server", openApiInputPath: "spring-server/src/main/resources/openapi.yaml" });
    for (const relative of ["workflow/module-draft.json", "runtime/dependencies.json", "runtime/render_clips.py", "clipping-service.openapi.json"]) expect(archive.readAsText(relative)).toBe(relative);
    expect(archive.readAsText("spring-server/src/main/resources/openapi.yaml")).toBe("openapi: 3.0.3\n");
    for (const relative of ["artifacts/generated-0.1.3-draft.zip", ".valoride-generation.json", ".valoride-blueprint.json"]) expect(archive.getEntry(relative)).toBeNull();
  });

  it("rejects a renamed local macOS binary before preparing a deployment source archive", async () => {
    await fs.mkdir(path.join(workspaceRoot, "runtime"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "runtime/ffmpeg"), Buffer.from("cffaedfe00000000", "hex"));
    await expect(createApplicationSourceArchive(workspaceRoot, "app-1")).rejects.toThrow(/compiled macOS.*runtime\/ffmpeg.*target-platform/);
  });
});

describe("canonical Application source publication", () => {
  const applicationId = "11111111-1111-4111-8111-111111111111";
  const artifactId = "44444444-4444-4444-8444-444444444444";
  const projectId = "33333333-3333-4333-8333-333333333333";
  const organizationId = "22222222-2222-4222-8222-222222222222";
  const jwtToken = "existing-test-session-header-only";
  const backend = "http://127.0.0.1:18925/v1";
  const originalZip = new AdmZip();
  originalZip.addFile("generated.txt", Buffer.from("original generator bytes"));
  const originalBytes = originalZip.toBuffer();
  const originalGeneratorChecksum = crypto.createHash("sha256").update(originalBytes).digest("hex");
  const manifest = {
    schemaVersion: 1, applicationId, runtimeTemplate: "java_spring_boot",
    backendRoot: "spring-server", openApiInputPath: "spring-server/src/main/resources/openapi.yaml",
    frontendRoot: "ui", thorapiClientPath: "typescript-redux-query", packageManager: "npm",
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 4) + "\n");
  const revisionRef = `source-snapshot:${applicationId}:${artifactId}`;
  let root: string, currentArtifact: string | null, source: any, selected: any, request: jest.Mock;
  let uploadFailure: "none" | "before" | "after", selectionFailure: "none" | "before" | "after";
  const write = async (relative: string, data: string | Buffer) => {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  };
  const publish = () => publishApplicationSource({ context: {} as any, applicationId, applicationName: "Useful App" });
  const uploaded = () => request.mock.calls.filter(([q]) => q.method === "POST" && q.url.endsWith("/source-snapshots"));
  const puts = () => request.mock.calls.filter(([q]) => q.method === "POST" && q.url.endsWith("/source-selection/select"));
  const marker = async () => JSON.parse(await fs.readFile(path.join(root, SOURCE_PUBLICATION_MARKER), "utf8"));

  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-canonical-source-")));
    await write(".valoride-deploy.json", manifestBytes);
    await write("spring-server/pom.xml", "<project />\n");
    await write("spring-server/src/main/resources/openapi.yaml", "openapi: 3.0.3\ninfo:\n  title: Useful App\n  version: 1.0.0\n");
    await write("package.json", JSON.stringify({ private: true, workspaces: ["ui", "typescript-redux-query"] }));
    await write("package-lock.json", "{\"lockfileVersion\":3}\n");
    await write("ui/package.json", JSON.stringify({ scripts: { build: "vite build" }, dependencies: { react: "18" } }));
    await write("ui/src/App.tsx", "export const App = () => <main>Protected custom edit</main>;\n");
    await write("typescript-redux-query/package.json", JSON.stringify({ name: "@valkyrai/thorapi" }));
    await write("typescript-redux-query/src/models/Model.ts", "export type Model = { value: string };\n");
    await write(".valoride-generator-ignore", "ui/src/App.tsx\nGETTING_STARTED.md\n");
    await write("GETTING_STARTED.md", "Developer installation notes\n");
    await write("spring-server/src/main/java/example/Custom.java", "class Custom {}\n");
    await write("generation-lineage.json", JSON.stringify({ applicationId, originalGeneratorChecksumSha256: originalGeneratorChecksum }));
    await write("export-reference/generator-original.zip", originalBytes);
    currentArtifact = "existing-generator-artifact"; source = undefined; selected = undefined;
    uploadFailure = "none"; selectionFailure = "none";
    (getWorkspacePath as jest.Mock).mockReturnValue(root);
    (getSecret as jest.Mock).mockResolvedValue(jwtToken);
    (getValkyraiBasePath as jest.Mock).mockReturnValue(backend);
    request = jest.fn(async q => {
      const descriptor = () => ({ applicationId, buildProfileId: selected ? artifactId : projectId,
        artifactRef: currentArtifact, profileSha256: (selected ? "b" : "a").repeat(64) });
      if (q.method === "GET" && q.url.endsWith("/source-selection/state")) return { data: descriptor() };
      if (q.method === "POST" && q.url.endsWith("/source-selection/select")) {
        if (selectionFailure === "before") throw new Error(jwtToken);
        selected = { ...source, projectId, organizationId, originalGeneratorChecksum };
        currentArtifact = revisionRef;
        if (selectionFailure === "after") throw new Error(jwtToken);
        return { data: { baseline: q.json.expectedCurrent, selected: descriptor(), sourceRevision: selected } };
      }
      if (q.method === "GET" && q.url.endsWith("/selection"))
        return { data: { applicationId, artifactRef: currentArtifact, sourceRevision: selected } };
      if (q.method === "GET" && q.url.endsWith("/source-snapshots")) return { data: source };
      if (q.method === "POST") {
        if (uploadFailure === "before") throw new ValkyrLabsApiError(jwtToken, 403);
        const bytes = Buffer.from(await q.body.get("file").arrayBuffer());
        source = { applicationId, artifactId, revisionRef, checksumSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
          sizeBytes: bytes.length, createdAt: "2026-10-07T00:00:00Z", status: "validated", manifest };
        if (uploadFailure === "after") throw new Error(jwtToken);
        return { data: source };
      }
      if (q.method === "PUT") {
        if (selectionFailure === "before") throw new Error(jwtToken);
        selected = { ...source, projectId, organizationId, originalGeneratorChecksum };
        currentArtifact = revisionRef;
        if (selectionFailure === "after") throw new Error(jwtToken);
        return { data: selected };
      }
      throw new Error("unexpected request");
    });
    (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request });
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it("preserves committed npm workspace bytes, SDK, baseline, protected edits and lockfile while excluding secrets and retry metadata", async () => {
    for (const relative of [".env", "ui/.env.local", "private.pem", "ui/node_modules/cache.js", "spring-server/target/app.jar",
      "ui/dist/index.html", SOURCE_PUBLICATION_MARKER, SOURCE_PUBLICATION_MARKER + ".old.tmp"])
      await write(relative, jwtToken);
    const first = await createApplicationSourceArchive(root, applicationId);
    const second = await createApplicationSourceArchive(root, applicationId);
    expect(second.checksumSha256).toBe(first.checksumSha256);
    const zip = new AdmZip(first.buffer);
    expect(zip.getEntry(".valoride-deploy.json")?.getData()).toEqual(manifestBytes);
    for (const relative of ["package-lock.json", "typescript-redux-query/src/models/Model.ts", ".valoride-generator-ignore", "ui/src/App.tsx",
      "GETTING_STARTED.md", "spring-server/src/main/java/example/Custom.java", "generation-lineage.json", "export-reference/generator-original.zip",
      "spring-server/src/main/resources/openapi.yaml"])
      expect(zip.getEntry(relative)?.getData()).toEqual(await fs.readFile(path.join(root, relative)));
    for (const entry of zip.getEntries()) expect(entry.getData().includes(Buffer.from(jwtToken))).toBe(false);
  });

  it.each([
    ["wrong Application", { applicationId: organizationId }, /another Application/],
    ["escaping path", { backendRoot: "../other" }, /inside the source project/],
    ["credential in manifest", { account: { accessToken: jwtToken } }, /Remove credentials/],
    ["legacy client path in npm workspace", { thorapiClientPath: "ui/src/thorapi" }, /generated npm workspace/],
    ["input outside backend", { openApiInputPath: "ui/api.yaml" }, /inside backendRoot/],
  ])("rejects %s before an API call", async (_name, changes, message) => {
    await write(".valoride-deploy.json", JSON.stringify({ ...manifest, ...(changes as any) }));
    await expect(publish()).rejects.toThrow(message as RegExp);
    expect(request).not.toHaveBeenCalled();
  });

  it.each(["package.json", "typescript-redux-query/package.json", "spring-server/src/main/resources/openapi.yaml",
    "generation-lineage.json", "export-reference/generator-original.zip"])("requires complete canonical source including %s", async relative => {
    await fs.rm(path.join(root, relative));
    await expect(publish()).rejects.toThrow(/complete|including/);
    expect(request).not.toHaveBeenCalled();
  });

  it("requires a usable npm workspace and keeps ignored protection policy from silently disappearing", async () => {
    await write("package.json", JSON.stringify({ workspaces: ["ui"] }));
    await expect(publish()).rejects.toThrow(/complete root npm workspace/);
    await write("package.json", JSON.stringify({ workspaces: ["ui", "typescript-redux-query"] }));
    await write(".valorideignore", ".valoride-generator-ignore\n");
    await expect(publish()).rejects.toThrow(/protection policy was excluded/);
    expect(request).not.toHaveBeenCalled();
  });

  it("uploads and explicitly selects one immutable revision using the captured parent and header-only session", async () => {
    const result = await publish();
    expect(result).toMatchObject({ selected: true, revisionRef, sourceRevision: { projectId, organizationId, originalGeneratorChecksum } });
    expect(request.mock.calls.map(([q]) => q.method)).toEqual(["GET", "GET", "POST", "GET", "POST", "GET"]);
    expect(puts()[0][0].json).toEqual({ revisionRef, expectedCurrent: {
      applicationId, buildProfileId: projectId, artifactRef: "existing-generator-artifact", profileSha256: "a".repeat(64),
    } });
    for (const [q] of request.mock.calls) {
      expect(q.headers).toEqual({ Authorization: `Bearer ${jwtToken}` });
      expect(JSON.stringify(q.json ?? {})).not.toContain(jwtToken);
      expect(q.redirect).toBe("error");
    }
    const bytes = Buffer.from(await uploaded()[0][0].body.get("file").arrayBuffer());
    for (const entry of new AdmZip(bytes).getEntries()) expect(entry.getData().includes(Buffer.from(jwtToken))).toBe(false);
    await expect(fs.stat(path.join(root, SOURCE_PUBLICATION_MARKER))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("reconnects after selection interruption without re-uploading or changing protected edits", async () => {
    selectionFailure = "before";
    await expect(publish()).rejects.toThrow(/Uploaded revision.*remains intact.*reconnect/);
    const saved = await marker();
    expect(saved.result.revisionRef).toBe(revisionRef);
    expect(JSON.stringify(saved)).not.toMatch(/token|credential|password/i);
    expect(saved.expectedCurrent.artifactRef).toBe("existing-generator-artifact");
    selectionFailure = "none";
    expect((await publish()).selected).toBe(true);
    expect(uploaded()).toHaveLength(1);
    expect(puts()).toHaveLength(2);
    expect(await fs.readFile(path.join(root, "ui/src/App.tsx"), "utf8")).toContain("Protected custom edit");
  });

  it("preserves an unknown selection response for review without inferring a new profile descriptor", async () => {
    selectionFailure = "after";
    await expect(publish()).rejects.toThrow(/remains intact/);
    selectionFailure = "none";
    await expect(publish()).rejects.toThrow(/selection changed after publication/);
    expect(uploaded()).toHaveLength(1); expect(puts()).toHaveLength(1);
  });

  it("recovers a lost upload response only when latest immutable source matches the exact deterministic archive", async () => {
    uploadFailure = "after";
    await expect(publish()).rejects.toThrow(/Source upload.*interrupted/);
    expect((await marker()).result).toBeUndefined();
    uploadFailure = "none";
    expect((await publish()).selected).toBe(true);
    expect(uploaded()).toHaveLength(1); expect(puts()).toHaveLength(1);
  });

  it("reports a rejected upload without reflecting credentials and resumes the unchanged archive", async () => {
    uploadFailure = "before";
    const failure = await publish().catch(error => error);
    expect(failure.message).toMatch(/Source upload \(403\).*authorized account/);
    expect(failure.message).not.toContain(jwtToken);
    expect(JSON.stringify(await marker())).not.toContain(jwtToken);
    expect(puts()).toHaveLength(0);
    uploadFailure = "none";
    expect((await publish()).selected).toBe(true);
    expect(uploaded()).toHaveLength(2);
  });

  it("refuses to adopt a changed parent after interruption and preserves the pending immutable revision", async () => {
    selectionFailure = "before";
    await expect(publish()).rejects.toThrow(/remains intact/);
    currentArtifact = "someone-elses-new-artifact";
    selectionFailure = "none";
    await expect(publish()).rejects.toThrow(/selection changed after publication/);
    expect(uploaded()).toHaveLength(1); expect(puts()).toHaveLength(1);
    expect((await marker()).expectedCurrent.artifactRef).toBe("existing-generator-artifact");
  });

  it("preserves edits made after an interrupted upload and requires review before a different revision", async () => {
    uploadFailure = "after";
    await expect(publish()).rejects.toThrow(/interrupted/);
    await write("GETTING_STARTED.md", "More notes after interruption\n");
    request.mockClear(); uploadFailure = "none";
    await expect(publish()).rejects.toThrow(/Source or account changed.*Keep your edits/);
    expect(request).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, "GETTING_STARTED.md"), "utf8")).toBe("More notes after interruption\n");
  });

  it("stops selection when the authenticated session changes after upload and resumes in the original account", async () => {
    const transport = request.getMockImplementation()!;
    request.mockImplementation(async q => {
      const response = await transport(q);
      if (q.method === "POST" && q.url.endsWith("/source-snapshots")) (getSecret as jest.Mock).mockResolvedValue("different-session");
      return response;
    });
    await expect(publish()).rejects.toThrow(/backend or session changed/);
    expect(puts()).toHaveLength(0);
    (getSecret as jest.Mock).mockResolvedValue(jwtToken);
    expect((await publish()).selected).toBe(true);
    expect(uploaded()).toHaveLength(1);
  });

  it("rejects a forged upload descriptor before selection", async () => {
    const transport = request.getMockImplementation()!;
    request.mockImplementation(async q => {
      const response = await transport(q);
      return q.method === "POST" && q.url.endsWith("/source-snapshots") ? { data: { ...response.data, applicationId: organizationId } } : response;
    });
    await expect(publish()).rejects.toThrow(/different or invalid immutable/);
    expect(puts()).toHaveLength(0);
  });

  it("keeps protected/custom edits and committed npm manifest when canonical generated ownership replaces other code", async () => {
    const identity = { applicationId, applicationName: "Useful App", applicationVersion: "1.0.0" };
    const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-source-replace-")));
    try {
      const owned = ["ui/src/App.tsx", "typescript-redux-query/src/models/Model.ts", "GETTING_STARTED.md"];
      const installed = await installGeneratedProject(root, parent, identity, undefined, { mode: "import", generatedFiles: owned });
      const project = installed.extractedPath;
      (promisify(execFile) as jest.Mock).mockImplementation(async (_command, args) => {
        if (args.includes("rev-parse")) return { stdout: project + "\n", stderr: "" };
        if (args.includes("show")) return { stdout: Buffer.from("ui/src/App.tsx\nGETTING_STARTED.md\n"), stderr: Buffer.alloc(0) };
        throw new Error("Unexpected fixture Git request");
      });
      await fs.writeFile(path.join(project, "ui/src/App.tsx"), "export const App = () => <main>Hand edit remains</main>;\n");
      await fs.writeFile(path.join(project, "CUSTOM.md"), "Owned developer change\n");
      await write("ui/src/App.tsx", "export const App = () => null;\n");
      await write("typescript-redux-query/src/models/Model.ts", "export type Model = { value: string; next: boolean };\n");
      const regenerated = await installGeneratedProject(root, parent, identity, undefined,
        { mode: "regenerate", generatedFiles: owned, confirmOverwrite: () => true });
      expect(regenerated.updatedFiles).toContain("typescript-redux-query/src/models/Model.ts");
      expect(regenerated.preservedFiles).toContain("ui/src/App.tsx");
      expect(await fs.readFile(path.join(project, "ui/src/App.tsx"), "utf8")).toContain("Hand edit remains");
      expect(await fs.readFile(path.join(project, "CUSTOM.md"), "utf8")).toBe("Owned developer change\n");
      const archive = await createApplicationSourceArchive(project, applicationId);
      const zip = new AdmZip(archive.buffer);
      expect(zip.getEntry(".valoride-deploy.json")?.getData()).toEqual(manifestBytes);
      expect(zip.readAsText("CUSTOM.md")).toBe("Owned developer change\n");
      expect(zip.readAsText("ui/src/App.tsx")).toContain("Hand edit remains");
      expect(zip.readAsText("typescript-redux-query/src/models/Model.ts")).toContain("next: boolean");
    } finally { await fs.rm(parent, { recursive: true, force: true }); }
  });
});
