import { getProviderDisplaySnapshot } from './providerDirectory';

const defaultReviewAuthorImage = require('../../../../assets/images/user/user_5.jpg');

function normalizeTimestampValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}

function getTimestampValue(value) {
  if (!value) {
    return 0;
  }

  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsedValue = new Date(value).getTime();
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function normalizeReviewRecord(review) {
  const providerSnapshot = getProviderDisplaySnapshot({
    providerId: review?.providerId || review?.providerSnapshot?.providerId,
    providerName: review?.providerName || review?.providerSnapshot?.displayName,
    providerRole: review?.providerRole || review?.providerSnapshot?.providerRole || review?.serviceSnapshot?.serviceName,
  });

  return {
    id: String(review?.id || review?.reviewId || review?.bookingId || `review_${Date.now()}`),
    reviewId: String(review?.reviewId || review?.bookingId || review?.id || ''),
    bookingId: String(review?.bookingId || review?.reviewId || review?.id || ''),
    authorUserId: String(review?.authorUserId || ''),
    authorName: String(review?.authorName || review?.authorSnapshot?.displayName || 'Client AI Nevoie').trim() || 'Client AI Nevoie',
    authorImage: review?.authorImage || defaultReviewAuthorImage,
    providerId: providerSnapshot.providerId,
    providerName: review?.providerName || review?.providerSnapshot?.displayName || providerSnapshot.providerName,
    providerRole: review?.providerRole || review?.providerSnapshot?.providerRole || providerSnapshot.providerRole,
    providerImage: review?.providerImage ?? providerSnapshot.providerImage,
    serviceId: String(review?.serviceId || review?.serviceSnapshot?.serviceId || ''),
    serviceName: String(review?.serviceName || review?.serviceSnapshot?.serviceName || '').trim(),
    rating: Math.max(1, Math.min(5, Number(review?.rating) || 0)),
    review: String(review?.review || '').trim(),
    status: String(review?.status || 'published').trim() || 'published',
    createdAt: normalizeTimestampValue(review?.createdAt) || new Date().toISOString(),
    updatedAt: normalizeTimestampValue(review?.updatedAt) || normalizeTimestampValue(review?.createdAt) || new Date().toISOString(),
  };
}

export function sortReviewsByUpdatedDesc(reviews = []) {
  return [...reviews].sort((firstReview, secondReview) => {
    const updatedDelta = getTimestampValue(secondReview.updatedAt) - getTimestampValue(firstReview.updatedAt);

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return getTimestampValue(secondReview.createdAt) - getTimestampValue(firstReview.createdAt);
  });
}

export function filterReviewsByProviderIdentifiers(reviews = [], providerIdentifiers = []) {
  const normalizedIdentifiers = providerIdentifiers
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  if (!normalizedIdentifiers.length) {
    return reviews;
  }

  return reviews.filter((review) => (
    normalizedIdentifiers.includes(String(review.providerId || '').trim().toLowerCase())
    || normalizedIdentifiers.includes(String(review.providerName || '').trim().toLowerCase())
  ));
}
