import { createHash, randomUUID } from 'node:crypto';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { writeAuditEvent } from './audit';
import { badRequest, failedPrecondition, internalError, permissionDenied } from './errors';
import { writeStructuredLog } from './logging';
import { PROVIDER_STATUSES, sanitizeString } from './shared';
import { fetchProviderAvailabilityProfile } from './providerAvailability';

type BookingDeps = {
  db: Firestore,
};

type CreateBookingPayload = {
  providerId?: unknown,
  serviceId?: unknown,
  scheduledDateKey?: unknown,
  scheduledStartTime?: unknown,
  timezone?: unknown,
  address?: unknown,
  idempotencyKey?: unknown,
  requestDetails?: {
    description?: unknown,
    estimatedHours?: unknown,
  } | null,
  paymentSummary?: {
    status?: unknown,
    method?: unknown,
    last4?: unknown,
    transactionId?: unknown,
  } | null,
};

type BookingActionPayload = {
  bookingId?: unknown,
  reason?: unknown,
  scheduledDateKey?: unknown,
  scheduledStartTime?: unknown,
  timezone?: unknown,
};

const BOOKING_STATUSES = Object.freeze({
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  RESCHEDULE_PROPOSED: 'reschedule_proposed',
  REJECTED: 'rejected',
  CANCELLED_BY_USER: 'cancelled_by_user',
  CANCELLED_BY_PROVIDER: 'cancelled_by_provider',
  COMPLETED: 'completed',
});

const PAYMENT_SUMMARY_STATUSES = Object.freeze({
  UNPAID: 'unpaid',
  IN_PROGRESS: 'in_progress',
  PAID: 'paid',
  FAILED: 'failed',
});

const PAYMENT_METHODS = Object.freeze({
  CARD: 'card',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
});

const DEFAULT_TIMEZONE = 'Europe/Bucharest';
const HOURS_LIMIT = 12;
const BOOKING_SCHEMA_VERSION = 1;
const PAYMENT_SCHEMA_VERSION = 1;

function isBookingStatus(value: unknown): value is string {
  return typeof value === 'string' && (Object.values(BOOKING_STATUSES) as string[]).includes(value);
}

function isPaymentSummaryStatus(value: unknown): value is string {
  return typeof value === 'string' && (Object.values(PAYMENT_SUMMARY_STATUSES) as string[]).includes(value);
}

function isPaymentMethod(value: unknown): value is string {
  return typeof value === 'string' && (Object.values(PAYMENT_METHODS) as string[]).includes(value);
}

function normalizeEstimatedHours(value: unknown) {
  const nextValue = Number(value);

  if (!Number.isInteger(nextValue) || nextValue <= 0 || nextValue > HOURS_LIMIT) {
    throw badRequest(`Estimated hours must be an integer between 1 and ${HOURS_LIMIT}.`);
  }

  return nextValue;
}

function normalizeDateKey(value: unknown) {
  const nextValue = sanitizeString(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
    throw badRequest('Use a valid booking date in YYYY-MM-DD format.');
  }

  return nextValue;
}

function normalizeTimeValue(value: unknown) {
  const nextValue = sanitizeString(value);

  if (!/^\d{2}:\d{2}$/.test(nextValue)) {
    throw badRequest('Use a valid booking time in HH:MM format.');
  }

  return nextValue;
}

function normalizeTimezone(value: unknown) {
  return sanitizeString(value) || DEFAULT_TIMEZONE;
}

function normalizeRequestDetails(payload: CreateBookingPayload['requestDetails']) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const description = sanitizeString(source?.description);

  if (!description) {
    throw badRequest('Booking request details are required.');
  }

  return {
    description,
    estimatedHours: normalizeEstimatedHours(source?.estimatedHours),
  };
}

function normalizePaymentSummary(payload: CreateBookingPayload['paymentSummary'] | null | undefined) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const status = isPaymentSummaryStatus(source?.status)
    ? source?.status
    : PAYMENT_SUMMARY_STATUSES.UNPAID;
  const method = isPaymentMethod(source?.method)
    ? source?.method
    : PAYMENT_METHODS.CARD;
  const last4 = sanitizeString(source?.last4).slice(-4) || null;
  const transactionId = sanitizeString(source?.transactionId) || null;

  return {
    paymentId: null,
    status,
    method,
    last4,
    transactionId,
  };
}

function createTransactionId() {
  const entropy = randomUUID().slice(0, 6).toUpperCase();
  return `TX-${Date.now()}-${entropy}`;
}

function buildPaymentId(bookingId: string) {
  return `pay_${bookingId}`;
}

function buildIdempotencyScopeKey(ownerUid: string, action: string, rawKey: string) {
  return `${ownerUid}:${action}:${sanitizeString(rawKey)}`;
}

function hashPayload(payload: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function parseTimeToMinutes(timeValue: string) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return (hours * 60) + minutes;
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return formatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {} as Record<string, string>);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const utcEquivalent = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (utcEquivalent - date.getTime()) / 60000;
}

function zonedDateTimeToDate(dateKey: string, timeValue: string, timeZone: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  let utcTime = Date.UTC(year, month - 1, day, hours, minutes, 0);
  let offset = getTimeZoneOffsetMinutes(new Date(utcTime), timeZone);
  utcTime -= offset * 60000;

  const correctedOffset = getTimeZoneOffsetMinutes(new Date(utcTime), timeZone);

  if (correctedOffset !== offset) {
    utcTime -= (correctedOffset - offset) * 60000;
  }

  return new Date(utcTime);
}

function getWeekDayKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][utcDay];
}

function ensureSlotFitsAvailability(
  availability: Record<string, any>,
  dateKey: string,
  startTime: string,
  estimatedHours: number,
) {
  const blockedDateKeys = Array.isArray(availability?.blockedDates)
    ? availability.blockedDates.map((item: Record<string, unknown>) => sanitizeString(item?.dateKey))
    : [];

  if (blockedDateKeys.includes(dateKey)) {
    throw failedPrecondition('The selected date is blocked in provider availability.');
  }

  const scheduleDay = Array.isArray(availability?.weekSchedule)
    ? availability.weekSchedule.find((day: Record<string, unknown>) => sanitizeString(day?.dayKey) === getWeekDayKey(dateKey))
    : null;

  if (!scheduleDay?.isEnabled || !Array.isArray(scheduleDay?.timeRanges) || !scheduleDay.timeRanges.length) {
    throw failedPrecondition('The provider is not available for the selected date.');
  }

  const requestedStartMinutes = parseTimeToMinutes(startTime);
  const requestedEndMinutes = requestedStartMinutes + (estimatedHours * 60);
  const fitsInSchedule = scheduleDay.timeRanges.some((range: Record<string, unknown>) => {
    const rangeStart = parseTimeToMinutes(normalizeTimeValue(range?.startTime));
    const rangeEnd = parseTimeToMinutes(normalizeTimeValue(range?.endTime));
    return requestedStartMinutes >= rangeStart && requestedEndMinutes <= rangeEnd;
  });

  if (!fitsInSchedule) {
    throw failedPrecondition('The selected booking window does not fit the provider schedule.');
  }
}

function assertTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions: Record<string, string[]> = {
    [BOOKING_STATUSES.REQUESTED]: [
      BOOKING_STATUSES.CONFIRMED,
      BOOKING_STATUSES.REJECTED,
      BOOKING_STATUSES.RESCHEDULE_PROPOSED,
      BOOKING_STATUSES.CANCELLED_BY_USER,
    ],
    [BOOKING_STATUSES.CONFIRMED]: [
      BOOKING_STATUSES.RESCHEDULE_PROPOSED,
      BOOKING_STATUSES.CANCELLED_BY_USER,
      BOOKING_STATUSES.CANCELLED_BY_PROVIDER,
      BOOKING_STATUSES.COMPLETED,
    ],
    [BOOKING_STATUSES.RESCHEDULE_PROPOSED]: [
      BOOKING_STATUSES.CONFIRMED,
      BOOKING_STATUSES.REJECTED,
      BOOKING_STATUSES.CANCELLED_BY_USER,
      BOOKING_STATUSES.CANCELLED_BY_PROVIDER,
    ],
  };

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw failedPrecondition(`Booking cannot transition from ${currentStatus} to ${nextStatus}.`);
  }
}

function normalizeStoredBooking(bookingId: string, payload: Record<string, any>) {
  const status = isBookingStatus(payload?.status)
    ? payload.status
    : BOOKING_STATUSES.REQUESTED;

  return {
    bookingId: sanitizeString(payload?.bookingId) || bookingId,
    userId: sanitizeString(payload?.userId),
    providerId: sanitizeString(payload?.providerId),
    serviceId: sanitizeString(payload?.serviceId),
    status,
    scheduledStartAt: payload?.scheduledStartAt || null,
    scheduledEndAt: payload?.scheduledEndAt || null,
    timezone: normalizeTimezone(payload?.timezone),
    requestDetails: payload?.requestDetails || {},
    pricingSnapshot: payload?.pricingSnapshot || {},
    paymentSummary: payload?.paymentSummary || {},
    userSnapshot: payload?.userSnapshot || {},
    providerSnapshot: payload?.providerSnapshot || {},
    serviceSnapshot: payload?.serviceSnapshot || {},
    providerDecision: payload?.providerDecision || null,
    cancellation: payload?.cancellation || null,
    completion: payload?.completion || null,
    reviewSummary: payload?.reviewSummary || null,
    createdAt: payload?.createdAt || null,
    updatedAt: payload?.updatedAt || null,
    createdBy: sanitizeString(payload?.createdBy),
    updatedBy: sanitizeString(payload?.updatedBy),
    schemaVersion: Number(payload?.schemaVersion) || BOOKING_SCHEMA_VERSION,
  };
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

function serializeBookingForClient(booking: Record<string, any>) {
  const paymentSummary = booking.paymentSummary || {};
  const providerDecision = booking.providerDecision || null;
  const cancellation = booking.cancellation || null;
  const completion = booking.completion || null;

  return {
    ...booking,
    scheduledStartAt: serializeTimestamp(booking.scheduledStartAt),
    scheduledEndAt: serializeTimestamp(booking.scheduledEndAt),
    paymentSummary: {
      ...paymentSummary,
      updatedAt: serializeTimestamp(paymentSummary.updatedAt),
    },
    providerDecision: providerDecision ? {
      ...providerDecision,
      proposedStartAt: serializeTimestamp(providerDecision.proposedStartAt),
      decidedAt: serializeTimestamp(providerDecision.decidedAt),
    } : null,
    cancellation: cancellation ? {
      ...cancellation,
      cancelledAt: serializeTimestamp(cancellation.cancelledAt),
    } : null,
    completion: completion ? {
      ...completion,
      completedAt: serializeTimestamp(completion.completedAt),
    } : null,
    createdAt: serializeTimestamp(booking.createdAt),
    updatedAt: serializeTimestamp(booking.updatedAt),
  };
}

function assertPaymentSummaryInvariants(bookingStatus: string, paymentStatus: string) {
  const rejectedOrCancelledStatuses: string[] = [
    BOOKING_STATUSES.REJECTED,
    BOOKING_STATUSES.CANCELLED_BY_USER,
    BOOKING_STATUSES.CANCELLED_BY_PROVIDER,
  ];

  if (
    paymentStatus === PAYMENT_SUMMARY_STATUSES.PAID
    && rejectedOrCancelledStatuses.includes(bookingStatus)
  ) {
    throw failedPrecondition('A rejected or cancelled booking cannot be marked as paid.');
  }

  if (
    paymentStatus === PAYMENT_SUMMARY_STATUSES.FAILED
    && bookingStatus === BOOKING_STATUSES.COMPLETED
  ) {
    throw failedPrecondition('A completed booking cannot end with a failed payment summary.');
  }
}

function buildPaymentDocument({
  paymentId,
  booking,
  paymentSummary,
  now,
}: {
  paymentId: string,
  booking: Record<string, any>,
  paymentSummary: Record<string, any>,
  now: Timestamp,
}) {
  const pricingSnapshot = booking.pricingSnapshot || {};

  return {
    paymentId,
    bookingId: booking.bookingId,
    userId: booking.userId,
    providerId: booking.providerId,
    status: paymentSummary.status || PAYMENT_SUMMARY_STATUSES.UNPAID,
    method: paymentSummary.method || PAYMENT_METHODS.CARD,
    amount: Number(pricingSnapshot.amount) || 0,
    currency: sanitizeString(pricingSnapshot.currency) || 'RON',
    processor: 'manual_mvp',
    last4: paymentSummary.last4 || null,
    transactionId: paymentSummary.transactionId || null,
    createdAt: booking.createdAt || now,
    updatedAt: now,
    updatedBy: booking.updatedBy || booking.userId,
    schemaVersion: PAYMENT_SCHEMA_VERSION,
  };
}

function buildBookingDocument({
  bookingId,
  userId,
  providerId,
  serviceId,
  scheduledStartAt,
  scheduledEndAt,
  timezone,
  requestDetails,
  paymentSummary,
  address,
  userData,
  providerData,
  serviceData,
  now,
  paymentId,
}: {
  bookingId: string,
  userId: string,
  providerId: string,
  serviceId: string,
  scheduledStartAt: Timestamp,
  scheduledEndAt: Timestamp,
  timezone: string,
  requestDetails: { description: string, estimatedHours: number },
  paymentSummary: Record<string, any>,
  address: string,
  userData: Record<string, any>,
  providerData: Record<string, any>,
  serviceData: Record<string, any>,
  now: Timestamp,
  paymentId: string,
}) {
  const amount = Number(serviceData.baseRateAmount) * requestDetails.estimatedHours;
  const currency = sanitizeString(serviceData.baseRateCurrency) || 'RON';
  const providerDisplayName = sanitizeString(providerData?.professionalProfile?.businessName)
    || sanitizeString(providerData?.professionalProfile?.displayName)
    || 'Prestator';

  return {
    bookingId,
    userId,
    providerId,
    serviceId,
    status: BOOKING_STATUSES.REQUESTED,
    scheduledStartAt,
    scheduledEndAt,
    timezone,
    requestDetails,
    pricingSnapshot: {
      amount,
      currency,
      unit: 'hour',
      estimatedHours: requestDetails.estimatedHours,
    },
    paymentSummary: {
      ...paymentSummary,
      paymentId,
      updatedAt: now,
    },
    userSnapshot: {
      displayName: sanitizeString(userData.displayName) || 'Client',
      photoPath: sanitizeString(userData.photoPath) || null,
      primaryLocation: {
        formattedAddress: address,
      },
    },
    providerSnapshot: {
      displayName: providerDisplayName,
      statusAtBookingTime: sanitizeString(providerData.status) || PROVIDER_STATUSES.APPROVED,
    },
    serviceSnapshot: {
      name: sanitizeString(serviceData.name) || 'Serviciu',
      baseRateAmount: Number(serviceData.baseRateAmount) || 0,
      baseRateCurrency: currency,
    },
    providerDecision: null,
    cancellation: null,
    completion: null,
    reviewSummary: {
      reviewId: null,
      rating: null,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    schemaVersion: BOOKING_SCHEMA_VERSION,
  };
}

async function getBookingForExistingIdempotency(
  db: Firestore,
  resourceId: string,
) {
  const bookingSnap = await db.collection('bookings').doc(resourceId).get();

  if (!bookingSnap.exists) {
    throw internalError('The stored idempotency key points to a missing booking.');
  }

  return normalizeStoredBooking(bookingSnap.id, bookingSnap.data() || {});
}

export async function createBookingRequestService(
  { db }: BookingDeps,
  userId: string,
  rawPayload: CreateBookingPayload,
) {
  const providerId = sanitizeString(rawPayload.providerId);
  const serviceId = sanitizeString(rawPayload.serviceId);
  const scheduledDateKey = normalizeDateKey(rawPayload.scheduledDateKey);
  const scheduledStartTime = normalizeTimeValue(rawPayload.scheduledStartTime);
  const timezone = normalizeTimezone(rawPayload.timezone);
  const requestDetails = normalizeRequestDetails(rawPayload.requestDetails);
  const paymentSummary = normalizePaymentSummary(rawPayload.paymentSummary);
  const address = sanitizeString(rawPayload.address);

  if (!providerId || !serviceId || !address) {
    throw badRequest('Booking payload is incomplete.');
  }

  const idempotencyKey = sanitizeString(rawPayload.idempotencyKey) || randomUUID();
  const requestFingerprint = hashPayload({
    providerId,
    serviceId,
    scheduledDateKey,
    scheduledStartTime,
    timezone,
    address,
    requestDetails,
    paymentSummary,
  });
  const scopeKey = buildIdempotencyScopeKey(userId, 'create_booking', idempotencyKey);
  const idempotencyRef = db.collection('idempotencyKeys').doc(scopeKey);

  const result = await db.runTransaction(async (transaction) => {
    const userRef = db.collection('users').doc(userId);
    const providerRef = db.collection('providers').doc(providerId);
    const serviceRef = providerRef.collection('services').doc(serviceId);
    const availabilityRef = providerRef.collection('availability').doc('profile');

    const [idempotencySnap, userSnap, providerSnap, serviceSnap, availabilitySnap] = await Promise.all([
      transaction.get(idempotencyRef),
      transaction.get(userRef),
      transaction.get(providerRef),
      transaction.get(serviceRef),
      transaction.get(availabilityRef),
    ]);

    if (idempotencySnap.exists) {
      const idempotencyData = idempotencySnap.data() || {};

      if (sanitizeString(idempotencyData.ownerUid) !== userId || sanitizeString(idempotencyData.requestHash) !== requestFingerprint) {
        throw failedPrecondition('This booking idempotency key was already used with a different payload.');
      }

      return {
        booking: await getBookingForExistingIdempotency(db, sanitizeString(idempotencyData.resourceId)),
        created: false,
      };
    }

    if (!userSnap.exists) {
      throw failedPrecondition('User profile is missing.');
    }

    if (!providerSnap.exists) {
      throw failedPrecondition('Provider profile is missing.');
    }

    if (!serviceSnap.exists) {
      throw failedPrecondition('Provider service is missing.');
    }

    const userData = userSnap.data() || {};
    const providerData = providerSnap.data() || {};
    const serviceData = serviceSnap.data() || {};

    if (sanitizeString(userData.role) !== 'user' || sanitizeString(userData.accountStatus) !== 'active') {
      throw failedPrecondition('Only active user accounts can create bookings.');
    }

    if (sanitizeString(providerData.role) !== 'provider' || sanitizeString(providerData.status) !== PROVIDER_STATUSES.APPROVED) {
      throw failedPrecondition('Bookings can only be created for approved providers.');
    }

    if (sanitizeString(serviceData.providerId) !== providerId || sanitizeString(serviceData.status) !== 'active') {
      throw failedPrecondition('Bookings can only target active provider services.');
    }

    ensureSlotFitsAvailability(
      availabilitySnap.exists ? availabilitySnap.data() || {} : await fetchProviderAvailabilityProfile({ db }, providerId),
      scheduledDateKey,
      scheduledStartTime,
      requestDetails.estimatedHours,
    );

    const scheduledStartDate = zonedDateTimeToDate(scheduledDateKey, scheduledStartTime, timezone);
    const scheduledEndDate = new Date(scheduledStartDate.getTime() + (requestDetails.estimatedHours * 60 * 60 * 1000));
    const now = Timestamp.now();
    const bookingRef = db.collection('bookings').doc();
    const paymentId = buildPaymentId(bookingRef.id);
    const booking = buildBookingDocument({
      bookingId: bookingRef.id,
      userId,
      providerId,
      serviceId,
      scheduledStartAt: Timestamp.fromDate(scheduledStartDate),
      scheduledEndAt: Timestamp.fromDate(scheduledEndDate),
      timezone,
      requestDetails,
      paymentSummary,
      address,
      userData,
      providerData,
      serviceData,
      now,
      paymentId,
    });
    const paymentRef = db.collection('payments').doc(paymentId);

    transaction.set(bookingRef, booking);
    transaction.set(paymentRef, buildPaymentDocument({
      paymentId,
      booking,
      paymentSummary: booking.paymentSummary || {},
      now,
    }));
    transaction.set(idempotencyRef, {
      scopeKey,
      action: 'create_booking',
      ownerUid: userId,
      requestHash: requestFingerprint,
      resourceType: 'booking',
      resourceId: bookingRef.id,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + (24 * 60 * 60 * 1000)),
    });

    return {
      booking,
      created: true,
    };
  });

  writeStructuredLog('info', {
    action: 'booking.create',
    uid: userId,
    role: 'user',
    resourceType: 'booking',
    resourceId: result.booking.bookingId,
    statusTo: result.booking.status,
    outcome: result.created ? 'created' : 'idempotent_replay',
  }, 'Booking request was processed.');

  await writeAuditEvent({ db }, {
    action: 'booking.create',
    actorUid: userId,
    actorRole: 'user',
    resourceType: 'booking',
    resourceId: result.booking.bookingId,
    statusTo: result.booking.status,
    result: result.created ? 'created' : 'idempotent_replay',
    context: {
      providerId: result.booking.providerId,
      serviceId: result.booking.serviceId,
      paymentId: result.booking.paymentSummary?.paymentId || null,
    },
  });

  return {
    booking: serializeBookingForClient(result.booking),
    idempotent: !result.created,
  };
}

async function getProviderActorForBooking(db: Firestore, providerId: string) {
  const providerSnap = await db.collection('providers').doc(providerId).get();

  if (!providerSnap.exists) {
    throw failedPrecondition('Provider profile is missing.');
  }

  const providerData = providerSnap.data() || {};

  if (sanitizeString(providerData.role) !== 'provider' || sanitizeString(providerData.status) !== PROVIDER_STATUSES.APPROVED) {
    throw failedPrecondition('Only approved providers can manage booking lifecycle actions.');
  }

  return providerData;
}

function normalizeActionPayload(rawPayload: BookingActionPayload) {
  const bookingId = sanitizeString(rawPayload.bookingId);

  if (!bookingId) {
    throw badRequest('Booking id is required.');
  }

  return {
    bookingId,
    reason: sanitizeString(rawPayload.reason),
    scheduledDateKey: rawPayload.scheduledDateKey != null ? normalizeDateKey(rawPayload.scheduledDateKey) : '',
    scheduledStartTime: rawPayload.scheduledStartTime != null ? normalizeTimeValue(rawPayload.scheduledStartTime) : '',
    timezone: rawPayload.timezone != null ? normalizeTimezone(rawPayload.timezone) : DEFAULT_TIMEZONE,
  };
}

async function mutateBooking(
  { db }: BookingDeps,
  bookingId: string,
  actorUid: string,
  action: string,
  updater: (booking: Record<string, any>, now: Timestamp) => Promise<Record<string, any> | null> | Record<string, any> | null,
) {
  const bookingRef = db.collection('bookings').doc(bookingId);
  const result = await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);

    if (!bookingSnap.exists) {
      throw failedPrecondition('Booking is missing.');
    }

    const booking = normalizeStoredBooking(bookingId, bookingSnap.data() || {});
    const now = Timestamp.now();
    const previousStatus = booking.status;
    const patch = await updater(booking, now);

    if (!patch || Object.keys(patch).length === 0) {
      return {
        booking,
        previousStatus,
        changed: false,
      };
    }

    const nextBooking = normalizeStoredBooking(bookingId, {
      ...booking,
      ...patch,
      updatedAt: now,
      updatedBy: actorUid,
    });

    transaction.set(bookingRef, {
      ...patch,
      updatedAt: now,
      updatedBy: actorUid,
    }, { merge: true });

    return {
      booking: nextBooking,
      previousStatus,
      changed: true,
    };
  });
  const actorRole = actorUid === result.booking.userId ? 'user' : 'provider';
  const outcome = result.changed ? 'success' : 'noop';

  writeStructuredLog('info', {
    action,
    uid: actorUid,
    role: actorRole,
    resourceType: 'booking',
    resourceId: result.booking.bookingId,
    statusFrom: result.previousStatus,
    statusTo: result.booking.status,
    outcome,
  }, 'Booking lifecycle action completed.');

  await writeAuditEvent({ db }, {
    action,
    actorUid,
    actorRole,
    resourceType: 'booking',
    resourceId: result.booking.bookingId,
    statusFrom: result.previousStatus,
    statusTo: result.booking.status,
    result: outcome,
    context: {
      userId: result.booking.userId,
      providerId: result.booking.providerId,
      serviceId: result.booking.serviceId,
    },
  });

  return {
    booking: serializeBookingForClient(result.booking),
  };
}

export async function confirmBookingService(
  { db }: BookingDeps,
  providerId: string,
  rawPayload: BookingActionPayload,
) {
  const { bookingId } = normalizeActionPayload(rawPayload);
  await getProviderActorForBooking(db, providerId);

  return mutateBooking({ db }, bookingId, providerId, 'booking.confirm', async (booking) => {
    if (booking.providerId !== providerId) {
      throw permissionDenied('Only the assigned provider can confirm this booking.');
    }

    assertTransition(booking.status, BOOKING_STATUSES.CONFIRMED);

    return booking.status === BOOKING_STATUSES.CONFIRMED
      ? null
      : {
        status: BOOKING_STATUSES.CONFIRMED,
        providerDecision: null,
      };
  });
}

export async function rejectBookingService(
  { db }: BookingDeps,
  providerId: string,
  rawPayload: BookingActionPayload,
) {
  const { bookingId, reason } = normalizeActionPayload(rawPayload);

  if (!reason) {
    throw badRequest('Reject reason is required.');
  }

  await getProviderActorForBooking(db, providerId);

  return mutateBooking({ db }, bookingId, providerId, 'booking.reject', async (booking, now) => {
    if (booking.providerId !== providerId) {
      throw permissionDenied('Only the assigned provider can reject this booking.');
    }

    assertTransition(booking.status, BOOKING_STATUSES.REJECTED);

    return booking.status === BOOKING_STATUSES.REJECTED
      ? null
      : {
        status: BOOKING_STATUSES.REJECTED,
        providerDecision: {
          type: 'rejected',
          reason,
          proposedStartAt: null,
          decidedAt: now,
        },
      };
  });
}

export async function proposeBookingRescheduleService(
  { db }: BookingDeps,
  providerId: string,
  rawPayload: BookingActionPayload,
) {
  const {
    bookingId,
    reason,
    scheduledDateKey,
    scheduledStartTime,
    timezone,
  } = normalizeActionPayload(rawPayload);
  await getProviderActorForBooking(db, providerId);

  return mutateBooking({ db }, bookingId, providerId, 'booking.reschedule', async (booking, now) => {
    if (booking.providerId !== providerId) {
      throw permissionDenied('Only the assigned provider can reschedule this booking.');
    }

    if (!scheduledDateKey || !scheduledStartTime) {
      throw badRequest('A new booking date and time are required.');
    }

    assertTransition(booking.status, BOOKING_STATUSES.RESCHEDULE_PROPOSED);
    const availability = await fetchProviderAvailabilityProfile({ db }, providerId);
    const estimatedHours = normalizeEstimatedHours(booking.requestDetails?.estimatedHours);
    ensureSlotFitsAvailability(availability, scheduledDateKey, scheduledStartTime, estimatedHours);

    const scheduledStartDate = zonedDateTimeToDate(scheduledDateKey, scheduledStartTime, timezone || booking.timezone || DEFAULT_TIMEZONE);
    const scheduledEndDate = new Date(scheduledStartDate.getTime() + (estimatedHours * 60 * 60 * 1000));
    const nextStartTimestamp = Timestamp.fromDate(scheduledStartDate);

    return {
      status: BOOKING_STATUSES.RESCHEDULE_PROPOSED,
      scheduledStartAt: nextStartTimestamp,
      scheduledEndAt: Timestamp.fromDate(scheduledEndDate),
      timezone: timezone || booking.timezone || DEFAULT_TIMEZONE,
      providerDecision: {
        type: 'reschedule_proposed',
        reason: reason || null,
        proposedStartAt: nextStartTimestamp,
        decidedAt: now,
      },
    };
  });
}

export async function cancelBookingService(
  { db }: BookingDeps,
  actorUid: string,
  rawPayload: BookingActionPayload,
) {
  const { bookingId, reason } = normalizeActionPayload(rawPayload);

  return mutateBooking({ db }, bookingId, actorUid, 'booking.cancel', async (booking, now) => {
    if (booking.userId === actorUid) {
      assertTransition(booking.status, BOOKING_STATUSES.CANCELLED_BY_USER);

      return booking.status === BOOKING_STATUSES.CANCELLED_BY_USER
        ? null
        : {
          status: BOOKING_STATUSES.CANCELLED_BY_USER,
          cancellation: {
            cancelledBy: 'user',
            reason: reason || null,
            cancelledAt: now,
          },
        };
    }

    if (booking.providerId === actorUid) {
      await getProviderActorForBooking(db, actorUid);
      assertTransition(booking.status, BOOKING_STATUSES.CANCELLED_BY_PROVIDER);

      return booking.status === BOOKING_STATUSES.CANCELLED_BY_PROVIDER
        ? null
        : {
          status: BOOKING_STATUSES.CANCELLED_BY_PROVIDER,
          cancellation: {
            cancelledBy: 'provider',
            reason: reason || null,
            cancelledAt: now,
          },
        };
    }

    throw permissionDenied('Only the booking user or assigned provider can cancel this booking.');
  });
}

export async function completeBookingService(
  { db }: BookingDeps,
  providerId: string,
  rawPayload: BookingActionPayload,
) {
  const { bookingId } = normalizeActionPayload(rawPayload);
  await getProviderActorForBooking(db, providerId);

  return mutateBooking({ db }, bookingId, providerId, 'booking.complete', async (booking, now) => {
    if (booking.providerId !== providerId) {
      throw permissionDenied('Only the assigned provider can complete this booking.');
    }

    assertTransition(booking.status, BOOKING_STATUSES.COMPLETED);

    return booking.status === BOOKING_STATUSES.COMPLETED
      ? null
      : {
        status: BOOKING_STATUSES.COMPLETED,
        completion: {
          completedAt: now,
          completedBy: providerId,
        },
      };
  });
}

export async function updateBookingPaymentSummaryService(
  { db }: BookingDeps,
  userId: string,
  rawPayload: {
    bookingId?: unknown,
    paymentSummary?: {
      status?: unknown,
      method?: unknown,
      last4?: unknown,
      transactionId?: unknown,
    } | null,
  },
) {
  const bookingId = sanitizeString(rawPayload.bookingId);

  if (!bookingId) {
    throw badRequest('Booking id is required.');
  }

  const patch = normalizePaymentSummary(rawPayload.paymentSummary);
  const bookingRef = db.collection('bookings').doc(bookingId);
  const result = await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);

    if (!bookingSnap.exists) {
      throw failedPrecondition('Booking is missing.');
    }

    const booking = normalizeStoredBooking(bookingId, bookingSnap.data() || {});

    if (booking.userId !== userId) {
      throw permissionDenied('Only the booking owner can update payment summary.');
    }

    const closedBookingStatuses: string[] = [
      BOOKING_STATUSES.REJECTED,
      BOOKING_STATUSES.CANCELLED_BY_USER,
      BOOKING_STATUSES.CANCELLED_BY_PROVIDER,
      BOOKING_STATUSES.COMPLETED,
    ];

    if (closedBookingStatuses.includes(booking.status)) {
      throw failedPrecondition('Payment summary cannot be updated for a closed booking.');
    }

    const now = Timestamp.now();
    const paymentId = sanitizeString(booking.paymentSummary?.paymentId) || buildPaymentId(bookingId);
    const previousPaymentStatus = sanitizeString(booking.paymentSummary?.status) || PAYMENT_SUMMARY_STATUSES.UNPAID;
    const nextPaymentSummary = {
      ...booking.paymentSummary,
      ...patch,
      paymentId,
      transactionId: patch.transactionId
        || booking.paymentSummary?.transactionId
        || (patch.status === PAYMENT_SUMMARY_STATUSES.PAID ? createTransactionId() : null),
      updatedAt: now,
    };

    assertPaymentSummaryInvariants(booking.status, sanitizeString(nextPaymentSummary.status));

    const nextBooking = normalizeStoredBooking(bookingId, {
      ...booking,
      paymentSummary: nextPaymentSummary,
      updatedAt: now,
      updatedBy: userId,
    });
    const paymentRef = db.collection('payments').doc(paymentId);

    transaction.set(bookingRef, {
      paymentSummary: nextPaymentSummary,
      updatedAt: now,
      updatedBy: userId,
    }, { merge: true });
    transaction.set(paymentRef, buildPaymentDocument({
      paymentId,
      booking: nextBooking,
      paymentSummary: nextPaymentSummary,
      now,
    }), { merge: true });

    return {
      booking: nextBooking,
      paymentId,
      previousPaymentStatus,
      nextPaymentStatus: sanitizeString(nextPaymentSummary.status) || PAYMENT_SUMMARY_STATUSES.UNPAID,
    };
  });

  writeStructuredLog('info', {
    action: 'booking.payment_summary.update',
    uid: userId,
    role: 'user',
    resourceType: 'payment',
    resourceId: result.paymentId,
    statusFrom: result.previousPaymentStatus,
    statusTo: result.nextPaymentStatus,
    outcome: 'success',
  }, 'Booking payment summary was updated.');

  await writeAuditEvent({ db }, {
    action: 'payment.summary.update',
    actorUid: userId,
    actorRole: 'user',
    resourceType: 'payment',
    resourceId: result.paymentId,
    statusFrom: result.previousPaymentStatus,
    statusTo: result.nextPaymentStatus,
    result: 'success',
    context: {
      bookingId: result.booking.bookingId,
      providerId: result.booking.providerId,
      userId: result.booking.userId,
    },
  });

  return {
    booking: serializeBookingForClient(result.booking),
  };
}
