import React, { useState, useEffect } from "react";
import styled from "styled-components";
import RatingComponent from "../RatingComponent";
import { RatingTargetTypeEnum } from "@thorapi/model/Rating";

interface TaskFeedbackButtonsProps {
  messageTs: number;
  isFromHistory?: boolean;
  style?: React.CSSProperties;
}

const TaskFeedbackButtons: React.FC<TaskFeedbackButtonsProps> = ({
  messageTs,
  isFromHistory = false,
  style,
}) => {
  const [shouldShow, setShouldShow] = useState<boolean>(true);

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
      const feedbackHistory = localStorage.getItem("taskFeedbackHistory") || "{}";
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
          targetType={RatingTargetTypeEnum.HELPFULNESS}
          contentId={String(messageTs)}
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

export default TaskFeedbackButtons;
