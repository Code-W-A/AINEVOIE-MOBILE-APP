import { describe, expect, it, jest } from '@jest/globals';
import {
  completeDemoPaymentService,
  createStripePaymentSheetSessionService,
  handleStripeWebhookEventService,
} from '../../src/payments';

function createMockDb(initialData: Record<string, Record<string, any>>) {
  const store = {
    bookings: { ...(initialData.bookings || {}) },
    payments: { ...(initialData.payments || {}) },
    auditEvents: { ...(initialData.auditEvents || {}) },
    stripeWebhookEvents: { ...(initialData.stripeWebhookEvents || {}) },
  };

  function deepMerge(target: Record<string, any>, source: Record<string, any>) {
    const nextTarget = { ...(target || {}) };
    Object.entries(source || {}).forEach(([key, value]) => {
      if (
        value
        && typeof value === 'object'
        && !Array.isArray(value)
        && typeof nextTarget[key] === 'object'
        && nextTarget[key] !== null
        && !Array.isArray(nextTarget[key])
      ) {
        nextTarget[key] = deepMerge(nextTarget[key], value as Record<string, any>);
        return;
      }
      nextTarget[key] = value;
    });
    return nextTarget;
  }

  function createSnapshot(value: Record<string, any> | undefined, ref: any) {
    return {
      exists: Boolean(value),
      id: ref.id,
      ref,
      data: () => value,
    };
  }

  function createDocRef(collectionName: keyof typeof store, id: string) {
    return {
      id,
      async get() {
        return createSnapshot(store[collectionName][id], this);
      },
      async set(payload: Record<string, any>, options?: { merge?: boolean }) {
        const current = store[collectionName][id] || {};
        store[collectionName][id] = options?.merge ? deepMerge(current, payload) : payload;
      },
    };
  }

  return {
    store,
    db: {
      collection(collectionName: keyof typeof store) {
        return {
          doc(id?: string) {
            return createDocRef(collectionName, id || `${String(collectionName).slice(0, 3)}_${Object.keys(store[collectionName]).length + 1}`);
          },
        };
      },
      async runTransaction<T>(updater: (transaction: {
        get: (ref: any) => Promise<any>,
        set: (ref: any, payload: Record<string, any>, options?: { merge?: boolean }) => void,
      }) => Promise<T>) {
        const operations: Array<() => Promise<void>> = [];
        const transaction = {
          async get(ref: any) {
            return ref.get();
          },
          set(ref: any, payload: Record<string, any>, options?: { merge?: boolean }) {
            operations.push(async () => {
              await ref.set(payload, options);
            });
          },
        };
        const result = await updater(transaction);
        for (const operation of operations) {
          await operation();
        }
        return result;
      },
    },
  };
}

function createConfirmedBooking(overrides: Record<string, any> = {}) {
  return {
    bookingId: 'booking_1',
    userId: 'user_1',
    providerId: 'provider_1',
    status: 'confirmed',
    pricingSnapshot: {
      amount: 180,
      currency: 'RON',
    },
    paymentSummary: {
      paymentId: 'pay_booking_1',
      status: 'unpaid',
      method: 'unknown',
    },
    ...overrides,
  };
}

function createStripeMock(overrides: Record<string, any> = {}) {
  return {
    paymentIntents: {
      retrieve: jest.fn(async () => {
        throw new Error('not found');
      }),
      create: jest.fn(async () => ({
        id: 'pi_123',
        client_secret: 'pi_123_secret_abc',
        status: 'requires_payment_method',
        latest_charge: null,
      })),
    },
    charges: {
      retrieve: jest.fn(async () => ({
        id: 'ch_123',
        payment_method_details: {
          type: 'card',
          card: {
            last4: '4242',
            wallet: null,
          },
        },
      })),
    },
    ...overrides,
  };
}

function createPaymentIntentEvent(type: string, overrides: Record<string, any> = {}) {
  return {
    id: `evt_${type}`,
    type,
    data: {
      object: {
        id: 'pi_123',
        amount: 18000,
        currency: 'ron',
        status: type === 'payment_intent.succeeded' ? 'succeeded' : 'payment_failed',
        latest_charge: 'ch_123',
        metadata: {
          bookingId: 'booking_1',
          paymentId: 'pay_booking_1',
          userId: 'user_1',
          providerId: 'provider_1',
        },
        ...overrides,
      },
    },
  };
}

describe('Stripe payment services', () => {
  it('creates a Stripe PaymentSheet session only for payable confirmed bookings', async () => {
    const { db, store } = createMockDb({
      bookings: {
        booking_1: createConfirmedBooking(),
      },
    });
    const stripe = createStripeMock();

    const result = await createStripePaymentSheetSessionService(
      { db: db as never, stripe: stripe as never },
      'user_1',
      { bookingId: 'booking_1' },
    );

    expect(result).toEqual({
      paymentIntentClientSecret: 'pi_123_secret_abc',
      paymentId: 'pay_booking_1',
    });
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 18000,
      currency: 'ron',
      metadata: expect.objectContaining({
        bookingId: 'booking_1',
        paymentId: 'pay_booking_1',
      }),
    }));
    expect(store.payments.pay_booking_1.processor).toBe('stripe');
    expect(store.bookings.booking_1.paymentSummary.stripePaymentIntentId).toBe('pi_123');
  });

  it('blocks payment sessions for non-owners, unconfirmed bookings and invalid pricing', async () => {
    const stripe = createStripeMock();
    const nonOwner = createMockDb({
      bookings: { booking_1: createConfirmedBooking() },
    });
    await expect(createStripePaymentSheetSessionService(
      { db: nonOwner.db as never, stripe: stripe as never },
      'user_2',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('Only the booking owner can pay this booking.');

    const unconfirmed = createMockDb({
      bookings: { booking_1: createConfirmedBooking({ status: 'requested' }) },
    });
    await expect(createStripePaymentSheetSessionService(
      { db: unconfirmed.db as never, stripe: stripe as never },
      'user_1',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('Booking must be confirmed before payment.');

    const invalidPricing = createMockDb({
      bookings: { booking_1: createConfirmedBooking({ pricingSnapshot: { amount: 0, currency: 'RON' } }) },
    });
    await expect(createStripePaymentSheetSessionService(
      { db: invalidPricing.db as never, stripe: stripe as never },
      'user_1',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('Booking pricing is missing or invalid.');
  });

  it('applies successful Stripe webhooks idempotently', async () => {
    const { db, store } = createMockDb({
      bookings: {
        booking_1: createConfirmedBooking({
          paymentSummary: {
            paymentId: 'pay_booking_1',
            status: 'unpaid',
            method: 'unknown',
            stripePaymentIntentId: 'pi_123',
          },
        }),
      },
      payments: {
        pay_booking_1: {
          paymentId: 'pay_booking_1',
          status: 'unpaid',
          stripePaymentIntentId: 'pi_123',
        },
      },
    });
    const stripe = createStripeMock();
    const event = createPaymentIntentEvent('payment_intent.succeeded');

    const first = await handleStripeWebhookEventService(
      { db: db as never, stripe: stripe as never },
      event as never,
    );
    const second = await handleStripeWebhookEventService(
      { db: db as never, stripe: stripe as never },
      event as never,
    );

    expect(first).toEqual({ duplicate: false, result: 'processed' });
    expect(second).toEqual({ duplicate: true, result: 'duplicate' });
    expect(store.bookings.booking_1.paymentSummary.status).toBe('paid');
    expect(store.bookings.booking_1.paymentSummary.method).toBe('card');
    expect(store.bookings.booking_1.paymentSummary.last4).toBe('4242');
    expect(store.payments.pay_booking_1.status).toBe('paid');
    expect(store.stripeWebhookEvents[event.id].result).toBe('processed');
  });

  it('marks failed and canceled Stripe webhooks as failed payments', async () => {
    const { db, store } = createMockDb({
      bookings: {
        booking_1: createConfirmedBooking({
          paymentSummary: {
            paymentId: 'pay_booking_1',
            status: 'unpaid',
            stripePaymentIntentId: 'pi_123',
          },
        }),
      },
      payments: {
        pay_booking_1: {
          paymentId: 'pay_booking_1',
          status: 'unpaid',
          stripePaymentIntentId: 'pi_123',
        },
      },
    });
    const stripe = createStripeMock();

    await handleStripeWebhookEventService(
      { db: db as never, stripe: stripe as never },
      createPaymentIntentEvent('payment_intent.payment_failed') as never,
    );

    expect(store.bookings.booking_1.paymentSummary.status).toBe('failed');
    expect(store.payments.pay_booking_1.status).toBe('failed');
  });

  it('completes demo payments only when server demo mode is enabled', async () => {
    const { db, store } = createMockDb({
      bookings: {
        booking_1: createConfirmedBooking(),
      },
    });

    const result = await completeDemoPaymentService(
      { db: db as never, isDemoPaymentEnabled: true },
      'user_1',
      { bookingId: 'booking_1' },
    );

    expect(result).toEqual(expect.objectContaining({
      bookingId: 'booking_1',
      paymentId: 'pay_booking_1',
      status: 'paid',
    }));
    expect(result.transactionId).toMatch(/^DEMO-/);
    expect(store.bookings.booking_1.paymentSummary.status).toBe('paid');
    expect(store.bookings.booking_1.paymentSummary.processor).toBe('demo');
    expect(store.bookings.booking_1.paymentSummary.method).toBe('demo');
    expect(store.bookings.booking_1.paymentSummary.stripePaymentIntentId).toBeNull();
    expect(store.payments.pay_booking_1.status).toBe('paid');
    expect(store.payments.pay_booking_1.processor).toBe('demo');
    expect(store.payments.pay_booking_1.method).toBe('demo');
    expect(Object.values(store.auditEvents)).toEqual([
      expect.objectContaining({
        action: 'payment.demo.completed',
        resourceId: 'pay_booking_1',
        statusFrom: 'unpaid',
        statusTo: 'paid',
      }),
    ]);
  });

  it('blocks demo payments when demo mode is disabled', async () => {
    const { db } = createMockDb({
      bookings: {
        booking_1: createConfirmedBooking(),
      },
    });

    await expect(completeDemoPaymentService(
      { db: db as never, isDemoPaymentEnabled: false },
      'user_1',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('Demo payment mode is disabled.');
  });

  it('blocks demo payments for non-owners, unconfirmed bookings and invalid pricing', async () => {
    const nonOwner = createMockDb({
      bookings: { booking_1: createConfirmedBooking() },
    });
    await expect(completeDemoPaymentService(
      { db: nonOwner.db as never, isDemoPaymentEnabled: true },
      'user_2',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('Only the booking owner can pay this booking.');

    const unconfirmed = createMockDb({
      bookings: { booking_1: createConfirmedBooking({ status: 'requested' }) },
    });
    await expect(completeDemoPaymentService(
      { db: unconfirmed.db as never, isDemoPaymentEnabled: true },
      'user_1',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('Booking must be confirmed before payment.');

    const completed = createMockDb({
      bookings: { booking_1: createConfirmedBooking({ paymentSummary: { status: 'paid' } }) },
    });
    await expect(completeDemoPaymentService(
      { db: completed.db as never, isDemoPaymentEnabled: true },
      'user_1',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('This booking is not payable.');

    const invalidPricing = createMockDb({
      bookings: { booking_1: createConfirmedBooking({ pricingSnapshot: { amount: 0, currency: 'RON' } }) },
    });
    await expect(completeDemoPaymentService(
      { db: invalidPricing.db as never, isDemoPaymentEnabled: true },
      'user_1',
      { bookingId: 'booking_1' },
    )).rejects.toThrow('Booking pricing is missing or invalid.');
  });
});
