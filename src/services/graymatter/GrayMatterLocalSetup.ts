import { readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { McpHub, McpServerConfig } from "@services/mcp/McpHub";
import { grayMatterMcpConfig } from "./GrayMatterMcpBridge";

export const LOCAL_GRAYMATTER_PROFILE = "graymatter-lite-local";
export const GRAYMATTER_MCP_SERVER = "graymatter-memory";

type SetupFailure =
  | "missing_profile"
  | "missing_installation"
  | "invalid_profile"
  | "unreachable"
  | "unauthenticated"
  | "mcp";

export class GrayMatterLocalSetupError extends Error {
  constructor(
    public readonly reason: SetupFailure,
    message: string,
  ) {
    super(message);
  }
}

type LocalHub = Pick<
  McpHub,
  "upsertServerConfig" | "getServers" | "restartConnection"
>;
type LocalSetupOptions = {
  root: string;
  hub: LocalHub;
  profilesFile?: string;
  fetch?: typeof fetch;
};

export const localGrayMatterProfilesFile = (): string =>
  process.env.GRAYMATTER_PROFILES_FILE ||
  path.join(
    process.env.GRAYMATTER_STATE_DIR || path.join(os.homedir(), ".graymatter"),
    "profiles.json",
  );

export const localGrayMatterMcpConfig = (
  launcher: string,
  profilesFile: string,
): McpServerConfig => ({
  ...grayMatterMcpConfig(launcher),
  transportType: "stdio",
  // The portable canonical launcher resolves this exact local profile. It does
  // no hosted release checks, hosted credential lookup, signup, or queue replay.
  env: {
    GRAYMATTER_PROFILES_FILE: profilesFile,
    GRAYMATTER_PROFILE: LOCAL_GRAYMATTER_PROFILE,
    GRAYMATTER_ACTIVE_PROFILE: LOCAL_GRAYMATTER_PROFILE,
    GRAYMATTER_PROFILE_MODE: "single",
    GRAYMATTER_PROFILES: "",
    GRAYMATTER_BLEND_PROFILES: "",
    GRAYMATTER_PROFILE_RESOLVED: "",
    GRAYMATTER_PORTABLE_LAUNCH_ONLY: "true",
    GRAYMATTER_LOCAL_ONLY: "true",
    GRAYMATTER_SKIP_SELF_UPDATE: "true",
    GRAYMATTER_LIGHT_MODE: "",
    GRAYMATTER_LIGHT_USERNAME: "",
    GRAYMATTER_LIGHT_PASSWORD: "",
    VALKYR_API_BASE: "",
    VALKYR_AUTH_TOKEN: "",
    VALKYR_JWT_SESSION: "",
    VALKYR_AUTH: "",
  },
});

const readLocalProfile = async (profilesFile: string) => {
  let registry: any;
  try {
    registry = JSON.parse(await readFile(profilesFile, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new GrayMatterLocalSetupError(
        "missing_profile",
        "GrayMatter Lite has not been set up in this account yet.",
      );
    }
    throw new GrayMatterLocalSetupError(
      "invalid_profile",
      "The GrayMatter profiles file cannot be read. Repair it with scripts/gm-profile before reconnecting.",
    );
  }
  if (
    registry.version !== 1 ||
    !registry.profiles ||
    typeof registry.profiles !== "object" ||
    Array.isArray(registry.profiles)
  ) {
    throw new GrayMatterLocalSetupError(
      "invalid_profile",
      "The GrayMatter profiles file is invalid. Repair it with scripts/gm-profile before reconnecting.",
    );
  }
  const profile = registry.profiles[LOCAL_GRAYMATTER_PROFILE];
  if (!profile)
    throw new GrayMatterLocalSetupError(
      "missing_profile",
      "Run ./vaix setup in the GrayMatter source folder to create the local profile.",
    );
  let url: URL;
  try {
    url = new URL(profile.apiBase);
  } catch {
    throw new GrayMatterLocalSetupError(
      "invalid_profile",
      "The local GrayMatter profile has an invalid server URL. Run ./vaix doctor in its source folder.",
    );
  }
  if (
    profile.kind !== "local" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    typeof profile.username !== "string" ||
    !profile.username.trim() ||
    typeof profile.passwordFile !== "string"
  ) {
    throw new GrayMatterLocalSetupError(
      "invalid_profile",
      "Choose a local GrayMatter Lite profile bound to a loopback server. Hosted accounts use the separate sign-in flow.",
    );
  }
  let password: string;
  try {
    const info = await stat(profile.passwordFile);
    if (process.platform !== "win32" && (info.mode & 0o077) !== 0)
      throw new Error("permissions");
    password = (await readFile(profile.passwordFile, "utf8")).replace(
      /\r?\n$/,
      "",
    );
    if (!password) throw new Error("empty");
  } catch {
    throw new GrayMatterLocalSetupError(
      "invalid_profile",
      "The local profile credential file is missing or is not private. Run ./vaix setup in the original GrayMatter source folder, then reconnect.",
    );
  }
  return {
    apiBase: url.toString().replace(/\/$/, ""),
    username: profile.username,
    password,
  };
};

export const connectLocalGrayMatter = async ({
  root,
  hub,
  profilesFile = localGrayMatterProfilesFile(),
  fetch: fetcher = fetch,
}: LocalSetupOptions): Promise<void> => {
  const launcher = path.join(root, "scripts", "gm-mcp-launcher.mjs");
  try {
    await stat(launcher);
    await stat(path.join(root, "scripts", "gm-connection.mjs"));
  } catch {
    throw new GrayMatterLocalSetupError(
      "missing_installation",
      "Choose an updated GrayMatter source folder containing vaix, scripts/gm-mcp-launcher.mjs, and scripts/gm-connection.mjs. Download it from github.com/ValkyrLabs/GrayMatter if needed.",
    );
  }
  const profile = await readLocalProfile(profilesFile);
  let response: Response;
  try {
    response = await fetcher(`${profile.apiBase}/UserPreferences/me`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${profile.username}:${profile.password}`).toString("base64")}`,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new GrayMatterLocalSetupError(
      "unreachable",
      "GrayMatter Lite is stopped or cannot be reached. Start it with ./vaix up in its source folder, then reconnect.",
    );
  }
  if (!response.ok) {
    throw new GrayMatterLocalSetupError(
      response.status === 401 || response.status === 403
        ? "unauthenticated"
        : "unreachable",
      response.status === 401 || response.status === 403
        ? "The local account was rejected. Run ./vaix doctor in the original GrayMatter folder and check its local credentials; a valkyrlabs.com account is not required."
        : "The local account endpoint is unavailable. Run ./vaix doctor in the GrayMatter source folder, then reconnect.",
    );
  }
  let account: any;
  try {
    account = await response.json();
  } catch {
    account = undefined;
  }
  if (
    typeof account?.username !== "string" ||
    account.username.toLowerCase() !== profile.username.toLowerCase()
  ) {
    throw new GrayMatterLocalSetupError(
      "unauthenticated",
      "The selected server did not verify the configured local account. Check ./vaix doctor before reconnecting.",
    );
  }
  await hub.upsertServerConfig(
    GRAYMATTER_MCP_SERVER,
    localGrayMatterMcpConfig(launcher, profilesFile),
  );
  let server = hub
    .getServers()
    .find((entry) => entry.name === GRAYMATTER_MCP_SERVER);
  if (server?.status === "disconnected") {
    await hub.restartConnection(GRAYMATTER_MCP_SERVER);
    server = hub
      .getServers()
      .find((entry) => entry.name === GRAYMATTER_MCP_SERVER);
  }
  if (
    server?.status !== "connected" ||
    !["memory_query", "memory_write", "graymatter_invariant_preflight"].every(
      (name) => server?.tools?.some((tool) => tool.name === name),
    )
  ) {
    throw new GrayMatterLocalSetupError(
      "mcp",
      "The local account is verified, but MCP memory tools did not connect. Check the GrayMatter server in ValorIDE's MCP panel, then retry Connect Local GrayMatter Lite. Ensure Node 20+ is on PATH.",
    );
  }
};

export const setupLocalGrayMatter = async (
  options: LocalSetupOptions & {
    run: (command: "setup" | "up") => Promise<void>;
  },
): Promise<void> => {
  try {
    await connectLocalGrayMatter(options);
  } catch (error) {
    if (
      !(error instanceof GrayMatterLocalSetupError) ||
      !["missing_profile", "unreachable"].includes(error.reason)
    )
      throw error;
    await options.run(error.reason === "missing_profile" ? "setup" : "up");
    await connectLocalGrayMatter(options);
  }
};
