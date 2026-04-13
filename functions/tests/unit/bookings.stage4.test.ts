import { describe, expect, it } from '@jest/globals';
import {
  cancelBookingService,
  completeBookingService,
  confirmBookingService,
  createBookingRequestService,
  rejectBookingService,
} from '../../src/bookings';
import { PROVIDER_STATUSES } from '../../src/shared';

function createMockDb(initialData: Record<string, Record<string, any>>) {
  const store = {
    users: { ...(initialData.users || {}) },
    providers: { ...(initialData.providers || {}) },
    bookings: { ...(initialData.bookings || {}) },
    payments: { ...(initialData.payments || {}) },
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
      provider_2: {
        uid: 'provider_2',
        role: 'provider',
        status: PROVIDER_STATUSES.APPROVED,
        professionalProfile: {
          businessName: 'Alt Provider',
          displayName: 'Alt Provider',
        },
      },
      provider_pending: {
        uid: 'provider_pending',
        role: 'provider',
        status: PROVIDER_STATUSES.PENDING_REVIEW,
        professionalProfile: {
          businessName: 'Pending Provider',
          displayName: 'Pending Provider',
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
          {
            dayKey: 'tuesday',
            label: 'Marti',
            shortLabel: 'Ma',
            isEnabled: true,
            timeRanges: [{ id: 'range_2', startTime: '09:00', endTime: '17:00' }],
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
      'provider_pending/service_1': {
        serviceId: 'service_1',
        providerId: 'provider_pending',
        name: 'Curatenie generala',
        status: 'active',
        baseRateAmount: 90,
        baseRateCurrency: 'RON',
      },
    },
  };
}

async function createBookingForTests(db: any) {
  const result: any = await createBookingRequestService(
    { db },
    'user_1',
    {
      providerId: 'provider_1',
      serviceId: 'service_1',
      scheduledDateKey: '2026-04-13',
      scheduledStartTime: '09:00',
      timezone: 'Europe/Bucharest',
      address: 'Str. Aviatorilor 21, Bucuresti',
      idempotencyKey: 'req-stage4-1',
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

describe('stage 4 bookings lifecycle services', () => {
  it('creates, confirms and completes a booking on the happy path', async () => {
    const { db, store } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never);
    const confirmed: any = await confirmBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId });
    const completed: any = await completeBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId });

    expect(created.bookingId).toBeTruthy();
    expect(confirmed.booking.status).toBe('confirmed');
    expect(completed.booking.status).toBe('completed');
    expect(store.bookings[created.bookingId].completion).toBeTruthy();
    expect(Object.values(store.auditEvents).map((event) => event.action)).toEqual([
      'booking.create',
      'booking.confirm',
      'booking.complete',
    ]);
  });

  it('blocks invalid transitions after rejection', async () => {
    const { db } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never);

    await rejectBookingService({ db: db as never }, 'provider_1', {
      bookingId: created.bookingId,
      reason: 'Nu mai este disponibil intervalul.',
    });

    await expect(
      completeBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId }),
    ).rejects.toThrow('Booking cannot transition from rejected to completed.');
  });

  it('deduplicates duplicate create requests with the same idempotency key', async () => {
    const { db, store } = createMockDb(createInitialStore());
    const payload = {
      providerId: 'provider_1',
      serviceId: 'service_1',
      scheduledDateKey: '2026-04-13',
      scheduledStartTime: '09:00',
      timezone: 'Europe/Bucharest',
      address: 'Str. Aviatorilor 21, Bucuresti',
      idempotencyKey: 'req-dedup-1',
      requestDetails: {
        description: 'Am nevoie de curatenie generala.',
        estimatedHours: 2,
      },
      paymentSummary: {
        status: 'in_progress',
        method: 'card',
      },
    };

    const first: any = await createBookingRequestService({ db: db as never }, 'user_1', payload);
    const second: any = await createBookingRequestService({ db: db as never }, 'user_1', payload);

    expect(first.booking.bookingId).toBe(second.booking.bookingId);
    expect(Object.keys(store.bookings)).toHaveLength(1);
    expect(Object.keys(store.idempotencyKeys)).toHaveLength(1);
    expect(Object.values(store.auditEvents).map((event) => event.result)).toEqual([
      'created',
      'idempotent_replay',
    ]);
  });

  it('treats confirm vs cancel as a single-winner race on the same booking', async () => {
    const { db } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never);

    await cancelBookingService({ db: db as never }, 'user_1', {
      bookingId: created.bookingId,
      reason: 'Nu mai am nevoie.',
    });

    await expect(
      confirmBookingService({ db: db as never }, 'provider_1', { bookingId: created.bookingId }),
    ).rejects.toThrow('Booking cannot transition from cancelled_by_user to confirmed.');
  });

  it('blocks unauthorized actors from provider and user lifecycle actions', async () => {
    const { db } = createMockDb(createInitialStore());
    const created: any = await createBookingForTests(db as never);

    await expect(
      confirmBookingService({ db: db as never }, 'provider_2', { bookingId: created.bookingId }),
    ).rejects.toThrow('Only the assigned provider can confirm this booking.');

    await expect(
      cancelBookingService({ db: db as never }, 'user_2', { bookingId: created.bookingId }),
    ).rejects.toThrow('Only the booking user or assigned provider can cancel this booking.');
  });

  it('blocks booking creation for non-approved providers and broken references', async () => {
    const { db } = createMockDb(createInitialStore());

    await expect(
      createBookingRequestService(
        { db: db as never },
        'user_1',
        {
          providerId: 'provider_pending',
          serviceId: 'service_1',
          scheduledDateKey: '2026-04-13',
          scheduledStartTime: '09:00',
          timezone: 'Europe/Bucharest',
          address: 'Str. Aviatorilor 21, Bucuresti',
          requestDetails: {
            description: 'Test',
            estimatedHours: 2,
          },
        },
      ),
    ).rejects.toThrow('Bookings can only be created for approved providers.');

    await expect(
      createBookingRequestService(
        { db: db as never },
        'user_1',
        {
          providerId: 'provider_1',
          serviceId: 'missing_service',
          scheduledDateKey: '2026-04-13',
          scheduledStartTime: '09:00',
          timezone: 'Europe/Bucharest',
          address: 'Str. Aviatorilor 21, Bucuresti',
          requestDetails: {
            description: 'Test',
            estimatedHours: 2,
          },
        },
      ),
    ).rejects.toThrow('Provider service is missing.');
  });
});
