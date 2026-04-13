import { describe, expect, it } from '@jest/globals';
import {
  getAdminBookingCaseService,
  getAdminDashboardSummaryService,
  getAdminProviderCaseService,
  listAdminAuditEventsService,
  listAdminBookingsService,
  listAdminProvidersService,
  listAdminReviewsService,
} from '../../src/adminPanel';

type RootCollectionName =
  | 'users'
  | 'providers'
  | 'providerDirectory'
  | 'bookings'
  | 'payments'
  | 'reviews'
  | 'auditEvents';

function createMockDb(initialData: Record<string, Record<string, any>>) {
  const store = {
    users: { ...(initialData.users || {}) },
    providers: { ...(initialData.providers || {}) },
    providerDirectory: { ...(initialData.providerDirectory || {}) },
    bookings: { ...(initialData.bookings || {}) },
    payments: { ...(initialData.payments || {}) },
    reviews: { ...(initialData.reviews || {}) },
    auditEvents: { ...(initialData.auditEvents || {}) },
    providerAvailability: { ...(initialData.providerAvailability || {}) },
    providerServices: { ...(initialData.providerServices || {}) },
  };

  function createSnapshot(value: Record<string, any> | undefined, ref: any) {
    return {
      exists: Boolean(value),
      id: ref.id,
      ref,
      data: () => value,
    };
  }

  function createRootDocRef(collectionName: RootCollectionName, id: string) {
    return {
      id,
      async get() {
        return createSnapshot(store[collectionName][id], this);
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
              };
            },
          };
        }

        return {
          async get() {
            const docs = Object.entries(store.providerServices)
              .filter(([key]) => key.startsWith(`${id}/`))
              .map(([key, value]) => ({
                id: key.split('/')[1],
                data: () => value,
              }));

            return { docs };
          },
        };
      },
    };
  }

  return {
    store,
    db: {
      collection(collectionName: RootCollectionName) {
        return {
          async get() {
            const docs = Object.entries(store[collectionName]).map(([id, value]) => ({
              id,
              data: () => value,
            }));

            return { docs };
          },
          doc(id: string) {
            return createRootDocRef(collectionName, id);
          },
        };
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
        displayName: 'Client One',
        accountStatus: 'active',
      },
    },
    providers: {
      provider_1: {
        uid: 'provider_1',
        role: 'provider',
        status: 'approved',
        email: 'provider@example.com',
        professionalProfile: {
          businessName: 'Casa in Ordine',
          displayName: 'Casa in Ordine',
          specialization: 'Curatenie',
          coverageAreaText: 'Bucuresti',
          availabilitySummary: 'Luni: 09:00-17:00',
        },
        documents: {
          identity: { status: 'uploaded' },
          professional: { status: 'uploaded' },
        },
        reviewState: {
          submittedAt: '2026-04-10T08:00:00.000Z',
          lastReviewedAt: '2026-04-11T08:00:00.000Z',
        },
        adminReview: {
          action: 'approve',
          reviewedAt: '2026-04-11T08:00:00.000Z',
        },
        updatedAt: '2026-04-12T08:00:00.000Z',
      },
      provider_pending: {
        uid: 'provider_pending',
        role: 'provider',
        status: 'pending_review',
        email: 'pending@example.com',
        professionalProfile: {
          businessName: 'Pending Team',
          displayName: 'Pending Team',
          specialization: 'Instalatii',
        },
        documents: {
          identity: { status: 'uploaded' },
          professional: { status: 'missing' },
        },
        reviewState: {
          submittedAt: '2026-04-13T09:00:00.000Z',
        },
        updatedAt: '2026-04-13T09:00:00.000Z',
      },
    },
    providerDirectory: {
      provider_1: {
        providerId: 'provider_1',
        displayName: 'Casa in Ordine',
        categoryPrimary: 'Curatenie',
        serviceSummaries: [
          {
            serviceId: 'service_cleaning',
            name: 'Curatenie generala',
            categoryKey: 'cleaning',
            categoryLabel: 'Curatenie',
            status: 'active',
            baseRateAmount: 120,
            baseRateCurrency: 'RON',
            estimatedDurationMinutes: 180,
          },
        ],
      },
    },
    bookings: {
      booking_1: {
        bookingId: 'booking_1',
        status: 'requested',
        userId: 'user_1',
        providerId: 'provider_1',
        serviceId: 'service_cleaning',
        scheduledStartAt: '2026-04-18T09:00:00.000Z',
        scheduledEndAt: '2026-04-18T12:00:00.000Z',
        timezone: 'Europe/Bucharest',
        paymentSummary: {
          paymentId: 'pay_booking_1',
          status: 'failed',
        },
        userSnapshot: {
          displayName: 'Client One',
        },
        providerSnapshot: {
          displayName: 'Casa in Ordine',
        },
        serviceSnapshot: {
          name: 'Curatenie generala',
        },
        requestDetails: {
          description: 'Am nevoie de curatenie generala.',
        },
        createdAt: '2026-04-13T10:00:00.000Z',
        updatedAt: '2026-04-13T10:30:00.000Z',
      },
      booking_2: {
        bookingId: 'booking_2',
        status: 'completed',
        userId: 'user_1',
        providerId: 'provider_1',
        serviceId: 'service_cleaning',
        scheduledStartAt: '2026-04-12T09:00:00.000Z',
        scheduledEndAt: '2026-04-12T12:00:00.000Z',
        timezone: 'Europe/Bucharest',
        paymentSummary: {
          paymentId: 'pay_booking_2',
          status: 'paid',
        },
        userSnapshot: {
          displayName: 'Client One',
        },
        providerSnapshot: {
          displayName: 'Casa in Ordine',
        },
        serviceSnapshot: {
          name: 'Curatenie generala',
        },
        requestDetails: {
          description: 'Curatenie finalizata.',
        },
        createdAt: '2026-04-12T08:00:00.000Z',
        updatedAt: '2026-04-12T13:00:00.000Z',
      },
    },
    payments: {
      pay_booking_1: {
        paymentId: 'pay_booking_1',
        bookingId: 'booking_1',
        status: 'failed',
        updatedAt: '2026-04-13T10:30:00.000Z',
      },
      pay_booking_2: {
        paymentId: 'pay_booking_2',
        bookingId: 'booking_2',
        status: 'paid',
        updatedAt: '2026-04-12T13:00:00.000Z',
      },
    },
    reviews: {
      booking_2: {
        reviewId: 'booking_2',
        bookingId: 'booking_2',
        providerId: 'provider_1',
        authorUserId: 'user_1',
        status: 'published',
        rating: 5,
        review: 'Foarte bine.',
        authorSnapshot: {
          displayName: 'Client One',
        },
        providerSnapshot: {
          displayName: 'Casa in Ordine',
        },
        serviceSnapshot: {
          serviceId: 'service_cleaning',
          serviceName: 'Curatenie generala',
        },
        createdAt: '2026-04-12T14:00:00.000Z',
        updatedAt: '2026-04-12T14:00:00.000Z',
      },
    },
    auditEvents: {
      event_provider_review: {
        action: 'provider.review',
        actorUid: 'admin_1',
        actorRole: 'admin',
        resourceType: 'provider',
        resourceId: 'provider_1',
        result: 'success',
        createdAt: '2026-04-11T08:00:00.000Z',
      },
      event_booking_issue: {
        action: 'booking.create',
        actorUid: 'user_1',
        actorRole: 'user',
        resourceType: 'booking',
        resourceId: 'booking_1',
        result: 'created',
        context: {
          providerId: 'provider_1',
          paymentId: 'pay_booking_1',
        },
        createdAt: '2026-04-13T10:30:00.000Z',
      },
      event_review: {
        action: 'review.save',
        actorUid: 'user_1',
        actorRole: 'user',
        resourceType: 'review',
        resourceId: 'booking_2',
        result: 'created',
        context: {
          providerId: 'provider_1',
          bookingId: 'booking_2',
          paymentId: 'pay_booking_2',
        },
        createdAt: '2026-04-13T12:00:00.000Z',
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
      'provider_1/service_cleaning': {
        serviceId: 'service_cleaning',
        providerId: 'provider_1',
        name: 'Curatenie generala',
        description: 'Curatenie pentru apartamente.',
        categoryKey: 'cleaning',
        categoryLabel: 'Curatenie',
        status: 'active',
        baseRateAmount: 120,
        baseRateCurrency: 'RON',
        estimatedDurationMinutes: 180,
      },
    },
  };
}

describe('stage 7 admin panel services', () => {
  it('builds dashboard summary for support users from existing backend collections', async () => {
    const { db } = createMockDb(createInitialStore());

    const result: any = await getAdminDashboardSummaryService(
      { db: db as never },
      'support',
    );

    expect(result.totals).toEqual({
      providers: 2,
      bookings: 2,
      payments: 2,
      reviews: 1,
      auditEvents: 3,
    });
    expect(result.pendingProviderReviewCount).toBe(1);
    expect(result.openBookingIssueCount).toBe(1);
    expect(result.latestAuditAt).toBe('2026-04-13T12:00:00.000Z');
  });

  it('filters provider list by status and search', async () => {
    const { db } = createMockDb(createInitialStore());

    const result: any = await listAdminProvidersService(
      { db: db as never },
      'admin',
      {
        status: 'pending_review',
        search: 'pending',
        limit: 10,
      },
    );

    expect(result.total).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        providerId: 'provider_pending',
        status: 'pending_review',
        businessName: 'Pending Team',
      }),
    ]);
  });

  it('returns provider case details with directory, availability, services and related activity', async () => {
    const { db } = createMockDb(createInitialStore());

    const result: any = await getAdminProviderCaseService(
      { db: db as never },
      'support',
      { providerId: 'provider_1' },
    );

    expect(result.provider.providerId).toBe('provider_1');
    expect(result.providerDirectory).toEqual(
      expect.objectContaining({
        providerId: 'provider_1',
        displayName: 'Casa in Ordine',
      }),
    );
    expect(result.availability.weekSchedule).toHaveLength(7);
    expect(result.availability.weekSchedule[0]).toEqual(
      expect.objectContaining({
        dayKey: 'monday',
        isEnabled: true,
      }),
    );
    expect(result.services).toEqual([
      expect.objectContaining({
        serviceId: 'service_cleaning',
        status: 'active',
      }),
    ]);
    expect(result.recentBookings).toHaveLength(2);
    expect(result.recentAuditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceId: 'provider_1',
        }),
      ]),
    );
  });

  it('filters booking list by payment status and free-text search', async () => {
    const { db } = createMockDb(createInitialStore());

    const result: any = await listAdminBookingsService(
      { db: db as never },
      'support',
      {
        paymentStatus: 'failed',
        search: 'client one',
      },
    );

    expect(result.total).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        bookingId: 'booking_1',
        status: 'requested',
      }),
    ]);
  });

  it('returns a booking case with linked payment, review, provider, user and audit context', async () => {
    const { db } = createMockDb(createInitialStore());

    const result: any = await getAdminBookingCaseService(
      { db: db as never },
      'admin',
      { bookingId: 'booking_2' },
    );

    expect(result.booking.bookingId).toBe('booking_2');
    expect(result.payment).toEqual(
      expect.objectContaining({
        paymentId: 'pay_booking_2',
        status: 'paid',
      }),
    );
    expect(result.review).toEqual(
      expect.objectContaining({
        reviewId: 'booking_2',
        rating: 5,
      }),
    );
    expect(result.provider).toEqual(
      expect.objectContaining({
        providerId: 'provider_1',
      }),
    );
    expect(result.user).toEqual(
      expect.objectContaining({
        userId: 'user_1',
      }),
    );
    expect(result.recentAuditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceId: 'booking_2',
        }),
      ]),
    );
  });

  it('lists reviews and audit events with admin filters over the shared backend model', async () => {
    const { db } = createMockDb(createInitialStore());

    const reviewsResult: any = await listAdminReviewsService(
      { db: db as never },
      'support',
      {
        providerId: 'provider_1',
        search: 'foarte',
      },
    );
    const auditResult: any = await listAdminAuditEventsService(
      { db: db as never },
      'admin',
      {
        resourceType: 'booking',
        resourceId: 'booking_1',
      },
    );

    expect(reviewsResult.total).toBe(1);
    expect(reviewsResult.items).toEqual([
      expect.objectContaining({
        reviewId: 'booking_2',
        providerId: 'provider_1',
      }),
    ]);
    expect(auditResult.total).toBe(1);
    expect(auditResult.items).toEqual([
      expect.objectContaining({
        action: 'booking.create',
        resourceId: 'booking_1',
      }),
    ]);
  });

  it('rejects admin audit queries for non-admin operational roles', async () => {
    const { db } = createMockDb(createInitialStore());

    await expect(
      listAdminAuditEventsService(
        { db: db as never },
        'provider',
        {},
      ),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});
