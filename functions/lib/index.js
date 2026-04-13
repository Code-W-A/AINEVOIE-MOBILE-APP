"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReviewWrite = exports.onProviderServiceWrite = exports.onProviderAvailabilityWrite = exports.onProviderProfileWrite = exports.listAdminAuditEvents = exports.listAdminReviews = exports.getAdminBookingCase = exports.listAdminBookings = exports.getAdminProviderCase = exports.listAdminProviders = exports.getAdminDashboardSummary = exports.adminReviewProvider = exports.finalizeProviderDocumentUpload = exports.finalizeProviderAvatarUpload = exports.finalizeUserAvatarUpload = exports.saveBookingReview = exports.updateBookingPaymentSummary = exports.completeBooking = exports.cancelBooking = exports.proposeBookingReschedule = exports.rejectBooking = exports.confirmBooking = exports.createBookingRequest = exports.resolveCoveragePlaceSelection = exports.searchCoveragePlaceSuggestions = exports.saveProviderAvailability = exports.submitProviderOnboarding = exports.bootstrapSession = void 0;
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
const reviews_1 = require("./reviews");
const adminPanel_1 = require("./adminPanel");
const providerCoverageSearch_1 = require("./providerCoverageSearch");
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
    return (0, adminReviewProvider_1.adminReviewProviderService)({ db: firebase_1.adminDb, auth: firebase_1.adminAuth }, request.auth.uid, typeof request.auth.token.role === 'string' ? request.auth.token.role : null, request.data || {});
});
exports.getAdminDashboardSummary = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, adminPanel_1.getAdminDashboardSummaryService)({ db: firebase_1.adminDb }, typeof request.auth.token.role === 'string' ? request.auth.token.role : null);
});
exports.listAdminProviders = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, adminPanel_1.listAdminProvidersService)({ db: firebase_1.adminDb }, typeof request.auth.token.role === 'string' ? request.auth.token.role : null, request.data || {});
});
exports.getAdminProviderCase = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, adminPanel_1.getAdminProviderCaseService)({ db: firebase_1.adminDb }, typeof request.auth.token.role === 'string' ? request.auth.token.role : null, request.data || {});
});
exports.listAdminBookings = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, adminPanel_1.listAdminBookingsService)({ db: firebase_1.adminDb }, typeof request.auth.token.role === 'string' ? request.auth.token.role : null, request.data || {});
});
exports.getAdminBookingCase = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, adminPanel_1.getAdminBookingCaseService)({ db: firebase_1.adminDb }, typeof request.auth.token.role === 'string' ? request.auth.token.role : null, request.data || {});
});
exports.listAdminReviews = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, adminPanel_1.listAdminReviewsService)({ db: firebase_1.adminDb }, typeof request.auth.token.role === 'string' ? request.auth.token.role : null, request.data || {});
});
exports.listAdminAuditEvents = (0, https_1.onCall)({ region: config_1.FUNCTION_REGION, invoker: 'public' }, async (request) => {
    if (!request.auth?.uid) {
        throw (0, errors_1.permissionDenied)('Authentication is required.');
    }
    return (0, adminPanel_1.listAdminAuditEventsService)({ db: firebase_1.adminDb }, typeof request.auth.token.role === 'string' ? request.auth.token.role : null, request.data || {});
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
    const after = event.data?.after;
    if (!after?.exists) {
        return;
    }
    const reviewData = after.data() || {};
    const providerId = typeof reviewData.providerId === 'string' ? reviewData.providerId : '';
    if (!providerId) {
        return;
    }
    await (0, providerDirectory_1.syncProviderDirectoryFromProviderRef)({ db: firebase_1.adminDb }, providerId);
});
