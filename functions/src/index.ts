import { onCall, onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FUNCTION_REGION, GOOGLE_MAPS_API_KEY, PAYMENT_DEMO_MODE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from './config';
import { adminAuth, adminDb, adminStorage } from './firebase';
import { permissionDenied } from './errors';
import { bootstrapSessionService } from './bootstrapSession';
import { submitProviderOnboardingService } from './providerOnboarding';
import {
  finalizeProviderAvatarUploadService,
  finalizeProviderDocumentUploadService,
  finalizeUserAvatarUploadService,
} from './storageFinalize';
import { adminReviewProviderService } from './adminReviewProvider';
import {
  syncProviderDirectoryFromProviderRef,
  syncProviderDirectorySnapshot,
} from './providerDirectory';
import { writeStructuredLog } from './logging';
import { saveProviderAvailabilityProfileService } from './providerAvailability';
import {
  cancelBookingService,
  completeBookingService,
  confirmBookingService,
  createBookingRequestService,
  proposeBookingRescheduleService,
  rejectBookingService,
  updateBookingPaymentSummaryService,
} from './bookings';
import {
  ensureBookingConversationService,
  ensureDirectConversationService,
  markConversationReadService,
  sendChatMessageService,
} from './chat';
import { saveBookingReviewService } from './reviews';
import {
  getAdminBookingCaseService,
  getAdminDashboardSummaryService,
  getAdminProviderCaseService,
  listAdminAuditEventsService,
  listAdminBookingsService,
  listAdminProvidersService,
  listAdminReviewsService,
} from './adminPanel';
import {
  resolveCoveragePlaceSelectionService,
  searchCoveragePlaceSuggestionsService,
} from './providerCoverageSearch';
import { sanitizeString } from './shared';
import {
  completeDemoPaymentService,
  createStripeClient,
  createStripePaymentSheetSessionService,
  handleStripeWebhookEventService,
} from './payments';

async function resolveAdminPanelRole(uid: string, options: { requireAdmin?: boolean } = {}) {
  const adminSnap = await adminDb.collection('admini').doc(uid).get();
  const data = adminSnap.data() || {};
  const role = sanitizeString(data.role);
  const isAdmin = data.isAdmin === true || role === 'admin';
  const isSupport = data.isSupport === true || role === 'support';

  if (options.requireAdmin) {
    if (!isAdmin) {
      throw permissionDenied('Only admin users can access this admin action.');
    }
    return 'admin';
  }

  if (isAdmin) {
    return 'admin';
  }

  if (isSupport) {
    return 'support';
  }

  throw permissionDenied('Only admin or support users can access admin panel queries.');
}

function isSameDocumentIgnoringTimestamps(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
): boolean {
  if (!before || !after) {
    return false;
  }
  const stripped = (data: Record<string, any>) => {
    const clone: Record<string, any> = { ...data };
    delete clone.updatedAt;
    delete clone.createdAt;
    delete clone.serverUpdatedAt;
    return clone;
  };
  try {
    return JSON.stringify(stripped(before)) === JSON.stringify(stripped(after));
  } catch {
    return false;
  }
}

export const bootstrapSession = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  const authUser = await adminAuth.getUser(request.auth.uid);
  return bootstrapSessionService(
    { db: adminDb, auth: adminAuth },
    {
      uid: request.auth.uid,
      authUser,
      payload: request.data,
    },
  );
});

export const submitProviderOnboarding = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return submitProviderOnboardingService(
    { db: adminDb, auth: adminAuth },
    request.auth.uid,
    request.data || {},
  );
});

export const saveProviderAvailability = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return saveProviderAvailabilityProfileService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const searchCoveragePlaceSuggestions = onCall({
  region: FUNCTION_REGION,
  invoker: 'public',
  secrets: [GOOGLE_MAPS_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return searchCoveragePlaceSuggestionsService(
    { mapsApiKey: GOOGLE_MAPS_API_KEY.value() },
    request.data || {},
  );
});

export const resolveCoveragePlaceSelection = onCall({
  region: FUNCTION_REGION,
  invoker: 'public',
  secrets: [GOOGLE_MAPS_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return resolveCoveragePlaceSelectionService(
    { mapsApiKey: GOOGLE_MAPS_API_KEY.value() },
    request.data || {},
  );
});

export const createBookingRequest = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return createBookingRequestService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const confirmBooking = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return confirmBookingService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const rejectBooking = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return rejectBookingService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const proposeBookingReschedule = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return proposeBookingRescheduleService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const cancelBooking = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return cancelBookingService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const completeBooking = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return completeBookingService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const updateBookingPaymentSummary = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return updateBookingPaymentSummaryService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const createStripePaymentSheetSession = onCall({
  region: FUNCTION_REGION,
  invoker: 'public',
  secrets: [STRIPE_SECRET_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return createStripePaymentSheetSessionService(
    { db: adminDb, stripe: createStripeClient(STRIPE_SECRET_KEY.value()) },
    request.auth.uid,
    request.data || {},
  );
});

export const completeDemoPayment = onCall({
  region: FUNCTION_REGION,
  invoker: 'public',
}, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return completeDemoPaymentService(
    {
      db: adminDb,
      isDemoPaymentEnabled: PAYMENT_DEMO_MODE.value().toLowerCase() === 'true',
    },
    request.auth.uid,
    request.data || {},
  );
});

export const stripeWebhook = onRequest({
  region: FUNCTION_REGION,
  invoker: 'public',
  secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
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

  const stripe = createStripeClient(STRIPE_SECRET_KEY.value());

  try {
    const event = stripe.webhooks.constructEvent(
      request.rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET.value(),
    );
    const result = await handleStripeWebhookEventService(
      { db: adminDb, stripe },
      event,
    );

    response.status(200).json({ received: true, ...result });
  } catch (error) {
    writeStructuredLog('error', {
      action: 'stripe.webhook',
      resourceType: 'payment',
      outcome: 'failure',
      reasonCode: error instanceof Error ? error.name : 'stripe_webhook_failed',
    }, 'Stripe webhook processing failed.');
    response.status(400).send(error instanceof Error ? error.message : 'Stripe webhook failed.');
  }
});

export const ensureDirectConversation = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return ensureDirectConversationService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const ensureBookingConversation = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return ensureBookingConversationService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const sendChatMessage = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return sendChatMessageService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const markConversationRead = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return markConversationReadService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const saveBookingReview = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return saveBookingReviewService(
    { db: adminDb },
    request.auth.uid,
    request.data || {},
  );
});

export const finalizeUserAvatarUpload = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return finalizeUserAvatarUploadService(
    { db: adminDb, storage: adminStorage },
    request.auth.uid,
    request.data || {},
  );
});

export const finalizeProviderAvatarUpload = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return finalizeProviderAvatarUploadService(
    { db: adminDb, storage: adminStorage },
    request.auth.uid,
    request.data || {},
  );
});

export const finalizeProviderDocumentUpload = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return finalizeProviderDocumentUploadService(
    { db: adminDb, storage: adminStorage },
    request.auth.uid,
    request.data || {},
  );
});

export const adminReviewProvider = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid, { requireAdmin: true });

  return adminReviewProviderService(
    { db: adminDb, auth: adminAuth },
    request.auth.uid,
    adminRole,
    request.data || {},
  );
});

export const getAdminDashboardSummary = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid);

  return getAdminDashboardSummaryService(
    { db: adminDb },
    adminRole,
  );
});

export const listAdminProviders = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid);

  return listAdminProvidersService(
    { db: adminDb },
    adminRole,
    request.data || {},
  );
});

export const getAdminProviderCase = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid);

  return getAdminProviderCaseService(
    { db: adminDb },
    adminRole,
    request.data || {},
  );
});

export const listAdminBookings = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid);

  return listAdminBookingsService(
    { db: adminDb },
    adminRole,
    request.data || {},
  );
});

export const getAdminBookingCase = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid);

  return getAdminBookingCaseService(
    { db: adminDb },
    adminRole,
    request.data || {},
  );
});

export const listAdminReviews = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid);

  return listAdminReviewsService(
    { db: adminDb },
    adminRole,
    request.data || {},
  );
});

export const listAdminAuditEvents = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }
  const adminRole = await resolveAdminPanelRole(request.auth.uid);

  return listAdminAuditEventsService(
    { db: adminDb },
    adminRole,
    request.data || {},
  );
});

export const onProviderProfileWrite = onDocumentWritten({ region: FUNCTION_REGION, document: 'providers/{uid}' }, async (event) => {
  const providerId = event.params.uid;
  const after = event.data?.after;

  if (!after?.exists) {
    await adminDb.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
    writeStructuredLog('info', {
      action: 'sync_provider_directory_trigger',
      uid: providerId,
      role: 'provider',
      resourceType: 'providerDirectory',
      resourceId: providerId,
      outcome: 'deleted_missing_provider',
    }, 'Provider directory snapshot was removed after provider deletion.');
    return;
  }

  await syncProviderDirectoryFromProviderRef({ db: adminDb }, providerId);
});

export const onProviderAvailabilityWrite = onDocumentWritten({ region: FUNCTION_REGION, document: 'providers/{uid}/availability/profile' }, async (event) => {
  const providerId = event.params.uid;
  const beforeData = event.data?.before?.exists ? event.data.before.data() || null : null;
  const afterData = event.data?.after?.exists ? event.data.after.data() || null : null;

  if (isSameDocumentIgnoringTimestamps(beforeData, afterData)) {
    return;
  }

  const providerSnap = await adminDb.collection('providers').doc(providerId).get();

  if (!providerSnap.exists) {
    await adminDb.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
    writeStructuredLog('info', {
      action: 'sync_provider_directory_from_availability_trigger',
      uid: providerId,
      role: 'provider',
      resourceType: 'providerDirectory',
      resourceId: providerId,
      outcome: 'deleted_missing_provider',
    }, 'Provider directory snapshot was removed after missing provider during availability sync.');
    return;
  }

  await syncProviderDirectorySnapshot({ db: adminDb }, providerId, providerSnap.data() || {});
});

export const onProviderServiceWrite = onDocumentWritten({ region: FUNCTION_REGION, document: 'providers/{uid}/services/{serviceId}' }, async (event) => {
  const providerId = event.params.uid;
  const beforeData = event.data?.before?.exists ? event.data.before.data() || null : null;
  const afterData = event.data?.after?.exists ? event.data.after.data() || null : null;

  if (isSameDocumentIgnoringTimestamps(beforeData, afterData)) {
    return;
  }

  const providerSnap = await adminDb.collection('providers').doc(providerId).get();

  if (!providerSnap.exists) {
    await adminDb.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
    writeStructuredLog('info', {
      action: 'sync_provider_directory_from_service_trigger',
      uid: providerId,
      role: 'provider',
      resourceType: 'providerDirectory',
      resourceId: providerId,
      outcome: 'deleted_missing_provider',
    }, 'Provider directory snapshot was removed after missing provider during service sync.');
    return;
  }

  await syncProviderDirectorySnapshot({ db: adminDb }, providerId, providerSnap.data() || {});
});

export const onReviewWrite = onDocumentWritten({ region: FUNCTION_REGION, document: 'reviews/{bookingId}' }, async (event) => {
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

  const directoryRef = adminDb.collection('providerDirectory').doc(providerId);
  let needsBootstrap = false;

  await adminDb.runTransaction(async (transaction) => {
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
    await syncProviderDirectoryFromProviderRef({ db: adminDb }, providerId);
  }

  writeStructuredLog('info', {
    action: 'sync_provider_review_aggregate_incremental',
    uid: providerId,
    role: 'provider',
    resourceType: 'providerDirectory',
    resourceId: providerId,
    outcome: needsBootstrap ? 'bootstrap' : 'success',
  }, 'Provider review aggregate updated incrementally.');
});
