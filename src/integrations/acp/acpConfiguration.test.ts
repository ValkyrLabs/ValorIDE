import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  acpDisplay,
  acpSecretKey,
  buildAcpLaunch,
  parseAcpAgents,
  assertAcpTaskWorkspace,
} from "./acpConfiguration";

describe("ACP user-owned launch configuration", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "acp-config-")),
    );
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  const agent = (extra = {}) =>
    parseAcpAgents([
      { id: "test", name: "Local agent", command: process.execPath, ...extra },
    ])[0];

  it("defaults to no launch configurations", () =>
    expect(parseAcpAgents(undefined)).toEqual([]));
  it.each([
    null,
    {},
    [{}],
    [{ name: "Missing ID", command: "node" }],
    [{ id: "bad id", name: "A", command: "node" }],
    [{ id: "a", name: "A", command: "./run" }],
    [{ id: "a", name: "A", command: "node", args: "--acp" }],
    [{ id: "a", name: "A", command: "node", env: { TOKEN: 42 } }],
    [{ id: "a", name: "A", command: "node", secretEnv: ["bad=name"] }],
  ])("rejects malformed configuration %p", (value) =>
    expect(() => parseAcpAgents(value)).toThrow(),
  );
  it("rejects duplicate IDs", () =>
    expect(() => parseAcpAgents([agent(), agent()])).toThrow(/unique/));
  it("preserves literal argv without shell expansion", async () => {
    const args = ["--acp", "; touch PWNED", "$(echo no)", "a b"];
    const launch = await buildAcpLaunch(
      agent({ args }),
      root,
      async () => undefined,
      { PATH: path.dirname(process.execPath) },
    );
    expect(launch.agent.args).toEqual(args);
    expect(launch.cwd).toBe(root);
  });
  it("does not inherit IDE/provider credentials or node startup options", async () => {
    const launch = await buildAcpLaunch(agent(), root, async () => undefined, {
      PATH: path.dirname(process.execPath),
      HOME: "/fixture",
      VALKYRAI_JWT: "do-not-forward",
      OPENAI_API_KEY: "do-not-forward",
      NODE_OPTIONS: "--require private.js",
    });
    expect(launch.environment.HOME).toBe("/fixture");
    for (const key of ["VALKYRAI_JWT", "OPENAI_API_KEY", "NODE_OPTIONS"])
      expect(launch.environment[key]).toBeUndefined();
  });
  it("resolves only explicitly named secrets for the selected agent", async () => {
    const keys: string[] = [];
    const launch = await buildAcpLaunch(
      agent({ secretEnv: ["API_KEY"], env: { NONSECRET: "value" } }),
      root,
      async (key) => {
        keys.push(key);
        return "fixture-secret";
      },
      {},
    );
    expect(keys).toEqual([acpSecretKey("test", "API_KEY")]);
    expect(launch.environment.API_KEY).toBe("fixture-secret");
    expect(launch.environment.NONSECRET).toBe("value");
  });
  it("fails closed for a missing explicitly configured secret", async () => {
    await expect(
      buildAcpLaunch(
        agent({ secretEnv: ["API_KEY"] }),
        root,
        async () => undefined,
        {},
      ),
    ).rejects.toThrow(/Set ACP Agent Secret/);
  });
  it("does not resolve executables from relative or workspace PATH entries", async () => {
    const binary = path.join(root, "fixture-agent");
    await fs.symlink(process.execPath, binary);
    await expect(
      buildAcpLaunch(
        agent({ command: "fixture-agent" }),
        root,
        async () => undefined,
        { PATH: `.${path.delimiter}${root}` },
      ),
    ).rejects.toThrow(/not found/);
  });
  it("does not resolve a PATH symlink back into the workspace", async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "acp-bin-"));
    try {
      const binary = path.join(root, "binary");
      await fs.writeFile(binary, "fixture", { mode: 0o700 });
      await fs.symlink(binary, path.join(outside, "fixture-agent"));
      await expect(
        buildAcpLaunch(
          agent({ command: "fixture-agent" }),
          root,
          async () => undefined,
          { PATH: outside },
        ),
      ).rejects.toThrow(/not found/);
    } finally {
      await fs.rm(outside, { recursive: true, force: true });
    }
  });
  it("reveals control and bidi characters in approvals", () => {
    expect(acpDisplay("safe\u202eevil\ncmd\u001b")).toBe(
      "safe\\u202eevil\\u000acmd\\u001b",
    );
  });
  it("pins the exported task root, allowing canonical aliases but rejecting changed workspaces", async () => {
    await expect(assertAcpTaskWorkspace(root, root)).resolves.toBeUndefined();
    await expect(
      assertAcpTaskWorkspace(root, path.dirname(root)),
    ).rejects.toThrow(/Reload/);
    await expect(
      assertAcpTaskWorkspace(root, path.join(root, "missing")),
    ).rejects.toThrow(/Reload/);
    const link = path.join(root, "alias");
    await fs.symlink(root, link);
    await expect(assertAcpTaskWorkspace(root, link)).resolves.toBeUndefined();
  });
});
