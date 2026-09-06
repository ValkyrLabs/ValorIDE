import { applicationDeepLinkOptions } from "./applicationDeepLink";

describe("Application Blueprint deep links", () => {
  const thor_id = "11111111-1111-4111-8111-111111111111";
  it("carries only the canonical application identity into the existing editor", () => {
    expect(
      applicationDeepLinkOptions(
        new URLSearchParams({
          applicationId: thor_id,
          applicationName: "untrusted name",
          deploymentUrl: "https://untrusted.test",
          token: "untrusted",
          command: "run",
        }),
      ),
    ).toEqual({ applicationId: thor_id });
  });
  for (const thor_invalid of [
    "",
    "../other",
    "not-an-application",
    "https://untrusted.test",
    "11111111-1111-4111-8111-111111111111/execute",
  ]) {
    it(`rejects invalid identity ${thor_invalid}`, () => {
      expect(
        applicationDeepLinkOptions(
          new URLSearchParams({ applicationId: thor_invalid }),
        ),
      ).toBeNull();
    });
  }
  it("rejects ambiguous duplicate identities", () => {
    expect(
      applicationDeepLinkOptions(
        new URLSearchParams(
          `applicationId=${thor_id}&applicationId=${thor_id}`,
        ),
      ),
    ).toBeNull();
  });
});
