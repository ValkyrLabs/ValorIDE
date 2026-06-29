import React, { useMemo, useState, useEffect } from "react";
import styled from "styled-components";
import RatingComponent from "../RatingComponent";
import { RatingTargetTypeEnum } from "@thorapi/model/Rating";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import { v4 as uuidv4 } from "uuid";

interface TaskFeedbackButtonsProps {
  messageTs: number;
  completedAt?: string;
  reportMarkdown?: string;
  reportTitle?: string;
  routeReceiptRef?: string;
  isFromHistory?: boolean;
  style?: React.CSSProperties;
}

const TaskFeedbackButtons: React.FC<TaskFeedbackButtonsProps> = ({
  messageTs,
  completedAt,
  reportMarkdown,
  reportTitle,
  routeReceiptRef,
  isFromHistory = false,
  style,
}) => {
  const {
    authenticatedUser,
    currentTaskItem,
    selectedLlmDetails,
    vscMachineId,
  } = useExtensionState();
  const [shouldShow, setShouldShow] = useState<boolean>(true);
  const ratingContentId = useMemo(() => {
    if (isUuid(currentTaskItem?.id)) {
      return currentTaskItem.id;
    }

    return uuidv4();
  }, [currentTaskItem?.id, messageTs]);

  // Check localStorage on mount to see if feedback was already given for this message
  useEffect(() => {
    try {
      const feedbackHistory =
        localStorage.getItem("taskFeedbackHistory") || "{}";
      const history = JSON.parse(feedbackHistory);
      // Check if this specific message timestamp has received feedback
      if (history[messageTs]) {
        setShouldShow(false);
      }
    } catch (e) {
      console.error("Error checking feedback history:", e);
    }
  }, [messageTs]);

  // Don't show buttons if this is from history or feedback was already given
  if (isFromHistory || !shouldShow) {
    return null;
  }

  const handleRatingSubmitted = () => {
    try {
      const feedbackHistory =
        localStorage.getItem("taskFeedbackHistory") || "{}";
      const history = JSON.parse(feedbackHistory);
      // Use the messageTs as a unique key for feedback history
      history[String(messageTs)] = true;
      localStorage.setItem("taskFeedbackHistory", JSON.stringify(history));
    } catch (e) {
      // ignore
    }
    setShouldShow(false);
  };

  return (
    <Container style={style}>
      <ButtonsContainer>
        <RatingComponent
          targetType={RatingTargetTypeEnum.AGENTTASK}
          contentId={ratingContentId}
          comments={reportMarkdown}
          metadata={{
            completedAt,
            completionReportTitle: reportTitle,
            currentTaskId: currentTaskItem?.id,
            currentTaskText: currentTaskItem?.task,
            llmDetailsId: selectedLlmDetails?.id,
            llmDetailsName: selectedLlmDetails?.name,
            llmDetailsProvider: selectedLlmDetails?.provider,
            llmDetailsSource: selectedLlmDetails?.source,
            machineId: vscMachineId,
            reportKind: "task_completion_report",
            skillOpticsSignal: true,
            taskFeedbackContentId: ratingContentId,
            taskFeedbackMessageTs: messageTs,
            totalCost: currentTaskItem?.totalCost,
          }}
          raterId={
            authenticatedUser?.id ??
            authenticatedUser?.username ??
            authenticatedUser?.email
          }
          routeReceiptRef={routeReceiptRef}
          runId={currentTaskItem?.id ?? String(messageTs)}
          sessionId={currentTaskItem?.id ?? String(messageTs)}
          showSlider={false}
          size="sm"
          onRatingSubmitted={handleRatingSubmitted}
          disabled={false}
        />
      </ButtonsContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 0px;
  opacity: 0.5;

  &:hover {
    opacity: 1;
  }
`;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value?: string): value is string =>
  typeof value === "string" && UUID_REGEX.test(value);

export default TaskFeedbackButtons;
