import { Auth } from 'firebase-admin/auth';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { writeAuditEvent } from './audit';
import { badRequest, failedPrecondition } from './errors';
import { buildClaims } from './claims';
import { writeStructuredLog } from './logging';
import { PROVIDER_STATUSES, sanitizeString } from './shared';
import {
  buildCoverageAreaText,
  hasCompleteCoverageArea,
  normalizeCoverageArea,
} from './providerCoverage';
import {
  fetchProviderAvailabilityProfile,
  formatAvailabilitySummary,
  hasConfiguredAvailability,
} from './providerAvailability';

type ProviderOnboardingPayload = {
  businessName?: string,
  displayName?: string,
  specialization?: string,
  baseRateAmount?: number,
  coverageArea?: {
    countryCode?: string,
    countryName?: string,
    countyCode?: string,
    countyName?: string,
    cityCode?: string,
    cityName?: string,
    placeId?: string,
    locationLabel?: string,
    formattedAddress?: string,
    centerLat?: number | string,
    centerLng?: number | string,
  },
  shortBio?: string,
};

type SubmitDeps = {
  db: Firestore,
  auth: Auth,
};

function normalizeNumber(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null;
}

function validatePayload(payload: ProviderOnboardingPayload) {
  const businessName = sanitizeString(payload.businessName);
  const displayName = sanitizeString(payload.displayName);
  const specialization = sanitizeString(payload.specialization);
  const coverageArea = normalizeCoverageArea(payload.coverageArea);
  const coverageAreaText = buildCoverageAreaText(coverageArea);
  const shortBio = sanitizeString(payload.shortBio);
  const baseRateAmount = normalizeNumber(payload.baseRateAmount);
  const hasLegacyRadiusField = Boolean(
    payload.coverageArea
    && typeof payload.coverageArea === 'object'
    && 'radiusKm' in payload.coverageArea,
  );

  if (hasLegacyRadiusField) {
    throw badRequest('Provider onboarding payload still uses the deprecated radius-based coverage model.');
  }

  if (!businessName || !displayName || !specialization || !hasCompleteCoverageArea(coverageArea) || !shortBio || !baseRateAmount) {
    throw badRequest('Provider onboarding payload is incomplete.');
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

export async function submitProviderOnboardingService(
  { db, auth }: SubmitDeps,
  uid: string,
  rawPayload: ProviderOnboardingPayload,
) {
  const payload = validatePayload(rawPayload);
  const providerRef = db.collection('providers').doc(uid);
  const providerSnap = await providerRef.get();

  if (!providerSnap.exists) {
    throw failedPrecondition('Provider profile not found.');
  }

  const providerData = providerSnap.data() || {};
  const currentStatus = providerData.status || PROVIDER_STATUSES.PRE_REGISTERED;

  if (currentStatus === PROVIDER_STATUSES.SUSPENDED) {
    throw failedPrecondition('Suspended providers cannot submit onboarding.');
  }

  if (currentStatus === PROVIDER_STATUSES.APPROVED) {
    throw failedPrecondition('Approved providers cannot resubmit onboarding from this flow.');
  }

  if (currentStatus === PROVIDER_STATUSES.PENDING_REVIEW) {
    throw failedPrecondition('Provider onboarding is already pending review.');
  }

  const hasIdentityDocument = providerData.documents?.identity?.status === 'uploaded'
    && sanitizeString(providerData.documents?.identity?.storagePath);
  const hasProfessionalDocument = providerData.documents?.professional?.status === 'uploaded'
    && sanitizeString(providerData.documents?.professional?.storagePath);

  if (!hasIdentityDocument || !hasProfessionalDocument) {
    throw failedPrecondition('Both finalized provider documents are required before submission.');
  }

  const availabilityProfile = await fetchProviderAvailabilityProfile({ db }, uid);

  if (!hasConfiguredAvailability(availabilityProfile.weekSchedule)) {
    throw failedPrecondition('Configure provider availability before submission.');
  }

  await providerRef.set({
    status: PROVIDER_STATUSES.PENDING_REVIEW,
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
      availabilitySummary: formatAvailabilitySummary(availabilityProfile.weekSchedule),
    },
    reviewState: {
      submittedAt: FieldValue.serverTimestamp(),
      lastReviewedAt: providerData.reviewState?.lastReviewedAt || null,
    },
    adminReview: {
      reviewedBy: null,
      action: null,
      reason: null,
      reviewedAt: null,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  }, { merge: true });

  await auth.setCustomUserClaims(uid, buildClaims({
    role: 'provider',
    providerStatus: PROVIDER_STATUSES.PENDING_REVIEW,
    accountStatus: providerData.accountStatus || 'active',
  }));

  writeStructuredLog('info', {
    action: 'submit_provider_onboarding',
    uid,
    role: 'provider',
    resourceType: 'provider',
    resourceId: uid,
    statusFrom: currentStatus,
    statusTo: PROVIDER_STATUSES.PENDING_REVIEW,
    outcome: 'success',
  }, 'Provider onboarding was submitted for review.');

  await writeAuditEvent({ db }, {
    action: 'provider.submit_for_review',
    actorUid: uid,
    actorRole: 'provider',
    resourceType: 'provider',
    resourceId: uid,
    statusFrom: currentStatus,
    statusTo: PROVIDER_STATUSES.PENDING_REVIEW,
    result: 'success',
    context: {
      hasConfiguredAvailability: true,
      hasIdentityDocument: true,
      hasProfessionalDocument: true,
    },
  });

  return {
    status: PROVIDER_STATUSES.PENDING_REVIEW,
  };
}
