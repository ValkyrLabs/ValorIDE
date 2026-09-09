import fs from "fs/promises";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";
import { extractLocalZip } from "./zipExtractor";

jest.mock("vscode", () => ({
  Uri: { file: (value: string) => value },
  workspace: {
    fs: {
      createDirectory: (value: string) =>
        jest.requireActual("fs/promises").mkdir(value, { recursive: true }),
      writeFile: (value: string, data: Uint8Array) =>
        jest.requireActual("fs/promises").writeFile(value, data),
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
