import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  findGrayMatterMcpLauncher,
  grayMatterMcpConfig,
} from "./GrayMatterMcpBridge";

describe("GrayMatter MCP launcher resolution", () => {
  it("uses the canonical plugin launcher instead of an npm fallback", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "valoride-graymatter-"));
    const scripts = path.join(root, "scripts");
    const launcher = path.join(scripts, "gm-mcp-launcher");
    await mkdir(scripts);
    await writeFile(launcher, "#!/usr/bin/env bash\nexit 0\n");
    await chmod(launcher, 0o755);

    expect(await findGrayMatterMcpLauncher([root])).toBe(launcher);
    expect(grayMatterMcpConfig(launcher)).toMatchObject({
      command: launcher,
      args: ["--stdio"],
      transportType: "stdio",
    });
  });

  it("does not invent a launcher when the plugin is absent", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "valoride-graymatter-"));
    expect(await findGrayMatterMcpLauncher([root])).toBeUndefined();
  });
});
