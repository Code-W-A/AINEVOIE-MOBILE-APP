import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { bootstrapSessionService } from '../../src/bootstrapSession';
import { buildUserProfileDoc } from '../../src/profileBuilders';
import { PROVIDER_STATUSES, ROLES } from '@ainevoie/firebase-shared';

const projectId = 'demo-ainevoie';
const firestoreRules = readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

function getAdminApp() {
  return getApps()[0] || initializeApp({ projectId });
}

describe('bootstrapSessionService', () => {
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
  });

  it('creates a minimal user profile when missing and returns bootstrap flags', async () => {
    const adminApp = getAdminApp();
    const adminDb = getFirestore(adminApp);
    const adminAuth = getAuth(adminApp);
    const uid = 'user-bootstrap-1';

    await adminAuth.createUser({
      uid,
      email: 'user-bootstrap-1@example.com',
      password: '12345678',
    }).catch(() => undefined);

    const authUser = {
      uid,
      email: 'user-bootstrap-1@example.com',
      phoneNumber: null,
      displayName: 'Test User',
      providerData: [{ providerId: 'password' }],
      customClaims: {},
    } as never;

    const result = await bootstrapSessionService(
      { db: adminDb, auth: adminAuth },
      {
        uid,
        authUser,
        payload: { intendedRole: ROLES.USER, displayName: 'Test User' },
      },
    );

    expect(result.role).toBe(ROLES.USER);
    expect(result.bootstrapOutcome).toBe('created_profile');
    expect(result.profileFlags.needsProfileCompletion).toBe(true);

    const userSnap = await adminDb.collection('users').doc(uid).get();
    expect(userSnap.exists).toBe(true);
  });

  it('repairs stale claims for an existing provider profile', async () => {
    const adminApp = getAdminApp();
    const adminDb = getFirestore(adminApp);
    const adminAuth = getAuth(adminApp);
    const uid = 'provider-bootstrap-1';

    await adminAuth.createUser({
      uid,
      email: 'provider@example.com',
      password: '12345678',
    }).catch(() => undefined);

    await adminDb.collection('providers').doc(uid).set({
      uid,
      role: ROLES.PROVIDER,
      status: PROVIDER_STATUSES.PENDING_REVIEW,
      accountStatus: 'active',
      email: 'provider@example.com',
      phoneNumber: null,
      authProviders: ['password'],
      locale: 'ro',
      notificationPreferences: {
        bookings: true,
        messages: true,
        promoSystem: true,
      },
      professionalProfile: {
        businessName: '',
        displayName: 'Provider',
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
      createdBy: uid,
      updatedBy: uid,
      schemaVersion: 1,
    });

    const authUser = {
      uid,
      email: 'provider@example.com',
      phoneNumber: null,
      displayName: 'Provider',
      providerData: [{ providerId: 'password' }],
      customClaims: {},
    } as never;

    const result = await bootstrapSessionService(
      { db: adminDb, auth: adminAuth },
      {
        uid,
        authUser,
        payload: {},
      },
    );

    expect(result.role).toBe(ROLES.PROVIDER);
    expect(result.providerStatus).toBe(PROVIDER_STATUSES.PENDING_REVIEW);
    expect(['repaired_claims', 'ok']).toContain(result.bootstrapOutcome);
  });

  it('rejects conflicting role documents', async () => {
    const adminApp = getAdminApp();
    const adminDb = getFirestore(adminApp);
    const adminAuth = getAuth(adminApp);
    const uid = 'conflict-bootstrap-1';

    await adminAuth.createUser({
      uid,
      email: 'conflict@example.com',
      password: '12345678',
    }).catch(() => undefined);

    await adminDb.collection('users').doc(uid).set(buildUserProfileDoc({
      uid,
      createdBy: uid,
      displayName: 'Conflict User',
      email: 'conflict@example.com',
      phoneNumber: null,
      authProviders: ['password'],
    }));
    await adminDb.collection('providers').doc(uid).set({
      uid,
      role: ROLES.PROVIDER,
      status: PROVIDER_STATUSES.PRE_REGISTERED,
      accountStatus: 'active',
      email: 'conflict@example.com',
      phoneNumber: null,
      authProviders: ['password'],
      locale: 'ro',
      notificationPreferences: {
        bookings: true,
        messages: true,
        promoSystem: true,
      },
      professionalProfile: {
        businessName: '',
        displayName: 'Conflict Provider',
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
      createdBy: uid,
      updatedBy: uid,
      schemaVersion: 1,
    });

    const authUser = {
      uid,
      email: 'conflict@example.com',
      phoneNumber: null,
      displayName: 'Conflict',
      providerData: [{ providerId: 'password' }],
      customClaims: {},
    } as never;

    await expect(
      bootstrapSessionService(
        { db: adminDb, auth: adminAuth },
        {
          uid,
          authUser,
          payload: {},
        },
      ),
    ).rejects.toThrow('Role conflict detected for this account.');
  });
});
