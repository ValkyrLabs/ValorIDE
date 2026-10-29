import fs from "fs/promises";
import os from "os";
import path from "path";
import { extractTextFromFile } from "./extract-text";

describe("read_file path regressions", () => {
  let root: string;
  beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-read-path-")); });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it("guides a directory request to list_files", async () => {
    await expect(extractTextFromFile(root)).rejects.toThrow("is a directory. Use list_files");
  });
  it("retains readable file contents", async () => {
    const file = path.join(root, "notes.txt");
    await fs.writeFile(file, "original source text");
    await expect(extractTextFromFile(file)).resolves.toBe("original source text");
  });
  it("reports a missing file accurately", async () => {
    await expect(extractTextFromFile(path.join(root, "absent.txt"))).rejects.toThrow("File not found");
  });
});
