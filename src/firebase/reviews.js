import { collection, doc, getDoc, getDocs, limit as limitQuery, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from './client';
import { resolveStoragePathDownloadUrl } from './storageUploads';
import { normalizeReviewRecord, sortReviewsByUpdatedDesc } from '../features/shared/utils/reviews';

function getReviewsCollectionRef(db) {
  return collection(db, 'reviews');
}

async function withResolvedProviderAvatar(record) {
  const avatarPath = record?.providerSnapshot?.avatarPath;

  if (!avatarPath || record.providerImage) {
    return record;
  }

  try {
    const avatarUrl = await resolveStoragePathDownloadUrl(avatarPath);
    return {
      ...record,
      providerImage: { uri: avatarUrl },
    };
  } catch {
    return record;
  }
}

async function normalizeReviewSnapshot(snapshot) {
  const normalized = await Promise.all(snapshot.docs.map(async (item) => normalizeReviewRecord(
    await withResolvedProviderAvatar({
      reviewId: item.id,
      ...item.data(),
    }),
  )));

  return sortReviewsByUpdatedDesc(normalized.filter((review) => review.status === 'published'));
}

export async function fetchUserReviews(authorUserId) {
  const { db } = getFirebaseServices();
  const reviewsQuery = query(
    getReviewsCollectionRef(db),
    where('authorUserId', '==', String(authorUserId || '').trim()),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(reviewsQuery);

  return await normalizeReviewSnapshot(snapshot);
}

export async function fetchProviderReviews(providerId) {
  const { db } = getFirebaseServices();
  const reviewsQuery = query(
    getReviewsCollectionRef(db),
    where('providerId', '==', String(providerId || '').trim()),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(reviewsQuery);

  return await normalizeReviewSnapshot(snapshot);
}

export async function fetchLatestPublicReviews(limit = 8) {
  const { db } = getFirebaseServices();
  const reviewsQuery = query(
    getReviewsCollectionRef(db),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limitQuery(Math.max(1, Number(limit) || 8)),
  );
  const snapshot = await getDocs(reviewsQuery);

  return await normalizeReviewSnapshot(snapshot);
}

export async function fetchReviewByBookingId(bookingId) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'reviews', String(bookingId || '').trim()));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeReviewRecord(await withResolvedProviderAvatar({
    reviewId: snapshot.id,
    ...snapshot.data(),
  }));
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

  return normalizeReviewRecord(await withResolvedProviderAvatar(response.data?.review || response.data));
}
