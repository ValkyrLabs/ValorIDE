import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RatingComponent from ".";
import { RatingTargetTypeEnum } from "@thorapi/model/Rating";

const addRatingMock = vi.fn();
const addSkillOptOutcomeMock = vi.fn();
let storage: Record<string, string> = {};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

vi.mock("@thorapi/redux/services/RatingService", () => ({
  useAddRatingMutation: () => [addRatingMock, { isLoading: false }],
}));

vi.mock("@thorapi/redux/services/SkillOptRouteOutcomeRequestService", () => ({
  useAddSkillOptRouteOutcomeRequestMutation: () => [
    addSkillOptOutcomeMock,
    { isLoading: false },
  ],
}));

describe("RatingComponent", () => {
  beforeEach(() => {
    storage = {};
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

  it("creates a rich Rating with completion report content for SkillOptics", async () => {
    const report = "# Completion Report\n\n## Quality Gates\n- Tests pass";
    const onRatingSubmitted = vi.fn();

    render(
      <RatingComponent
        targetType={RatingTargetTypeEnum.AGENTTASK}
        contentId="completion-123"
        comments={report}
        metadata={{ taskId: "task-1", llmDetailsId: "prompt-1" }}
        raterId="user-1"
        runId="run-1"
        sessionId="session-1"
        onRatingSubmitted={onRatingSubmitted}
      />,
    );

    fireEvent.click(screen.getByLabelText("Rate 5 stars"));

    await waitFor(() => expect(addRatingMock).toHaveBeenCalledTimes(1));

    const payload = addRatingMock.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        targetType: RatingTargetTypeEnum.AGENTTASK,
        rating: 100,
        comments: report,
        ratingType: "user_feedback",
        status: "new",
      }),
    );
    expect(payload.contentId).toMatch(UUID_REGEX);
    expect(payload.contentId).not.toBe("completion-123");
    expect(payload.raterId).toMatch(UUID_REGEX);
    expect(payload.raterId).not.toBe("user-1");
    expect(payload.runId).toMatch(UUID_REGEX);
    expect(payload.runId).not.toBe("run-1");
    expect(payload.sessionId).toMatch(UUID_REGEX);
    expect(payload.sessionId).not.toBe("session-1");

    const metadata = JSON.parse(payload.metadata);
    expect(metadata).toMatchObject({
      taskId: "task-1",
      llmDetailsId: "prompt-1",
      notes: report,
      outcome: "success",
      ratingScore: 100,
      ratingContentId: payload.contentId,
      ratingRaterId: payload.raterId,
      ratingRunId: payload.runId,
      ratingSessionId: payload.sessionId,
      sourceSurface: "ValorIDE",
      sourceContentId: "completion-123",
      sourceRaterId: "user-1",
      sourceRunId: "run-1",
      sourceSessionId: "session-1",
      starRating: 5,
      skillOptics: {
        enabled: true,
      },
    });
    expect(onRatingSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rating-1" }),
    );
  });

  it("records an optional SkillOpt route outcome when a route receipt is present", async () => {
    render(
      <RatingComponent
        targetType={RatingTargetTypeEnum.AGENTTASK}
        contentId="completion-123"
        comments="Task report"
        routeReceiptRef="skillopt-route-1"
        runId="run-1"
      />,
    );

    fireEvent.click(screen.getByLabelText("Rate 2 stars"));

    await waitFor(() =>
      expect(addSkillOptOutcomeMock).toHaveBeenCalledTimes(1),
    );

    expect(addSkillOptOutcomeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routeReceiptRef: "skillopt-route-1",
        outcome: "failure",
        ratingScore: 40,
        notes: "Task report",
        traceId: "run-1",
      }),
    );
    expect(addSkillOptOutcomeMock.mock.calls[0][0].metadata).toEqual(
      expect.objectContaining({
        contentId: expect.stringMatching(UUID_REGEX),
        sourceContentId: "completion-123",
        sessionId: expect.stringMatching(UUID_REGEX),
        sourceSessionId: undefined,
      }),
    );
  });

  it("passes through contentId unchanged when it is already a UUID", async () => {
    const contentUuid = "123e4567-e89b-42d3-a456-426614174000";

    render(
      <RatingComponent
        targetType={RatingTargetTypeEnum.AGENTTASK}
        contentId={contentUuid}
      />,
    );

    fireEvent.click(screen.getByLabelText("Rate 5 stars"));

    await waitFor(() => expect(addRatingMock).toHaveBeenCalledTimes(1));

    expect(addRatingMock.mock.calls[0][0].contentId).toBe(contentUuid);
  });

  it("passes through sessionId, runId, and raterId unchanged when they are already UUIDs", async () => {
    const contentUuid = "123e4567-e89b-42d3-a456-426614174000";
    const sessionUuid = "223e4567-e89b-42d3-a456-426614174000";
    const runUuid = "323e4567-e89b-42d3-a456-426614174000";
    const raterUuid = "423e4567-e89b-42d3-a456-426614174000";

    render(
      <RatingComponent
        targetType={RatingTargetTypeEnum.AGENTTASK}
        contentId={contentUuid}
        sessionId={sessionUuid}
        runId={runUuid}
        raterId={raterUuid}
      />,
    );

    fireEvent.click(screen.getByLabelText("Rate 5 stars"));

    await waitFor(() => expect(addRatingMock).toHaveBeenCalledTimes(1));

    expect(addRatingMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        contentId: contentUuid,
        sessionId: sessionUuid,
        runId: runUuid,
        raterId: raterUuid,
      }),
    );
  });

  it("includes SkillOpt route metadata directly on the Rating object", async () => {
    render(
      <RatingComponent
        targetType={RatingTargetTypeEnum.AGENTTASK}
        contentId="completion-123"
        comments="Task report"
        metadata={{ totalCost: 1.23 }}
        routeReceiptRef="skillopt-route-1"
        runId="run-1"
      />,
    );

    fireEvent.click(screen.getByLabelText("Rate 4 stars"));

    await waitFor(() => expect(addRatingMock).toHaveBeenCalledTimes(1));

    const payload = addRatingMock.mock.calls[0][0];
    const metadata = JSON.parse(payload.metadata);
    expect(metadata).toMatchObject({
      actualCreditCost: 1.23,
      notes: "Task report",
      outcome: "success",
      ratingScore: 80,
      routeReceiptRef: "skillopt-route-1",
      skillOptics: {
        enabled: true,
        routeReceiptRef: "skillopt-route-1",
      },
    });
  });

  it("shows the API failure reason when Rating creation is rejected", async () => {
    addRatingMock.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          status: 403,
          data: { message: "Missing Rating APPEND permission" },
        }),
    });

    render(
      <RatingComponent
        targetType={RatingTargetTypeEnum.AGENTTASK}
        contentId="completion-123"
      />,
    );

    fireEvent.click(screen.getByLabelText("Rate 5 stars"));

    expect(
      await screen.findByText(
        "Rating save failed (403): Missing Rating APPEND permission",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Rate 5 stars")).toBeInTheDocument();
  });
});
