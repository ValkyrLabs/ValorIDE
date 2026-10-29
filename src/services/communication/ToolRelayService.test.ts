import fs from "fs/promises";
import os from "os";
import path from "path";

jest.mock("../../core/task", () => ({ cwd: "/tmp" }));
jest.mock("./CommunicationService", () => ({ CommunicationService: jest.fn() }));
jest.mock("../../services/search/file-search", () => ({ searchWorkspaceFiles: jest.fn() }));

import { ToolRelayService } from "./ToolRelayService";

describe("relayed read_file path regressions", () => {
  let root: string;
  const read = (file: string): Promise<string> => (ToolRelayService.prototype as any).executeReadFile({ path: file });
  beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-relay-read-")); });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it("guides a directory request to list_files", async () => {
    await expect(read(root)).rejects.toThrow("is a directory. Use list_files");
  });
  it("retains readable file contents", async () => {
    const file = path.join(root, "notes.txt");
    await fs.writeFile(file, "original source text");
    await expect(read(file)).resolves.toBe("original source text");
  });
  it("reports a missing file accurately", async () => {
    await expect(read(path.join(root, "absent.txt"))).rejects.toThrow("File not found");
  });
});
