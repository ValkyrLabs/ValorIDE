import {
  getDefaultValkyraiHost,
  normalizeValkyraiHost,
} from "./serverValkyraiHost";

describe("normalizeValkyraiHost", () => {
  it("defaults the extension host to the canonical api-0 /v1 API base path", () => {
    expect(getDefaultValkyraiHost()).toBe("https://api-0.valkyrlabs.com/v1");
  });

  it("normalizes a bare ValkyrAI origin to the /v1 API base path", () => {
    expect(normalizeValkyraiHost("https://api-0.valkyrlabs.com")).toBe(
      "https://api-0.valkyrlabs.com/v1",
    );
  });

  it("preserves an explicit API base path", () => {
    expect(normalizeValkyraiHost("https://api-0.valkyrlabs.com/v1/")).toBe(
      "https://api-0.valkyrlabs.com/v1",
    );
  });
});
