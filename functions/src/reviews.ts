import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { writeAuditEvent } from './audit';
import { badRequest, failedPrecondition, permissionDenied } from './errors';
import { sanitizeString } from './shared';
import { writeStructuredLog } from './logging';

type ReviewDeps = {
  db: Firestore,
};

type SaveReviewPayload = {
  bookingId?: unknown,
  rating?: unknown,
  review?: unknown,
};

const REVIEW_STATUS_PUBLISHED = 'published';
const REVIEW_SCHEMA_VERSION = 1;

function normalizeRating(value: unknown) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 5) {
    throw badRequest('Rating must be between 1 and 5.');
  }

  return Math.round(numericValue);
}

function normalizeStoredReview(reviewId: string, payload: Record<string, any>) {
  return {
    reviewId: sanitizeString(payload?.reviewId) || reviewId,
    bookingId: sanitizeString(payload?.bookingId) || reviewId,
    authorUserId: sanitizeString(payload?.authorUserId),
    providerId: sanitizeString(payload?.providerId),
    status: sanitizeString(payload?.status) || REVIEW_STATUS_PUBLISHED,
    rating: Number(payload?.rating) || 0,
    review: sanitizeString(payload?.review),
    authorSnapshot: payload?.authorSnapshot || {},
    providerSnapshot: payload?.providerSnapshot || {},
    serviceSnapshot: payload?.serviceSnapshot || {},
    createdAt: payload?.createdAt || null,
    updatedAt: payload?.updatedAt || null,
    createdBy: sanitizeString(payload?.createdBy),
    updatedBy: sanitizeString(payload?.updatedBy),
    schemaVersion: Number(payload?.schemaVersion) || REVIEW_SCHEMA_VERSION,
  };
}

function serializeTimestamp(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  const parsedValue = new Date(String(value));
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}

function serializeReviewForClient(review: Record<string, any>) {
  return {
    ...review,
    createdAt: serializeTimestamp(review.createdAt),
    updatedAt: serializeTimestamp(review.updatedAt),
  };
}

export async function fetchProviderReviewAggregate(
  { db }: ReviewDeps,
  providerId: string,
) {
  const normalizedProviderId = sanitizeString(providerId);

  if (!normalizedProviderId) {
    return {
      ratingAverage: 0,
      reviewCount: 0,
      ratingSum: 0,
    };
  }

  const snapshot = await db.collection('reviews')
    .where('providerId', '==', normalizedProviderId)
    .where('status', '==', 'published')
    .get();
  const reviews = snapshot.docs.map((docSnap) => normalizeStoredReview(docSnap.id, docSnap.data() || {}));
  const reviewCount = reviews.length;
  const ratingSum = reviews.reduce((sum, review) => sum + review.rating, 0);
  const ratingAverage = reviewCount ? ratingSum / reviewCount : 0;

  return {
    ratingAverage: Number(ratingAverage.toFixed(2)),
    reviewCount,
    ratingSum: Number(ratingSum.toFixed(2)),
  };
}

export async function saveBookingReviewService(
  { db }: ReviewDeps,
  userId: string,
  rawPayload: SaveReviewPayload,
) {
  const bookingId = sanitizeString(rawPayload.bookingId);

  if (!bookingId) {
    throw badRequest('Booking id is required.');
  }

  const rating = normalizeRating(rawPayload.rating);
  const reviewText = sanitizeString(rawPayload.review);
  const bookingRef = db.collection('bookings').doc(bookingId);
  const reviewRef = db.collection('reviews').doc(bookingId);
  const result = await db.runTransaction(async (transaction) => {
    const [bookingSnap, reviewSnap, userSnap] = await Promise.all([
      transaction.get(bookingRef),
      transaction.get(reviewRef),
      transaction.get(db.collection('users').doc(userId)),
    ]);

    if (!bookingSnap.exists) {
      throw failedPrecondition('Booking is missing.');
    }

    if (!userSnap.exists) {
      throw failedPrecondition('User profile is missing.');
    }

    const booking = bookingSnap.data() || {};

    if (sanitizeString(booking.userId) !== userId) {
      throw permissionDenied('Only the booking owner can submit a review.');
    }

    if (sanitizeString(booking.status) !== 'completed') {
      throw failedPrecondition('Only completed bookings can receive a review.');
    }

    const now = Timestamp.now();
    const userData = userSnap.data() || {};
    const reviewDoc = {
      reviewId: bookingId,
      bookingId,
      authorUserId: userId,
      providerId: sanitizeString(booking.providerId),
      status: REVIEW_STATUS_PUBLISHED,
      rating,
      review: reviewText,
      authorSnapshot: {
        displayName: sanitizeString(userData.displayName) || 'Client',
        photoPath: sanitizeString(userData.photoPath) || null,
      },
      providerSnapshot: {
        displayName: sanitizeString(booking.providerSnapshot?.displayName) || 'Prestator',
        providerRole: sanitizeString(booking.serviceSnapshot?.name) || 'Serviciu',
        avatarPath: sanitizeString(booking.providerSnapshot?.avatarPath) || null,
      },
      serviceSnapshot: {
        serviceId: sanitizeString(booking.serviceId),
        serviceName: sanitizeString(booking.serviceSnapshot?.name) || 'Serviciu',
      },
      updatedAt: now,
      updatedBy: userId,
      schemaVersion: REVIEW_SCHEMA_VERSION,
    };

    if (reviewSnap.exists) {
      const existingReview = reviewSnap.data() || {};

      if (sanitizeString(existingReview.authorUserId) && sanitizeString(existingReview.authorUserId) !== userId) {
        throw permissionDenied('This review already belongs to another user.');
      }

      transaction.set(reviewRef, reviewDoc, { merge: true });
    } else {
      transaction.set(reviewRef, {
        ...reviewDoc,
        createdAt: now,
        createdBy: userId,
      });
    }

    transaction.set(bookingRef, {
      reviewSummary: {
        reviewId: bookingId,
        rating,
      },
      updatedAt: now,
      updatedBy: userId,
    }, { merge: true });

    return {
      created: !reviewSnap.exists,
      review: normalizeStoredReview(bookingId, {
        ...(reviewSnap.exists ? reviewSnap.data() || {} : {}),
        ...reviewDoc,
        createdAt: reviewSnap.exists ? (reviewSnap.data() || {}).createdAt || now : now,
        createdBy: reviewSnap.exists ? sanitizeString((reviewSnap.data() || {}).createdBy) || userId : userId,
      }),
    };
  });

  writeStructuredLog('info', {
    action: 'review.save',
    uid: userId,
    role: 'user',
    resourceType: 'review',
    resourceId: bookingId,
    statusTo: result.review.status,
    outcome: 'success',
  }, 'Booking review was saved.');

  await writeAuditEvent({ db }, {
    action: 'review.save',
    actorUid: userId,
    actorRole: 'user',
    resourceType: 'review',
    resourceId: bookingId,
    statusTo: result.review.status,
    result: result.created ? 'created' : 'updated',
    context: {
      bookingId,
      providerId: result.review.providerId,
      rating: result.review.rating,
    },
  });

  return {
    review: serializeReviewForClient(result.review),
  };
}
