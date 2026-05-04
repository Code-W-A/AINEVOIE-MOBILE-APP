import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchProviderReviews } from '../src/firebase/reviews';

export function useProviderReviews(providerId = null) {
  const { session } = useSession();
  const ownerProviderId = session.isAuthenticated && session.activeRole === 'provider' ? session.uid : null;
  const resolvedProviderId = providerId || ownerProviderId;
  const canUseRemote = Boolean(resolvedProviderId && !session.configError);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReviews = useCallback(async () => {
    if (!resolvedProviderId || !canUseRemote) {
      setIsLoading(false);
      return [];
    }

    setError(null);
    setIsLoading(true);

    try {
      const nextReviews = await fetchProviderReviews(resolvedProviderId);
      setReviews(nextReviews);
      return nextReviews;
    } catch (nextError) {
      setReviews([]);
      setError(nextError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [canUseRemote, resolvedProviderId]);

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews]),
  );

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
    reviewCount: reviews.length,
    averageRating,
    loadReviews,
    reload: loadReviews,
  };
}
