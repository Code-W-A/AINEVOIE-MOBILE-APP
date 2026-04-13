import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const projectId = 'demo-ainevoie';
const firestoreRules = readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

describe('firestore rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: firestoreRules,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users/user_1'), {
        uid: 'user_1',
        role: 'user',
        accountStatus: 'active',
        displayName: 'User One',
        email: 'user_1@example.com',
        phoneNumber: null,
        authProviders: ['password'],
        photoPath: null,
        locale: 'ro',
        notificationPreferences: { bookings: true, messages: true, promoSystem: true },
        primaryLocation: null,
        profileCompletion: { hasPrimaryLocation: false },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user_1',
        updatedBy: 'user_1',
        schemaVersion: 1,
      });
      await setDoc(doc(db, 'providers/provider_1'), {
        uid: 'provider_1',
        role: 'provider',
        status: 'pre_registered',
        accountStatus: 'active',
        email: 'provider_1@example.com',
        phoneNumber: null,
        authProviders: ['password'],
        locale: 'ro',
        notificationPreferences: { bookings: true, messages: true, promoSystem: true },
        professionalProfile: {
          businessName: '',
          displayName: 'Provider One',
          specialization: '',
          baseRateAmount: null,
          baseRateCurrency: 'RON',
          coverageArea: {
            countryCode: 'RO',
            countryName: 'România',
            countyCode: '',
            countyName: '',
            cityCode: '',
            cityName: '',
            placeId: '',
            locationLabel: '',
            formattedAddress: '',
            centerLat: null,
            centerLng: null,
          },
          coverageAreaText: '',
          shortBio: '',
          availabilitySummary: '',
          avatarPath: null,
        },
        documents: {
          identity: { status: 'missing', storagePath: null, originalFileName: null, uploadedAt: null },
          professional: { status: 'missing', storagePath: null, originalFileName: null, uploadedAt: null },
        },
        reviewState: { submittedAt: null, lastReviewedAt: null },
        adminReview: { reviewedBy: null, action: null, reason: null, reviewedAt: null },
        suspension: null,
        lastPublishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'provider_1',
        updatedBy: 'provider_1',
        schemaVersion: 1,
      });
      await setDoc(doc(db, 'bookings/booking_1'), {
        bookingId: 'booking_1',
        userId: 'user_1',
        providerId: 'provider_1',
        serviceId: 'service_1',
        status: 'requested',
        scheduledStartAt: new Date('2026-04-13T07:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-13T09:00:00.000Z'),
        timezone: 'Europe/Bucharest',
        requestDetails: {
          description: 'Curatenie generala',
          estimatedHours: 2,
        },
        pricingSnapshot: {
          amount: 180,
          currency: 'RON',
          unit: 'hour',
          estimatedHours: 2,
        },
        paymentSummary: {
          paymentId: null,
          status: 'in_progress',
          method: 'card',
          updatedAt: new Date('2026-04-12T10:00:00.000Z'),
        },
        userSnapshot: {
          displayName: 'User One',
          photoPath: null,
          primaryLocation: {
            formattedAddress: 'Test address',
          },
        },
        providerSnapshot: {
          displayName: 'Provider One',
          statusAtBookingTime: 'approved',
        },
        serviceSnapshot: {
          name: 'Curatenie generala',
          baseRateAmount: 90,
          baseRateCurrency: 'RON',
        },
        providerDecision: null,
        cancellation: null,
        completion: null,
        reviewSummary: {
          reviewId: null,
          rating: null,
        },
        createdAt: new Date('2026-04-12T10:00:00.000Z'),
        updatedAt: new Date('2026-04-12T10:00:00.000Z'),
        createdBy: 'user_1',
        updatedBy: 'user_1',
        schemaVersion: 1,
      });
      await setDoc(doc(db, 'reviews/booking_1'), {
        reviewId: 'booking_1',
        bookingId: 'booking_1',
        authorUserId: 'user_1',
        providerId: 'provider_1',
        status: 'published',
        rating: 5,
        review: 'Foarte bun.',
        authorSnapshot: {
          displayName: 'User One',
          photoPath: null,
        },
        providerSnapshot: {
          displayName: 'Provider One',
          providerRole: 'Curatenie generala',
        },
        serviceSnapshot: {
          serviceId: 'service_1',
          serviceName: 'Curatenie generala',
        },
        createdAt: new Date('2026-04-12T12:00:00.000Z'),
        updatedAt: new Date('2026-04-12T12:00:00.000Z'),
        createdBy: 'user_1',
        updatedBy: 'user_1',
        schemaVersion: 1,
      });
    });
  });

  it('allows a user to read their own profile and blocks others', async () => {
    const ownDb = testEnv.authenticatedContext('user_1', { role: 'user' }).firestore();
    const otherDb = testEnv.authenticatedContext('user_2', { role: 'user' }).firestore();

    await assertSucceeds(getDoc(doc(ownDb, 'users/user_1')));
    await assertFails(getDoc(doc(otherDb, 'users/user_1')));
  });

  it('blocks client profile creation on users collection', async () => {
    const db = testEnv.authenticatedContext('user_2', { role: 'user' }).firestore();

    await assertFails(setDoc(doc(db, 'users/user_2'), {
      uid: 'user_2',
      role: 'user',
    }));
  });

  it('allows a user to update only whitelisted fields', async () => {
    const db = testEnv.authenticatedContext('user_1', { role: 'user' }).firestore();

    await assertSucceeds(updateDoc(doc(db, 'users/user_1'), {
      displayName: 'User One Updated',
      updatedAt: serverTimestamp(),
    }));

    const snap = await getDoc(doc(db, 'users/user_1'));
    expect(snap.data()?.displayName).toBe('User One Updated');
  });

  it('allows a self update on users collection even before custom claims are refreshed', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore();

    await assertSucceeds(updateDoc(doc(db, 'users/user_1'), {
      primaryLocation: {
        formattedAddress: 'Test address',
        lat: 44.43,
        lng: 26.1,
        source: 'gps',
      },
      profileCompletion: {
        hasPrimaryLocation: true,
      },
      updatedAt: serverTimestamp(),
    }));
  });

  it('blocks provider status tampering from the client', async () => {
    const db = testEnv.authenticatedContext('provider_1', { role: 'provider', providerStatus: 'pre_registered' }).firestore();

    await assertFails(updateDoc(doc(db, 'providers/provider_1'), {
      status: 'approved',
      updatedAt: serverTimestamp(),
    }));
  });

  it('allows a provider to update whitelisted fields without depending on refreshed custom claims', async () => {
    const db = testEnv.authenticatedContext('provider_1').firestore();

    await assertSucceeds(updateDoc(doc(db, 'providers/provider_1'), {
      'professionalProfile.shortBio': 'Updated bio',
      'professionalProfile.coverageArea': {
        countryCode: 'RO',
        countryName: 'România',
        countyCode: 'B',
        countyName: 'București',
        cityCode: 'bucuresti',
        cityName: 'București',
        placeId: 'place_1',
        locationLabel: 'Bulevardul Iuliu Maniu 10',
        formattedAddress: 'Bulevardul Iuliu Maniu 10, București, România',
        centerLat: 44.43,
        centerLng: 26.04,
      },
      'professionalProfile.coverageAreaText': 'România, București, București',
      updatedAt: serverTimestamp(),
    }));
  });

  it('blocks direct client writes to the availability profile subdocument', async () => {
    const db = testEnv.authenticatedContext('provider_1').firestore();
    const availabilityRef = doc(db, 'providers/provider_1/availability/profile');

    await assertFails(setDoc(availabilityRef, {
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
      availabilitySummary: 'Luni: 09:00-17:00',
      availabilityDayChips: ['Luni'],
      hasConfiguredAvailability: true,
      updatedAt: serverTimestamp(),
    }));
  });

  it('allows a provider to create and update their own service documents', async () => {
    const db = testEnv.authenticatedContext('provider_1').firestore();
    const serviceRef = doc(db, 'providers/provider_1/services/service_1');

    await assertSucceeds(setDoc(serviceRef, {
      serviceId: 'service_1',
      providerId: 'provider_1',
      name: 'Curățenie generală',
      description: 'Intervenție completă pentru apartament.',
      categoryKey: 'cleaning',
      categoryLabel: 'Curățenie',
      status: 'active',
      baseRateAmount: 90,
      baseRateCurrency: 'RON',
      estimatedDurationMinutes: 180,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'provider_1',
      updatedBy: 'provider_1',
      schemaVersion: 1,
    }));

    await assertSucceeds(updateDoc(serviceRef, {
      status: 'inactive',
      description: 'Intervenție completă și coordonare atentă.',
      updatedAt: serverTimestamp(),
      updatedBy: 'provider_1',
    }));
  });

  it('blocks non-owners from writing provider services', async () => {
    const db = testEnv.authenticatedContext('user_1').firestore();
    const serviceRef = doc(db, 'providers/provider_1/services/service_1');

    await assertFails(setDoc(serviceRef, {
      serviceId: 'service_1',
      providerId: 'provider_1',
      name: 'Curățenie generală',
      description: 'Intervenție completă pentru apartament.',
      categoryKey: 'cleaning',
      categoryLabel: 'Curățenie',
      status: 'active',
      baseRateAmount: 90,
      baseRateCurrency: 'RON',
      estimatedDurationMinutes: 180,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'user_1',
      updatedBy: 'user_1',
      schemaVersion: 1,
    }));
  });

  it('allows the booking user and assigned provider to read the same booking', async () => {
    const userDb = testEnv.authenticatedContext('user_1').firestore();
    const providerDb = testEnv.authenticatedContext('provider_1').firestore();

    await assertSucceeds(getDoc(doc(userDb, 'bookings/booking_1')));
    await assertSucceeds(getDoc(doc(providerDb, 'bookings/booking_1')));
  });

  it('blocks unrelated actors from reading bookings', async () => {
    const db = testEnv.authenticatedContext('user_2').firestore();

    await assertFails(getDoc(doc(db, 'bookings/booking_1')));
  });

  it('blocks direct client writes to bookings and idempotency keys', async () => {
    const userDb = testEnv.authenticatedContext('user_1').firestore();
    const bookingRef = doc(userDb, 'bookings/booking_1');
    const idempotencyRef = doc(userDb, 'idempotencyKeys/user_1:create_booking:req_1');

    await assertFails(updateDoc(bookingRef, {
      status: 'confirmed',
      updatedAt: serverTimestamp(),
    }));

    await assertFails(setDoc(idempotencyRef, {
      scopeKey: 'user_1:create_booking:req_1',
      action: 'create_booking',
      ownerUid: 'user_1',
      requestHash: 'hash',
      resourceType: 'booking',
      resourceId: 'booking_1',
      createdAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
    }));
  });

  it('allows public reads for reviews and blocks direct client writes to reviews and payments', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    const userDb = testEnv.authenticatedContext('user_1').firestore();

    await assertSucceeds(getDoc(doc(publicDb, 'reviews/booking_1')));
    await assertFails(updateDoc(doc(userDb, 'reviews/booking_1'), {
      rating: 4,
      updatedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(userDb, 'payments/pay_booking_1'), {
      paymentId: 'pay_booking_1',
      bookingId: 'booking_1',
      userId: 'user_1',
      providerId: 'provider_1',
      status: 'paid',
      method: 'card',
      amount: 180,
      currency: 'RON',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  });

  it('blocks direct client reads and writes to audit events and provider directory writes', async () => {
    const publicDb = testEnv.unauthenticatedContext().firestore();
    const userDb = testEnv.authenticatedContext('user_1').firestore();

    await assertFails(getDoc(doc(userDb, 'auditEvents/evt_1')));
    await assertFails(setDoc(doc(userDb, 'auditEvents/evt_1'), {
      eventId: 'evt_1',
      action: 'booking.confirm',
      actorUid: 'provider_1',
      actorRole: 'provider',
      resourceType: 'booking',
      resourceId: 'booking_1',
      result: 'success',
      createdAt: serverTimestamp(),
    }));

    await assertSucceeds(getDoc(doc(publicDb, 'providerDirectory/provider_1')));
    await assertFails(setDoc(doc(userDb, 'providerDirectory/provider_1'), {
      providerId: 'provider_1',
      displayName: 'Provider One',
      status: 'approved',
      updatedAt: serverTimestamp(),
    }));
  });
});
