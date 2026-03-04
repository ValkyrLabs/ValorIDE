import { formatResponse } from "./responses";

describe("formatResponse.noToolsUsed", () => {
  it("includes plan_mode_respond guidance in plan mode", () => {
    const message = formatResponse.noToolsUsed("plan");
    expect(message).toContain("Next Steps (PLAN MODE)");
    expect(message).toContain("plan_mode_respond");
    expect(message).toContain("Do NOT use execute_command");
  });

  it("includes completion guidance in act mode", () => {
    const message = formatResponse.noToolsUsed("act");
    expect(message).toContain("attempt_completion");
    expect(message).toContain("ask_followup_question");
  });
});

