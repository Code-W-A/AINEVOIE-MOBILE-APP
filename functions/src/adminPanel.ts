import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { badRequest, failedPrecondition, permissionDenied } from './errors';
import { fetchProviderAvailabilityProfile } from './providerAvailability';
import { fetchProviderServices } from './providerServices';
import { sanitizeString } from './shared';

type AdminPanelDeps = {
  db: Firestore,
};

type AdminRole = string | null | undefined;

type AdminListPayload = {
  limit?: unknown,
  search?: unknown,
};

type ProviderListPayload = AdminListPayload & {
  status?: unknown,
};

type ProviderCasePayload = {
  providerId?: unknown,
};

type BookingListPayload = AdminListPayload & {
  status?: unknown,
  providerId?: unknown,
  userId?: unknown,
  paymentStatus?: unknown,
};

type BookingCasePayload = {
  bookingId?: unknown,
};

type ReviewListPayload = AdminListPayload & {
  providerId?: unknown,
  authorUserId?: unknown,
  status?: unknown,
};

type AuditListPayload = AdminListPayload & {
  resourceType?: unknown,
  resourceId?: unknown,
  actorUid?: unknown,
  action?: unknown,
  result?: unknown,
};

const ADMIN_READ_ROLES = new Set(['admin', 'support']);
const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;

function assertAdminReadRole(role: AdminRole) {
  if (!ADMIN_READ_ROLES.has(sanitizeString(role))) {
    throw permissionDenied('Only admin or support users can access admin panel queries.');
  }
}

function normalizeLimit(value: unknown) {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(Math.floor(nextValue), MAX_LIST_LIMIT);
}

function getTimestampMillis(value: unknown) {
  if (!value) {
    return 0;
  }

  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof (value as { toMillis?: () => number })?.toMillis === 'function') {
    return Number((value as { toMillis: () => number }).toMillis()) || 0;
  }

  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  const parsedValue = new Date(String(value)).getTime();
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function serializeTimestamp(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  const parsedValue = new Date(String(value));
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}

function serializeValue(value: unknown): unknown {
  if (
    value == null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
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
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, itemValue]) => [key, serializeValue(itemValue)]),
    );
  }

  return value;
}

function sortByTimestampDesc<T>(items: T[], resolver: (item: T) => unknown) {
  return [...items].sort((firstItem, secondItem) => getTimestampMillis(resolver(secondItem)) - getTimestampMillis(resolver(firstItem)));
}

async function fetchCollectionDocs(
  db: Firestore,
  collectionName: string,
) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data() || {},
  }));
}

function matchesSearch(haystack: Array<unknown>, searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  const normalizedSearch = searchTerm.toLowerCase();

  return haystack.some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
}

function buildProviderListItem(providerId: string, provider: Record<string, any>) {
  const profile = provider.professionalProfile || {};
  const documents = provider.documents || {};
  const reviewState = provider.reviewState || {};
  const adminReview = provider.adminReview || {};

  return serializeValue({
    providerId,
    status: sanitizeString(provider.status),
    accountStatus: sanitizeString(provider.accountStatus),
    email: sanitizeString(provider.email) || null,
    phoneNumber: sanitizeString(provider.phoneNumber) || null,
    businessName: sanitizeString(profile.businessName),
    displayName: sanitizeString(profile.displayName),
    specialization: sanitizeString(profile.specialization),
    coverageAreaText: sanitizeString(profile.coverageAreaText),
    availabilitySummary: sanitizeString(profile.availabilitySummary),
    identityDocumentStatus: sanitizeString(documents.identity?.status) || 'missing',
    professionalDocumentStatus: sanitizeString(documents.professional?.status) || 'missing',
    submittedAt: reviewState.submittedAt || null,
    lastReviewedAt: reviewState.lastReviewedAt || null,
    reviewedAt: adminReview.reviewedAt || null,
    reviewAction: sanitizeString(adminReview.action) || null,
    lastPublishedAt: provider.lastPublishedAt || null,
    updatedAt: provider.updatedAt || null,
  });
}

function buildBookingListItem(bookingId: string, booking: Record<string, any>) {
  return serializeValue({
    bookingId,
    status: sanitizeString(booking.status),
    userId: sanitizeString(booking.userId),
    providerId: sanitizeString(booking.providerId),
    serviceId: sanitizeString(booking.serviceId),
    scheduledStartAt: booking.scheduledStartAt || null,
    scheduledEndAt: booking.scheduledEndAt || null,
    timezone: sanitizeString(booking.timezone),
    paymentSummary: booking.paymentSummary || {},
    userSnapshot: booking.userSnapshot || {},
    providerSnapshot: booking.providerSnapshot || {},
    serviceSnapshot: booking.serviceSnapshot || {},
    updatedAt: booking.updatedAt || null,
    createdAt: booking.createdAt || null,
  });
}

function buildReviewListItem(reviewId: string, review: Record<string, any>) {
  return serializeValue({
    reviewId,
    bookingId: sanitizeString(review.bookingId) || reviewId,
    providerId: sanitizeString(review.providerId),
    authorUserId: sanitizeString(review.authorUserId),
    status: sanitizeString(review.status),
    rating: Number(review.rating) || 0,
    review: sanitizeString(review.review),
    authorSnapshot: review.authorSnapshot || {},
    providerSnapshot: review.providerSnapshot || {},
    serviceSnapshot: review.serviceSnapshot || {},
    createdAt: review.createdAt || null,
    updatedAt: review.updatedAt || null,
  });
}

function buildAuditEventItem(eventId: string, eventData: Record<string, any>) {
  return serializeValue({
    eventId,
    action: sanitizeString(eventData.action),
    actorUid: sanitizeString(eventData.actorUid) || null,
    actorRole: sanitizeString(eventData.actorRole) || null,
    resourceType: sanitizeString(eventData.resourceType) || null,
    resourceId: sanitizeString(eventData.resourceId) || null,
    statusFrom: sanitizeString(eventData.statusFrom) || null,
    statusTo: sanitizeString(eventData.statusTo) || null,
    result: sanitizeString(eventData.result) || null,
    errorCode: sanitizeString(eventData.errorCode) || null,
    context: serializeValue(eventData.context || {}),
    createdAt: eventData.createdAt || null,
  });
}

function filterProviderAuditEvents(events: Array<{ id: string, data: Record<string, any> }>, providerId: string) {
  return events.filter((event) => {
    const resourceId = sanitizeString(event.data.resourceId);
    const contextProviderId = sanitizeString(event.data.context?.providerId);

    return resourceId === providerId
      || resourceId.startsWith(`${providerId}:`)
      || resourceId.startsWith(`${providerId}/`)
      || contextProviderId === providerId;
  });
}

function filterBookingAuditEvents(
  events: Array<{ id: string, data: Record<string, any> }>,
  bookingId: string,
  paymentId: string,
) {
  return events.filter((event) => {
    const resourceId = sanitizeString(event.data.resourceId);
    const contextBookingId = sanitizeString(event.data.context?.bookingId);
    const contextPaymentId = sanitizeString(event.data.context?.paymentId);

    return resourceId === bookingId
      || resourceId === paymentId
      || contextBookingId === bookingId
      || contextPaymentId === paymentId;
  });
}

export async function getAdminDashboardSummaryService(
  { db }: AdminPanelDeps,
  role: AdminRole,
) {
  assertAdminReadRole(role);

  const [providers, bookings, payments, reviews, auditEvents] = await Promise.all([
    fetchCollectionDocs(db, 'providers'),
    fetchCollectionDocs(db, 'bookings'),
    fetchCollectionDocs(db, 'payments'),
    fetchCollectionDocs(db, 'reviews'),
    fetchCollectionDocs(db, 'auditEvents'),
  ]);

  const providersByStatus = providers.reduce<Record<string, number>>((counts, item) => {
    const status = sanitizeString(item.data.status) || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const bookingsByStatus = bookings.reduce<Record<string, number>>((counts, item) => {
    const status = sanitizeString(item.data.status) || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const paymentsByStatus = payments.reduce<Record<string, number>>((counts, item) => {
    const status = sanitizeString(item.data.status) || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const reviewsByStatus = reviews.reduce<Record<string, number>>((counts, item) => {
    const status = sanitizeString(item.data.status) || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const openBookingIssueCount = bookings.filter((item) => {
    const bookingStatus = sanitizeString(item.data.status);
    const paymentStatus = sanitizeString(item.data.paymentSummary?.status);

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

export async function listAdminProvidersService(
  { db }: AdminPanelDeps,
  role: AdminRole,
  rawPayload: ProviderListPayload,
) {
  assertAdminReadRole(role);

  const status = sanitizeString(rawPayload.status);
  const search = sanitizeString(rawPayload.search).toLowerCase();
  const limit = normalizeLimit(rawPayload.limit);
  const providers = await fetchCollectionDocs(db, 'providers');
  const filtered = sortByTimestampDesc(
    providers.filter((item) => {
      if (status && sanitizeString(item.data.status) !== status) {
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
    }),
    (item) => item.data.reviewState?.submittedAt || item.data.updatedAt || item.data.createdAt,
  );

  return {
    total: filtered.length,
    items: filtered
      .slice(0, limit)
      .map((item) => buildProviderListItem(item.id, item.data)),
  };
}

export async function getAdminProviderCaseService(
  { db }: AdminPanelDeps,
  role: AdminRole,
  rawPayload: ProviderCasePayload,
) {
  assertAdminReadRole(role);
  const providerId = sanitizeString(rawPayload.providerId);

  if (!providerId) {
    throw badRequest('Provider id is required.');
  }

  const providerRef = db.collection('providers').doc(providerId);
  const [providerSnap, providerDirectorySnap, availability, services, auditEvents, bookings] = await Promise.all([
    providerRef.get(),
    db.collection('providerDirectory').doc(providerId).get(),
    fetchProviderAvailabilityProfile({ db }, providerId),
    fetchProviderServices({ db }, providerId),
    fetchCollectionDocs(db, 'auditEvents'),
    fetchCollectionDocs(db, 'bookings'),
  ]);

  if (!providerSnap.exists) {
    throw failedPrecondition('Provider profile not found.');
  }

  const provider = providerSnap.data() || {};
  const relatedBookings = sortByTimestampDesc(
    bookings.filter((item) => sanitizeString(item.data.providerId) === providerId),
    (item) => item.data.updatedAt || item.data.createdAt,
  ).slice(0, 10);
  const relatedAuditEvents = sortByTimestampDesc(
    filterProviderAuditEvents(auditEvents, providerId),
    (item) => item.data.createdAt,
  ).slice(0, 25);

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

export async function listAdminBookingsService(
  { db }: AdminPanelDeps,
  role: AdminRole,
  rawPayload: BookingListPayload,
) {
  assertAdminReadRole(role);

  const status = sanitizeString(rawPayload.status);
  const providerId = sanitizeString(rawPayload.providerId);
  const userId = sanitizeString(rawPayload.userId);
  const paymentStatus = sanitizeString(rawPayload.paymentStatus);
  const search = sanitizeString(rawPayload.search).toLowerCase();
  const limit = normalizeLimit(rawPayload.limit);
  const bookings = await fetchCollectionDocs(db, 'bookings');
  const filtered = sortByTimestampDesc(
    bookings.filter((item) => {
      if (status && sanitizeString(item.data.status) !== status) {
        return false;
      }

      if (providerId && sanitizeString(item.data.providerId) !== providerId) {
        return false;
      }

      if (userId && sanitizeString(item.data.userId) !== userId) {
        return false;
      }

      if (paymentStatus && sanitizeString(item.data.paymentSummary?.status) !== paymentStatus) {
        return false;
      }

      return matchesSearch([
        item.id,
        item.data.userSnapshot?.displayName,
        item.data.providerSnapshot?.displayName,
        item.data.serviceSnapshot?.name,
        item.data.requestDetails?.description,
      ], search);
    }),
    (item) => item.data.updatedAt || item.data.createdAt,
  );

  return {
    total: filtered.length,
    items: filtered.slice(0, limit).map((item) => buildBookingListItem(item.id, item.data)),
  };
}

export async function getAdminBookingCaseService(
  { db }: AdminPanelDeps,
  role: AdminRole,
  rawPayload: BookingCasePayload,
) {
  assertAdminReadRole(role);
  const bookingId = sanitizeString(rawPayload.bookingId);

  if (!bookingId) {
    throw badRequest('Booking id is required.');
  }

  const bookingRef = db.collection('bookings').doc(bookingId);
  const bookingSnap = await bookingRef.get();

  if (!bookingSnap.exists) {
    throw failedPrecondition('Booking not found.');
  }

  const booking = bookingSnap.data() || {};
  const paymentId = sanitizeString(booking.paymentSummary?.paymentId) || `pay_${bookingId}`;
  const [paymentSnap, reviewSnap, providerSnap, userSnap, auditEvents] = await Promise.all([
    db.collection('payments').doc(paymentId).get(),
    db.collection('reviews').doc(bookingId).get(),
    db.collection('providers').doc(sanitizeString(booking.providerId)).get(),
    db.collection('users').doc(sanitizeString(booking.userId)).get(),
    fetchCollectionDocs(db, 'auditEvents'),
  ]);
  const relatedAuditEvents = sortByTimestampDesc(
    filterBookingAuditEvents(auditEvents, bookingId, paymentId),
    (item) => item.data.createdAt,
  ).slice(0, 25);

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

export async function listAdminReviewsService(
  { db }: AdminPanelDeps,
  role: AdminRole,
  rawPayload: ReviewListPayload,
) {
  assertAdminReadRole(role);

  const providerId = sanitizeString(rawPayload.providerId);
  const authorUserId = sanitizeString(rawPayload.authorUserId);
  const status = sanitizeString(rawPayload.status);
  const search = sanitizeString(rawPayload.search).toLowerCase();
  const limit = normalizeLimit(rawPayload.limit);
  const reviews = await fetchCollectionDocs(db, 'reviews');
  const filtered = sortByTimestampDesc(
    reviews.filter((item) => {
      if (providerId && sanitizeString(item.data.providerId) !== providerId) {
        return false;
      }

      if (authorUserId && sanitizeString(item.data.authorUserId) !== authorUserId) {
        return false;
      }

      if (status && sanitizeString(item.data.status) !== status) {
        return false;
      }

      return matchesSearch([
        item.id,
        item.data.review,
        item.data.authorSnapshot?.displayName,
        item.data.providerSnapshot?.displayName,
        item.data.serviceSnapshot?.serviceName,
      ], search);
    }),
    (item) => item.data.updatedAt || item.data.createdAt,
  );

  return {
    total: filtered.length,
    items: filtered.slice(0, limit).map((item) => buildReviewListItem(item.id, item.data)),
  };
}

export async function listAdminAuditEventsService(
  { db }: AdminPanelDeps,
  role: AdminRole,
  rawPayload: AuditListPayload,
) {
  assertAdminReadRole(role);

  const resourceType = sanitizeString(rawPayload.resourceType);
  const resourceId = sanitizeString(rawPayload.resourceId);
  const actorUid = sanitizeString(rawPayload.actorUid);
  const action = sanitizeString(rawPayload.action);
  const result = sanitizeString(rawPayload.result);
  const search = sanitizeString(rawPayload.search).toLowerCase();
  const limit = normalizeLimit(rawPayload.limit);
  const auditEvents = await fetchCollectionDocs(db, 'auditEvents');
  const filtered = sortByTimestampDesc(
    auditEvents.filter((item) => {
      if (resourceType && sanitizeString(item.data.resourceType) !== resourceType) {
        return false;
      }

      if (resourceId && sanitizeString(item.data.resourceId) !== resourceId) {
        return false;
      }

      if (actorUid && sanitizeString(item.data.actorUid) !== actorUid) {
        return false;
      }

      if (action && sanitizeString(item.data.action) !== action) {
        return false;
      }

      if (result && sanitizeString(item.data.result) !== result) {
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
    }),
    (item) => item.data.createdAt,
  );

  return {
    total: filtered.length,
    items: filtered.slice(0, limit).map((item) => buildAuditEventItem(item.id, item.data)),
  };
}
