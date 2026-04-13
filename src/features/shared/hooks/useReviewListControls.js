import { useMemo, useState } from "react";

const STAR_OPTIONS = [5, 4, 3, 2, 1];
const SORT_OPTIONS = ['Recente', 'Scor mare', 'Scor mic'];

const getDefaultSortKey = (item) => {
    const fallbackNumericId = String(item.id).replace(/\D/g, '');
    return Number(fallbackNumericId) || 0;
};

const useReviewListControls = (reviewsList, options = {}) => {
    const {
        getSortKey = getDefaultSortKey,
        starOptions = STAR_OPTIONS,
        sortOptions = SORT_OPTIONS,
    } = options;

    const [selectedStars, setSelectedStars] = useState(null);
    const [onlyWithText, setOnlyWithText] = useState(false);
    const [selectedSort, setSelectedSort] = useState(sortOptions[0]);
    const [expandedReviews, setExpandedReviews] = useState({});

    const averageRating = useMemo(() => {
        if (!reviewsList.length) {
            return 0;
        }

        const total = reviewsList.reduce((sum, item) => sum + item.rating, 0);
        return total / reviewsList.length;
    }, [reviewsList]);

    const recommendationRate = useMemo(() => {
        if (!reviewsList.length) {
            return 0;
        }

        const recommendedCount = reviewsList.filter((item) => item.rating >= 4.5).length;
        return Math.round((recommendedCount / reviewsList.length) * 100);
    }, [reviewsList]);

    const visibleReviews = useMemo(() => {
        const filteredReviews = reviewsList.filter((item) => {
            if (selectedStars !== null && item.rating < selectedStars) {
                return false;
            }

            if (onlyWithText && item.review.trim().length < 20) {
                return false;
            }

            return true;
        });

        const sortedReviews = [...filteredReviews];
        if (selectedSort === 'Scor mare') {
            sortedReviews.sort((a, b) => b.rating - a.rating);
        } else if (selectedSort === 'Scor mic') {
            sortedReviews.sort((a, b) => a.rating - b.rating);
        } else {
            sortedReviews.sort((a, b) => getSortKey(b) - getSortKey(a));
        }

        return sortedReviews;
    }, [getSortKey, onlyWithText, reviewsList, selectedSort, selectedStars]);

    const toggleReviewExpansion = (id) => {
        setExpandedReviews((currentState) => ({
            ...currentState,
            [id]: !currentState[id],
        }));
    };

    return {
        starOptions,
        sortOptions,
        selectedStars,
        setSelectedStars,
        onlyWithText,
        setOnlyWithText,
        selectedSort,
        setSelectedSort,
        expandedReviews,
        toggleReviewExpansion,
        averageRating,
        recommendationRate,
        visibleReviews,
    };
};

export default useReviewListControls;
