import fs from "fs/promises";
import { it } from "@jest/globals";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";
import fetch from "node-fetch";
import * as vscode from "vscode";
import { downloadAndExtractZip, extractLocalZip } from "./zipExtractor";

jest.mock("node-fetch", () => ({ __esModule: true, default: jest.fn() }));

jest.mock("vscode", () => ({
  Uri: { file: (value: string) => value },
  workspace: {
    fs: {
      createDirectory: jest.fn((value: string) =>
        jest.requireActual("fs/promises").mkdir(value, { recursive: true }),
      ),
      writeFile: jest.fn((value: string, data: Uint8Array) =>
        jest.requireActual("fs/promises").writeFile(value, data),
      ),
    },
  },
}));

describe("local generated archive extraction", () => {
  let root: string;
  let archivePath: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-zip-"));
    archivePath = path.join(root, "v1.Sample.zip");
    const zip = new AdmZip();
    zip.addFile("src/main.ts", Buffer.from("export const ready = true;"));
    zip.addFile("README.md", Buffer.from("Sample app"));
    zip.writeZip(archivePath);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("extracts a real archive with nested source files", async () => {
    const output = await extractLocalZip(
      archivePath,
      path.join(root, "out"),
      "Sample",
    );
    expect(
      await fs.readFile(path.join(output, "src/main.ts"), "utf8"),
    ).toContain("ready = true");
    expect(await fs.readFile(path.join(output, "README.md"), "utf8")).toBe(
      "Sample app",
    );
  });

  it("rejects an empty ZIP instead of reporting an empty project as ready", async () => {
    new AdmZip().writeZip(archivePath);
    await expect(
      extractLocalZip(archivePath, path.join(root, "out"), "Sample", {
        fresh: true,
      }),
    ).rejects.toThrow(/no project files/i);
  });

  it("keeps regenerated artifacts separate and preserves local edits", async () => {
    const first = await extractLocalZip(
      archivePath,
      path.join(root, "out"),
      "Sample",
      { fresh: true },
    );
    await fs.writeFile(path.join(first, "README.md"), "Local edits");
    const second = await extractLocalZip(
      archivePath,
      path.join(root, "out"),
      "Sample",
      { fresh: true },
    );
    expect(first).not.toBe(second);
    expect(await fs.readFile(path.join(first, "README.md"), "utf8")).toBe(
      "Local edits",
    );
    expect(await fs.readFile(path.join(second, "README.md"), "utf8")).toBe(
      "Sample app",
    );
  });

  it("rejects parent traversal in ZIP headers before writing files", async () => {
    const bytes = await fs.readFile(archivePath);
    let offset = bytes.indexOf("src/main.ts");
    while (offset >= 0) {
      bytes.write("../owned.ts", offset);
      offset = bytes.indexOf("src/main.ts", offset + 1);
    }
    await fs.writeFile(archivePath, bytes);
    await expect(
      extractLocalZip(archivePath, path.join(root, "out")),
    ).rejects.toThrow(/unsafe archive path/i);
    await expect(fs.access(path.join(root, "out/owned.ts"))).rejects.toThrow();
  });

  it("rejects output symlinks before writing any archive files", async () => {
    const output = path.join(root, "out/v1.Sample");
    const outside = path.join(root, "outside");
    await fs.mkdir(output, { recursive: true });
    await fs.mkdir(outside);
    await fs.symlink(outside, path.join(output, "src"));
    await expect(
      extractLocalZip(archivePath, path.join(root, "out")),
    ).rejects.toThrow(/symbolic link/i);
    await expect(fs.access(path.join(outside, "main.ts"))).rejects.toThrow();
    await expect(fs.access(path.join(output, "README.md"))).rejects.toThrow();
  });
});

describe("downloaded generated archive validation", () => {
  let root: string;
  const url =
    "https://artifacts.example.test/private/generated?reference=synthetic";
  const source = Buffer.from("export const ready = true;");
  const manifest = Buffer.from(
    JSON.stringify({
      applicationId: "11111111-1111-4111-8111-111111111111",
      receiptRef: "receipt-fixture",
    }),
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "valoride-download-zip-")),
    );
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const archive = () => {
    const zip = new AdmZip();
    // A valid entry must precede the unsafe one, proving complete preflight.
    zip.addFile("000-safe.txt", Buffer.from("safe original"));
    zip.addFile("src/main.ts", source);
    zip.addFile("source-manifest.json", manifest);
    return zip;
  };
  const download = (bytes: Buffer) => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: () => "attachment; filename*=UTF-8''v3.Sample%20App.zip",
      },
      arrayBuffer: async () => bytes,
    });
    return downloadAndExtractZip(url, path.join(root, "out"), "Sample App");
  };
  const replaceEntryName = (bytes: Buffer, replacement: string) => {
    const name = "src/main.ts";
    expect(Buffer.byteLength(replacement)).toBe(Buffer.byteLength(name));
    const result = Buffer.from(bytes);
    let count = 0;
    for (
      let offset = result.indexOf(name);
      offset >= 0;
      offset = result.indexOf(name, offset + name.length)
    ) {
      result.write(replacement, offset);
      count++;
    }
    expect(count).toBe(2); // local header and central directory, not a sanitized addFile name
    return result;
  };
  const expectNoExtractionWrites = () => {
    expect(vscode.workspace.fs.createDirectory).not.toHaveBeenCalled();
    expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
  };

  it.each([
    "../owned.ts",
    "..\\owned.ts",
    "/outside.ts",
    "C:/owned.ts",
    "//owned.tsx",
  ])(
    "rejects unsafe downloaded entry %s before any extraction write",
    async (name) => {
      const bytes = replaceEntryName(archive().toBuffer(), name);
      expect(new AdmZip(bytes).getEntries()[0].entryName).toBe("000-safe.txt");
      await expect(download(bytes)).rejects.toThrow(/unsafe archive path/i);
      expectNoExtractionWrites();
      expect(await fs.readdir(root)).toEqual([]);
    },
  );

  it("rejects an archive symbolic link before even the preceding safe file is written", async () => {
    const zip = archive();
    zip.addFile("zzz-link", Buffer.from("../outside"));
    zip.getEntry("zzz-link")!.attr = (0o120777 << 16) >>> 0;
    await expect(download(zip.toBuffer())).rejects.toThrow(
      /archive symbolic link/i,
    );
    expectNoExtractionWrites();
    expect(await fs.readdir(root)).toEqual([]);
  });

  it.each(["destination", "member parent"])(
    "rejects an existing %s symbolic link without changing originals",
    async (kind) => {
      const outside = path.join(root, "outside");
      await fs.mkdir(outside);
      await fs.writeFile(
        path.join(outside, "original.txt"),
        "keep private original",
      );
      if (kind === "destination") {
        await fs.symlink(outside, path.join(root, "out"));
      } else {
        const project = path.join(root, "out/v3.Sample App");
        await fs.mkdir(project, { recursive: true });
        await fs.symlink(outside, path.join(project, "src"));
      }
      await expect(download(archive().toBuffer())).rejects.toThrow(
        /symbolic link/i,
      );
      expectNoExtractionWrites();
      expect(await fs.readdir(outside)).toEqual(["original.txt"]);
      expect(
        await fs.readFile(path.join(outside, "original.txt"), "utf8"),
      ).toBe("keep private original");
    },
  );

  it("extracts a valid downloaded archive with its version, source and identity bytes unchanged", async () => {
    const output = await download(archive().toBuffer());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(url);
    expect(output).toBe(path.join(root, "out/v3.Sample App"));
    expect(await fs.readFile(path.join(output, "src/main.ts"))).toEqual(source);
    expect(
      await fs.readFile(path.join(output, "source-manifest.json")),
    ).toEqual(manifest);
    expect(await fs.readFile(path.join(output, "000-safe.txt"), "utf8")).toBe(
      "safe original",
    );
  });

  it("writes valid backslash-separated members to the same normalized path that was validated", async () => {
    const bytes = replaceEntryName(archive().toBuffer(), "src\\main.ts");
    const output = await download(bytes);
    expect(await fs.readFile(path.join(output, "src/main.ts"))).toEqual(source);
    expect(
      await fs.readFile(path.join(output, "source-manifest.json")),
    ).toEqual(manifest);
  });
});
