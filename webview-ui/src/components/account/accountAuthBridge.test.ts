import { describe, expect, it } from "vitest";
import { buildAccountLoginSuccessMessage } from "./accountAuthBridge";

describe("accountAuthBridge", () => {
  it("builds an extension login message with token and principal", () => {
    expect(
      buildAccountLoginSuccessMessage({
        token: "jwt-token",
        user: {
          id: "principal-1",
          username: "super",
        },
      }),
    ).toEqual({
      authenticatedPrincipal: {
        id: "principal-1",
        username: "super",
      },
      customToken: "jwt-token",
      type: "accountLoginSuccess",
    });
  });
});
