import React, { useMemo, useState, useEffect } from "react";
import styled from "styled-components";
import { FaStar } from "react-icons/fa";
import { useAddRatingMutation } from "@thorapi/redux/services/RatingService";
import { useAddSkillOptRouteOutcomeRequestMutation } from "@thorapi/redux/services/SkillOptRouteOutcomeRequestService";
import { v4 as uuidv4, v5 as uuidv5, validate as isValidUuid } from "uuid";
import {
  Rating,
  RatingRaterTypeEnum,
  RatingRatingTypeEnum,
  RatingStatusEnum,
  RatingTargetTypeEnum,
} from "@thorapi/model/Rating";
import { SkillOptRouteOutcomeRequestOutcomeEnum } from "@thorapi/model/SkillOptRouteOutcomeRequest";

interface RatingComponentProps {
  targetType: RatingTargetTypeEnum;
  contentId: string;
  comments?: string;
  metadata?: Record<string, unknown>;
  raterId?: string;
  routeReceiptRef?: string;
  runId?: string;
  sessionId?: string;
  showSlider?: boolean; // not yet implemented
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onRatingSubmitted?: (rating: Rating) => void;
}

const Stars = styled.div<{ size: string }>`
  display: flex;
  gap: 4px;
  align-items: center;
  svg {
    cursor: pointer;
  }
`;

const ErrorText = styled.div`
  color: var(--vscode-errorForeground);
  font-size: 11px;
  margin-top: 4px;
  max-width: 220px;
`;

const getApiErrorMessage = (error: unknown): string => {
  const candidate = error as any;
  const status = candidate?.status;
  const data = candidate?.data;
  const message =
    typeof data === "string"
      ? data
      : typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : typeof candidate?.error === "string"
            ? candidate.error
            : error instanceof Error
              ? error.message
              : "";
  const prefix = status
    ? `Rating save failed (${status})`
    : "Rating save failed";
  return message ? `${prefix}: ${message}` : `${prefix}.`;
};

const RatingComponent: React.FC<RatingComponentProps> = ({
  targetType,
  contentId,
  comments,
  metadata,
  raterId,
  routeReceiptRef,
  runId,
  sessionId,
  size = "sm",
  disabled = false,
  onRatingSubmitted,
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addRating, { isLoading }] = useAddRatingMutation();
  const [addSkillOptRouteOutcomeRequest, skillOptOutcomeResult] =
    useAddSkillOptRouteOutcomeRequestMutation();
  const [shouldShow, setShouldShow] = useState(true);
  const ratingContentId = useMemo(
    () => requiredRatingUuid(contentId, "content"),
    [contentId],
  );
  const ratingSessionId = useMemo(
    () => requiredRatingUuid(sessionId ?? contentId, "session"),
    [contentId, sessionId],
  );
  const ratingRunId = useMemo(() => optionalRatingUuid(runId, "run"), [runId]);
  const ratingRaterId = useMemo(
    () => optionalRatingUuid(raterId, "rater"),
    [raterId],
  );

  useEffect(() => {
    try {
      const feedbackHistory =
        localStorage.getItem("taskFeedbackHistory") || "{}";
      const history = JSON.parse(feedbackHistory);
      if (history[contentId]) setShouldShow(false);
    } catch (e) {
      // no-op
    }
  }, [contentId]);

  if (!shouldShow || disabled) return null;

  const handleClick = async (value: number) => {
    if (isLoading || skillOptOutcomeResult.isLoading) return;
    const scaled = Math.max(0, Math.min(100, Math.round((value / 5) * 100))); // 1-5 scaled to 0-100
    setRating(value);
    setSubmitError(null);
    const outcome =
      value >= 4
        ? SkillOptRouteOutcomeRequestOutcomeEnum.SUCCESS
        : value >= 3
          ? SkillOptRouteOutcomeRequestOutcomeEnum.PARTIAL
          : SkillOptRouteOutcomeRequestOutcomeEnum.FAILURE;

    const ratingPayload: Partial<Rating> = {
      contentId: ratingContentId,
      targetType,
      rating: scaled,
      comments,
      metadata: JSON.stringify({
        ...metadata,
        skillOptics: {
          enabled: true,
          intent:
            "Use this task rating and completion report to improve ValorIDE operations, GrayMatter invariants, commands, and user preferences.",
          routeReceiptRef,
        },
        actualCreditCost:
          typeof metadata?.totalCost === "number"
            ? metadata.totalCost
            : undefined,
        notes: comments,
        outcome,
        ratingScore: scaled,
        ratingContentId,
        ratingRaterId,
        ratingRunId,
        ratingSessionId,
        routeReceiptRef,
        sourceSurface: "ValorIDE",
        sourceContentId: contentId,
        sourceRaterId: raterId,
        sourceRunId: runId,
        sourceSessionId: sessionId,
        starRating: value,
        starScale: "1-5",
        scoreScale: "0-100",
      }),
      raterType: RatingRaterTypeEnum.USER,
      raterId: ratingRaterId,
      sessionId: ratingSessionId,
      runId: ratingRunId,
      ratingType: RatingRatingTypeEnum.USERFEEDBACK,
      status: RatingStatusEnum.NEW,
    };

    try {
      const createdRating = await addRating(ratingPayload).unwrap();

      if (routeReceiptRef) {
        try {
          await addSkillOptRouteOutcomeRequest({
            routeReceiptRef,
            outcome,
            traceId: runId,
            rating: createdRating,
            ratingScore: scaled,
            notes: comments,
            metadata: {
              contentId: ratingContentId,
              ratingRunId,
              ratingSessionId,
              sourceContentId: contentId,
              sourceRunId: runId,
              sourceSessionId: sessionId,
              sessionId: ratingSessionId,
              sourceSurface: "ValorIDE",
              taskFeedbackMessageTs:
                metadata?.taskFeedbackMessageTs ?? contentId,
            },
          }).unwrap();
        } catch (skillOptError) {
          console.warn(
            "Failed to record SkillOpt route outcome",
            skillOptError,
          );
        }
      }

      try {
        const feedbackHistory =
          localStorage.getItem("taskFeedbackHistory") || "{}";
        const history = JSON.parse(feedbackHistory);
        history[contentId] = true;
        localStorage.setItem("taskFeedbackHistory", JSON.stringify(history));
      } catch (e) {
        // ignore
      }
      setShouldShow(false);
      onRatingSubmitted?.(createdRating);
    } catch (e) {
      setRating(null);
      setSubmitError(getApiErrorMessage(e));
      console.error("Failed to submit rating", e);
    }
  };

  const starSize = size === "sm" ? 12 : size === "md" ? 16 : 20;

  return (
    <div>
      <Stars size={`${starSize}px`} aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <FaStar
            key={i}
            size={starSize}
            color={
              (hover ?? rating ?? 0) >= i ? "gold" : "rgba(255,255,255,0.35)"
            }
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => handleClick(i)}
            role="button"
            aria-label={`Rate ${i} stars`}
          />
        ))}
      </Stars>
      {submitError && <ErrorText>{submitError}</ErrorText>}
    </div>
  );
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALORIDE_RATING_UUID_NAMESPACE = "68e704ae-ed76-4d05-b302-92eb89297b6d";

const optionalRatingUuid = (
  value: unknown,
  scope: "content" | "rater" | "run" | "session",
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (isValidUuid(trimmed) && UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  return uuidv5(
    `valoride-rating:${scope}:${trimmed}`,
    VALORIDE_RATING_UUID_NAMESPACE,
  );
};

const requiredRatingUuid = (
  value: unknown,
  scope: "content" | "rater" | "run" | "session",
): string => optionalRatingUuid(value, scope) ?? uuidv4();

export default RatingComponent;
