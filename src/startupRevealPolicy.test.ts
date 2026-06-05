import {
  getStartupRevealMode,
  shouldRevealSidebarOnStartup,
  STARTUP_REVEAL_SETTING,
} from "./startupRevealPolicy";

describe("startup reveal policy", () => {
  const configuration = (value: unknown) => ({
    get: jest.fn(<T>(section: string, defaultValue: T): T => {
      expect(section).toBe(STARTUP_REVEAL_SETTING);
      return (value ?? defaultValue) as T;
    }),
  });

  const context = (completed: boolean) => ({
    globalState: {
      get: jest.fn(
        (_key: string, defaultValue: boolean) => completed ?? defaultValue,
      ),
    },
  });

  it("defaults to manual startup so returning workspaces keep editor focus", () => {
    const mode = getStartupRevealMode(configuration(undefined));

    expect(mode).toBe("manual");
    expect(shouldRevealSidebarOnStartup(mode, context(false))).toBe(false);
  });

  it("reveals once for first-install mode until the global marker is set", () => {
    expect(shouldRevealSidebarOnStartup("firstInstall", context(false))).toBe(
      true,
    );
    expect(shouldRevealSidebarOnStartup("firstInstall", context(true))).toBe(
      false,
    );
  });

  it("allows explicit always mode for users who want startup reveal", () => {
    expect(shouldRevealSidebarOnStartup("always", context(true))).toBe(true);
  });

  it("treats unknown configuration values as manual", () => {
    expect(getStartupRevealMode(configuration("surprise"))).toBe("manual");
  });
});
