import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../context/localeContext';
import { useSession } from '../context/sessionContext';
import { fetchUserReviews, saveBookingReview } from '../src/firebase/reviews';
import {
  filterReviewsByProviderIdentifiers,
  sortReviewsByUpdatedDesc,
} from '../src/features/shared/utils/reviews';

export function useUserReviews() {
  const { locale } = useLocale();
  const { session } = useSession();
  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === 'user'
    && session.uid
    && !session.configError,
  );
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReviews = useCallback(async () => {
    if (!canUseRemote) {
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const remoteReviews = await fetchUserReviews(session.uid);
      setReviews(remoteReviews);
      return remoteReviews;
    } catch (nextError) {
      setReviews([]);
      setError(nextError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [canUseRemote, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews]),
  );

  const saveReview = useCallback(async (reviewPayload) => {
    if (!reviewPayload?.bookingId) {
      throw new Error('Missing bookingId for review.');
    }

    if (!canUseRemote || !session.uid) {
      throw new Error('Autentificarea este necesară pentru recenzii reale.');
    }

    const savedReview = await saveBookingReview({
      bookingId: reviewPayload.bookingId,
      rating: reviewPayload.rating,
      review: reviewPayload.review,
    }, locale);

    setReviews((currentReviews) => sortReviewsByUpdatedDesc([
      savedReview,
      ...currentReviews.filter((review) => review.bookingId !== savedReview.bookingId),
    ]));

    return savedReview;
  }, [canUseRemote, locale, session.uid]);

  const getReviewByBookingId = useCallback((bookingId) => (
    reviews.find((review) => review.bookingId === bookingId) || null
  ), [reviews]);

  const getReviewsForProvider = useCallback((providerIdentifiers = []) => (
    filterReviewsByProviderIdentifiers(reviews, providerIdentifiers)
  ), [reviews]);

  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return 0;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  return {
    reviews,
    data: reviews,
    list: reviews,
    isLoading,
    error,
    averageRating,
    loadReviews,
    reload: loadReviews,
    saveReview,
    getReviewByBookingId,
    getReviewsForProvider,
  };
}
