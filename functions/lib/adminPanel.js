"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboardSummaryService = getAdminDashboardSummaryService;
exports.listAdminProvidersService = listAdminProvidersService;
exports.getAdminProviderCaseService = getAdminProviderCaseService;
exports.listAdminBookingsService = listAdminBookingsService;
exports.getAdminBookingCaseService = getAdminBookingCaseService;
exports.listAdminReviewsService = listAdminReviewsService;
exports.listAdminAuditEventsService = listAdminAuditEventsService;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("./errors");
const providerAvailability_1 = require("./providerAvailability");
const providerServices_1 = require("./providerServices");
const shared_1 = require("./shared");
const ADMIN_READ_ROLES = new Set(['admin', 'support']);
const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;
function assertAdminReadRole(role) {
    if (!ADMIN_READ_ROLES.has((0, shared_1.sanitizeString)(role))) {
        throw (0, errors_1.permissionDenied)('Only admin or support users can access admin panel queries.');
    }
}
function normalizeLimit(value) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
        return DEFAULT_LIST_LIMIT;
    }
    return Math.min(Math.floor(nextValue), MAX_LIST_LIMIT);
}
function getTimestampMillis(value) {
    if (!value) {
        return 0;
    }
    if (value instanceof firestore_1.Timestamp) {
        return value.toMillis();
    }
    if (value instanceof Date) {
        return value.getTime();
    }
    if (typeof value?.toMillis === 'function') {
        return Number(value.toMillis()) || 0;
    }
    if (typeof value?.toDate === 'function') {
        return value.toDate().getTime();
    }
    const parsedValue = new Date(String(value)).getTime();
    return Number.isFinite(parsedValue) ? parsedValue : 0;
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
function serializeValue(value) {
    if (value == null
        || typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean') {
        return value;
    }
    const serializedTimestamp = serializeTimestamp(value);
    if (serializedTimestamp) {
        return serializedTimestamp;
    }
    if (Array.isArray(value)) {
        return value.map((item) => serializeValue(item));
    }
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value)
            .map(([key, itemValue]) => [key, serializeValue(itemValue)]));
    }
    return value;
}
function sortByTimestampDesc(items, resolver) {
    return [...items].sort((firstItem, secondItem) => getTimestampMillis(resolver(secondItem)) - getTimestampMillis(resolver(firstItem)));
}
async function fetchCollectionDocs(db, collectionName) {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        data: docSnap.data() || {},
    }));
}
function matchesSearch(haystack, searchTerm) {
    if (!searchTerm) {
        return true;
    }
    const normalizedSearch = searchTerm.toLowerCase();
    return haystack.some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
}
function buildProviderListItem(providerId, provider) {
    const profile = provider.professionalProfile || {};
    const documents = provider.documents || {};
    const reviewState = provider.reviewState || {};
    const adminReview = provider.adminReview || {};
    return serializeValue({
        providerId,
        status: (0, shared_1.sanitizeString)(provider.status),
        accountStatus: (0, shared_1.sanitizeString)(provider.accountStatus),
        email: (0, shared_1.sanitizeString)(provider.email) || null,
        phoneNumber: (0, shared_1.sanitizeString)(provider.phoneNumber) || null,
        businessName: (0, shared_1.sanitizeString)(profile.businessName),
        displayName: (0, shared_1.sanitizeString)(profile.displayName),
        specialization: (0, shared_1.sanitizeString)(profile.specialization),
        coverageAreaText: (0, shared_1.sanitizeString)(profile.coverageAreaText),
        availabilitySummary: (0, shared_1.sanitizeString)(profile.availabilitySummary),
        identityDocumentStatus: (0, shared_1.sanitizeString)(documents.identity?.status) || 'missing',
        professionalDocumentStatus: (0, shared_1.sanitizeString)(documents.professional?.status) || 'missing',
        submittedAt: reviewState.submittedAt || null,
        lastReviewedAt: reviewState.lastReviewedAt || null,
        reviewedAt: adminReview.reviewedAt || null,
        reviewAction: (0, shared_1.sanitizeString)(adminReview.action) || null,
        lastPublishedAt: provider.lastPublishedAt || null,
        updatedAt: provider.updatedAt || null,
    });
}
function buildBookingListItem(bookingId, booking) {
    const pricingSnapshot = booking.pricingSnapshot || {};
    return serializeValue({
        bookingId,
        status: (0, shared_1.sanitizeString)(booking.status),
        userId: (0, shared_1.sanitizeString)(booking.userId),
        providerId: (0, shared_1.sanitizeString)(booking.providerId),
        serviceId: (0, shared_1.sanitizeString)(booking.serviceId),
        scheduledStartAt: booking.scheduledStartAt || null,
        scheduledEndAt: booking.scheduledEndAt || null,
        timezone: (0, shared_1.sanitizeString)(booking.timezone),
        pricingSnapshot,
        paymentSummary: {
            ...(booking.paymentSummary || {}),
            amount: Number(pricingSnapshot.amount) || 0,
            currency: (0, shared_1.sanitizeString)(pricingSnapshot.currency) || 'RON',
        },
        userSnapshot: booking.userSnapshot || {},
        providerSnapshot: booking.providerSnapshot || {},
        serviceSnapshot: booking.serviceSnapshot || {},
        updatedAt: booking.updatedAt || null,
        createdAt: booking.createdAt || null,
    });
}
function buildReviewListItem(reviewId, review) {
    return serializeValue({
        reviewId,
        bookingId: (0, shared_1.sanitizeString)(review.bookingId) || reviewId,
        providerId: (0, shared_1.sanitizeString)(review.providerId),
        authorUserId: (0, shared_1.sanitizeString)(review.authorUserId),
        status: (0, shared_1.sanitizeString)(review.status),
        rating: Number(review.rating) || 0,
        review: (0, shared_1.sanitizeString)(review.review),
        authorSnapshot: review.authorSnapshot || {},
        providerSnapshot: review.providerSnapshot || {},
        serviceSnapshot: review.serviceSnapshot || {},
        createdAt: review.createdAt || null,
        updatedAt: review.updatedAt || null,
    });
}
function buildAuditEventItem(eventId, eventData) {
    return serializeValue({
        eventId,
        action: (0, shared_1.sanitizeString)(eventData.action),
        actorUid: (0, shared_1.sanitizeString)(eventData.actorUid) || null,
        actorRole: (0, shared_1.sanitizeString)(eventData.actorRole) || null,
        resourceType: (0, shared_1.sanitizeString)(eventData.resourceType) || null,
        resourceId: (0, shared_1.sanitizeString)(eventData.resourceId) || null,
        statusFrom: (0, shared_1.sanitizeString)(eventData.statusFrom) || null,
        statusTo: (0, shared_1.sanitizeString)(eventData.statusTo) || null,
        result: (0, shared_1.sanitizeString)(eventData.result) || null,
        errorCode: (0, shared_1.sanitizeString)(eventData.errorCode) || null,
        context: serializeValue(eventData.context || {}),
        createdAt: eventData.createdAt || null,
    });
}
function filterProviderAuditEvents(events, providerId) {
    return events.filter((event) => {
        const resourceId = (0, shared_1.sanitizeString)(event.data.resourceId);
        const contextProviderId = (0, shared_1.sanitizeString)(event.data.context?.providerId);
        return resourceId === providerId
            || resourceId.startsWith(`${providerId}:`)
            || resourceId.startsWith(`${providerId}/`)
            || contextProviderId === providerId;
    });
}
function filterBookingAuditEvents(events, bookingId, paymentId) {
    return events.filter((event) => {
        const resourceId = (0, shared_1.sanitizeString)(event.data.resourceId);
        const contextBookingId = (0, shared_1.sanitizeString)(event.data.context?.bookingId);
        const contextPaymentId = (0, shared_1.sanitizeString)(event.data.context?.paymentId);
        return resourceId === bookingId
            || resourceId === paymentId
            || contextBookingId === bookingId
            || contextPaymentId === paymentId;
    });
}
async function getAdminDashboardSummaryService({ db }, role) {
    assertAdminReadRole(role);
    const [providers, bookings, payments, reviews, auditEvents] = await Promise.all([
        fetchCollectionDocs(db, 'providers'),
        fetchCollectionDocs(db, 'bookings'),
        fetchCollectionDocs(db, 'payments'),
        fetchCollectionDocs(db, 'reviews'),
        fetchCollectionDocs(db, 'auditEvents'),
    ]);
    const providersByStatus = providers.reduce((counts, item) => {
        const status = (0, shared_1.sanitizeString)(item.data.status) || 'unknown';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
    }, {});
    const bookingsByStatus = bookings.reduce((counts, item) => {
        const status = (0, shared_1.sanitizeString)(item.data.status) || 'unknown';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
    }, {});
    const paymentsByStatus = payments.reduce((counts, item) => {
        const status = (0, shared_1.sanitizeString)(item.data.status) || 'unknown';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
    }, {});
    const reviewsByStatus = reviews.reduce((counts, item) => {
        const status = (0, shared_1.sanitizeString)(item.data.status) || 'unknown';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
    }, {});
    const openBookingIssueCount = bookings.filter((item) => {
        const bookingStatus = (0, shared_1.sanitizeString)(item.data.status);
        const paymentStatus = (0, shared_1.sanitizeString)(item.data.paymentSummary?.status);
        return bookingStatus === 'requested'
            || bookingStatus === 'reschedule_proposed'
            || paymentStatus === 'failed';
    }).length;
    return serializeValue({
        generatedAt: new Date().toISOString(),
        totals: {
            providers: providers.length,
            bookings: bookings.length,
            payments: payments.length,
            reviews: reviews.length,
            auditEvents: auditEvents.length,
        },
        providersByStatus,
        bookingsByStatus,
        paymentsByStatus,
        reviewsByStatus,
        pendingProviderReviewCount: providersByStatus.pending_review || 0,
        openBookingIssueCount,
        latestAuditAt: sortByTimestampDesc(auditEvents, (item) => item.data.createdAt)[0]?.data?.createdAt || null,
    });
}
async function listAdminProvidersService({ db }, role, rawPayload) {
    assertAdminReadRole(role);
    const status = (0, shared_1.sanitizeString)(rawPayload.status);
    const search = (0, shared_1.sanitizeString)(rawPayload.search).toLowerCase();
    const limit = normalizeLimit(rawPayload.limit);
    const providers = await fetchCollectionDocs(db, 'providers');
    const filtered = sortByTimestampDesc(providers.filter((item) => {
        if (status && (0, shared_1.sanitizeString)(item.data.status) !== status) {
            return false;
        }
        return matchesSearch([
            item.id,
            item.data.email,
            item.data.phoneNumber,
            item.data.professionalProfile?.businessName,
            item.data.professionalProfile?.displayName,
            item.data.professionalProfile?.specialization,
        ], search);
    }), (item) => item.data.reviewState?.submittedAt || item.data.updatedAt || item.data.createdAt);
    return {
        total: filtered.length,
        items: filtered
            .slice(0, limit)
            .map((item) => buildProviderListItem(item.id, item.data)),
    };
}
async function getAdminProviderCaseService({ db }, role, rawPayload) {
    assertAdminReadRole(role);
    const providerId = (0, shared_1.sanitizeString)(rawPayload.providerId);
    if (!providerId) {
        throw (0, errors_1.badRequest)('Provider id is required.');
    }
    const providerRef = db.collection('providers').doc(providerId);
    const [providerSnap, providerDirectorySnap, availability, services, auditEvents, bookings] = await Promise.all([
        providerRef.get(),
        db.collection('providerDirectory').doc(providerId).get(),
        (0, providerAvailability_1.fetchProviderAvailabilityProfile)({ db }, providerId),
        (0, providerServices_1.fetchProviderServices)({ db }, providerId),
        fetchCollectionDocs(db, 'auditEvents'),
        fetchCollectionDocs(db, 'bookings'),
    ]);
    if (!providerSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Provider profile not found.');
    }
    const provider = providerSnap.data() || {};
    const relatedBookings = sortByTimestampDesc(bookings.filter((item) => (0, shared_1.sanitizeString)(item.data.providerId) === providerId), (item) => item.data.updatedAt || item.data.createdAt).slice(0, 10);
    const relatedAuditEvents = sortByTimestampDesc(filterProviderAuditEvents(auditEvents, providerId), (item) => item.data.createdAt).slice(0, 25);
    return {
        provider: serializeValue({
            providerId,
            ...provider,
        }),
        providerDirectory: providerDirectorySnap.exists
            ? serializeValue({
                providerId,
                ...providerDirectorySnap.data(),
            })
            : null,
        availability: serializeValue(availability),
        services: serializeValue(services),
        recentBookings: relatedBookings.map((item) => buildBookingListItem(item.id, item.data)),
        recentAuditEvents: relatedAuditEvents.map((item) => buildAuditEventItem(item.id, item.data)),
    };
}
async function listAdminBookingsService({ db }, role, rawPayload) {
    assertAdminReadRole(role);
    const status = (0, shared_1.sanitizeString)(rawPayload.status);
    const providerId = (0, shared_1.sanitizeString)(rawPayload.providerId);
    const userId = (0, shared_1.sanitizeString)(rawPayload.userId);
    const paymentStatus = (0, shared_1.sanitizeString)(rawPayload.paymentStatus);
    const search = (0, shared_1.sanitizeString)(rawPayload.search).toLowerCase();
    const limit = normalizeLimit(rawPayload.limit);
    const bookings = await fetchCollectionDocs(db, 'bookings');
    const filtered = sortByTimestampDesc(bookings.filter((item) => {
        if (status && (0, shared_1.sanitizeString)(item.data.status) !== status) {
            return false;
        }
        if (providerId && (0, shared_1.sanitizeString)(item.data.providerId) !== providerId) {
            return false;
        }
        if (userId && (0, shared_1.sanitizeString)(item.data.userId) !== userId) {
            return false;
        }
        if (paymentStatus && (0, shared_1.sanitizeString)(item.data.paymentSummary?.status) !== paymentStatus) {
            return false;
        }
        return matchesSearch([
            item.id,
            item.data.userSnapshot?.displayName,
            item.data.providerSnapshot?.displayName,
            item.data.serviceSnapshot?.name,
            item.data.requestDetails?.description,
        ], search);
    }), (item) => item.data.updatedAt || item.data.createdAt);
    return {
        total: filtered.length,
        items: filtered.slice(0, limit).map((item) => buildBookingListItem(item.id, item.data)),
    };
}
async function getAdminBookingCaseService({ db }, role, rawPayload) {
    assertAdminReadRole(role);
    const bookingId = (0, shared_1.sanitizeString)(rawPayload.bookingId);
    if (!bookingId) {
        throw (0, errors_1.badRequest)('Booking id is required.');
    }
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Booking not found.');
    }
    const booking = bookingSnap.data() || {};
    const paymentId = (0, shared_1.sanitizeString)(booking.paymentSummary?.paymentId) || `pay_${bookingId}`;
    const [paymentSnap, reviewSnap, providerSnap, userSnap, auditEvents] = await Promise.all([
        db.collection('payments').doc(paymentId).get(),
        db.collection('reviews').doc(bookingId).get(),
        db.collection('providers').doc((0, shared_1.sanitizeString)(booking.providerId)).get(),
        db.collection('users').doc((0, shared_1.sanitizeString)(booking.userId)).get(),
        fetchCollectionDocs(db, 'auditEvents'),
    ]);
    const relatedAuditEvents = sortByTimestampDesc(filterBookingAuditEvents(auditEvents, bookingId, paymentId), (item) => item.data.createdAt).slice(0, 25);
    return {
        booking: buildBookingListItem(bookingId, booking),
        payment: paymentSnap.exists
            ? serializeValue({
                paymentId,
                ...paymentSnap.data(),
            })
            : null,
        review: reviewSnap.exists
            ? buildReviewListItem(reviewSnap.id, reviewSnap.data() || {})
            : null,
        provider: providerSnap.exists
            ? serializeValue({
                providerId: providerSnap.id,
                ...providerSnap.data(),
            })
            : null,
        user: userSnap.exists
            ? serializeValue({
                userId: userSnap.id,
                ...userSnap.data(),
            })
            : null,
        recentAuditEvents: relatedAuditEvents.map((item) => buildAuditEventItem(item.id, item.data)),
    };
}
async function listAdminReviewsService({ db }, role, rawPayload) {
    assertAdminReadRole(role);
    const providerId = (0, shared_1.sanitizeString)(rawPayload.providerId);
    const authorUserId = (0, shared_1.sanitizeString)(rawPayload.authorUserId);
    const status = (0, shared_1.sanitizeString)(rawPayload.status);
    const search = (0, shared_1.sanitizeString)(rawPayload.search).toLowerCase();
    const limit = normalizeLimit(rawPayload.limit);
    const reviews = await fetchCollectionDocs(db, 'reviews');
    const filtered = sortByTimestampDesc(reviews.filter((item) => {
        if (providerId && (0, shared_1.sanitizeString)(item.data.providerId) !== providerId) {
            return false;
        }
        if (authorUserId && (0, shared_1.sanitizeString)(item.data.authorUserId) !== authorUserId) {
            return false;
        }
        if (status && (0, shared_1.sanitizeString)(item.data.status) !== status) {
            return false;
        }
        return matchesSearch([
            item.id,
            item.data.review,
            item.data.authorSnapshot?.displayName,
            item.data.providerSnapshot?.displayName,
            item.data.serviceSnapshot?.serviceName,
        ], search);
    }), (item) => item.data.updatedAt || item.data.createdAt);
    return {
        total: filtered.length,
        items: filtered.slice(0, limit).map((item) => buildReviewListItem(item.id, item.data)),
    };
}
async function listAdminAuditEventsService({ db }, role, rawPayload) {
    assertAdminReadRole(role);
    const resourceType = (0, shared_1.sanitizeString)(rawPayload.resourceType);
    const resourceId = (0, shared_1.sanitizeString)(rawPayload.resourceId);
    const actorUid = (0, shared_1.sanitizeString)(rawPayload.actorUid);
    const action = (0, shared_1.sanitizeString)(rawPayload.action);
    const result = (0, shared_1.sanitizeString)(rawPayload.result);
    const search = (0, shared_1.sanitizeString)(rawPayload.search).toLowerCase();
    const limit = normalizeLimit(rawPayload.limit);
    const auditEvents = await fetchCollectionDocs(db, 'auditEvents');
    const filtered = sortByTimestampDesc(auditEvents.filter((item) => {
        if (resourceType && (0, shared_1.sanitizeString)(item.data.resourceType) !== resourceType) {
            return false;
        }
        if (resourceId && (0, shared_1.sanitizeString)(item.data.resourceId) !== resourceId) {
            return false;
        }
        if (actorUid && (0, shared_1.sanitizeString)(item.data.actorUid) !== actorUid) {
            return false;
        }
        if (action && (0, shared_1.sanitizeString)(item.data.action) !== action) {
            return false;
        }
        if (result && (0, shared_1.sanitizeString)(item.data.result) !== result) {
            return false;
        }
        return matchesSearch([
            item.id,
            item.data.action,
            item.data.actorUid,
            item.data.resourceType,
            item.data.resourceId,
            item.data.result,
            item.data.errorCode,
        ], search);
    }), (item) => item.data.createdAt);
    return {
        total: filtered.length,
        items: filtered.slice(0, limit).map((item) => buildAuditEventItem(item.id, item.data)),
    };
}
