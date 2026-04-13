import { collection, doc, getDoc, getDocs, httpsCallable, query, where } from 'firebase/firestore';
import { getFirebaseServices } from './client';
import { normalizeReviewRecord, sortReviewsByUpdatedDesc } from '../features/shared/utils/reviews';

function getReviewsCollectionRef(db) {
  return collection(db, 'reviews');
}

export async function fetchUserReviews(authorUserId) {
  const { db } = getFirebaseServices();
  const reviewsQuery = query(getReviewsCollectionRef(db), where('authorUserId', '==', String(authorUserId || '').trim()));
  const snapshot = await getDocs(reviewsQuery);

  return sortReviewsByUpdatedDesc(
    snapshot.docs.map((item) => normalizeReviewRecord({
      reviewId: item.id,
      ...item.data(),
    })),
  );
}

export async function fetchProviderReviews(providerId) {
  const { db } = getFirebaseServices();
  const reviewsQuery = query(getReviewsCollectionRef(db), where('providerId', '==', String(providerId || '').trim()));
  const snapshot = await getDocs(reviewsQuery);

  return sortReviewsByUpdatedDesc(
    snapshot.docs.map((item) => normalizeReviewRecord({
      reviewId: item.id,
      ...item.data(),
    })),
  );
}

export async function fetchReviewByBookingId(bookingId) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'reviews', String(bookingId || '').trim()));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeReviewRecord({
    reviewId: snapshot.id,
    ...snapshot.data(),
  });
}

export async function saveBookingReview(payload, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'saveBookingReview');
  const response = await callable({
    bookingId: payload?.bookingId,
    rating: payload?.rating,
    review: payload?.review,
    locale,
  });

  return normalizeReviewRecord(response.data?.review || response.data);
}
