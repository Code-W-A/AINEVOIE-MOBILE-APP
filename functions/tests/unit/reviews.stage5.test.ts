import { describe, expect, it } from '@jest/globals';
import {
  completeBookingService,
  confirmBookingService,
  createBookingRequestService,
  rejectBookingService,
  updateBookingPaymentSummaryService,
} from '../../src/bookings';
import { fetchProviderReviewAggregate, saveBookingReviewService } from '../../src/reviews';
import { PROVIDER_STATUSES } from '../../src/shared';

function createMockDb(initialData: Record<string, Record<string, any>>) {
  const store = {
    users: { ...(initialData.users || {}) },
    providers: { ...(initialData.providers || {}) },
    bookings: { ...(initialData.bookings || {}) },
    payments: { ...(initialData.payments || {}) },
    conversations: { ...(initialData.conversations || {}) },
    conversationMemberships: { ...(initialData.conversationMemberships || {}) },
    reviews: { ...(initialData.reviews || {}) },
    auditEvents: { ...(initialData.auditEvents || {}) },
    idempotencyKeys: { ...(initialData.idempotencyKeys || {}) },
    providerAvailability: { ...(initialData.providerAvailability || {}) },
    providerServices: { ...(initialData.providerServices || {}) },
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

  function createRootDocRef(collectionName: keyof typeof store, id: string) {
    return {
      id,
      async get() {
        return createSnapshot(store[collectionName][id], this);
      },
      async set(payload: Record<string, any>, options?: { merge?: boolean }) {
        const current = store[collectionName][id] || {};
        store[collectionName][id] = options?.merge ? deepMerge(current, payload) : payload;
      },
      async delete() {
        delete store[collectionName][id];
      },
      collection(subcollectionName: 'availability' | 'services') {
        if (subcollectionName === 'availability') {
          return {
            doc(subId: string) {
              const composedId = `${id}/${subId}`;

              return {
                id: subId,
                async get() {
                  return createSnapshot(store.providerAvailability[composedId], this);
                },
                async set(payload: Record<string, any>, options?: { merge?: boolean }) {
                  const current = store.providerAvailability[composedId] || {};
                  store.providerAvailability[composedId] = options?.merge ? deepMerge(current, payload) : payload;
                },
              };
            },
          };
        }

        return {
          doc(subId: string) {
            const composedId = `${id}/${subId}`;

            return {
              id: subId,
              async get() {
                return createSnapshot(store.providerServices[composedId], this);
              },
              async set(payload: Record<string, any>, options?: { merge?: boolean }) {
                const current = store.providerServices[composedId] || {};
                store.providerServices[composedId] = options?.merge ? deepMerge(current, payload) : payload;
              },
            };
          },
        };
      },
    };
  }

  return {
    store,
    db: {
      collection(collectionName: keyof typeof store) {
        return {
          doc(id?: string) {
            const nextId = id || `${String(collectionName).slice(0, 3)}_${Object.keys(store[collectionName]).length + 1}`;
            return createRootDocRef(collectionName, nextId);
          },
          where(fieldName: string, operator: string, expectedValue: unknown) {
            const filters = [{ fieldName, operator, expectedValue }];
            const queryBuilder = {
              where(nextFieldName: string, nextOperator: string, nextExpectedValue: unknown) {
                filters.push({
                  fieldName: nextFieldName,
                  operator: nextOperator,
                  expectedValue: nextExpectedValue,
                });
                return queryBuilder;
              },
              async get() {
                if (filters.some((filter) => filter.operator !== '==')) {
                  throw new Error('Unsupported operator in mock query.');
                }

                const docs = Object.entries(store[collectionName])
                  .filter(([, value]) => value && filters.every((filter) => value[filter.fieldName] === filter.expectedValue))
                  .map(([id, value]) => createSnapshot(value, createRootDocRef(collectionName, id)));

                return { docs };
              },
            };
            return queryBuilder;
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

function createInitialStore() {
  return {
    users: {
      user_1: {
        uid: 'user_1',
        role: 'user',
        accountStatus: 'active',
        displayName: 'Client One',
        photoPath: null,
      },
      user_2: {
        uid: 'user_2',
        role: 'user',
        accountStatus: 'active',
        displayName: 'Client Two',
        photoPath: null,
      },
    },
    providers: {
      provider_1: {
        uid: 'provider_1',
        role: 'provider',
        status: PROVIDER_STATUSES.APPROVED,
        professionalProfile: {
          businessName: 'Casa in Ordine',
          displayName: 'Casa in Ordine',
        },
      },
    },
    providerAvailability: {
      'provider_1/profile': {
        weekSchedule: [
          {
            dayKey: 'monday',
            label: 'Luni',
            shortLabel: 'Lu',
            isEnabled: true,
            timeRanges: [{ id: 'range_1', startTime: '09:00', endTime: '17:00' }],
          },
        ],
        blockedDates: [],
      },
    },
    providerServices: {
      'provider_1/service_1': {
        serviceId: 'service_1',
        providerId: 'provider_1',
        name: 'Curatenie generala',
        status: 'active',
        baseRateAmount: 90,
        baseRateCurrency: 'RON',
      },
    },
  };
}

async function createBookingForTests(db: any, {
  userId = 'user_1',
  idempotencyKey = 'req-stage5-1',
} = {}) {
  const result: any = await createBookingRequestService(
    { db },
    userId,
    {
      providerId: 'provider_1',
      serviceId: 'service_1',
      scheduledDateKey: '2026-04-13',
      scheduledStartTime: '09:00',
      timezone: 'Europe/Bucharest',
      address: 'Str. Aviatorilor 21, Bucuresti',
      idempotencyKey,
      requestDetails: {
        description: 'Am nevoie de curatenie generala.',
        estimatedHours: 2,
      },
      paymentSummary: {
        status: 'in_progress',
        method: 'card',
      },
    },
  );

  return result.booking;
}

describe('stage 5 payments summary and reviews services', () => {
  it('creates a payment record and keeps it in sync with booking payment summary updates', async () => {
    const { db, store } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never);
    const paymentId = `pay_${created.bookingId}`;

    expect(store.payments[paymentId]).toBeTruthy();
    expect(store.payments[paymentId].status).toBe('in_progress');

    const updated: any = await updateBookingPaymentSummaryService(
      { db: db as never },
      'user_1',
      {
        bookingId: created.bookingId,
        paymentSummary: {
          status: 'failed',
          method: 'card',
          last4: '4242',
        },
      },
    );

    expect(updated.booking.paymentSummary.paymentId).toBe(paymentId);
    expect(updated.booking.paymentSummary.status).toBe('failed');
    expect(updated.booking.paymentSummary.transactionId).toBeNull();
    expect(store.payments[paymentId].status).toBe('failed');
    expect(store.payments[paymentId].last4).toBe('4242');
    expect(store.payments[paymentId].transactionId).toBe(updated.booking.paymentSummary.transactionId);
    expect(Object.values(store.auditEvents).map((event) => event.action)).toEqual([
      'booking.create',
      'payment.summary.update',
    ]);
  });

  it('blocks payment summary updates after the booking is closed', async () => {
    const { db } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never, { idempotencyKey: 'req-stage5-closed' });

    await rejectBookingService({ db: db as never }, 'provider_1', {
      bookingId: created.bookingId,
      reason: 'Nu mai este disponibil intervalul.',
    });

    await expect(
      updateBookingPaymentSummaryService(
        { db: db as never },
        'user_1',
        {
          bookingId: created.bookingId,
          paymentSummary: { status: 'failed' },
        },
      ),
    ).rejects.toThrow('Payment summary cannot be updated for a closed booking.');
  });

  it('creates and updates a single review document per completed booking', async () => {
    const { db, store } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never, { idempotencyKey: 'req-stage5-review-1' });

    await confirmBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId });
    await completeBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId });

    const first: any = await saveBookingReviewService(
      { db: db as never },
      'user_1',
      {
        bookingId: created.bookingId,
        rating: 5,
        review: 'Foarte bun.',
      },
    );
    const second: any = await saveBookingReviewService(
      { db: db as never },
      'user_1',
      {
        bookingId: created.bookingId,
        rating: 4,
        review: 'Actualizare după follow-up.',
      },
    );

    expect(first.review.reviewId).toBe(created.bookingId);
    expect(second.review.reviewId).toBe(created.bookingId);
    expect(Object.keys(store.reviews)).toHaveLength(1);
    expect(store.reviews[created.bookingId].rating).toBe(4);
    expect(store.bookings[created.bookingId].reviewSummary.rating).toBe(4);
    expect(Object.values(store.auditEvents).map((event) => event.action)).toEqual([
      'booking.create',
      'booking.confirm',
      'booking.complete',
      'review.save',
      'review.save',
    ]);
  });

  it('blocks review submission before the booking is completed and blocks non-owners', async () => {
    const { db } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never, { idempotencyKey: 'req-stage5-review-2' });

    await expect(
      saveBookingReviewService(
        { db: db as never },
        'user_1',
        {
          bookingId: created.bookingId,
          rating: 5,
          review: 'Prea devreme.',
        },
      ),
    ).rejects.toThrow('Only completed bookings can receive a review.');

    await confirmBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId });
    await completeBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId });

    await expect(
      saveBookingReviewService(
        { db: db as never },
        'user_2',
        {
          bookingId: created.bookingId,
          rating: 2,
          review: 'Nu sunt owner.',
        },
      ),
    ).rejects.toThrow('Only the booking owner can submit a review.');
  });

  it('computes provider review aggregates from published reviews', async () => {
    const { db } = createMockDb(createInitialStore());
    const firstBooking: any = await createBookingForTests(db as never, { userId: 'user_1', idempotencyKey: 'req-stage5-agg-1' });
    const secondBooking: any = await createBookingForTests(db as never, { userId: 'user_2', idempotencyKey: 'req-stage5-agg-2' });

    await confirmBookingService({ db: db as never }, 'provider_1', { bookingId: firstBooking.bookingId });
    await completeBookingService({ db: db as never }, 'provider_1', { bookingId: firstBooking.bookingId });
    await confirmBookingService({ db: db as never }, 'provider_1', { bookingId: secondBooking.bookingId });
    await completeBookingService({ db: db as never }, 'provider_1', { bookingId: secondBooking.bookingId });

    await saveBookingReviewService(
      { db: db as never },
      'user_1',
      {
        bookingId: firstBooking.bookingId,
        rating: 5,
        review: 'Excelent.',
      },
    );
    await saveBookingReviewService(
      { db: db as never },
      'user_2',
      {
        bookingId: secondBooking.bookingId,
        rating: 3,
        review: 'A fost ok.',
      },
    );

    const aggregate = await fetchProviderReviewAggregate({ db: db as never }, 'provider_1');

    expect(aggregate.reviewCount).toBe(2);
    expect(aggregate.ratingAverage).toBe(4);
  });
});
