import fs from "fs/promises";
import os from "os";
import path from "path";
import { it } from "@jest/globals";
import { installGeneratedProject } from "./generatedProjectInstall";
import { BLUEPRINT_MARKER, initializeProjectBlueprintState, ProjectBlueprintConflict, readProjectBlueprintState, safeProjectRelativePath, specificationHash, synchronizeProjectBlueprint } from "./projectBlueprintSync";
import { ValkyrLabsApiError, ValkyrLabsRtkApiClient } from "./valkyrai/ValkyrLabsRtkApi";

const applicationId = "11111111-1111-4111-8111-111111111111";
const specId = "22222222-2222-4222-8222-222222222222";
const backend = "https://api.example/v1";
const original = { openapi: "3.0.3", info: { title: "Round Trip", version: "1.0.0" }, paths: {} };
const document = (specification: any, etag = "a".repeat(64)) => ({ applicationId, specId, filename: "openapi.json", etag, specification });
const response = (data: any) => ({ data, status: 200, statusText: "OK", headers: {} });

describe("project source path boundary", () => {
  it.each(Array.from({ length: 32 }, (_, code) => code))("rejects embedded ASCII control code %i", (code) => {
    expect(() => safeProjectRelativePath(`src/${String.fromCharCode(code)}file.ts`)).toThrow(/unsafe source path/);
  });
  it.each(["../outside.ts", "src/../outside.ts", "/outside.ts", "C:/outside.ts", "src\\file.ts", "src//file.ts", "src/./file.ts"])(
    "rejects unsafe source path %s", (candidate) => {
      expect(() => safeProjectRelativePath(candidate)).toThrow(/unsafe source path/);
    },
  );
  it.each(["src/file.ts", "src/a b.ts", "src/café.ts"])("retains safe source path %s", (candidate) => {
    expect(safeProjectRelativePath(candidate)).toBe(candidate);
  });
});

describe("local project Blueprint synchronization", () => {
  let fixture: string;
  let root: string;
  let request: jest.Mock;
  let canonical: ReturnType<typeof document>;
  const edit = async (description = "authored edit") => {
    const edited = { ...original, info: { ...original.info, description } };
    await fs.writeFile(path.join(root, "openapi.json"), JSON.stringify(edited));
    return edited;
  };
  const sync = (extra: any = {}) => synchronizeProjectBlueprint({ root, backend, jwtToken: "disposable-fixture-session", client: { request } as ValkyrLabsRtkApiClient, ...extra });
  beforeEach(async () => {
    fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-blueprint-test-")));
    const incoming = path.join(fixture, "incoming"); await fs.mkdir(incoming);
    await fs.writeFile(path.join(incoming, "openapi.json"), JSON.stringify(original));
    root = (await installGeneratedProject(incoming, path.join(fixture, "projects"), { applicationId, applicationName: original.info.title, applicationVersion: original.info.version })).extractedPath;
    await initializeProjectBlueprintState(root, { schemaVersion: 1, applicationId, specificationPath: "openapi.json", baselineHash: specificationHash(original) });
    canonical = document(original);
    request = jest.fn(async (input) => {
      if (input.method === "PUT") {
        if (input.json.expectedEtag !== canonical.etag) throw new ValkyrLabsApiError("conflict", 409);
        canonical = document(input.json.specification, "b".repeat(64));
      }
      return response(canonical);
    });
  });
  afterEach(async () => fs.rm(fixture, { recursive: true, force: true }));

  it("compares the original imported document before binding, and saves an edit with the actual server ETag", async () => {
    canonical = document({ paths: {}, info: { version: "1.0.0", title: "Round Trip" }, openapi: "3.0.3" });
    const edited = await edit();
    expect((await sync()).status).toBe("saved");
    expect(request.mock.calls[1][0]).toMatchObject({ method: "PUT", json: { specification: edited, expectedEtag: "a".repeat(64) }, headers: { Authorization: "Bearer disposable-fixture-session" } });
    expect(await readProjectBlueprintState(root)).toMatchObject({ backend, etag: "b".repeat(64), baselineHash: specificationHash(edited) });
    const metadata = await fs.readFile(path.join(root, BLUEPRINT_MARKER), "utf8");
    expect(metadata).not.toContain("disposable-fixture-session");
    expect(JSON.parse(await fs.readFile(path.join(root, "openapi.json"), "utf8"))).toEqual(edited);
    expect((await sync()).status).toBe("unchanged");
    expect(request.mock.calls.filter(([input]) => input.method === "PUT")).toHaveLength(1);
  });

  it("fails closed when the canonical document changed before the first binding, retaining the local source and base", async () => {
    const edited = await edit(); const before = await fs.readFile(path.join(root, BLUEPRINT_MARKER));
    canonical = document({ ...original, paths: { "/remote": {} } }, "c".repeat(64));
    await expect(sync()).rejects.toBeInstanceOf(ProjectBlueprintConflict);
    expect(request).toHaveBeenCalledTimes(1);
    expect(await fs.readFile(path.join(root, BLUEPRINT_MARKER))).toEqual(before);
    expect(JSON.parse(await fs.readFile(path.join(root, "openapi.json"), "utf8"))).toEqual(edited);
  });

  it("retains a bound ETag through conflict/cancel and rechecks the exact explicitly reviewed revision before retry", async () => {
    await sync(); await edit(); const before = await fs.readFile(path.join(root, BLUEPRINT_MARKER));
    canonical = document({ ...original, paths: { "/remote": {} } }, "c".repeat(64));
    await expect(sync()).rejects.toBeInstanceOf(ProjectBlueprintConflict);
    expect(await fs.readFile(path.join(root, BLUEPRINT_MARKER))).toEqual(before);
    const reviewedBase = { etag: canonical.etag, specificationHash: specificationHash(canonical.specification) };
    canonical = document({ ...original, paths: { "/another": {} } }, "d".repeat(64));
    await expect(sync({ reviewedBase })).rejects.toBeInstanceOf(ProjectBlueprintConflict);
    expect(request.mock.calls.filter(([input]) => input.method === "PUT")).toHaveLength(0);
    const latest = { etag: canonical.etag, specificationHash: specificationHash(canonical.specification) };
    expect((await sync({ reviewedBase: latest })).status).toBe("saved");
    expect(request.mock.calls.at(-1)?.[0].json.expectedEtag).toBe("d".repeat(64));
  });

  it("handles a server conflict between GET and PUT without silently adopting the conflict's ETag", async () => {
    await sync(); await edit();
    request.mockImplementation(async (input) => {
      if (input.method === "PUT") { canonical = document({ ...original, paths: { "/race": {} } }, "c".repeat(64)); throw new ValkyrLabsApiError("conflict", 409); }
      return response(canonical);
    });
    await expect(sync()).rejects.toBeInstanceOf(ProjectBlueprintConflict);
    expect((await readProjectBlueprintState(root))?.etag).toBe("a".repeat(64));
    await expect(sync()).rejects.toBeInstanceOf(ProjectBlueprintConflict);
    expect(request.mock.calls.filter(([input]) => input.method === "PUT")).toHaveLength(1);
  });

  it.each([false, true])("recovers a failed response without losing the intended base or replaying an already committed save (committed=%s)", async (committed) => {
    await edit();
    request.mockImplementationOnce(async () => response(canonical)).mockImplementationOnce(async (input) => {
      if (committed) canonical = document(input.json.specification, "b".repeat(64));
      throw new Error("transport interrupted");
    });
    await expect(sync()).rejects.toThrow("transport interrupted");
    expect((await readProjectBlueprintState(root))?.pending?.expectedEtag).toBe("a".repeat(64));
    expect((await sync()).status).toBe(committed ? "recovered" : "saved");
    expect(request.mock.calls.filter(([input]) => input.method === "PUT")).toHaveLength(committed ? 1 : 2);
    expect((await readProjectBlueprintState(root))?.pending).toBeUndefined();
  });

  it("cancels after the canonical read without a PUT or local metadata change, then safely retries", async () => {
    await edit(); const before = await fs.readFile(path.join(root, BLUEPRINT_MARKER));
    await expect(sync({ assertCurrent: () => { if (request.mock.calls.length) throw new Error("cancelled"); } })).rejects.toThrow("cancelled");
    expect(request).toHaveBeenCalledTimes(1); expect(await fs.readFile(path.join(root, BLUEPRINT_MARKER))).toEqual(before);
    expect((await sync()).status).toBe("saved");
  });

  it("does not publish an editor save made during GET, and retains further edits made during PUT", async () => {
    await edit();
    request.mockImplementationOnce(async () => { await edit("edit during GET"); return response(canonical); });
    await expect(sync()).rejects.toThrow(/changed during/);
    expect(request.mock.calls.filter(([input]) => input.method === "PUT")).toHaveLength(0);
    request.mockImplementationOnce(async () => response(canonical)).mockImplementationOnce(async (input) => {
      canonical = document(input.json.specification, "b".repeat(64)); await edit("edit during PUT"); return response(canonical);
    });
    expect((await sync()).localEditsRemain).toBe(true);
    expect(JSON.parse(await fs.readFile(path.join(root, "openapi.json"), "utf8")).info.description).toBe("edit during PUT");
  });

  it("rejects a backend switch, a missing session, and a mismatched server Application before publication", async () => {
    await sync(); request.mockClear();
    await expect(sync({ backend: "https://another.example/v1" })).rejects.toThrow(/another ValkyrAI backend/);
    await expect(sync({ jwtToken: "" })).rejects.toThrow(/Sign in/);
    expect(request).not.toHaveBeenCalled();
    request.mockResolvedValueOnce(response({ ...canonical, applicationId: specId }));
    await expect(sync()).rejects.toThrow(/invalid Blueprint/);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
