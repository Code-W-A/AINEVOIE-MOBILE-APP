"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripeClient = createStripeClient;
exports.createStripePaymentSheetSessionService = createStripePaymentSheetSessionService;
exports.completeDemoPaymentService = completeDemoPaymentService;
exports.handleStripeWebhookEventService = handleStripeWebhookEventService;
const node_crypto_1 = require("node:crypto");
const stripe_1 = __importDefault(require("stripe"));
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const shared_1 = require("./shared");
const audit_1 = require("./audit");
const PAYMENT_STATUSES = Object.freeze({
    UNPAID: 'unpaid',
    IN_PROGRESS: 'in_progress',
    PAID: 'paid',
    FAILED: 'failed',
});
const BOOKING_STATUSES = Object.freeze({
    CONFIRMED: 'confirmed',
});
const SUPPORTED_SESSION_PAYMENT_STATUSES = new Set([
    PAYMENT_STATUSES.UNPAID,
    PAYMENT_STATUSES.FAILED,
]);
const REUSABLE_PAYMENT_INTENT_STATUSES = new Set([
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
]);
const ZERO_DECIMAL_CURRENCIES = new Set([
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
]);
function createStripeClient(secretKey) {
    return new stripe_1.default(secretKey, {
        apiVersion: '2026-02-25.clover',
    });
}
function readBookingId(rawPayload) {
    const bookingId = (0, shared_1.sanitizeString)(rawPayload.bookingId);
    if (!bookingId) {
        throw (0, errors_1.badRequest)('Booking id is required.');
    }
    return bookingId;
}
function buildPaymentId(bookingId) {
    return `pay_${bookingId}`;
}
function buildDemoTransactionId() {
    const entropy = (0, node_crypto_1.randomUUID)().slice(0, 6).toUpperCase();
    return `DEMO-${Date.now()}-${entropy}`;
}
function normalizeCurrency(value) {
    return ((0, shared_1.sanitizeString)(value) || 'RON').toLowerCase();
}
function toMinorAmount(amount, currency) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw (0, errors_1.failedPrecondition)('Booking pricing is missing or invalid.');
    }
    return ZERO_DECIMAL_CURRENCIES.has(currency)
        ? Math.round(numericAmount)
        : Math.round(numericAmount * 100);
}
function normalizeStripePaymentIntentId(value) {
    if (typeof value === 'string') {
        return (0, shared_1.sanitizeString)(value);
    }
    if (value && typeof value === 'object' && typeof value.id === 'string') {
        return (0, shared_1.sanitizeString)(value.id);
    }
    return '';
}
async function getReusablePaymentIntent(stripe, paymentIntentId) {
    if (!paymentIntentId) {
        return null;
    }
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return REUSABLE_PAYMENT_INTENT_STATUSES.has(paymentIntent.status) ? paymentIntent : null;
    }
    catch (error) {
        (0, logging_1.writeStructuredLog)('warn', {
            action: 'stripe.payment_intent.retrieve',
            resourceType: 'paymentIntent',
            resourceId: paymentIntentId,
            outcome: 'failure',
            reasonCode: error instanceof Error ? error.name : 'stripe_retrieve_failed',
        }, 'Could not retrieve an existing Stripe PaymentIntent.');
        return null;
    }
}
function getLatestChargeId(paymentIntent) {
    return normalizeStripePaymentIntentId(paymentIntent.latest_charge);
}
async function getLatestCharge(stripe, paymentIntent) {
    const chargeId = getLatestChargeId(paymentIntent);
    if (!chargeId) {
        return null;
    }
    try {
        return await stripe.charges.retrieve(chargeId);
    }
    catch (error) {
        (0, logging_1.writeStructuredLog)('warn', {
            action: 'stripe.charge.retrieve',
            resourceType: 'charge',
            resourceId: chargeId,
            outcome: 'failure',
            reasonCode: error instanceof Error ? error.name : 'stripe_charge_retrieve_failed',
        }, 'Could not retrieve Stripe charge details.');
        return null;
    }
}
function resolvePaymentMethod(charge) {
    const details = charge?.payment_method_details;
    if (details?.type === 'card') {
        const walletType = details.card?.wallet?.type;
        if (walletType === 'apple_pay') {
            return 'apple_pay';
        }
        if (walletType === 'google_pay') {
            return 'google_pay';
        }
        return 'card';
    }
    return 'unknown';
}
function resolveLast4(charge) {
    const details = charge?.payment_method_details;
    return details?.type === 'card' ? (0, shared_1.sanitizeString)(details.card?.last4).slice(-4) || null : null;
}
async function createStripePaymentSheetSessionService({ db, stripe }, userId, rawPayload) {
    const bookingId = readBookingId(rawPayload);
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Booking is missing.');
    }
    const booking = bookingSnap.data() || {};
    if ((0, shared_1.sanitizeString)(booking.userId) !== userId) {
        throw (0, errors_1.permissionDenied)('Only the booking owner can pay this booking.');
    }
    if ((0, shared_1.sanitizeString)(booking.status) !== BOOKING_STATUSES.CONFIRMED) {
        throw (0, errors_1.failedPrecondition)('Booking must be confirmed before payment.');
    }
    const currentPaymentStatus = (0, shared_1.sanitizeString)(booking.paymentSummary?.status) || PAYMENT_STATUSES.UNPAID;
    if (!SUPPORTED_SESSION_PAYMENT_STATUSES.has(currentPaymentStatus)) {
        throw (0, errors_1.failedPrecondition)('This booking is not payable.');
    }
    const pricingSnapshot = booking.pricingSnapshot || {};
    const currency = normalizeCurrency(pricingSnapshot.currency);
    const amountMinor = toMinorAmount(pricingSnapshot.amount, currency);
    const paymentId = (0, shared_1.sanitizeString)(booking.paymentSummary?.paymentId) || buildPaymentId(bookingId);
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentSnap = await paymentRef.get();
    const paymentData = paymentSnap.exists ? paymentSnap.data() || {} : {};
    const existingPaymentIntentId = (0, shared_1.sanitizeString)(paymentData.stripePaymentIntentId)
        || (0, shared_1.sanitizeString)(booking.paymentSummary?.stripePaymentIntentId);
    const reusablePaymentIntent = await getReusablePaymentIntent(stripe, existingPaymentIntentId);
    const paymentIntent = reusablePaymentIntent || await stripe.paymentIntents.create({
        amount: amountMinor,
        currency,
        automatic_payment_methods: {
            enabled: true,
        },
        metadata: {
            bookingId,
            paymentId,
            userId,
            providerId: (0, shared_1.sanitizeString)(booking.providerId),
        },
        description: `AI Nevoie booking ${bookingId}`,
    });
    if (!paymentIntent.client_secret) {
        throw (0, errors_1.failedPrecondition)('Stripe did not return a payment client secret.');
    }
    const now = firestore_1.Timestamp.now();
    const paymentPatch = {
        paymentId,
        bookingId,
        userId,
        providerId: (0, shared_1.sanitizeString)(booking.providerId),
        status: currentPaymentStatus,
        method: (0, shared_1.sanitizeString)(booking.paymentSummary?.method) || 'unknown',
        amount: Number(pricingSnapshot.amount) || 0,
        currency: currency.toUpperCase(),
        processor: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        stripeLatestChargeId: getLatestChargeId(paymentIntent) || null,
        stripeStatus: paymentIntent.status,
        transactionId: (0, shared_1.sanitizeString)(booking.paymentSummary?.transactionId) || null,
        last4: (0, shared_1.sanitizeString)(booking.paymentSummary?.last4) || null,
        createdAt: paymentData.createdAt || now,
        updatedAt: now,
        updatedBy: userId,
        schemaVersion: 1,
    };
    const nextPaymentSummary = {
        ...booking.paymentSummary,
        paymentId,
        status: currentPaymentStatus,
        method: (0, shared_1.sanitizeString)(booking.paymentSummary?.method) || 'unknown',
        processor: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        stripeLatestChargeId: getLatestChargeId(paymentIntent) || null,
        stripeStatus: paymentIntent.status,
        updatedAt: now,
    };
    await db.runTransaction(async (transaction) => {
        transaction.set(paymentRef, paymentPatch, { merge: true });
        transaction.set(bookingRef, {
            paymentSummary: nextPaymentSummary,
            updatedAt: now,
            updatedBy: userId,
        }, { merge: true });
    });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'stripe.payment_sheet_session.create',
        uid: userId,
        role: 'user',
        resourceType: 'payment',
        resourceId: paymentId,
        stripePaymentIntentId: paymentIntent.id,
        outcome: reusablePaymentIntent ? 'reused' : 'created',
    }, 'Stripe PaymentSheet session was prepared.');
    return {
        paymentIntentClientSecret: paymentIntent.client_secret,
        paymentId,
    };
}
async function completeDemoPaymentService({ db, isDemoPaymentEnabled }, userId, rawPayload) {
    if (!isDemoPaymentEnabled) {
        throw (0, errors_1.failedPrecondition)('Demo payment mode is disabled.');
    }
    const bookingId = readBookingId(rawPayload);
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Booking is missing.');
    }
    const booking = bookingSnap.data() || {};
    if ((0, shared_1.sanitizeString)(booking.userId) !== userId) {
        throw (0, errors_1.permissionDenied)('Only the booking owner can pay this booking.');
    }
    if ((0, shared_1.sanitizeString)(booking.status) !== BOOKING_STATUSES.CONFIRMED) {
        throw (0, errors_1.failedPrecondition)('Booking must be confirmed before payment.');
    }
    const currentPaymentStatus = (0, shared_1.sanitizeString)(booking.paymentSummary?.status) || PAYMENT_STATUSES.UNPAID;
    if (!SUPPORTED_SESSION_PAYMENT_STATUSES.has(currentPaymentStatus)) {
        throw (0, errors_1.failedPrecondition)('This booking is not payable.');
    }
    const pricingSnapshot = booking.pricingSnapshot || {};
    const currency = normalizeCurrency(pricingSnapshot.currency);
    toMinorAmount(pricingSnapshot.amount, currency);
    const paymentId = (0, shared_1.sanitizeString)(booking.paymentSummary?.paymentId) || buildPaymentId(bookingId);
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentSnap = await paymentRef.get();
    const paymentData = paymentSnap.exists ? paymentSnap.data() || {} : {};
    const now = firestore_1.Timestamp.now();
    const transactionId = buildDemoTransactionId();
    const amount = Number(pricingSnapshot.amount) || 0;
    const previousPaymentStatus = currentPaymentStatus;
    const nextPaymentSummary = {
        ...booking.paymentSummary,
        paymentId,
        status: PAYMENT_STATUSES.PAID,
        method: 'demo',
        processor: 'demo',
        transactionId,
        last4: null,
        stripePaymentIntentId: null,
        stripeLatestChargeId: null,
        stripeStatus: null,
        updatedAt: now,
    };
    const paymentPatch = {
        paymentId,
        bookingId,
        userId,
        providerId: (0, shared_1.sanitizeString)(booking.providerId),
        status: PAYMENT_STATUSES.PAID,
        method: 'demo',
        amount,
        currency: currency.toUpperCase(),
        processor: 'demo',
        transactionId,
        last4: null,
        stripePaymentIntentId: null,
        stripeLatestChargeId: null,
        stripeStatus: null,
        createdAt: paymentData.createdAt || now,
        updatedAt: now,
        updatedBy: userId,
        schemaVersion: 1,
    };
    await db.runTransaction(async (transaction) => {
        transaction.set(paymentRef, paymentPatch, { merge: true });
        transaction.set(bookingRef, {
            paymentSummary: nextPaymentSummary,
            updatedAt: now,
            updatedBy: userId,
        }, { merge: true });
    });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'payment.demo.completed',
        uid: userId,
        role: 'user',
        resourceType: 'payment',
        resourceId: paymentId,
        statusFrom: previousPaymentStatus,
        statusTo: PAYMENT_STATUSES.PAID,
        outcome: 'success',
    }, 'Demo payment was completed.');
    await (0, audit_1.writeAuditEvent)({ db }, {
        action: 'payment.demo.completed',
        actorUid: userId,
        actorRole: 'user',
        resourceType: 'payment',
        resourceId: paymentId,
        statusFrom: previousPaymentStatus,
        statusTo: PAYMENT_STATUSES.PAID,
        result: 'success',
        context: {
            bookingId,
            userId,
            providerId: (0, shared_1.sanitizeString)(booking.providerId),
            transactionId,
        },
    });
    return {
        paymentId,
        bookingId,
        status: PAYMENT_STATUSES.PAID,
        transactionId,
    };
}
async function markWebhookEventProcessed(db, event, result) {
    await db.collection('stripeWebhookEvents').doc(event.id).set({
        eventId: event.id,
        type: event.type,
        result,
        processedAt: firestore_1.Timestamp.now(),
    }, { merge: true });
}
async function wasWebhookEventProcessed(db, eventId) {
    const eventSnap = await db.collection('stripeWebhookEvents').doc(eventId).get();
    return eventSnap.exists;
}
function getBookingPaymentTarget(paymentIntent) {
    const bookingId = (0, shared_1.sanitizeString)(paymentIntent.metadata?.bookingId);
    const paymentId = (0, shared_1.sanitizeString)(paymentIntent.metadata?.paymentId) || (bookingId ? buildPaymentId(bookingId) : '');
    if (!bookingId || !paymentId) {
        return null;
    }
    return {
        bookingId,
        paymentId,
    };
}
async function applyPaymentIntentStatus({ db, stripe }, event, paymentIntent, nextStatus) {
    const target = getBookingPaymentTarget(paymentIntent);
    if (!target) {
        (0, logging_1.writeStructuredLog)('warn', {
            action: 'stripe.webhook.payment_intent',
            resourceType: 'paymentIntent',
            resourceId: paymentIntent.id,
            outcome: 'ignored',
            reasonCode: 'missing_metadata',
        }, 'Stripe webhook payment intent was missing booking metadata.');
        return 'ignored_missing_metadata';
    }
    const bookingRef = db.collection('bookings').doc(target.bookingId);
    const paymentRef = db.collection('payments').doc(target.paymentId);
    const charge = await getLatestCharge(stripe, paymentIntent);
    const method = resolvePaymentMethod(charge);
    const last4 = resolveLast4(charge);
    const latestChargeId = getLatestChargeId(paymentIntent);
    const now = firestore_1.Timestamp.now();
    const result = await db.runTransaction(async (transaction) => {
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Booking is missing.');
        }
        const booking = bookingSnap.data() || {};
        const previousPaymentStatus = (0, shared_1.sanitizeString)(booking.paymentSummary?.status) || PAYMENT_STATUSES.UNPAID;
        const nextPaymentSummary = {
            ...booking.paymentSummary,
            paymentId: target.paymentId,
            status: nextStatus,
            method,
            last4,
            transactionId: latestChargeId || paymentIntent.id,
            processor: 'stripe',
            stripePaymentIntentId: paymentIntent.id,
            stripeLatestChargeId: latestChargeId || null,
            stripeStatus: paymentIntent.status,
            updatedAt: now,
        };
        const paymentPatch = {
            paymentId: target.paymentId,
            bookingId: target.bookingId,
            userId: (0, shared_1.sanitizeString)(booking.userId),
            providerId: (0, shared_1.sanitizeString)(booking.providerId),
            status: nextStatus,
            method,
            amount: Number(booking.pricingSnapshot?.amount) || paymentIntent.amount / 100,
            currency: normalizeCurrency(booking.pricingSnapshot?.currency || paymentIntent.currency).toUpperCase(),
            processor: 'stripe',
            last4,
            transactionId: latestChargeId || paymentIntent.id,
            stripePaymentIntentId: paymentIntent.id,
            stripeLatestChargeId: latestChargeId || null,
            stripeStatus: paymentIntent.status,
            webhookEventId: event.id,
            updatedAt: now,
            updatedBy: 'stripe',
            schemaVersion: 1,
        };
        transaction.set(bookingRef, {
            paymentSummary: nextPaymentSummary,
            updatedAt: now,
            updatedBy: 'stripe',
        }, { merge: true });
        transaction.set(paymentRef, paymentPatch, { merge: true });
        return {
            booking,
            previousPaymentStatus,
        };
    });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'stripe.webhook.payment_intent',
        uid: (0, shared_1.sanitizeString)(result.booking.userId),
        role: 'user',
        resourceType: 'payment',
        resourceId: target.paymentId,
        statusFrom: result.previousPaymentStatus,
        statusTo: nextStatus,
        stripePaymentIntentId: paymentIntent.id,
        outcome: 'success',
    }, 'Stripe payment intent status was applied.');
    await (0, audit_1.writeAuditEvent)({ db }, {
        action: 'payment.stripe_webhook',
        actorUid: 'stripe',
        actorRole: 'system',
        resourceType: 'payment',
        resourceId: target.paymentId,
        statusFrom: result.previousPaymentStatus,
        statusTo: nextStatus,
        result: 'success',
        context: {
            bookingId: target.bookingId,
            userId: (0, shared_1.sanitizeString)(result.booking.userId),
            providerId: (0, shared_1.sanitizeString)(result.booking.providerId),
            stripePaymentIntentId: paymentIntent.id,
            stripeEventId: event.id,
            stripeEventType: event.type,
        },
    });
    return 'processed';
}
async function handleStripeWebhookEventService(deps, event) {
    if (await wasWebhookEventProcessed(deps.db, event.id)) {
        return {
            duplicate: true,
            result: 'duplicate',
        };
    }
    let result = 'ignored';
    if (event.type === 'payment_intent.succeeded'
        || event.type === 'payment_intent.payment_failed'
        || event.type === 'payment_intent.canceled') {
        const paymentIntent = event.data.object;
        result = await applyPaymentIntentStatus(deps, event, paymentIntent, event.type === 'payment_intent.succeeded' ? 'paid' : 'failed');
    }
    await markWebhookEventProcessed(deps.db, event, result);
    return {
        duplicate: false,
        result,
    };
}
