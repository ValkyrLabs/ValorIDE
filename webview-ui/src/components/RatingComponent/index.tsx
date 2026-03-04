import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaStar } from 'react-icons/fa';
import { useAddRatingMutation } from '@thorapi/redux/services/RatingService';
import { RatingTargetTypeEnum } from '@thorapi/model/Rating';

interface RatingComponentProps {
    targetType: RatingTargetTypeEnum;
    contentId: string;
    showSlider?: boolean; // not yet implemented
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onRatingSubmitted?: () => void;
}

const Stars = styled.div<{ size: string }>`
  display: flex;
  gap: 4px;
  align-items: center;
  svg { cursor: pointer; }
`;

const RatingComponent: React.FC<RatingComponentProps> = ({
    targetType,
    contentId,
    size = 'sm',
    disabled = false,
    onRatingSubmitted,
}) => {
    const [rating, setRating] = useState<number | null>(null);
    const [hover, setHover] = useState<number | null>(null);
    const [addRating, { isLoading }] = useAddRatingMutation();
    const [shouldShow, setShouldShow] = useState(true);

    useEffect(() => {
        try {
            const feedbackHistory = localStorage.getItem('taskFeedbackHistory') || '{}';
            const history = JSON.parse(feedbackHistory);
            if (history[contentId]) setShouldShow(false);
        } catch (e) {
            // no-op
        }
    }, [contentId]);

    if (!shouldShow || disabled) return null;

    const handleClick = async (value: number) => {
        if (isLoading) return;
        const scaled = Math.max(0, Math.min(100, Math.round((value / 5) * 100))); // 1-5 scaled to 0-100
        setRating(value);
        try {
            await addRating({ contentId, targetType, rating: scaled }).unwrap();
            try {
                const feedbackHistory = localStorage.getItem('taskFeedbackHistory') || '{}';
                const history = JSON.parse(feedbackHistory);
                history[contentId] = true;
                localStorage.setItem('taskFeedbackHistory', JSON.stringify(history));
            } catch (e) {
                // ignore
            }
            setShouldShow(false);
            onRatingSubmitted?.();
        } catch (e) {
            setRating(null);
            console.error('Failed to submit rating', e);
        }
    };

    const starSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;

    return (
        <Stars size={`${starSize}px`} aria-label="Rating">
            {[1, 2, 3, 4, 5].map((i) => (
                <FaStar
                    key={i}
                    size={starSize}
                    color={(hover ?? rating ?? 0) >= i ? 'gold' : 'rgba(255,255,255,0.35)'}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => handleClick(i)}
                    role="button"
                    aria-label={`Rate ${i} stars`}
                />
            ))}
        </Stars>
    );
};

export default RatingComponent;
