import { Auth } from 'firebase-admin/auth';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { writeAuditEvent } from './audit';
import { badRequest, failedPrecondition, permissionDenied } from './errors';
import { buildClaims } from './claims';
import { syncProviderDirectorySnapshot } from './providerDirectory';
import {
  PROVIDER_REVIEW_ACTIONS,
  PROVIDER_STATUSES,
  isProviderReviewAction,
  sanitizeString,
} from './shared';
import { writeStructuredLog } from './logging';

type AdminReviewProviderPayload = {
  providerId?: string,
  action?: string,
  reason?: string,
};

type AdminReviewDeps = {
  db: Firestore,
  auth: Auth,
};

function resolveNextProviderStatus(currentStatus: string, action: string) {
  const isApprovableStatus = [
    PROVIDER_STATUSES.PRE_REGISTERED,
    PROVIDER_STATUSES.PENDING_REVIEW,
    PROVIDER_STATUSES.REJECTED,
    'new',
    'in_review',
  ].includes(currentStatus);
  const isRejectableStatus = currentStatus === PROVIDER_STATUSES.PENDING_REVIEW || currentStatus === 'in_review';

  if (action === PROVIDER_REVIEW_ACTIONS.APPROVE && isApprovableStatus) {
    return PROVIDER_STATUSES.APPROVED;
  }

  if (action === PROVIDER_REVIEW_ACTIONS.REJECT && isRejectableStatus) {
    return PROVIDER_STATUSES.REJECTED;
  }

  if (action === PROVIDER_REVIEW_ACTIONS.SUSPEND && currentStatus === PROVIDER_STATUSES.APPROVED) {
    return PROVIDER_STATUSES.SUSPENDED;
  }

  if (action === PROVIDER_REVIEW_ACTIONS.REINSTATE && currentStatus === PROVIDER_STATUSES.SUSPENDED) {
    return PROVIDER_STATUSES.APPROVED;
  }

  return null;
}

export async function adminReviewProviderService(
  { db, auth }: AdminReviewDeps,
  reviewerUid: string,
  reviewerRole: string | null | undefined,
  rawPayload: AdminReviewProviderPayload,
) {
  if (reviewerRole !== 'admin') {
    throw permissionDenied('Only admin users can review providers.');
  }

  const providerId = sanitizeString(rawPayload.providerId);
  const action = isProviderReviewAction(rawPayload.action) ? rawPayload.action : null;
  const reason = sanitizeString(rawPayload.reason) || null;

  if (!providerId || !action) {
    throw badRequest('A valid provider review payload is required.');
  }

  if ((action === PROVIDER_REVIEW_ACTIONS.REJECT || action === PROVIDER_REVIEW_ACTIONS.SUSPEND) && !reason) {
    throw badRequest('A reason is required for reject and suspend actions.');
  }

  const providerRef = db.collection('providers').doc(providerId);
  const providerSnap = await providerRef.get();

  if (!providerSnap.exists) {
    throw failedPrecondition('Provider profile not found.');
  }

  const providerData = providerSnap.data() || {};
  const currentStatus = providerData.status || PROVIDER_STATUSES.PRE_REGISTERED;
  const nextStatus = resolveNextProviderStatus(currentStatus, action);

  if (!nextStatus) {
    throw failedPrecondition('Invalid provider status transition.');
  }

  await providerRef.set({
    status: nextStatus,
    adminReview: {
      reviewedBy: reviewerUid,
      action,
      reason,
      reviewedAt: FieldValue.serverTimestamp(),
    },
    reviewState: {
      ...providerData.reviewState,
      lastReviewedAt: FieldValue.serverTimestamp(),
    },
    suspension: nextStatus === PROVIDER_STATUSES.SUSPENDED
      ? {
          reason,
          suspendedBy: reviewerUid,
          suspendedAt: FieldValue.serverTimestamp(),
        }
      : null,
    lastPublishedAt: nextStatus === PROVIDER_STATUSES.APPROVED
      ? FieldValue.serverTimestamp()
      : null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: reviewerUid,
  }, { merge: true });

  const refreshedSnap = await providerRef.get();
  const refreshedData = refreshedSnap.data() || {};
  await syncProviderDirectorySnapshot({ db }, providerId, refreshedData);

  await auth.setCustomUserClaims(providerId, buildClaims({
    role: 'provider',
    providerStatus: nextStatus,
    accountStatus: refreshedData.accountStatus || 'active',
  }));

  writeStructuredLog('info', {
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

  await writeAuditEvent({ db }, {
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
