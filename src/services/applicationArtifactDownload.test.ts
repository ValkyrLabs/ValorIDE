import fs from "fs/promises";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";
import { createHash } from "crypto";
import {
  downloadApplicationArtifact,
  filenameFromDisposition,
} from "./applicationArtifactDownload";
import { getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { extractLocalZip } from "@utils/zipExtractor";
import { generateCanonicalArchive } from "./canonicalApplicationGeneration";

jest.mock("@utils/path", () => ({
  getWorkspacePath: jest.fn(),
  getReadablePath: (_: string, p: string) => p,
}));
jest.mock("@utils/thorapi", () => ({
  resolveThorapiFolderPath: (root: string) =>
    jest.requireActual("path").join(root, "thorapi"),
}));
jest.mock("@utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: jest.fn(),
}));
jest.mock("@utils/zipExtractor", () => ({
  extractLocalZip: jest.fn(),
  isZipBuffer: (data: Buffer) =>
    data.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])),
}));
jest.mock("./canonicalApplicationGeneration", () => ({
  generateCanonicalArchive: jest.fn(),
}));

const applicationId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const request = {
  applicationId,
  applicationName: "Sample",
  applicationVersion: "1",
  jwtToken: "host-session",
};
const response = {
  archive: Buffer.from([80, 75, 3, 4, 1]),
  fileName: "v1.Sample.zip",
  provenance: { requestRef: "req-1", receiptRef: "receipt-1", generationRunRef: "run-1", artifactRef: "artifact-1", fileRecordId: "file-1", checksum: "digest", tenantId: "tenant", accountId: "account" },
  complete: jest.fn(async () => {}),
};

describe("native application artifacts", () => {
  let root: string;
  let fetchArtifact: jest.Mock;
  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-artifact-test-")));
    (getWorkspacePath as jest.Mock).mockReturnValue(root);
    (getValkyraiBasePath as jest.Mock).mockReturnValue(
      "https://api.example/v1",
    );
    fetchArtifact = jest.fn().mockResolvedValue(response);
    (generateCanonicalArchive as jest.Mock).mockImplementation((...args) => fetchArtifact(...args));
    (extractLocalZip as jest.Mock).mockImplementation(
      async (_archive, target) => {
        const output = path.join(target, "v1.Sample");
        await fs.mkdir(output, { recursive: true });
        return output;
      },
    );
  });
  afterEach(async () => fs.rm(root, { recursive: true, force: true }));

  it("uses host authentication and publishes provenance only after extraction", async () => {
    const stages: string[] = [];
    const result = await downloadApplicationArtifact({
      ...request,
      onProgress: (_message, step) => {
        stages.push(step);
      },
    });
    expect(fetchArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: "https://api.example/v1",
        applicationId,
        jwtToken: "host-session",
        assertCurrent: expect.any(Function),
      }),
    );
    expect(result.extractedPath).toBe(path.join(root, "thorapi", "Sample-v1"));
    expect(result.extractedPath).not.toContain(applicationId);
    expect(
      JSON.parse(
        await fs.readFile(
          path.join(result.extractedPath, ".valoride-generation.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({ applicationId, editableUpstreamSurface: "openapi-only" });
    expect(response.complete).toHaveBeenCalledTimes(1);
    expect(result.generationReceiptRef).toBe("receipt-1");
    expect(stages).toEqual([
      "receiving",
      "processing",
      "extracting",
      "finalizing",
    ]);
    await expect(
      fs.access((extractLocalZip as jest.Mock).mock.calls[0][0]),
    ).rejects.toThrow();
  });

  it("rejects a duplicate build before making another paid request", async () => {
    let finish!: (value: typeof response) => void;
    fetchArtifact.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = downloadApplicationArtifact(request);
    while (fetchArtifact.mock.calls.length === 0) await Promise.resolve();
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(
      /already.*generat/i,
    );
    expect(fetchArtifact).toHaveBeenCalledTimes(1);
    finish(response);
    await first;
    fetchArtifact.mockResolvedValue(response);
    await downloadApplicationArtifact(request);
    expect(fetchArtifact).toHaveBeenCalledTimes(2);
  });

  it("rejects a same-name/version collision instead of overwriting another application", async () => {
    const first = await downloadApplicationArtifact(request);
    await expect(downloadApplicationArtifact({ ...request, applicationId: secondId })).rejects.toThrow(/another application/i);
    expect(JSON.parse(await fs.readFile(path.join(first.extractedPath, ".valoride-generation.json"), "utf8")).applicationId).toBe(applicationId);
  });

  it("uses the generated API version instead of the UUID ZIP filename and rejects a stale saved version", async () => {
    fetchArtifact.mockResolvedValue({ ...response, fileName: `sample-thorapi-${applicationId}.zip` });
    (extractLocalZip as jest.Mock).mockImplementation(async (_archive, target) => {
      const output = path.join(target, "incoming"); await fs.mkdir(output);
      await fs.writeFile(path.join(output, "generation-plan.json"), JSON.stringify({ api: { version: "3.2.1" } }));
      return output;
    });
    const result = await downloadApplicationArtifact({ ...request, applicationVersion: undefined });
    expect(result.extractedPath).toBe(path.join(root, "thorapi", "Sample-v3.2.1"));
    expect(result.applicationVersion).toBe("3.2.1");
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/version changed/i);
    expect(await fs.readdir(path.join(root, "thorapi"))).toEqual(["Sample-v3.2.1"]);
  });

  it("regenerates into an opened canonical project and places a different version beside it", async () => {
    const first = await downloadApplicationArtifact(request);
    await fs.writeFile(path.join(first.extractedPath, "custom.ts"), "hand-written");
    (getWorkspacePath as jest.Mock).mockReturnValue(first.extractedPath);
    const repeated = await downloadApplicationArtifact(request);
    expect(repeated.extractedPath).toBe(first.extractedPath);
    expect(await fs.readFile(path.join(first.extractedPath, "custom.ts"), "utf8")).toBe("hand-written");
    const next = await downloadApplicationArtifact({ ...request, applicationVersion: "2" });
    expect(next.extractedPath).toBe(path.join(root, "thorapi", "Sample-v2"));
    await expect(fs.access(path.join(first.extractedPath, "thorapi"))).rejects.toThrow();
  });

  it("uses the original generator ownership vector and preserves edited custom source during canonical regeneration", async () => {
    const original = new AdmZip();
    original.addFile("spring-server/Generated.java", Buffer.from("fresh generated"));
    const originalBytes = original.toBuffer();
    (extractLocalZip as jest.Mock).mockImplementation(async (_archive, target) => {
      const output = path.join(target, "incoming");
      await fs.mkdir(path.join(output, "spring-server"), { recursive: true });
      await fs.mkdir(path.join(output, "export-reference"));
      await fs.writeFile(path.join(output, "spring-server/Generated.java"), "fresh generated");
      await fs.writeFile(path.join(output, "custom.ts"), "committed custom");
      await fs.writeFile(path.join(output, "export-reference/generator-original.zip"), originalBytes);
      await fs.writeFile(path.join(output, "generation-lineage.json"), JSON.stringify({
        applicationId, originalGeneratorChecksumSha256: createHash("sha256").update(originalBytes).digest("hex"),
        generatedFiles: ["spring-server/Generated.java"],
      }));
      return output;
    });
    const first = await downloadApplicationArtifact(request);
    await fs.writeFile(path.join(first.extractedPath, "custom.ts"), "local custom edit");
    await fs.writeFile(path.join(first.extractedPath, "spring-server/Generated.java"), "local generated edit");
    const confirmOverwrite = jest.fn(async () => true);
    const repeated = await downloadApplicationArtifact({ ...request, confirmOverwrite });
    expect(confirmOverwrite).toHaveBeenCalledWith(["spring-server/Generated.java"]);
    expect(await fs.readFile(path.join(repeated.extractedPath, "custom.ts"), "utf8")).toBe("local custom edit");
    expect(await fs.readFile(path.join(repeated.extractedPath, "spring-server/Generated.java"), "utf8")).toBe("fresh generated");
    const manifest = JSON.parse(await fs.readFile(path.join(repeated.extractedPath, ".valoride-generation.json"), "utf8"));
    expect(manifest.generatedFiles).toEqual(["spring-server/Generated.java"]);
  });

  it("rejects malformed identity, missing auth, and missing workspace before generation", async () => {
    await expect(
      downloadApplicationArtifact({ ...request, applicationId: "../app" }),
    ).rejects.toThrow(/application/i);
    await expect(
      downloadApplicationArtifact({ ...request, jwtToken: "" }),
    ).rejects.toThrow(/sign in/i);
    (getWorkspacePath as jest.Mock).mockReturnValue(undefined);
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(
      /workspace/i,
    );
    expect(fetchArtifact).not.toHaveBeenCalled();
  });

  it("stops before extraction when the session changes during download", async () => {
    let current = true;
    const assertCurrent = jest.fn(async () => {
      if (!current) throw new Error("Session changed");
    });
    fetchArtifact.mockImplementation(async () => {
      current = false;
      return response;
    });
    await expect(
      downloadApplicationArtifact({ ...request, assertCurrent }),
    ).rejects.toThrow("Session changed");
    expect(fetchArtifact).toHaveBeenCalledTimes(1);
    expect(extractLocalZip).not.toHaveBeenCalled();
  });

  it("does not send the session to a backend selected while progress is delivered", async () => {
    await expect(
      downloadApplicationArtifact({
        ...request,
        onProgress: (_message, step) => {
          if (step === "receiving") {
            (getValkyraiBasePath as jest.Mock).mockReturnValue(
              "https://other.example/v1",
            );
          }
        },
      }),
    ).rejects.toThrow(/backend changed/i);
    expect(fetchArtifact).not.toHaveBeenCalled();
  });

  it("rejects the old backend response before writing a project", async () => {
    fetchArtifact.mockImplementation(async () => {
      (getValkyraiBasePath as jest.Mock).mockReturnValue(
        "https://other.example/v1",
      );
      return response;
    });
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(
      /backend changed/i,
    );
    expect(fetchArtifact).toHaveBeenCalledTimes(1);
    expect(extractLocalZip).not.toHaveBeenCalled();
    expect(await fs.readdir(root)).toEqual([]);
  });

  it("rechecks the session after progress before the paid request", async () => {
    let current = true;
    await expect(
      downloadApplicationArtifact({
        ...request,
        assertCurrent: async () => {
          if (!current) throw new Error("Session changed");
        },
        onProgress: (_message, step) => {
          if (step === "receiving") current = false;
        },
      }),
    ).rejects.toThrow("Session changed");
    expect(fetchArtifact).not.toHaveBeenCalled();
  });

  it("rejects non-ZIP responses and keeps extraction errors without a success stage", async () => {
    fetchArtifact.mockResolvedValueOnce({
      ...response,
      archive: Buffer.from("login page"),
    });
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(
      /non-ZIP/,
    );
    (extractLocalZip as jest.Mock).mockRejectedValue(new Error("Corrupt ZIP"));
    const stages: string[] = [];
    await expect(
      downloadApplicationArtifact({
        ...request,
        onProgress: (_message, step) => {
          stages.push(step);
        },
      }),
    ).rejects.toThrow("Corrupt ZIP");
    expect(stages).not.toContain("finalizing");
    expect(response.complete).not.toHaveBeenCalled();
    await expect(
      fs.access((extractLocalZip as jest.Mock).mock.calls[0][0]),
    ).rejects.toThrow();
  });

  it("tolerates ordinary percent characters and strips filename paths", () => {
    expect(
      filenameFromDisposition(
        'attachment; filename="100% ready.zip"',
        applicationId,
      ),
    ).toBe("100% ready.zip");
    expect(
      filenameFromDisposition(
        "attachment; filename*=UTF-8''%2Ftmp%2Fapp.zip",
        applicationId,
      ),
    ).toBe("app.zip");
  });
});
