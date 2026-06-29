import { describe, expect, it } from "vitest";
import {
  PASSWORD_POLICY_DESCRIPTION,
  buildPasswordValidation,
} from "./passwordPolicy";

describe("passwordPolicy", () => {
  it("rejects passwords that satisfy the old signup rule but fail ThorAPI", async () => {
    await expect(
      buildPasswordValidation().validate("Password1"),
    ).rejects.toThrow(PASSWORD_POLICY_DESCRIPTION);
  });

  it("accepts passwords that satisfy the ThorAPI signup policy", async () => {
    await expect(
      buildPasswordValidation().validate("ValkyrSecure-123!"),
    ).resolves.toBe("ValkyrSecure-123!");
  });
});
