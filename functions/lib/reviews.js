"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProviderReviewAggregate = fetchProviderReviewAggregate;
exports.saveBookingReviewService = saveBookingReviewService;
const firestore_1 = require("firebase-admin/firestore");
const audit_1 = require("./audit");
const errors_1 = require("./errors");
const shared_1 = require("./shared");
const logging_1 = require("./logging");
const REVIEW_STATUS_PUBLISHED = 'published';
const REVIEW_SCHEMA_VERSION = 1;
function normalizeRating(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 5) {
        throw (0, errors_1.badRequest)('Rating must be between 1 and 5.');
    }
    return Math.round(numericValue);
}
function normalizeStoredReview(reviewId, payload) {
    return {
        reviewId: (0, shared_1.sanitizeString)(payload?.reviewId) || reviewId,
        bookingId: (0, shared_1.sanitizeString)(payload?.bookingId) || reviewId,
        authorUserId: (0, shared_1.sanitizeString)(payload?.authorUserId),
        providerId: (0, shared_1.sanitizeString)(payload?.providerId),
        status: (0, shared_1.sanitizeString)(payload?.status) || REVIEW_STATUS_PUBLISHED,
        rating: Number(payload?.rating) || 0,
        review: (0, shared_1.sanitizeString)(payload?.review),
        authorSnapshot: payload?.authorSnapshot || {},
        providerSnapshot: payload?.providerSnapshot || {},
        serviceSnapshot: payload?.serviceSnapshot || {},
        createdAt: payload?.createdAt || null,
        updatedAt: payload?.updatedAt || null,
        createdBy: (0, shared_1.sanitizeString)(payload?.createdBy),
        updatedBy: (0, shared_1.sanitizeString)(payload?.updatedBy),
        schemaVersion: Number(payload?.schemaVersion) || REVIEW_SCHEMA_VERSION,
    };
}
function serializeTimestamp(value) {
    if (!value) {
        return null;
    }
    if (value instanceof firestore_1.Timestamp) {
        return value.toDate().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value?.toDate === 'function') {
        return value.toDate().toISOString();
    }
    const parsedValue = new Date(String(value));
    return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}
function serializeReviewForClient(review) {
    return {
        ...review,
        createdAt: serializeTimestamp(review.createdAt),
        updatedAt: serializeTimestamp(review.updatedAt),
    };
}
async function fetchProviderReviewAggregate({ db }, providerId) {
    const normalizedProviderId = (0, shared_1.sanitizeString)(providerId);
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
async function saveBookingReviewService({ db }, userId, rawPayload) {
    const bookingId = (0, shared_1.sanitizeString)(rawPayload.bookingId);
    if (!bookingId) {
        throw (0, errors_1.badRequest)('Booking id is required.');
    }
    const rating = normalizeRating(rawPayload.rating);
    const reviewText = (0, shared_1.sanitizeString)(rawPayload.review);
    const bookingRef = db.collection('bookings').doc(bookingId);
    const reviewRef = db.collection('reviews').doc(bookingId);
    const result = await db.runTransaction(async (transaction) => {
        const [bookingSnap, reviewSnap, userSnap] = await Promise.all([
            transaction.get(bookingRef),
            transaction.get(reviewRef),
            transaction.get(db.collection('users').doc(userId)),
        ]);
        if (!bookingSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Booking is missing.');
        }
        if (!userSnap.exists) {
            throw (0, errors_1.failedPrecondition)('User profile is missing.');
        }
        const booking = bookingSnap.data() || {};
        if ((0, shared_1.sanitizeString)(booking.userId) !== userId) {
            throw (0, errors_1.permissionDenied)('Only the booking owner can submit a review.');
        }
        if ((0, shared_1.sanitizeString)(booking.status) !== 'completed') {
            throw (0, errors_1.failedPrecondition)('Only completed bookings can receive a review.');
        }
        const now = firestore_1.Timestamp.now();
        const userData = userSnap.data() || {};
        const reviewDoc = {
            reviewId: bookingId,
            bookingId,
            authorUserId: userId,
            providerId: (0, shared_1.sanitizeString)(booking.providerId),
            status: REVIEW_STATUS_PUBLISHED,
            rating,
            review: reviewText,
            authorSnapshot: {
                displayName: (0, shared_1.sanitizeString)(userData.displayName) || 'Client',
                photoPath: (0, shared_1.sanitizeString)(userData.photoPath) || null,
            },
            providerSnapshot: {
                displayName: (0, shared_1.sanitizeString)(booking.providerSnapshot?.displayName) || 'Prestator',
                providerRole: (0, shared_1.sanitizeString)(booking.serviceSnapshot?.name) || 'Serviciu',
                avatarPath: (0, shared_1.sanitizeString)(booking.providerSnapshot?.avatarPath) || null,
            },
            serviceSnapshot: {
                serviceId: (0, shared_1.sanitizeString)(booking.serviceId),
                serviceName: (0, shared_1.sanitizeString)(booking.serviceSnapshot?.name) || 'Serviciu',
            },
            updatedAt: now,
            updatedBy: userId,
            schemaVersion: REVIEW_SCHEMA_VERSION,
        };
        if (reviewSnap.exists) {
            const existingReview = reviewSnap.data() || {};
            if ((0, shared_1.sanitizeString)(existingReview.authorUserId) && (0, shared_1.sanitizeString)(existingReview.authorUserId) !== userId) {
                throw (0, errors_1.permissionDenied)('This review already belongs to another user.');
            }
            transaction.set(reviewRef, reviewDoc, { merge: true });
        }
        else {
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
                createdBy: reviewSnap.exists ? (0, shared_1.sanitizeString)((reviewSnap.data() || {}).createdBy) || userId : userId,
            }),
        };
    });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'review.save',
        uid: userId,
        role: 'user',
        resourceType: 'review',
        resourceId: bookingId,
        statusTo: result.review.status,
        outcome: 'success',
    }, 'Booking review was saved.');
    await (0, audit_1.writeAuditEvent)({ db }, {
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
