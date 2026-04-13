"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminReviewProviderService = adminReviewProviderService;
const firestore_1 = require("firebase-admin/firestore");
const audit_1 = require("./audit");
const errors_1 = require("./errors");
const claims_1 = require("./claims");
const providerDirectory_1 = require("./providerDirectory");
const shared_1 = require("./shared");
const logging_1 = require("./logging");
const providerCoverage_1 = require("./providerCoverage");
const providerAvailability_1 = require("./providerAvailability");
function hasUploadedDocuments(providerData) {
    return providerData.documents?.identity?.status === 'uploaded'
        && (0, shared_1.sanitizeString)(providerData.documents?.identity?.storagePath)
        && providerData.documents?.professional?.status === 'uploaded'
        && (0, shared_1.sanitizeString)(providerData.documents?.professional?.storagePath);
}
function hasCompleteProfessionalProfile(providerData) {
    const profile = providerData.professionalProfile || {};
    const baseRateAmount = Number(profile.baseRateAmount);
    return Boolean((0, shared_1.sanitizeString)(profile.businessName)
        && (0, shared_1.sanitizeString)(profile.displayName)
        && (0, shared_1.sanitizeString)(profile.specialization)
        && (0, providerCoverage_1.hasCompleteCoverageArea)(profile.coverageArea)
        && (0, shared_1.sanitizeString)(profile.shortBio)
        && Number.isFinite(baseRateAmount)
        && baseRateAmount > 0);
}
function resolveNextProviderStatus(currentStatus, action) {
    if (action === shared_1.PROVIDER_REVIEW_ACTIONS.APPROVE && currentStatus === shared_1.PROVIDER_STATUSES.PENDING_REVIEW) {
        return shared_1.PROVIDER_STATUSES.APPROVED;
    }
    if (action === shared_1.PROVIDER_REVIEW_ACTIONS.REJECT && currentStatus === shared_1.PROVIDER_STATUSES.PENDING_REVIEW) {
        return shared_1.PROVIDER_STATUSES.REJECTED;
    }
    if (action === shared_1.PROVIDER_REVIEW_ACTIONS.SUSPEND && currentStatus === shared_1.PROVIDER_STATUSES.APPROVED) {
        return shared_1.PROVIDER_STATUSES.SUSPENDED;
    }
    if (action === shared_1.PROVIDER_REVIEW_ACTIONS.REINSTATE && currentStatus === shared_1.PROVIDER_STATUSES.SUSPENDED) {
        return shared_1.PROVIDER_STATUSES.APPROVED;
    }
    return null;
}
async function adminReviewProviderService({ db, auth }, reviewerUid, reviewerRole, rawPayload) {
    if (reviewerRole !== 'admin') {
        throw (0, errors_1.permissionDenied)('Only admin users can review providers.');
    }
    const providerId = (0, shared_1.sanitizeString)(rawPayload.providerId);
    const action = (0, shared_1.isProviderReviewAction)(rawPayload.action) ? rawPayload.action : null;
    const reason = (0, shared_1.sanitizeString)(rawPayload.reason) || null;
    if (!providerId || !action) {
        throw (0, errors_1.badRequest)('A valid provider review payload is required.');
    }
    if ((action === shared_1.PROVIDER_REVIEW_ACTIONS.REJECT || action === shared_1.PROVIDER_REVIEW_ACTIONS.SUSPEND) && !reason) {
        throw (0, errors_1.badRequest)('A reason is required for reject and suspend actions.');
    }
    const providerRef = db.collection('providers').doc(providerId);
    const providerSnap = await providerRef.get();
    if (!providerSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Provider profile not found.');
    }
    const providerData = providerSnap.data() || {};
    const currentStatus = providerData.status || shared_1.PROVIDER_STATUSES.PRE_REGISTERED;
    const nextStatus = resolveNextProviderStatus(currentStatus, action);
    if (!nextStatus) {
        throw (0, errors_1.failedPrecondition)('Invalid provider status transition.');
    }
    const availabilityProfile = await (0, providerAvailability_1.fetchProviderAvailabilityProfile)({ db }, providerId);
    if (nextStatus === shared_1.PROVIDER_STATUSES.APPROVED
        && (!hasCompleteProfessionalProfile(providerData)
            || !hasUploadedDocuments(providerData)
            || !(0, providerAvailability_1.hasConfiguredAvailability)(availabilityProfile.weekSchedule))) {
        throw (0, errors_1.failedPrecondition)('Provider profile is incomplete and cannot be approved.');
    }
    await providerRef.set({
        status: nextStatus,
        adminReview: {
            reviewedBy: reviewerUid,
            action,
            reason,
            reviewedAt: firestore_1.FieldValue.serverTimestamp(),
        },
        reviewState: {
            ...providerData.reviewState,
            lastReviewedAt: firestore_1.FieldValue.serverTimestamp(),
        },
        suspension: nextStatus === shared_1.PROVIDER_STATUSES.SUSPENDED
            ? {
                reason,
                suspendedBy: reviewerUid,
                suspendedAt: firestore_1.FieldValue.serverTimestamp(),
            }
            : null,
        lastPublishedAt: nextStatus === shared_1.PROVIDER_STATUSES.APPROVED
            ? firestore_1.FieldValue.serverTimestamp()
            : null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: reviewerUid,
    }, { merge: true });
    const refreshedSnap = await providerRef.get();
    const refreshedData = refreshedSnap.data() || {};
    await (0, providerDirectory_1.syncProviderDirectorySnapshot)({ db }, providerId, refreshedData);
    await auth.setCustomUserClaims(providerId, (0, claims_1.buildClaims)({
        role: 'provider',
        providerStatus: nextStatus,
        accountStatus: refreshedData.accountStatus || 'active',
    }));
    (0, logging_1.writeStructuredLog)('info', {
        action: 'admin_review_provider',
        uid: reviewerUid,
        role: reviewerRole,
        resourceType: 'provider',
        resourceId: providerId,
        statusFrom: currentStatus,
        statusTo: nextStatus,
        outcome: 'success',
        reasonCode: action,
    }, 'Provider review action completed successfully.');
    await (0, audit_1.writeAuditEvent)({ db }, {
        action: 'provider.review',
        actorUid: reviewerUid,
        actorRole: reviewerRole,
        resourceType: 'provider',
        resourceId: providerId,
        statusFrom: currentStatus,
        statusTo: nextStatus,
        result: 'success',
        context: {
            reviewAction: action,
            reasonProvided: Boolean(reason),
        },
    });
    return {
        providerId,
        status: nextStatus,
    };
}
