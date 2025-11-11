import React, { useState, useEffect } from "react";
import { Modal, Form, Alert, Row, Col } from "react-bootstrap";
import { Rating, RatingTargetTypeEnum } from "@thor/model/Rating";
import { useAddRatingMutation } from "@thor/redux/services/RatingService";
import CoolButton from "@valkyr/component-library/CoolButton";

/**
 * Props for the RatingComponent
 */
interface RatingComponentProps {
  /** The type of content being rated - must be a valid RatingTargetTypeEnum */
  targetType: RatingTargetTypeEnum;
  /** Unique identifier for the content being rated */
  contentId: string;
  /** Whether to show a 0-5 slider instead of thumbs up/down */
  showSlider?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button size */
  size?: "sm" | "lg";
  /** Callback fired when rating is successfully submitted */
  onRatingSubmitted?: (rating: Rating) => void;
  /** Whether the component should be disabled */
  disabled?: boolean;
}

/**
 * Type for button variants to avoid complex union type issues
 */
type ButtonVariant =
  | "success"
  | "outline-success"
  | "danger"
  | "outline-danger"
  | "primary"
  | "secondary";

const RatingComponent: React.FC<RatingComponentProps> = ({
  targetType,
  contentId,
  showSlider = false,
  className = "",
  size = "sm",
  onRatingSubmitted,
  disabled = false,
}) => {
  const [selectedRating, setSelectedRating] = useState<"up" | "down" | null>(
    null,
  );
  const [sliderValue, setSliderValue] = useState<number>(3);
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>("");

  const [addRating, { isLoading }] = useAddRatingMutation();

  const handleThumbClick = (rating: "up" | "down") => {
    setSelectedRating(rating);
    setShowModal(true);
    setError("");
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(event.target.value));
  };

  const validateRatingData = (): string | null => {
    if (!contentId || contentId.trim() === "") {
      return "Content ID is required";
    }
    if (!targetType) {
      return "Target type is required";
    }
    // Validate targetType is a valid enum value
    if (!Object.values(RatingTargetTypeEnum).includes(targetType)) {
      return "Invalid target type provided";
    }
    // Validate rating bounds
    if (showSlider && (sliderValue < 0 || sliderValue > 5)) {
      return "Rating must be between 0 and 5";
    }
    // Validate comments length
    if (comments.length > 500) {
      return "Comments must be 500 characters or less";
    }
    return null;
  };

  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, "");
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      const validationError = validateRatingData();
      if (validationError) {
        setError(validationError);
        return;
      }

      let ratingValue: number;

      if (showSlider) {
        // Convert 0-5 slider to 0-100 scale as per Rating model spec
        ratingValue = sliderValue * 20;
      } else {
        // Thumb up = 100, thumb down = 0 (0-100 scale as per Rating model)
        ratingValue = selectedRating === "up" ? 100 : 0;
      }

      // Create compliant Rating object with proper validation and sanitization
      const sanitizedComments = sanitizeInput(comments);
      const ratingData: Pick<
        Rating,
        "contentId" | "targetType" | "rating" | "comments" | "url"
      > = {
        contentId: sanitizeInput(contentId),
        targetType,
        rating: Math.max(0, Math.min(100, ratingValue)), // Ensure 0-100 bounds
        comments: sanitizedComments || undefined,
        url: window.location.href,
      };

      const result = await addRating(ratingData).unwrap();
      setSubmitted(true);

      // Call the callback if provided
      if (onRatingSubmitted && result) {
        onRatingSubmitted(result);
      }

      // Auto-close after 2.5 seconds
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      setError(
        error?.data?.message || "Failed to submit rating. Please try again.",
      );
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedRating(null);
    setComments("");
    setSliderValue(3);
    setSubmitted(false);
    setError("");
  };

  const getModalTitle = (): string => {
    if (submitted) return "Thank You!";
    if (showSlider) return "Rate & Comment";
    return `Rate ${selectedRating === "up" ? "Positive" : "Negative"} & Comment`;
  };

  // Helper functions to avoid complex union types
  const getUpButtonVariant = () => {
    return selectedRating === "up" ? "success" : "outline-success";
  };

  const getDownButtonVariant = () => {
    return selectedRating === "down" ? "danger" : "outline-danger";
  };

  return (
    <div className={`rating-component ${className}`}>
      <div className="d-flex align-items-center gap-2">
        <CoolButton
          variant={getUpButtonVariant() as ButtonVariant}
          size={size}
          onClick={() => handleThumbClick("up")}
          disabled={submitted || disabled}
          /* title="Rate positively"*/
        >
          👍
        </CoolButton>

        <CoolButton
          variant={getDownButtonVariant() as ButtonVariant}
          size={size}
          onClick={() => handleThumbClick("down")}
          disabled={submitted || disabled}
          /* title="Rate negatively" */
        >
          👎
        </CoolButton>
      </div>

      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {/* @ts-ignore - Complex conditional string union */}
            {getModalTitle()}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {submitted ? (
            <Alert variant="success">
              <div className="text-center">
                <strong>Thank you for submitting your rating!</strong>
                <br />
                <small className="text-muted">
                  Your feedback helps us improve.
                </small>
              </div>
            </Alert>
          ) : (
            <>
              {showSlider && (
                <Form.Group className="mb-3">
                  <Form.Label>Rating: {sliderValue}/5</Form.Label>
                  <Form.Range
                    min={0}
                    max={5}
                    step={1}
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="mb-2"
                  />
                  <div className="d-flex justify-content-between">
                    <small className="text-muted">Poor</small>
                    <small className="text-muted">Excellent</small>
                  </div>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Comments (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share your thoughts..."
                  maxLength={500}
                />
                <Form.Text className="text-muted">
                  {comments.length}/500 characters
                </Form.Text>
              </Form.Group>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}
            </>
          )}
        </Modal.Body>

        {!submitted && (
          <Modal.Footer>
            <Row className="w-100">
              <Col>
                <CoolButton
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </CoolButton>
              </Col>
              <Col className="text-end">
                <CoolButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit Rating"}
                </CoolButton>
              </Col>
            </Row>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default RatingComponent;
