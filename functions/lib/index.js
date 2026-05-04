"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReviewWrite = exports.onProviderServiceWrite = exports.onProviderAvailabilityWrite = exports.onProviderProfileWrite = exports.listAdminAuditEvents = exports.listAdminReviews = exports.getAdminBookingCase = exports.listAdminBookings = exports.getAdminProviderCase = exports.listAdminProviders = exports.getAdminDashboardSummary = exports.adminReviewProvider = exports.finalizeProviderDocumentUpload = exports.finalizeProviderAvatarUpload = exports.finalizeUserAvatarUpload = exports.saveBookingReview = exports.markConversationRead = exports.sendChatMessage = exports.ensureBookingConversation = exports.ensureDirectConversation = exports.stripeWebhook = exports.completeDemoPayment = exports.createStripePaymentSheetSession = exports.updateBookingPaymentSummary = exports.completeBooking = exports.cancelBooking = exports.proposeBookingReschedule = exports.rejectBooking = exports.confirmBooking = exports.createBookingRequest = exports.resolveCoveragePlaceSelection = exports.searchCoveragePlaceSuggestions = exports.saveProviderAvailability = exports.submitProviderOnboarding = exports.bootstrapSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const config_1 = require("./config");
const firebase_1 = require("./firebase");
const errors_1 = require("./errors");
const bootstrapSession_1 = require("./bootstrapSession");
const providerOnboarding_1 = require("./providerOnboarding");
const storageFinalize_1 = require("./storageFinalize");
const adminReviewProvider_1 = require("./adminReviewProvider");
const providerDirectory_1 = require("./providerDirectory");
const logging_1 = require("./logging");
const providerAvailability_1 = require("./providerAvailability");
const bookings_1 = require("./bookings");
const chat_1 = require("./chat");
const reviews_1 = require("./reviews");
const adminPanel_1 = require("./adminPanel");
const providerCoverageSearch_1 = require("./providerCoverageSearch");
const shared_1 = require("./shared");
const payments_1 = require("./payments");
async function resolveAdminPanelRole(uid, options = {}) {
    const adminSnap = await firebase_1.adminDb.collection('admini').doc(uid).get();
    const data = adminSnap.data() || {};
    const role = (0, shared_1.sanitizeString)(data.role);
    const isAdmin = data.isAdmin === true || role === 'admin';
    const isSupport = data.isSupport === true || role === 'support';
    if (options.requireAdmin) {
        if (!isAdmin) {
            throw (0, errors_1.permissionDenied)('Only admin users can access this admin action.');
        }
        return 'admin';
    }
    if (isAdmin) {
        return 'admin';
    }
    if (isSupport) {
        return 'support';
    }
    throw (0, errors_1.permissionDenied)('Only admin or support users can access admin panel queries.');
}
function isSameDocumentIgnoringTimestamps(before, after) {
    if (!before || !after) {
        return false;
    }
    const stripped = (data) => {
        const clone = { ...data };
        delete clone.updatedAt;
        delete clone.createdAt;
        delete clone.serverUpdatedAt;
        return clone;
    };
    try {
        return JSON.stringify(stripped(before)) === JSON.stringify(stripped(after));
    }
    catch {
        return false;
    }
}
exports.bootstrapSession = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const authUser = await firebase_1.adminAuth.getUser(request.auth.uid);
    return (0, bootstrapSession_1.bootstrapSessionService)({ db: firebase_1.adminDb, auth: firebase_1.adminAuth }, {
        uid: request.auth.uid,
        authUser,
        payload: request.data,
    });
});
exports.submitProviderOnboarding = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, providerOnboarding_1.submitProviderOnboardingService)({ db: firebase_1.adminDb, auth: firebase_1.adminAuth }, request.auth.uid, request.data || {});
});
exports.saveProviderAvailability = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, providerAvailability_1.saveProviderAvailabilityProfileService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.searchCoveragePlaceSuggestions = (0, https_1.onCall)({
    region: config_1.FUNCTION_REGION,
    invoker: 'public',
    secrets: [config_1.GOOGLE_MAPS_API_KEY],
}, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, providerCoverageSearch_1.searchCoveragePlaceSuggestionsService)({ mapsApiKey: config_1.GOOGLE_MAPS_API_KEY.value() }, request.data || {});
});
exports.resolveCoveragePlaceSelection = (0, https_1.onCall)({
    region: config_1.FUNCTION_REGION,
    invoker: 'public',
    secrets: [config_1.GOOGLE_MAPS_API_KEY],
}, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, providerCoverageSearch_1.resolveCoveragePlaceSelectionService)({ mapsApiKey: config_1.GOOGLE_MAPS_API_KEY.value() }, request.data || {});
});
exports.createBookingRequest = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, bookings_1.createBookingRequestService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.confirmBooking = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, bookings_1.confirmBookingService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.rejectBooking = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, bookings_1.rejectBookingService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.proposeBookingReschedule = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, bookings_1.proposeBookingRescheduleService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.cancelBooking = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, bookings_1.cancelBookingService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.completeBooking = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, bookings_1.completeBookingService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.updateBookingPaymentSummary = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, bookings_1.updateBookingPaymentSummaryService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.createStripePaymentSheetSession = (0, https_1.onCall)({
    region: config_1.FUNCTION_REGION,
    invoker: 'public',
    secrets: [config_1.STRIPE_SECRET_KEY],
}, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, payments_1.createStripePaymentSheetSessionService)({ db: firebase_1.adminDb, stripe: (0, payments_1.createStripeClient)(config_1.STRIPE_SECRET_KEY.value()) }, request.auth.uid, request.data || {});
});
exports.completeDemoPayment = (0, https_1.onCall)({
    region: config_1.FUNCTION_REGION,
    invoker: 'public',
}, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, payments_1.completeDemoPaymentService)({
        db: firebase_1.adminDb,
        isDemoPaymentEnabled: config_1.PAYMENT_DEMO_MODE.value().toLowerCase() === 'true',
    }, request.auth.uid, request.data || {});
});
exports.stripeWebhook = (0, https_1.onRequest)({
    region: config_1.FUNCTION_REGION,
    invoker: 'public',
    secrets: [config_1.STRIPE_SECRET_KEY, config_1.STRIPE_WEBHOOK_SECRET],
}, async (request, response) => {
    if (request.method !== 'POST') {
        response.status(405).send('Method not allowed.');
        return;
    }
    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string') {
        response.status(400).send('Missing Stripe signature.');
        return;
    }
    const stripe = (0, payments_1.createStripeClient)(config_1.STRIPE_SECRET_KEY.value());
    try {
        const event = stripe.webhooks.constructEvent(request.rawBody, signature, config_1.STRIPE_WEBHOOK_SECRET.value());
        const result = await (0, payments_1.handleStripeWebhookEventService)({ db: firebase_1.adminDb, stripe }, event);
        response.status(200).json({ received: true, ...result });
    }
    catch (error) {
        (0, logging_1.writeStructuredLog)('error', {
            action: 'stripe.webhook',
            resourceType: 'payment',
            outcome: 'failure',
            reasonCode: error instanceof Error ? error.name : 'stripe_webhook_failed',
        }, 'Stripe webhook processing failed.');
        response.status(400).send(error instanceof Error ? error.message : 'Stripe webhook failed.');
    }
});
exports.ensureDirectConversation = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, chat_1.ensureDirectConversationService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.ensureBookingConversation = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, chat_1.ensureBookingConversationService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.sendChatMessage = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, chat_1.sendChatMessageService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.markConversationRead = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, chat_1.markConversationReadService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.saveBookingReview = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, reviews_1.saveBookingReviewService)({ db: firebase_1.adminDb }, request.auth.uid, request.data || {});
});
exports.finalizeUserAvatarUpload = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, storageFinalize_1.finalizeUserAvatarUploadService)({ db: firebase_1.adminDb, storage: firebase_1.adminStorage }, request.auth.uid, request.data || {});
});
exports.finalizeProviderAvatarUpload = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, storageFinalize_1.finalizeProviderAvatarUploadService)({ db: firebase_1.adminDb, storage: firebase_1.adminStorage }, request.auth.uid, request.data || {});
});
exports.finalizeProviderDocumentUpload = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, storageFinalize_1.finalizeProviderDocumentUploadService)({ db: firebase_1.adminDb, storage: firebase_1.adminStorage }, request.auth.uid, request.data || {});
});
exports.adminReviewProvider = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid, { requireAdmin: true });
    return (0, adminReviewProvider_1.adminReviewProviderService)({ db: firebase_1.adminDb, auth: firebase_1.adminAuth }, request.auth.uid, adminRole, request.data || {});
});
exports.getAdminDashboardSummary = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid);
    return (0, adminPanel_1.getAdminDashboardSummaryService)({ db: firebase_1.adminDb }, adminRole);
});
exports.listAdminProviders = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid);
    return (0, adminPanel_1.listAdminProvidersService)({ db: firebase_1.adminDb }, adminRole, request.data || {});
});
exports.getAdminProviderCase = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid);
    return (0, adminPanel_1.getAdminProviderCaseService)({ db: firebase_1.adminDb }, adminRole, request.data || {});
});
exports.listAdminBookings = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid);
    return (0, adminPanel_1.listAdminBookingsService)({ db: firebase_1.adminDb }, adminRole, request.data || {});
});
exports.getAdminBookingCase = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid);
    return (0, adminPanel_1.getAdminBookingCaseService)({ db: firebase_1.adminDb }, adminRole, request.data || {});
});
exports.listAdminReviews = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid);
    return (0, adminPanel_1.listAdminReviewsService)({ db: firebase_1.adminDb }, adminRole, request.data || {});
});
exports.listAdminAuditEvents = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    const adminRole = await resolveAdminPanelRole(request.auth.uid);
    return (0, adminPanel_1.listAdminAuditEventsService)({ db: firebase_1.adminDb }, adminRole, request.data || {});
});
exports.onProviderProfileWrite = (0, firestore_1.onDocumentWritten)({ region: config_1.FUNCTION_REGION, document: 'providers/{uid}' }, async (event) => {
    const providerId = event.params.uid;
    const after = event.data?.after;
    if (!after?.exists) {
        await firebase_1.adminDb.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
        (0, logging_1.writeStructuredLog)('info', {
            action: 'sync_provider_directory_trigger',
            uid: providerId,
            role: 'provider',
            resourceType: 'providerDirectory',
            resourceId: providerId,
            outcome: 'deleted_missing_provider',
        }, 'Provider directory snapshot was removed after provider deletion.');
        return;
    }
    await (0, providerDirectory_1.syncProviderDirectoryFromProviderRef)({ db: firebase_1.adminDb }, providerId);
});
exports.onProviderAvailabilityWrite = (0, firestore_1.onDocumentWritten)({ region: config_1.FUNCTION_REGION, document: 'providers/{uid}/availability/profile' }, async (event) => {
    const providerId = event.params.uid;
    const beforeData = event.data?.before?.exists ? event.data.before.data() || null : null;
    const afterData = event.data?.after?.exists ? event.data.after.data() || null : null;
    if (isSameDocumentIgnoringTimestamps(beforeData, afterData)) {
        return;
    }
    const providerSnap = await firebase_1.adminDb.collection('providers').doc(providerId).get();
    if (!providerSnap.exists) {
        await firebase_1.adminDb.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
        (0, logging_1.writeStructuredLog)('info', {
            action: 'sync_provider_directory_from_availability_trigger',
            uid: providerId,
            role: 'provider',
            resourceType: 'providerDirectory',
            resourceId: providerId,
            outcome: 'deleted_missing_provider',
        }, 'Provider directory snapshot was removed after missing provider during availability sync.');
        return;
    }
    await (0, providerDirectory_1.syncProviderDirectorySnapshot)({ db: firebase_1.adminDb }, providerId, providerSnap.data() || {});
});
exports.onProviderServiceWrite = (0, firestore_1.onDocumentWritten)({ region: config_1.FUNCTION_REGION, document: 'providers/{uid}/services/{serviceId}' }, async (event) => {
    const providerId = event.params.uid;
    const beforeData = event.data?.before?.exists ? event.data.before.data() || null : null;
    const afterData = event.data?.after?.exists ? event.data.after.data() || null : null;
    if (isSameDocumentIgnoringTimestamps(beforeData, afterData)) {
        return;
    }
    const providerSnap = await firebase_1.adminDb.collection('providers').doc(providerId).get();
    if (!providerSnap.exists) {
        await firebase_1.adminDb.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
        (0, logging_1.writeStructuredLog)('info', {
            action: 'sync_provider_directory_from_service_trigger',
            uid: providerId,
            role: 'provider',
            resourceType: 'providerDirectory',
            resourceId: providerId,
            outcome: 'deleted_missing_provider',
        }, 'Provider directory snapshot was removed after missing provider during service sync.');
        return;
    }
    await (0, providerDirectory_1.syncProviderDirectorySnapshot)({ db: firebase_1.adminDb }, providerId, providerSnap.data() || {});
});
exports.onReviewWrite = (0, firestore_1.onDocumentWritten)({ region: config_1.FUNCTION_REGION, document: 'reviews/{bookingId}' }, async (event) => {
    const beforeData = event.data?.before?.exists ? event.data.before.data() || {} : null;
    const afterData = event.data?.after?.exists ? event.data.after.data() || {} : null;
    const providerId = (typeof afterData?.providerId === 'string' && afterData.providerId)
        ? afterData.providerId
        : (typeof beforeData?.providerId === 'string' ? beforeData.providerId : '');
    if (!providerId) {
        return;
    }
    const beforePublished = Boolean(beforeData && beforeData.status === 'published');
    const afterPublished = Boolean(afterData && afterData.status === 'published');
    const beforeRating = beforePublished ? Number(beforeData?.rating) || 0 : 0;
    const afterRating = afterPublished ? Number(afterData?.rating) || 0 : 0;
    const ratingDelta = afterRating - beforeRating;
    const countDelta = (afterPublished ? 1 : 0) - (beforePublished ? 1 : 0);
    if (ratingDelta === 0 && countDelta === 0) {
        return;
    }
    const directoryRef = firebase_1.adminDb.collection('providerDirectory').doc(providerId);
    let needsBootstrap = false;
    await firebase_1.adminDb.runTransaction(async (transaction) => {
        const snap = await transaction.get(directoryRef);
        if (!snap.exists) {
            needsBootstrap = true;
            return;
        }
        const existing = snap.data() || {};
        const nextSum = Math.max(0, (Number(existing.ratingSum) || 0) + ratingDelta);
        const nextCount = Math.max(0, (Number(existing.reviewCount) || 0) + countDelta);
        const nextAvg = nextCount > 0 ? Number((nextSum / nextCount).toFixed(2)) : 0;
        transaction.set(directoryRef, {
            ratingSum: Number(nextSum.toFixed(2)),
            reviewCount: nextCount,
            ratingAverage: nextAvg,
        }, { merge: true });
    });
    if (needsBootstrap) {
        await (0, providerDirectory_1.syncProviderDirectoryFromProviderRef)({ db: firebase_1.adminDb }, providerId);
    }
    (0, logging_1.writeStructuredLog)('info', {
        action: 'sync_provider_review_aggregate_incremental',
        uid: providerId,
        role: 'provider',
        resourceType: 'providerDirectory',
        resourceId: providerId,
        outcome: needsBootstrap ? 'bootstrap' : 'success',
    }, 'Provider review aggregate updated incrementally.');
});
