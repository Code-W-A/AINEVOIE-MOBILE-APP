import { onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FUNCTION_REGION, GOOGLE_MAPS_API_KEY } from './config';
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

  return adminReviewProviderService(
    { db: adminDb, auth: adminAuth },
    request.auth.uid,
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
    request.data || {},
  );
});

export const getAdminDashboardSummary = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return getAdminDashboardSummaryService(
    { db: adminDb },
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
  );
});

export const listAdminProviders = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return listAdminProvidersService(
    { db: adminDb },
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
    request.data || {},
  );
});

export const getAdminProviderCase = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return getAdminProviderCaseService(
    { db: adminDb },
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
    request.data || {},
  );
});

export const listAdminBookings = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return listAdminBookingsService(
    { db: adminDb },
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
    request.data || {},
  );
});

export const getAdminBookingCase = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return getAdminBookingCaseService(
    { db: adminDb },
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
    request.data || {},
  );
});

export const listAdminReviews = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return listAdminReviewsService(
    { db: adminDb },
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
    request.data || {},
  );
});

export const listAdminAuditEvents = onCall({ region: FUNCTION_REGION, invoker: 'public' }, async (request) => {
  if (!request.auth?.uid) {
    throw permissionDenied('Authentication is required.');
  }

  return listAdminAuditEventsService(
    { db: adminDb },
    typeof request.auth.token.role === 'string' ? request.auth.token.role : null,
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
  const after = event.data?.after;

  if (!after?.exists) {
    return;
  }

  const reviewData = after.data() || {};
  const providerId = typeof reviewData.providerId === 'string' ? reviewData.providerId : '';

  if (!providerId) {
    return;
  }

  await syncProviderDirectoryFromProviderRef({ db: adminDb }, providerId);
});
