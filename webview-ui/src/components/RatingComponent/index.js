import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Modal, Form, Alert, Row, Col } from "react-bootstrap";
import { RatingTargetTypeEnum } from "@thor/model/Rating";
import { useAddRatingMutation } from "@thor/redux/services/RatingService";
import CoolButton from "@valkyr/component-library/CoolButton";
const RatingComponent = ({ targetType, contentId, showSlider = false, className = "", size = "sm", onRatingSubmitted, disabled = false, }) => {
    const [selectedRating, setSelectedRating] = useState(null);
    const [sliderValue, setSliderValue] = useState(3);
    const [showModal, setShowModal] = useState(false);
    const [comments, setComments] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [addRating, { isLoading }] = useAddRatingMutation();
    const handleThumbClick = (rating) => {
        setSelectedRating(rating);
        setShowModal(true);
        setError("");
    };
    const handleSliderChange = (event) => {
        setSliderValue(parseInt(event.target.value));
    };
    const validateRatingData = () => {
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
    const sanitizeInput = (input) => {
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
            let ratingValue;
            if (showSlider) {
                // Convert 0-5 slider to 0-100 scale as per Rating model spec
                ratingValue = sliderValue * 20;
            }
            else {
                // Thumb up = 100, thumb down = 0 (0-100 scale as per Rating model)
                ratingValue = selectedRating === "up" ? 100 : 0;
            }
            // Create compliant Rating object with proper validation and sanitization
            const sanitizedComments = sanitizeInput(comments);
            const ratingData = {
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
        }
        catch (error) {
            console.error("Error submitting rating:", error);
            setError(error?.data?.message || "Failed to submit rating. Please try again.");
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
    const getModalTitle = () => {
        if (submitted)
            return "Thank You!";
        if (showSlider)
            return "Rate & Comment";
        return `Rate ${selectedRating === "up" ? "Positive" : "Negative"} & Comment`;
    };
    // Helper functions to avoid complex union types
    const getUpButtonVariant = () => {
        return selectedRating === "up" ? "success" : "outline-success";
    };
    const getDownButtonVariant = () => {
        return selectedRating === "down" ? "danger" : "outline-danger";
    };
    return (_jsxs("div", { className: `rating-component ${className}`, children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx(CoolButton, { variant: getUpButtonVariant(), size: size, onClick: () => handleThumbClick("up"), disabled: submitted || disabled, children: "\uD83D\uDC4D" }), _jsx(CoolButton, { variant: getDownButtonVariant(), size: size, onClick: () => handleThumbClick("down"), disabled: submitted || disabled, children: "\uD83D\uDC4E" })] }), _jsxs(Modal, { show: showModal, onHide: handleClose, centered: true, children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: getModalTitle() }) }), _jsx(Modal.Body, { children: submitted ? (_jsx(Alert, { variant: "success", children: _jsxs("div", { className: "text-center", children: [_jsx("strong", { children: "Thank you for submitting your rating!" }), _jsx("br", {}), _jsx("small", { className: "text-muted", children: "Your feedback helps us improve." })] }) })) : (_jsxs(_Fragment, { children: [showSlider && (_jsxs(Form.Group, { className: "mb-3", children: [_jsxs(Form.Label, { children: ["Rating: ", sliderValue, "/5"] }), _jsx(Form.Range, { min: 0, max: 5, step: 1, value: sliderValue, onChange: handleSliderChange, className: "mb-2" }), _jsxs("div", { className: "d-flex justify-content-between", children: [_jsx("small", { className: "text-muted", children: "Poor" }), _jsx("small", { className: "text-muted", children: "Excellent" })] })] })), _jsxs(Form.Group, { className: "mb-3", children: [_jsx(Form.Label, { children: "Comments (optional)" }), _jsx(Form.Control, { as: "textarea", rows: 3, value: comments, onChange: (e) => setComments(e.target.value), placeholder: "Share your thoughts...", maxLength: 500 }), _jsxs(Form.Text, { className: "text-muted", children: [comments.length, "/500 characters"] })] }), error && (_jsx(Alert, { variant: "danger", className: "mb-3", children: error }))] })) }), !submitted && (_jsx(Modal.Footer, { children: _jsxs(Row, { className: "w-100", children: [_jsx(Col, { children: _jsx(CoolButton, { variant: "secondary", onClick: handleClose, disabled: isLoading, children: "Cancel" }) }), _jsx(Col, { className: "text-end", children: _jsx(CoolButton, { variant: "primary", onClick: handleSubmit, disabled: isLoading, children: isLoading ? "Submitting..." : "Submit Rating" }) })] }) }))] })] }));
};
export default RatingComponent;
//# sourceMappingURL=index.js.map