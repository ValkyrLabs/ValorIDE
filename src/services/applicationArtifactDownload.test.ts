import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  downloadApplicationArtifact,
  filenameFromDisposition,
} from "./applicationArtifactDownload";
import { getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { extractLocalZip } from "@utils/zipExtractor";
import { getValkyrLabsRtkApiClient } from "./valkyrai/ValkyrLabsRtkApi";

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
jest.mock("./valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: jest.fn(),
}));

const applicationId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const request = {
  applicationId,
  applicationName: "Sample",
  jwtToken: "host-session",
};
const response = {
  data: Buffer.from([80, 75, 3, 4, 1]),
  headers: { "content-disposition": 'attachment; filename="v1.Sample.zip"' },
};

describe("native application artifacts", () => {
  let root: string;
  let fetchArtifact: jest.Mock;
  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-artifact-test-"));
    (getWorkspacePath as jest.Mock).mockReturnValue(root);
    (getValkyraiBasePath as jest.Mock).mockReturnValue(
      "https://api.example/v1",
    );
    fetchArtifact = jest.fn().mockResolvedValue(response);
    (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({
      request: fetchArtifact,
    });
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
        url: `https://api.example/v1/thorapi/generate/${applicationId}`,
        method: "POST",
        headers: {
          Authorization: "Bearer host-session",
          jwtSession: "host-session",
        },
        responseType: "arrayBuffer",
      }),
    );
    expect(result.extractedPath).toContain(applicationId);
    expect(
      JSON.parse(
        await fs.readFile(
          path.join(result.extractedPath, ".valoride-generation.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({ applicationId, editableUpstreamSurface: "openapi-only" });
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

  it("separates applications even when their archive names match", async () => {
    const [first, second] = await Promise.all([
      downloadApplicationArtifact(request),
      downloadApplicationArtifact({ ...request, applicationId: secondId }),
    ]);
    expect(first.extractedPath).not.toBe(second.extractedPath);
    const archives = (extractLocalZip as jest.Mock).mock.calls.map(
      (call) => call[0],
    );
    expect(archives[0]).not.toBe(archives[1]);
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
      data: Buffer.from("login page"),
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
