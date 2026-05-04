"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingRequestService = createBookingRequestService;
exports.confirmBookingService = confirmBookingService;
exports.rejectBookingService = rejectBookingService;
exports.proposeBookingRescheduleService = proposeBookingRescheduleService;
exports.cancelBookingService = cancelBookingService;
exports.completeBookingService = completeBookingService;
exports.updateBookingPaymentSummaryService = updateBookingPaymentSummaryService;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const audit_1 = require("./audit");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const shared_1 = require("./shared");
const providerAvailability_1 = require("./providerAvailability");
const chat_1 = require("./chat");
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
    DEMO: 'demo',
    UNKNOWN: 'unknown',
});
const DEFAULT_TIMEZONE = 'Europe/Bucharest';
const HOURS_LIMIT = 12;
const BOOKING_SCHEMA_VERSION = 1;
const PAYMENT_SCHEMA_VERSION = 1;
function isBookingStatus(value) {
    return typeof value === 'string' && Object.values(BOOKING_STATUSES).includes(value);
}
function isPaymentSummaryStatus(value) {
    return typeof value === 'string' && Object.values(PAYMENT_SUMMARY_STATUSES).includes(value);
}
function isPaymentMethod(value) {
    return typeof value === 'string' && Object.values(PAYMENT_METHODS).includes(value);
}
function normalizeEstimatedHours(value) {
    const nextValue = Number(value);
    if (!Number.isInteger(nextValue) || nextValue <= 0 || nextValue > HOURS_LIMIT) {
        throw (0, errors_1.badRequest)(`Estimated hours must be an integer between 1 and ${HOURS_LIMIT}.`);
    }
    return nextValue;
}
function normalizeDateKey(value) {
    const nextValue = (0, shared_1.sanitizeString)(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
        throw (0, errors_1.badRequest)('Use a valid booking date in YYYY-MM-DD format.');
    }
    return nextValue;
}
function normalizeTimeValue(value) {
    const nextValue = (0, shared_1.sanitizeString)(value);
    if (!/^\d{2}:\d{2}$/.test(nextValue)) {
        throw (0, errors_1.badRequest)('Use a valid booking time in HH:MM format.');
    }
    return nextValue;
}
function normalizeTimezone(value) {
    return (0, shared_1.sanitizeString)(value) || DEFAULT_TIMEZONE;
}
function normalizeRequestDetails(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const description = (0, shared_1.sanitizeString)(source?.description);
    if (!description) {
        throw (0, errors_1.badRequest)('Booking request details are required.');
    }
    return {
        description,
        estimatedHours: normalizeEstimatedHours(source?.estimatedHours),
    };
}
function normalizePaymentSummary(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const status = isPaymentSummaryStatus(source?.status)
        ? source?.status
        : PAYMENT_SUMMARY_STATUSES.UNPAID;
    const method = isPaymentMethod(source?.method)
        ? source?.method
        : PAYMENT_METHODS.CARD;
    const last4 = (0, shared_1.sanitizeString)(source?.last4).slice(-4) || null;
    const transactionId = (0, shared_1.sanitizeString)(source?.transactionId) || null;
    return {
        paymentId: null,
        status,
        method,
        last4,
        transactionId,
        processor: null,
    };
}
function createTransactionId() {
    const entropy = (0, node_crypto_1.randomUUID)().slice(0, 6).toUpperCase();
    return `TX-${Date.now()}-${entropy}`;
}
function buildPaymentId(bookingId) {
    return `pay_${bookingId}`;
}
function buildIdempotencyScopeKey(ownerUid, action, rawKey) {
    return `${ownerUid}:${action}:${(0, shared_1.sanitizeString)(rawKey)}`;
}
function hashPayload(payload) {
    return (0, node_crypto_1.createHash)('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');
}
function parseTimeToMinutes(timeValue) {
    const [hours, minutes] = timeValue.split(':').map(Number);
    return (hours * 60) + minutes;
}
function getTimeZoneParts(date, timeZone) {
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
    }, {});
}
function getTimeZoneOffsetMinutes(date, timeZone) {
    const parts = getTimeZoneParts(date, timeZone);
    const utcEquivalent = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    return (utcEquivalent - date.getTime()) / 60000;
}
function zonedDateTimeToDate(dateKey, timeValue, timeZone) {
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
function getWeekDayKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const utcDay = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][utcDay];
}
function ensureSlotFitsAvailability(availability, dateKey, startTime, estimatedHours) {
    const blockedDateKeys = Array.isArray(availability?.blockedDates)
        ? availability.blockedDates.map((item) => (0, shared_1.sanitizeString)(item?.dateKey))
        : [];
    if (blockedDateKeys.includes(dateKey)) {
        throw (0, errors_1.failedPrecondition)('The selected date is blocked in provider availability.');
    }
    const scheduleDay = Array.isArray(availability?.weekSchedule)
        ? availability.weekSchedule.find((day) => (0, shared_1.sanitizeString)(day?.dayKey) === getWeekDayKey(dateKey))
        : null;
    if (!scheduleDay?.isEnabled || !Array.isArray(scheduleDay?.timeRanges) || !scheduleDay.timeRanges.length) {
        throw (0, errors_1.failedPrecondition)('The provider is not available for the selected date.');
    }
    const requestedStartMinutes = parseTimeToMinutes(startTime);
    const requestedEndMinutes = requestedStartMinutes + (estimatedHours * 60);
    const fitsInSchedule = scheduleDay.timeRanges.some((range) => {
        const rangeStart = parseTimeToMinutes(normalizeTimeValue(range?.startTime));
        const rangeEnd = parseTimeToMinutes(normalizeTimeValue(range?.endTime));
        return requestedStartMinutes >= rangeStart && requestedEndMinutes <= rangeEnd;
    });
    if (!fitsInSchedule) {
        throw (0, errors_1.failedPrecondition)('The selected booking window does not fit the provider schedule.');
    }
}
function assertTransition(currentStatus, nextStatus) {
    if (currentStatus === nextStatus) {
        return;
    }
    const allowedTransitions = {
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
        throw (0, errors_1.failedPrecondition)(`Booking cannot transition from ${currentStatus} to ${nextStatus}.`);
    }
}
function normalizeStoredBooking(bookingId, payload) {
    const status = isBookingStatus(payload?.status)
        ? payload.status
        : BOOKING_STATUSES.REQUESTED;
    return {
        bookingId: (0, shared_1.sanitizeString)(payload?.bookingId) || bookingId,
        userId: (0, shared_1.sanitizeString)(payload?.userId),
        providerId: (0, shared_1.sanitizeString)(payload?.providerId),
        serviceId: (0, shared_1.sanitizeString)(payload?.serviceId),
        conversationId: (0, shared_1.sanitizeString)(payload?.conversationId) || null,
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
        createdBy: (0, shared_1.sanitizeString)(payload?.createdBy),
        updatedBy: (0, shared_1.sanitizeString)(payload?.updatedBy),
        schemaVersion: Number(payload?.schemaVersion) || BOOKING_SCHEMA_VERSION,
    };
}
function serializeTimestamp(value) {
    if (!value) {
        return null;
    }
    if (value instanceof firestore_1.Timestamp) {
        return value.toDate().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value?.toDate === 'function') {
        return value.toDate().toISOString();
    }
    const parsedValue = new Date(String(value));
    return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}
function serializeBookingForClient(booking) {
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
function assertPaymentSummaryInvariants(bookingStatus, paymentStatus) {
    const rejectedOrCancelledStatuses = [
        BOOKING_STATUSES.REJECTED,
        BOOKING_STATUSES.CANCELLED_BY_USER,
        BOOKING_STATUSES.CANCELLED_BY_PROVIDER,
    ];
    if (paymentStatus === PAYMENT_SUMMARY_STATUSES.PAID
        && rejectedOrCancelledStatuses.includes(bookingStatus)) {
        throw (0, errors_1.failedPrecondition)('A rejected or cancelled booking cannot be marked as paid.');
    }
    if (paymentStatus === PAYMENT_SUMMARY_STATUSES.FAILED
        && bookingStatus === BOOKING_STATUSES.COMPLETED) {
        throw (0, errors_1.failedPrecondition)('A completed booking cannot end with a failed payment summary.');
    }
}
function buildPaymentDocument({ paymentId, booking, paymentSummary, now, }) {
    const pricingSnapshot = booking.pricingSnapshot || {};
    return {
        paymentId,
        bookingId: booking.bookingId,
        userId: booking.userId,
        providerId: booking.providerId,
        status: paymentSummary.status || PAYMENT_SUMMARY_STATUSES.UNPAID,
        method: paymentSummary.method || PAYMENT_METHODS.CARD,
        amount: Number(pricingSnapshot.amount) || 0,
        currency: (0, shared_1.sanitizeString)(pricingSnapshot.currency) || 'RON',
        processor: paymentSummary.processor || 'manual_mvp',
        last4: paymentSummary.last4 || null,
        transactionId: paymentSummary.transactionId || null,
        stripePaymentIntentId: paymentSummary.stripePaymentIntentId || null,
        stripeLatestChargeId: paymentSummary.stripeLatestChargeId || null,
        stripeStatus: paymentSummary.stripeStatus || null,
        createdAt: booking.createdAt || now,
        updatedAt: now,
        updatedBy: booking.updatedBy || booking.userId,
        schemaVersion: PAYMENT_SCHEMA_VERSION,
    };
}
function buildBookingDocument({ bookingId, userId, providerId, serviceId, scheduledStartAt, scheduledEndAt, timezone, requestDetails, paymentSummary, address, userData, providerData, serviceData, now, paymentId, }) {
    const amount = Number(serviceData.baseRateAmount) * requestDetails.estimatedHours;
    const currency = (0, shared_1.sanitizeString)(serviceData.baseRateCurrency) || 'RON';
    const providerDisplayName = (0, shared_1.sanitizeString)(providerData?.professionalProfile?.businessName)
        || (0, shared_1.sanitizeString)(providerData?.professionalProfile?.displayName)
        || 'Prestator';
    const conversationId = (0, chat_1.bookingConversationId)(bookingId);
    return {
        bookingId,
        userId,
        providerId,
        serviceId,
        conversationId,
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
            transactionId: paymentSummary.transactionId
                || (paymentSummary.status === PAYMENT_SUMMARY_STATUSES.PAID ? createTransactionId() : null),
            updatedAt: now,
        },
        userSnapshot: {
            displayName: (0, shared_1.sanitizeString)(userData.displayName) || 'Client',
            photoPath: (0, shared_1.sanitizeString)(userData.photoPath) || null,
            primaryLocation: {
                formattedAddress: address,
            },
        },
        providerSnapshot: {
            displayName: providerDisplayName,
            avatarPath: (0, shared_1.sanitizeString)(providerData?.professionalProfile?.avatarPath) || null,
            statusAtBookingTime: (0, shared_1.sanitizeString)(providerData.status) || shared_1.PROVIDER_STATUSES.APPROVED,
        },
        serviceSnapshot: {
            name: (0, shared_1.sanitizeString)(serviceData.name) || 'Serviciu',
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
async function getBookingForExistingIdempotency(db, resourceId) {
    const bookingSnap = await db.collection('bookings').doc(resourceId).get();
    if (!bookingSnap.exists) {
        throw (0, errors_1.internalError)('The stored idempotency key points to a missing booking.');
    }
    return normalizeStoredBooking(bookingSnap.id, bookingSnap.data() || {});
}
async function createBookingRequestService({ db }, userId, rawPayload) {
    const providerId = (0, shared_1.sanitizeString)(rawPayload.providerId);
    const serviceId = (0, shared_1.sanitizeString)(rawPayload.serviceId);
    const scheduledDateKey = normalizeDateKey(rawPayload.scheduledDateKey);
    const scheduledStartTime = normalizeTimeValue(rawPayload.scheduledStartTime);
    const timezone = normalizeTimezone(rawPayload.timezone);
    const requestDetails = normalizeRequestDetails(rawPayload.requestDetails);
    const paymentSummary = normalizePaymentSummary(rawPayload.paymentSummary);
    const address = (0, shared_1.sanitizeString)(rawPayload.address);
    if (!providerId || !serviceId || !address) {
        throw (0, errors_1.badRequest)('Booking payload is incomplete.');
    }
    const idempotencyKey = (0, shared_1.sanitizeString)(rawPayload.idempotencyKey) || (0, node_crypto_1.randomUUID)();
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
            if ((0, shared_1.sanitizeString)(idempotencyData.ownerUid) !== userId || (0, shared_1.sanitizeString)(idempotencyData.requestHash) !== requestFingerprint) {
                throw (0, errors_1.failedPrecondition)('This booking idempotency key was already used with a different payload.');
            }
            return {
                booking: await getBookingForExistingIdempotency(db, (0, shared_1.sanitizeString)(idempotencyData.resourceId)),
                created: false,
            };
        }
        if (!userSnap.exists) {
            throw (0, errors_1.failedPrecondition)('User profile is missing.');
        }
        if (!providerSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Provider profile is missing.');
        }
        if (!serviceSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Provider service is missing.');
        }
        const userData = userSnap.data() || {};
        const providerData = providerSnap.data() || {};
        const serviceData = serviceSnap.data() || {};
        if ((0, shared_1.sanitizeString)(userData.role) !== 'user' || (0, shared_1.sanitizeString)(userData.accountStatus) !== 'active') {
            throw (0, errors_1.failedPrecondition)('Only active user accounts can create bookings.');
        }
        if ((0, shared_1.sanitizeString)(providerData.role) !== 'provider' || (0, shared_1.sanitizeString)(providerData.status) !== shared_1.PROVIDER_STATUSES.APPROVED) {
            throw (0, errors_1.failedPrecondition)('Bookings can only be created for approved providers.');
        }
        if ((0, shared_1.sanitizeString)(serviceData.providerId) !== providerId || (0, shared_1.sanitizeString)(serviceData.status) !== 'active') {
            throw (0, errors_1.failedPrecondition)('Bookings can only target active provider services.');
        }
        ensureSlotFitsAvailability(availabilitySnap.exists
            ? (availabilitySnap.data() || {})
            : (0, providerAvailability_1.normalizeProviderAvailabilityData)(null), scheduledDateKey, scheduledStartTime, requestDetails.estimatedHours);
        const scheduledStartDate = zonedDateTimeToDate(scheduledDateKey, scheduledStartTime, timezone);
        const scheduledEndDate = new Date(scheduledStartDate.getTime() + (requestDetails.estimatedHours * 60 * 60 * 1000));
        const now = firestore_1.Timestamp.now();
        const bookingRef = db.collection('bookings').doc();
        const paymentId = buildPaymentId(bookingRef.id);
        const booking = buildBookingDocument({
            bookingId: bookingRef.id,
            userId,
            providerId,
            serviceId,
            scheduledStartAt: firestore_1.Timestamp.fromDate(scheduledStartDate),
            scheduledEndAt: firestore_1.Timestamp.fromDate(scheduledEndDate),
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
        (0, chat_1.writeBookingConversationDocuments)({
            db,
            transaction,
            booking,
            now,
        });
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
            expiresAt: firestore_1.Timestamp.fromMillis(now.toMillis() + (24 * 60 * 60 * 1000)),
        });
        return {
            booking,
            created: true,
        };
    });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'booking.create',
        uid: userId,
        role: 'user',
        resourceType: 'booking',
        resourceId: result.booking.bookingId,
        statusTo: result.booking.status,
        outcome: result.created ? 'created' : 'idempotent_replay',
    }, 'Booking request was processed.');
    await (0, audit_1.writeAuditEvent)({ db }, {
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
async function getProviderActorForBooking(db, providerId) {
    const providerSnap = await db.collection('providers').doc(providerId).get();
    if (!providerSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Provider profile is missing.');
    }
    const providerData = providerSnap.data() || {};
    if ((0, shared_1.sanitizeString)(providerData.role) !== 'provider' || (0, shared_1.sanitizeString)(providerData.status) !== shared_1.PROVIDER_STATUSES.APPROVED) {
        throw (0, errors_1.failedPrecondition)('Only approved providers can manage booking lifecycle actions.');
    }
    return providerData;
}
function normalizeActionPayload(rawPayload) {
    const bookingId = (0, shared_1.sanitizeString)(rawPayload.bookingId);
    if (!bookingId) {
        throw (0, errors_1.badRequest)('Booking id is required.');
    }
    return {
        bookingId,
        reason: (0, shared_1.sanitizeString)(rawPayload.reason),
        scheduledDateKey: rawPayload.scheduledDateKey != null ? normalizeDateKey(rawPayload.scheduledDateKey) : '',
        scheduledStartTime: rawPayload.scheduledStartTime != null ? normalizeTimeValue(rawPayload.scheduledStartTime) : '',
        timezone: rawPayload.timezone != null ? normalizeTimezone(rawPayload.timezone) : DEFAULT_TIMEZONE,
    };
}
async function mutateBooking({ db }, bookingId, actorUid, action, updater) {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const result = await db.runTransaction(async (transaction) => {
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Booking is missing.');
        }
        const booking = normalizeStoredBooking(bookingId, bookingSnap.data() || {});
        const now = firestore_1.Timestamp.now();
        const previousStatus = booking.status;
        const patch = await updater(booking, now, transaction);
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
    (0, logging_1.writeStructuredLog)('info', {
        action,
        uid: actorUid,
        role: actorRole,
        resourceType: 'booking',
        resourceId: result.booking.bookingId,
        statusFrom: result.previousStatus,
        statusTo: result.booking.status,
        outcome,
    }, 'Booking lifecycle action completed.');
    await (0, audit_1.writeAuditEvent)({ db }, {
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
async function confirmBookingService({ db }, providerId, rawPayload) {
    const { bookingId } = normalizeActionPayload(rawPayload);
    await getProviderActorForBooking(db, providerId);
    return mutateBooking({ db }, bookingId, providerId, 'booking.confirm', async (booking) => {
        if (booking.providerId !== providerId) {
            throw (0, errors_1.permissionDenied)('Only the assigned provider can confirm this booking.');
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
async function rejectBookingService({ db }, providerId, rawPayload) {
    const { bookingId, reason } = normalizeActionPayload(rawPayload);
    if (!reason) {
        throw (0, errors_1.badRequest)('Reject reason is required.');
    }
    await getProviderActorForBooking(db, providerId);
    return mutateBooking({ db }, bookingId, providerId, 'booking.reject', async (booking, now) => {
        if (booking.providerId !== providerId) {
            throw (0, errors_1.permissionDenied)('Only the assigned provider can reject this booking.');
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
async function proposeBookingRescheduleService({ db }, providerId, rawPayload) {
    const { bookingId, reason, scheduledDateKey, scheduledStartTime, timezone, } = normalizeActionPayload(rawPayload);
    await getProviderActorForBooking(db, providerId);
    return mutateBooking({ db }, bookingId, providerId, 'booking.reschedule', async (booking, now, transaction) => {
        if (booking.providerId !== providerId) {
            throw (0, errors_1.permissionDenied)('Only the assigned provider can reschedule this booking.');
        }
        if (!scheduledDateKey || !scheduledStartTime) {
            throw (0, errors_1.badRequest)('A new booking date and time are required.');
        }
        assertTransition(booking.status, BOOKING_STATUSES.RESCHEDULE_PROPOSED);
        const availabilityRef = db.collection('providers').doc(providerId).collection('availability').doc('profile');
        const availabilitySnap = await transaction.get(availabilityRef);
        const availability = availabilitySnap.exists
            ? (availabilitySnap.data() || {})
            : (0, providerAvailability_1.normalizeProviderAvailabilityData)(null);
        const estimatedHours = normalizeEstimatedHours(booking.requestDetails?.estimatedHours);
        ensureSlotFitsAvailability(availability, scheduledDateKey, scheduledStartTime, estimatedHours);
        const scheduledStartDate = zonedDateTimeToDate(scheduledDateKey, scheduledStartTime, timezone || booking.timezone || DEFAULT_TIMEZONE);
        const scheduledEndDate = new Date(scheduledStartDate.getTime() + (estimatedHours * 60 * 60 * 1000));
        const nextStartTimestamp = firestore_1.Timestamp.fromDate(scheduledStartDate);
        return {
            status: BOOKING_STATUSES.RESCHEDULE_PROPOSED,
            scheduledStartAt: nextStartTimestamp,
            scheduledEndAt: firestore_1.Timestamp.fromDate(scheduledEndDate),
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
async function cancelBookingService({ db }, actorUid, rawPayload) {
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
        throw (0, errors_1.permissionDenied)('Only the booking user or assigned provider can cancel this booking.');
    });
}
async function completeBookingService({ db }, providerId, rawPayload) {
    const { bookingId } = normalizeActionPayload(rawPayload);
    await getProviderActorForBooking(db, providerId);
    return mutateBooking({ db }, bookingId, providerId, 'booking.complete', async (booking, now) => {
        if (booking.providerId !== providerId) {
            throw (0, errors_1.permissionDenied)('Only the assigned provider can complete this booking.');
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
async function updateBookingPaymentSummaryService({ db }, userId, rawPayload) {
    const bookingId = (0, shared_1.sanitizeString)(rawPayload.bookingId);
    if (!bookingId) {
        throw (0, errors_1.badRequest)('Booking id is required.');
    }
    const patch = normalizePaymentSummary(rawPayload.paymentSummary);
    if (patch.status === PAYMENT_SUMMARY_STATUSES.PAID) {
        throw (0, errors_1.permissionDenied)('Payment confirmation must be received from the payment processor.');
    }
    const bookingRef = db.collection('bookings').doc(bookingId);
    const result = await db.runTransaction(async (transaction) => {
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Booking is missing.');
        }
        const booking = normalizeStoredBooking(bookingId, bookingSnap.data() || {});
        if (booking.userId !== userId) {
            throw (0, errors_1.permissionDenied)('Only the booking owner can update payment summary.');
        }
        const closedBookingStatuses = [
            BOOKING_STATUSES.REJECTED,
            BOOKING_STATUSES.CANCELLED_BY_USER,
            BOOKING_STATUSES.CANCELLED_BY_PROVIDER,
            BOOKING_STATUSES.COMPLETED,
        ];
        if (closedBookingStatuses.includes(booking.status)) {
            throw (0, errors_1.failedPrecondition)('Payment summary cannot be updated for a closed booking.');
        }
        const now = firestore_1.Timestamp.now();
        const paymentId = (0, shared_1.sanitizeString)(booking.paymentSummary?.paymentId) || buildPaymentId(bookingId);
        const previousPaymentStatus = (0, shared_1.sanitizeString)(booking.paymentSummary?.status) || PAYMENT_SUMMARY_STATUSES.UNPAID;
        const nextPaymentSummary = {
            ...booking.paymentSummary,
            ...patch,
            paymentId,
            transactionId: patch.transactionId
                || booking.paymentSummary?.transactionId
                || (patch.status === PAYMENT_SUMMARY_STATUSES.PAID ? createTransactionId() : null),
            updatedAt: now,
        };
        assertPaymentSummaryInvariants(booking.status, (0, shared_1.sanitizeString)(nextPaymentSummary.status));
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
            nextPaymentStatus: (0, shared_1.sanitizeString)(nextPaymentSummary.status) || PAYMENT_SUMMARY_STATUSES.UNPAID,
        };
    });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'booking.payment_summary.update',
        uid: userId,
        role: 'user',
        resourceType: 'payment',
        resourceId: result.paymentId,
        statusFrom: result.previousPaymentStatus,
        statusTo: result.nextPaymentStatus,
        outcome: 'success',
    }, 'Booking payment summary was updated.');
    await (0, audit_1.writeAuditEvent)({ db }, {
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
