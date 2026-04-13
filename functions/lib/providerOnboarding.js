"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitProviderOnboardingService = submitProviderOnboardingService;
const firestore_1 = require("firebase-admin/firestore");
const audit_1 = require("./audit");
const errors_1 = require("./errors");
const claims_1 = require("./claims");
const logging_1 = require("./logging");
const shared_1 = require("./shared");
const providerCoverage_1 = require("./providerCoverage");
const providerAvailability_1 = require("./providerAvailability");
function normalizeNumber(value) {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null;
}
function validatePayload(payload) {
    const businessName = (0, shared_1.sanitizeString)(payload.businessName);
    const displayName = (0, shared_1.sanitizeString)(payload.displayName);
    const specialization = (0, shared_1.sanitizeString)(payload.specialization);
    const coverageArea = (0, providerCoverage_1.normalizeCoverageArea)(payload.coverageArea);
    const coverageAreaText = (0, providerCoverage_1.buildCoverageAreaText)(coverageArea);
    const shortBio = (0, shared_1.sanitizeString)(payload.shortBio);
    const baseRateAmount = normalizeNumber(payload.baseRateAmount);
    const hasLegacyRadiusField = Boolean(payload.coverageArea
        && typeof payload.coverageArea === 'object'
        && 'radiusKm' in payload.coverageArea);
    if (hasLegacyRadiusField) {
        throw (0, errors_1.badRequest)('Provider onboarding payload still uses the deprecated radius-based coverage model.');
    }
    if (!businessName || !displayName || !specialization || !(0, providerCoverage_1.hasCompleteCoverageArea)(coverageArea) || !shortBio || !baseRateAmount) {
        throw (0, errors_1.badRequest)('Provider onboarding payload is incomplete.');
    }
    return {
        businessName,
        displayName,
        specialization,
        coverageArea,
        coverageAreaText,
        shortBio,
        baseRateAmount,
    };
}
async function submitProviderOnboardingService({ db, auth }, uid, rawPayload) {
    const payload = validatePayload(rawPayload);
    const providerRef = db.collection('providers').doc(uid);
    const providerSnap = await providerRef.get();
    if (!providerSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Provider profile not found.');
    }
    const providerData = providerSnap.data() || {};
    const currentStatus = providerData.status || shared_1.PROVIDER_STATUSES.PRE_REGISTERED;
    if (currentStatus === shared_1.PROVIDER_STATUSES.SUSPENDED) {
        throw (0, errors_1.failedPrecondition)('Suspended providers cannot submit onboarding.');
    }
    if (currentStatus === shared_1.PROVIDER_STATUSES.APPROVED) {
        throw (0, errors_1.failedPrecondition)('Approved providers cannot resubmit onboarding from this flow.');
    }
    if (currentStatus === shared_1.PROVIDER_STATUSES.PENDING_REVIEW) {
        throw (0, errors_1.failedPrecondition)('Provider onboarding is already pending review.');
    }
    const hasIdentityDocument = providerData.documents?.identity?.status === 'uploaded'
        && (0, shared_1.sanitizeString)(providerData.documents?.identity?.storagePath);
    const hasProfessionalDocument = providerData.documents?.professional?.status === 'uploaded'
        && (0, shared_1.sanitizeString)(providerData.documents?.professional?.storagePath);
    if (!hasIdentityDocument || !hasProfessionalDocument) {
        throw (0, errors_1.failedPrecondition)('Both finalized provider documents are required before submission.');
    }
    const availabilityProfile = await (0, providerAvailability_1.fetchProviderAvailabilityProfile)({ db }, uid);
    if (!(0, providerAvailability_1.hasConfiguredAvailability)(availabilityProfile.weekSchedule)) {
        throw (0, errors_1.failedPrecondition)('Configure provider availability before submission.');
    }
    await providerRef.set({
        status: shared_1.PROVIDER_STATUSES.PENDING_REVIEW,
        professionalProfile: {
            ...providerData.professionalProfile,
            businessName: payload.businessName,
            displayName: payload.displayName,
            specialization: payload.specialization,
            baseRateAmount: payload.baseRateAmount,
            baseRateCurrency: providerData.professionalProfile?.baseRateCurrency || 'RON',
            coverageArea: payload.coverageArea,
            coverageAreaText: payload.coverageAreaText,
            shortBio: payload.shortBio,
            availabilitySummary: (0, providerAvailability_1.formatAvailabilitySummary)(availabilityProfile.weekSchedule),
        },
        reviewState: {
            submittedAt: firestore_1.FieldValue.serverTimestamp(),
            lastReviewedAt: providerData.reviewState?.lastReviewedAt || null,
        },
        adminReview: {
            reviewedBy: null,
            action: null,
            reason: null,
            reviewedAt: null,
        },
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: uid,
    }, { merge: true });
    await auth.setCustomUserClaims(uid, (0, claims_1.buildClaims)({
        role: 'provider',
        providerStatus: shared_1.PROVIDER_STATUSES.PENDING_REVIEW,
        accountStatus: providerData.accountStatus || 'active',
    }));
    (0, logging_1.writeStructuredLog)('info', {
        action: 'submit_provider_onboarding',
        uid,
        role: 'provider',
        resourceType: 'provider',
        resourceId: uid,
        statusFrom: currentStatus,
        statusTo: shared_1.PROVIDER_STATUSES.PENDING_REVIEW,
        outcome: 'success',
    }, 'Provider onboarding was submitted for review.');
    await (0, audit_1.writeAuditEvent)({ db }, {
        action: 'provider.submit_for_review',
        actorUid: uid,
        actorRole: 'provider',
        resourceType: 'provider',
        resourceId: uid,
        statusFrom: currentStatus,
        statusTo: shared_1.PROVIDER_STATUSES.PENDING_REVIEW,
        result: 'success',
        context: {
            hasConfiguredAvailability: true,
            hasIdentityDocument: true,
            hasProfessionalDocument: true,
        },
    });
    return {
        status: shared_1.PROVIDER_STATUSES.PENDING_REVIEW,
    };
}
