import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  connectLocalGrayMatter,
  setupLocalGrayMatter,
  GrayMatterLocalSetupError,
} from "./GrayMatterLocalSetup";

let root: string;
let profilesFile: string;
let hub: any;
const secret = "disposable-local-fixture-password";
const connected = {
  name: "graymatter-memory",
  status: "connected",
  tools: ["memory_query", "memory_write", "graymatter_invariant_preflight"].map(
    (name) => ({ name }),
  ),
};
const verified = () =>
  Promise.resolve(new Response(JSON.stringify({ username: "local-user" })));
const addProfile = async (apiBase = "http://127.0.0.1:8787/v1") => {
  const passwordFile = path.join(root, "password");
  await writeFile(passwordFile, secret, { mode: 0o600 });
  await chmod(passwordFile, 0o600);
  await writeFile(
    profilesFile,
    JSON.stringify({
      version: 1,
      mode: "single",
      activeProfile: "cloud",
      blendProfiles: [],
      profiles: {
        cloud: {
          kind: "hosted",
          apiBase: "https://api-0.valkyrlabs.com/v1",
          username: "hosted-user",
        },
        "graymatter-lite-local": {
          kind: "local",
          apiBase,
          username: "local-user",
          passwordFile,
        },
      },
    }),
  );
};

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "valoride-local-setup-"));
  profilesFile = path.join(root, "profiles.json");
  await mkdir(path.join(root, "scripts"));
  await writeFile(
    path.join(root, "scripts/gm-mcp-launcher.mjs"),
    "#!/usr/bin/env node\n",
  );
  await writeFile(path.join(root, "scripts/gm-connection.mjs"), "");
  hub = {
    upsertServerConfig: jest.fn(),
    getServers: jest.fn(() => [connected]),
    restartConnection: jest.fn(),
  };
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("connects local memory without a hosted token or signup and leaves hosted selection intact", async () => {
  await addProfile();
  const before = await readFile(profilesFile, "utf8");
  const fetcher = jest.fn(verified);
  await connectLocalGrayMatter({ root, hub, profilesFile, fetch: fetcher });
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:8787/v1/UserPreferences/me",
    expect.objectContaining({ redirect: "manual" }),
  );
  const config = hub.upsertServerConfig.mock.calls[0][1];
  expect(config.env).toMatchObject({
    GRAYMATTER_PROFILE: "graymatter-lite-local",
    GRAYMATTER_PORTABLE_LAUNCH_ONLY: "true",
    GRAYMATTER_LOCAL_ONLY: "true",
    GRAYMATTER_LIGHT_PASSWORD: "",
    VALKYR_AUTH_TOKEN: "",
    VALKYR_AUTH: "",
  });
  expect(JSON.stringify(config)).not.toContain(secret);
  expect(config.autoApprove).not.toContain("memory_write");
  expect(await readFile(profilesFile, "utf8")).toBe(before);
});

it("requires the local connection resolver before launching or changing settings", async () => {
  await addProfile();
  await rm(path.join(root, "scripts/gm-connection.mjs"));
  const fetcher = jest.fn(verified);
  await expect(
    connectLocalGrayMatter({ root, hub, profilesFile, fetch: fetcher }),
  ).rejects.toThrow("updated GrayMatter source folder");
  expect(fetcher).not.toHaveBeenCalled();
  expect(hub.upsertServerConfig).not.toHaveBeenCalled();
});

it("finishes fresh installation then verifies the account and tools before reporting success", async () => {
  const run = jest.fn(async () => addProfile());
  await setupLocalGrayMatter({ root, hub, profilesFile, fetch: verified, run });
  expect(run).toHaveBeenCalledWith("setup");
  expect(hub.upsertServerConfig).toHaveBeenCalledTimes(1);
});

it("repeated setup reuses the existing profile and server", async () => {
  await addProfile();
  const run = jest.fn();
  const options = { root, hub, profilesFile, fetch: verified, run };
  await setupLocalGrayMatter(options);
  await setupLocalGrayMatter(options);
  expect(run).not.toHaveBeenCalled();
  expect(hub.upsertServerConfig.mock.calls[0]).toEqual(
    hub.upsertServerConfig.mock.calls[1],
  );
});

it("restarts a stopped local instance and verifies reconnect", async () => {
  await addProfile();
  const fetcher = jest
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(verified);
  const run = jest.fn();
  await setupLocalGrayMatter({ root, hub, profilesFile, fetch: fetcher, run });
  expect(run).toHaveBeenCalledWith("up");
  expect(hub.upsertServerConfig).toHaveBeenCalledTimes(1);
});

it("interrupted installation leaves MCP settings untouched and can be retried", async () => {
  const options = { root, hub, profilesFile, fetch: verified };
  await expect(
    setupLocalGrayMatter({
      ...options,
      run: async () => {
        throw new Error("cancelled");
      },
    }),
  ).rejects.toThrow("cancelled");
  expect(hub.upsertServerConfig).not.toHaveBeenCalled();
  await setupLocalGrayMatter({ ...options, run: async () => addProfile() });
  expect(hub.upsertServerConfig).toHaveBeenCalledTimes(1);
});

for (const status of [401, 403, 302]) {
  it(`rejects authentication failures and redirects (${status}) without registering a server`, async () => {
    await addProfile();
    await expect(
      connectLocalGrayMatter({
        root,
        hub,
        profilesFile,
        fetch: async () => new Response("", { status }),
      }),
    ).rejects.toBeInstanceOf(GrayMatterLocalSetupError);
    expect(hub.upsertServerConfig).not.toHaveBeenCalled();
  });
}

it("rejects a wrong account and a remote endpoint instead of using hosted credentials", async () => {
  await addProfile();
  await expect(
    connectLocalGrayMatter({
      root,
      hub,
      profilesFile,
      fetch: async () => new Response('{"username":"different-user"}'),
    }),
  ).rejects.toThrow("did not verify");
  await addProfile("https://api-0.valkyrlabs.com/v1");
  const fetcher = jest.fn(verified);
  await expect(
    connectLocalGrayMatter({ root, hub, profilesFile, fetch: fetcher }),
  ).rejects.toThrow("loopback");
  expect(fetcher).not.toHaveBeenCalled();
  expect(hub.upsertServerConfig).not.toHaveBeenCalled();
});

it("reconnects an existing disconnected MCP server and rejects missing memory tools", async () => {
  await addProfile();
  hub.getServers
    .mockReturnValueOnce([{ ...connected, status: "disconnected" }])
    .mockReturnValue([connected]);
  await connectLocalGrayMatter({ root, hub, profilesFile, fetch: verified });
  expect(hub.restartConnection).toHaveBeenCalledWith("graymatter-memory");
  hub.getServers.mockReturnValue([{ ...connected, tools: [] }]);
  await expect(
    connectLocalGrayMatter({ root, hub, profilesFile, fetch: verified }),
  ).rejects.toThrow("memory tools did not connect");
});
