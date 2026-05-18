import { describe, expect, it } from "vitest";
import {
  formatLoginFailureMessage,
  loginValidationSchema,
} from "./loginFormModel";

describe("loginFormModel", () => {
  it("requires a password before submitting login", async () => {
    await expect(
      loginValidationSchema.validate({
        password: "",
        username: "super",
      }),
    ).rejects.toMatchObject({
      path: "password",
    });
  });

  it("explains api-0 access denied as rejected credentials", () => {
    expect(
      formatLoginFailureMessage({
        error: {
          data: {
            error: "403 FORBIDDEN",
            message: "access denied",
          },
          status: 403,
        },
        username: "super",
      }),
    ).toContain("api-0 rejected the username or password for super");
  });

  it("preserves expired-session guidance for stale session errors", () => {
    expect(
      formatLoginFailureMessage({
        error: {
          data: {
            message:
              "Session expired or replaced by another login. Please sign in again to obtain a fresh token.",
          },
          status: 401,
        },
        username: "super",
      }),
    ).toContain("stored session expired");
  });
});
