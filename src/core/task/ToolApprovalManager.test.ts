jest.mock(
  "@integrations/notifications",
  () => ({
    showSystemNotification: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  "execa",
  () => ({ __esModule: true, default: jest.fn(), execa: jest.fn() }),
  { virtual: true },
);

import { ToolApprovalManager } from "./ToolApprovalManager";

describe("ToolApprovalManager.normalizeApprovalResponse", () => {
  it("approves yes button clicks and preserves feedback", () => {
    const result = ToolApprovalManager.normalizeApprovalResponse(
      "yesButtonClicked",
      "Looks good",
      ["img.png"],
    );

    expect(result.approved).toBe(true);
    expect(result.feedback).toEqual({
      text: "Looks good",
      images: ["img.png"],
    });
  });

  it("rejects non-affirmative responses and returns feedback", () => {
    const result = ToolApprovalManager.normalizeApprovalResponse(
      "messageResponse",
      "no",
      undefined,
    );

    expect(result.approved).toBe(false);
    expect(result.feedback).toEqual({ text: "no", images: undefined });
  });
});
