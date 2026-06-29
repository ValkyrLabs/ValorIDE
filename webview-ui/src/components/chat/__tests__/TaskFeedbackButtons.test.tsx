import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskFeedbackButtons from "../TaskFeedbackButtons";

const addRatingMock = vi.fn();
const addSkillOptOutcomeMock = vi.fn();
let extensionState: Record<string, unknown>;
let storage: Record<string, string> = {};

vi.mock("@thorapi/redux/services/RatingService", () => ({
  useAddRatingMutation: () => [addRatingMock, { isLoading: false }],
}));

vi.mock("@thorapi/redux/services/SkillOptRouteOutcomeRequestService", () => ({
  useAddSkillOptRouteOutcomeRequestMutation: () => [
    addSkillOptOutcomeMock,
    { isLoading: false },
  ],
}));

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => extensionState,
}));

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("TaskFeedbackButtons", () => {
  beforeEach(() => {
    storage = {};
    extensionState = {
      authenticatedUser: { id: "user-1" },
      currentTaskItem: {
        id: "task-history-1782611320142",
        task: "Fix the completion report",
        totalCost: 1.23,
      },
      selectedLlmDetails: {
        id: "llm-1",
        name: "Claude",
        provider: "openrouter",
        source: "remote",
      },
      vscMachineId: "machine-1",
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage[key] = value;
        }),
      },
    });
    addRatingMock.mockReset();
    addSkillOptOutcomeMock.mockReset();
    addRatingMock.mockReturnValue({
      unwrap: () => Promise.resolve({ id: "rating-1", rating: 100 }),
    });
    addSkillOptOutcomeMock.mockReturnValue({
      unwrap: () => Promise.resolve({ id: "skillopt-outcome-1" }),
    });
  });

  it("uses a UUID contentId instead of the chat message timestamp", async () => {
    render(
      <TaskFeedbackButtons
        messageTs={1782611320142}
        completedAt="2026-06-27T18:48:59.000Z"
        reportMarkdown="# Completion Report"
        reportTitle="Mystery rating bug"
      />,
    );

    fireEvent.click(screen.getByLabelText("Rate 5 stars"));

    await waitFor(() => expect(addRatingMock).toHaveBeenCalledTimes(1));

    const payload = addRatingMock.mock.calls[0][0];
    expect(payload.contentId).toMatch(UUID_REGEX);
    expect(payload.contentId).not.toBe("1782611320142");
    expect(payload.sessionId).toMatch(UUID_REGEX);
    expect(payload.sessionId).not.toBe("1782611320142");
    expect(payload.sessionId).not.toBe("task-history-1782611320142");
    expect(payload.runId).toMatch(UUID_REGEX);
    expect(payload.runId).not.toBe("task-history-1782611320142");
    expect(payload.raterId).toMatch(UUID_REGEX);
    expect(payload.raterId).not.toBe("user-1");

    const metadata = JSON.parse(payload.metadata);
    expect(metadata).toMatchObject({
      currentTaskId: "task-history-1782611320142",
      taskFeedbackContentId: payload.contentId,
      taskFeedbackMessageTs: 1782611320142,
      ratingRaterId: payload.raterId,
      ratingRunId: payload.runId,
      ratingSessionId: payload.sessionId,
      sourceRaterId: "user-1",
      sourceRunId: "task-history-1782611320142",
      sourceSessionId: "task-history-1782611320142",
    });
  });

  it("reuses the task history id when it is already a UUID", async () => {
    const taskUuid = "123e4567-e89b-42d3-a456-426614174000";
    extensionState = {
      ...extensionState,
      currentTaskItem: {
        ...(extensionState.currentTaskItem as Record<string, unknown>),
        id: taskUuid,
      },
    };

    render(<TaskFeedbackButtons messageTs={1782611320142} />);

    fireEvent.click(screen.getByLabelText("Rate 4 stars"));

    await waitFor(() => expect(addRatingMock).toHaveBeenCalledTimes(1));

    expect(addRatingMock.mock.calls[0][0].contentId).toBe(taskUuid);
    expect(addRatingMock.mock.calls[0][0].sessionId).toBe(taskUuid);
    expect(addRatingMock.mock.calls[0][0].runId).toBe(taskUuid);
  });
});
