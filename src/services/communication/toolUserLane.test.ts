import { isAllowedCommand, loadCommandAllowlist, loadToolAllowlist, toResultCard } from "./toolUserLane";

describe("toolUserLane", () => {
  it("loads explicit tool allowlist", () => {
    const tools = loadToolAllowlist("read_file,execute_command");
    expect(tools.has("read_file")).toBe(true);
    expect(tools.has("write_to_file")).toBe(false);
  });

  it("blocks commands outside regex allowlist", () => {
    const patterns = loadCommandAllowlist("^yarn\\b,^node\\b");
    expect(isAllowedCommand("yarn test", patterns)).toBe(true);
    expect(isAllowedCommand("rm -rf /", patterns)).toBe(false);
  });

  it("returns structured execute_command card", () => {
    const card = toResultCard("execute_command", { command: "yarn test", stdout: "ok", stderr: "" });
    expect(card.summary).toBe("ok");
    expect(card.logs[0]).toBe("$ yarn test");
    expect(card.artifacts).toEqual([]);
  });
});
