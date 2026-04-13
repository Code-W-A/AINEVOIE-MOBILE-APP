import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../context/localeContext';
import { useSession } from '../context/sessionContext';
import { fetchUserReviews, saveBookingReview } from '../src/firebase/reviews';
import {
  filterReviewsByProviderIdentifiers,
  normalizeReviewRecord,
  sortReviewsByUpdatedDesc,
} from '../src/features/shared/utils/reviews';

const USER_REVIEWS_STORAGE_KEY = '@ainevoie/user-reviews';
const LEGACY_USER_REVIEWS_STORAGE_KEY = '@urbanhome/user-reviews';

const seedUserReviews = [
  {
    id: 'review_seed_1',
    bookingId: 'seed_past_1',
    providerId: 'provider-amara-smith',
    providerName: 'Amara Smith',
    providerRole: 'Specialist curățenie',
    serviceName: 'Curățenie locuință',
    rating: 5,
    review: 'Serviciul a fost clar, punctual și atent la detalii. Aș rezerva din nou fără ezitare.',
    createdAt: '2026-03-18T10:20:00.000Z',
  },
  {
    id: 'review_seed_2',
    bookingId: 'seed_past_3',
    providerId: 'provider-john-smith',
    providerName: 'John Smith',
    providerRole: 'Electrician',
    serviceName: 'Electricitate',
    rating: 4,
    review: 'Comunicare bună și intervenție rapidă. A rămas doar un mic follow-up după lucrare.',
    createdAt: '2026-03-27T16:15:00.000Z',
  },
];

async function readStoredReviews() {
  try {
    const storedValue = await AsyncStorage.getItem(USER_REVIEWS_STORAGE_KEY);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);
      return Array.isArray(parsedValue)
        ? sortReviewsByUpdatedDesc(parsedValue.map((review) => normalizeReviewRecord(review)))
        : seedUserReviews.map(normalizeReviewRecord);
    }

    const legacyValue = await AsyncStorage.getItem(LEGACY_USER_REVIEWS_STORAGE_KEY);

    if (!legacyValue) {
      return seedUserReviews.map(normalizeReviewRecord);
    }

    await AsyncStorage.setItem(USER_REVIEWS_STORAGE_KEY, legacyValue);
    await AsyncStorage.removeItem(LEGACY_USER_REVIEWS_STORAGE_KEY);
    const parsedLegacyValue = JSON.parse(legacyValue);

    return Array.isArray(parsedLegacyValue)
      ? sortReviewsByUpdatedDesc(parsedLegacyValue.map((review) => normalizeReviewRecord(review)))
      : seedUserReviews.map(normalizeReviewRecord);
  } catch {
    return seedUserReviews.map(normalizeReviewRecord);
  }
}

async function persistReviews(nextReviews) {
  await AsyncStorage.setItem(USER_REVIEWS_STORAGE_KEY, JSON.stringify(nextReviews));
  await AsyncStorage.removeItem(LEGACY_USER_REVIEWS_STORAGE_KEY);
}

export function useUserReviews() {
  const { locale } = useLocale();
  const { session } = useSession();
  const canUseRemote = Boolean(session.isAuthenticated && session.uid && !session.configError);
  const [reviews, setReviews] = useState(seedUserReviews.map(normalizeReviewRecord));
  const [isLoading, setIsLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);

    if (canUseRemote && session.uid) {
      try {
        const remoteReviews = await fetchUserReviews(session.uid);
        setReviews(remoteReviews);
        setIsLoading(false);
        return remoteReviews;
      } catch {
      }
    }

    const storedReviews = await readStoredReviews();
    setReviews(storedReviews);
    setIsLoading(false);
    return storedReviews;
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

    if (canUseRemote && session.uid) {
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
    }

    const storedReviews = await readStoredReviews();
    const normalizedReview = normalizeReviewRecord(reviewPayload);
    const existingIndex = storedReviews.findIndex((review) => review.bookingId === normalizedReview.bookingId);
    const nextReviews = [...storedReviews];

    if (existingIndex >= 0) {
      nextReviews[existingIndex] = {
        ...nextReviews[existingIndex],
        ...normalizedReview,
      };
    } else {
      nextReviews.unshift(normalizedReview);
    }

    const sortedReviews = sortReviewsByUpdatedDesc(nextReviews);
    await persistReviews(sortedReviews);
    setReviews(sortedReviews);
    return normalizedReview;
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
    isLoading,
    averageRating,
    loadReviews,
    saveReview,
    getReviewByBookingId,
    getReviewsForProvider,
  };
}
