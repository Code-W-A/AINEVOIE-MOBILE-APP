import { describe, expect, it, jest } from '@jest/globals';
import { buildProviderDirectoryDoc } from '../../src/providerDirectory';
import {
  finalizeProviderDocumentUploadService,
  finalizeUserAvatarUploadService,
} from '../../src/storageFinalize';
import { adminReviewProviderService } from '../../src/adminReviewProvider';
import { submitProviderOnboardingService } from '../../src/providerOnboarding';
import { saveProviderAvailabilityProfileService } from '../../src/providerAvailability';
import { PROVIDER_DOCUMENT_TYPES, PROVIDER_REVIEW_ACTIONS, PROVIDER_STATUSES } from '../../src/shared';

function createMockDb(initialData: Record<string, Record<string, any>>) {
  const store = {
    users: { ...(initialData.users || {}) },
    providers: { ...(initialData.providers || {}) },
    providerDirectory: { ...(initialData.providerDirectory || {}) },
    reviews: { ...(initialData.reviews || {}) },
    auditEvents: { ...(initialData.auditEvents || {}) },
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

  return {
    store,
    db: {
      collection(collectionName: 'users' | 'providers' | 'providerDirectory' | 'reviews' | 'auditEvents') {
        return {
          where(fieldName: string, operator: string, expectedValue: unknown) {
            return {
              async get() {
                if (operator !== '==') {
                  throw new Error(`Unsupported operator in mock query: ${operator}`);
                }

                const docs = Object.entries(store[collectionName])
                  .filter(([, value]) => value && value[fieldName] === expectedValue)
                  .map(([id, value]) => ({
                    id,
                    data: () => value,
                  }));

                return { docs };
              },
            };
          },
          doc(id?: string) {
            const nextId = id || `${String(collectionName).slice(0, 3)}_${Object.keys(store[collectionName]).length + 1}`;
            return {
              id: nextId,
              collection(subcollectionName: 'availability' | 'services') {
                if (subcollectionName === 'availability') {
                  return {
                    doc(subId: string) {
                      const composedId = `${nextId}/${subId}`;

                      return {
                        async get() {
                          const value = store.providerAvailability[composedId];
                          return {
                            exists: Boolean(value),
                            data: () => value,
                            ref: this,
                          };
                        },
                        async set(payload: Record<string, any>, options?: { merge?: boolean }) {
                          const current = store.providerAvailability[composedId] || {};
                          store.providerAvailability[composedId] = options?.merge ? deepMerge(current, payload) : payload;
                        },
                        async delete() {
                          delete store.providerAvailability[composedId];
                        },
                      };
                    },
                  };
                }

                return {
                  async get() {
                    const docs = Object.entries(store.providerServices)
                      .filter(([key]) => key.startsWith(`${nextId}/`))
                      .map(([key, value]) => ({
                        id: key.split('/')[1],
                        data: () => value,
                      }));

                    return { docs };
                  },
                  doc(subId: string) {
                    const composedId = `${nextId}/${subId}`;

                    return {
                      async get() {
                        const value = store.providerServices[composedId];
                        return {
                          exists: Boolean(value),
                          data: () => value,
                          ref: this,
                        };
                      },
                      async set(payload: Record<string, any>, options?: { merge?: boolean }) {
                        const current = store.providerServices[composedId] || {};
                        store.providerServices[composedId] = options?.merge ? deepMerge(current, payload) : payload;
                      },
                      async delete() {
                        delete store.providerServices[composedId];
                      },
                    };
                  },
                };
              },
              async get() {
                const value = store[collectionName][nextId];
                return {
                  exists: Boolean(value),
                  data: () => value,
                  ref: this,
                };
              },
              async set(payload: Record<string, any>, options?: { merge?: boolean }) {
                const current = store[collectionName][nextId] || {};
                store[collectionName][nextId] = options?.merge ? deepMerge(current, payload) : payload;
              },
              async delete() {
                delete store[collectionName][nextId];
              },
            };
          },
        };
      },
    },
  };
}

function createMockStorage(existingPaths: string[] = []) {
  const files = new Set(existingPaths);

  return {
    files,
    storage: {
      bucket() {
        return {
          file(storagePath: string) {
            return {
              async exists() {
                return [files.has(storagePath)];
              },
              async delete() {
                files.delete(storagePath);
              },
            };
          },
        };
      },
    },
  };
}

describe('stage 2 provider/profile services', () => {
  it('builds a provider directory snapshot with storage path and normalized keywords', () => {
    const snapshot = buildProviderDirectoryDoc(
      'provider_1',
      {
        status: PROVIDER_STATUSES.APPROVED,
        professionalProfile: {
        businessName: 'Casa în Ordine',
        displayName: 'Casa în Ordine',
        specialization: 'Curățenie rezidențială',
        coverageArea: {
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
        coverageAreaText: 'România, București, București',
        shortBio: 'Servicii clare pentru locuințe ocupate.',
        baseRateAmount: 90,
        baseRateCurrency: 'RON',
        avatarPath: 'providers/provider_1/avatar/main.jpg',
      },
    },
      {
        weekSchedule: [
          {
            dayKey: 'monday',
            label: 'Luni',
            shortLabel: 'Lu',
            isEnabled: true,
            timeRanges: [{ startTime: '09:00', endTime: '17:00' }],
          },
        ],
        blockedDates: [],
      },
      [
        {
          serviceId: 'service_1',
          providerId: 'provider_1',
          name: 'Curățenie generală',
          description: 'Curățenie completă pentru apartament.',
          categoryKey: 'cleaning',
          categoryLabel: 'Curățenie',
          status: 'active',
          baseRateAmount: 90,
          baseRateCurrency: 'RON',
          estimatedDurationMinutes: 180,
        },
      ],
    );

    expect(snapshot.providerId).toBe('provider_1');
    expect(snapshot.avatarPath).toBe('providers/provider_1/avatar/main.jpg');
    expect(snapshot.coverageTags).toContain('București');
    expect(snapshot.countryCode).toBe('RO');
    expect(snapshot.countyCode).toBe('B');
    expect(snapshot.cityCode).toBe('bucuresti');
    expect(snapshot).not.toHaveProperty('centerLat');
    expect(snapshot).not.toHaveProperty('radiusKm');
    expect(snapshot.searchKeywordsNormalized).toContain('curatenie');
    expect(snapshot.categoryPrimary).toBe('Curățenie');
    expect(snapshot.serviceSummaries).toEqual([
      expect.objectContaining({
        serviceId: 'service_1',
        categoryKey: 'cleaning',
        categoryLabel: 'Curățenie',
        baseRateAmount: 90,
      }),
    ]);
  });

  it('rejects overlapping availability ranges', async () => {
    const { db } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.APPROVED,
        },
      },
    });

    await expect(
      saveProviderAvailabilityProfileService(
        { db: db as never },
        'provider_1',
        {
          weekSchedule: [
            {
              dayKey: 'monday',
              isEnabled: true,
              timeRanges: [
                { startTime: '09:00', endTime: '12:00' },
                { startTime: '11:30', endTime: '14:00' },
              ],
            },
          ],
          blockedDates: [],
        },
      ),
    ).rejects.toThrow('Time ranges cannot overlap for Luni.');
  });

  it('rejects duplicate blocked dates in availability profile', async () => {
    const { db } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.APPROVED,
        },
      },
    });

    await expect(
      saveProviderAvailabilityProfileService(
        { db: db as never },
        'provider_1',
        {
          weekSchedule: [],
          blockedDates: [
            { dateKey: '2026-05-01', note: 'Concediu' },
            { dateKey: '2026-05-01', note: 'Dublură' },
          ],
        },
      ),
    ).rejects.toThrow('Duplicate blocked date detected for 2026-05-01.');
  });

  it('blocks suspended providers from updating availability', async () => {
    const { db } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.SUSPENDED,
        },
      },
    });

    await expect(
      saveProviderAvailabilityProfileService(
        { db: db as never },
        'provider_1',
        {
          weekSchedule: [],
          blockedDates: [],
        },
      ),
    ).rejects.toThrow('Suspended providers cannot update availability.');
  });

  it('saves valid availability and derives public summary fields', async () => {
    const { db, store } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.APPROVED,
          professionalProfile: {
            availabilitySummary: '',
          },
        },
      },
    });

    const result = await saveProviderAvailabilityProfileService(
      { db: db as never },
      'provider_1',
      {
        weekSchedule: [
          {
            dayKey: 'monday',
            isEnabled: true,
            timeRanges: [{ startTime: '09:00', endTime: '17:00' }],
          },
        ],
        blockedDates: [{ dateKey: '2026-05-01', note: 'Concediu' }],
      },
    );

    expect(result.availabilitySummary).toBe('Luni: 09:00-17:00');
    expect(result.availabilityDayChips).toEqual(['Luni']);
    expect(result.hasConfiguredAvailability).toBe(true);
    expect(store.providerAvailability['provider_1/profile']).toEqual(expect.objectContaining({
      availabilitySummary: 'Luni: 09:00-17:00',
      hasConfiguredAvailability: true,
    }));
    expect(store.providers.provider_1.professionalProfile.availabilitySummary).toBe('Luni: 09:00-17:00');
    expect(Object.values(store.auditEvents)).toEqual([
      expect.objectContaining({
        action: 'provider.availability.save',
        actorUid: 'provider_1',
        statusFrom: 'empty',
        statusTo: 'configured',
      }),
    ]);
  });

  it('rejects onboarding submit when provider documents were not finalized', async () => {
    const { db } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.PRE_REGISTERED,
          accountStatus: 'active',
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
        },
      },
      providerAvailability: {
        'provider_1/profile': {
          weekSchedule: [],
          blockedDates: [],
        },
      },
    });

    await expect(
      submitProviderOnboardingService(
        {
          db: db as never,
          auth: { setCustomUserClaims: jest.fn() } as never,
        },
        'provider_1',
        {
          businessName: 'Business',
          displayName: 'Display',
          specialization: 'Curățenie',
          baseRateAmount: 120,
          coverageArea: {
            countryCode: 'RO',
            countryName: 'România',
            countyCode: 'B',
            countyName: 'București',
            cityCode: 'bucuresti',
            cityName: 'București',
            placeId: 'place_1',
            locationLabel: 'Calea Victoriei 10',
            formattedAddress: 'Calea Victoriei 10, București, România',
            centerLat: 44.43,
            centerLng: 26.1,
          },
          shortBio: 'Bio',
        },
      ),
    ).rejects.toThrow('Both finalized provider documents are required before submission.');
  });

  it('submits provider onboarding and records an audit event', async () => {
    const { db, store } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.PRE_REGISTERED,
          accountStatus: 'active',
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
            identity: {
              status: 'uploaded',
              storagePath: 'providers/provider_1/documents/identity/ci.jpg',
              originalFileName: 'ci.jpg',
              uploadedAt: new Date(),
            },
            professional: {
              status: 'uploaded',
              storagePath: 'providers/provider_1/documents/professional/certificat.jpg',
              originalFileName: 'certificat.jpg',
              uploadedAt: new Date(),
            },
          },
          reviewState: { submittedAt: null, lastReviewedAt: null },
          adminReview: { reviewedBy: null, action: null, reason: null, reviewedAt: null },
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
              timeRanges: [{ startTime: '09:00', endTime: '17:00' }],
            },
          ],
          blockedDates: [],
        },
      },
    });
    const setCustomUserClaims = jest.fn();

    const result = await submitProviderOnboardingService(
      {
        db: db as never,
        auth: { setCustomUserClaims } as never,
      },
      'provider_1',
      {
        businessName: 'Business',
        displayName: 'Display',
        specialization: 'Curățenie',
        baseRateAmount: 120,
        coverageArea: {
          countryCode: 'RO',
          countryName: 'România',
          countyCode: 'B',
          countyName: 'București',
          cityCode: 'bucuresti',
          cityName: 'București',
          placeId: 'place_1',
          locationLabel: 'Calea Victoriei 10',
          formattedAddress: 'Calea Victoriei 10, București, România',
          centerLat: 44.43,
          centerLng: 26.1,
        },
        shortBio: 'Bio',
      },
    );

    expect(result.status).toBe(PROVIDER_STATUSES.PENDING_REVIEW);
    expect(store.providers.provider_1.status).toBe(PROVIDER_STATUSES.PENDING_REVIEW);
    expect(setCustomUserClaims).toHaveBeenCalledWith('provider_1', expect.objectContaining({
      role: 'provider',
      providerStatus: PROVIDER_STATUSES.PENDING_REVIEW,
    }));
    expect(Object.values(store.auditEvents)).toEqual([
      expect.objectContaining({
        action: 'provider.submit_for_review',
        actorUid: 'provider_1',
        statusFrom: PROVIDER_STATUSES.PRE_REGISTERED,
        statusTo: PROVIDER_STATUSES.PENDING_REVIEW,
      }),
    ]);
  });

  it('finalizes a provider document only on owned storage paths', async () => {
    const { db, store } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.PRE_REGISTERED,
          documents: {
            identity: { status: 'missing', storagePath: null, originalFileName: null, uploadedAt: null },
            professional: { status: 'missing', storagePath: null, originalFileName: null, uploadedAt: null },
          },
          professionalProfile: { avatarPath: null },
        },
      },
    });
    const { storage } = createMockStorage([
      'providers/provider_1/documents/identity/ci.jpg',
    ]);

    const result = await finalizeProviderDocumentUploadService(
      { db: db as never, storage: storage as never },
      'provider_1',
      {
        documentType: PROVIDER_DOCUMENT_TYPES.IDENTITY,
        storagePath: 'providers/provider_1/documents/identity/ci.jpg',
        originalFileName: 'ci.jpg',
      },
    );

    expect(result.status).toBe('uploaded');
    expect(store.providers.provider_1.documents.identity.storagePath).toBe('providers/provider_1/documents/identity/ci.jpg');
  });

  it('approves a pending provider and publishes the provider directory snapshot', async () => {
    const { db, store } = createMockDb({
      providers: {
        provider_1: {
          uid: 'provider_1',
          role: 'provider',
          status: PROVIDER_STATUSES.PENDING_REVIEW,
          accountStatus: 'active',
          professionalProfile: {
            businessName: 'Casa în Ordine',
            displayName: 'Casa în Ordine',
            specialization: 'Curățenie',
            baseRateAmount: 100,
            baseRateCurrency: 'RON',
            coverageArea: {
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
            coverageAreaText: 'România, București, București',
            shortBio: 'Bio',
            availabilitySummary: 'Luni-Vineri',
            avatarPath: 'providers/provider_1/avatar/main.jpg',
          },
          documents: {
            identity: {
              status: 'uploaded',
              storagePath: 'providers/provider_1/documents/identity/ci.jpg',
              originalFileName: 'ci.jpg',
              uploadedAt: new Date(),
            },
            professional: {
              status: 'uploaded',
              storagePath: 'providers/provider_1/documents/professional/certificat.jpg',
              originalFileName: 'certificat.jpg',
              uploadedAt: new Date(),
            },
          },
          reviewState: { submittedAt: new Date(), lastReviewedAt: null },
          adminReview: { reviewedBy: null, action: null, reason: null, reviewedAt: null },
          suspension: null,
          lastPublishedAt: null,
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
              timeRanges: [{ startTime: '09:00', endTime: '17:00' }],
            },
          ],
          blockedDates: [],
        },
      },
    });
    const setCustomUserClaims = jest.fn();

    const result = await adminReviewProviderService(
      {
        db: db as never,
        auth: { setCustomUserClaims } as never,
      },
      'admin_1',
      'admin',
      {
        providerId: 'provider_1',
        action: PROVIDER_REVIEW_ACTIONS.APPROVE,
      },
    );

    expect(result.status).toBe(PROVIDER_STATUSES.APPROVED);
    expect(store.providers.provider_1.status).toBe(PROVIDER_STATUSES.APPROVED);
    expect(store.providerDirectory.provider_1.providerId).toBe('provider_1');
    expect(setCustomUserClaims).toHaveBeenCalledWith('provider_1', expect.objectContaining({
      role: 'provider',
      providerStatus: PROVIDER_STATUSES.APPROVED,
    }));
    expect(Object.values(store.auditEvents)).toEqual([
      expect.objectContaining({
        action: 'provider.review',
        actorUid: 'admin_1',
        statusFrom: PROVIDER_STATUSES.PENDING_REVIEW,
        statusTo: PROVIDER_STATUSES.APPROVED,
      }),
    ]);
  });

  it('finalizes a user avatar on an owned storage path', async () => {
    const { db, store } = createMockDb({
      users: {
        user_1: {
          uid: 'user_1',
          role: 'user',
          accountStatus: 'active',
          photoPath: null,
        },
      },
    });
    const { storage } = createMockStorage([
      'users/user_1/avatar/profile.jpg',
    ]);

    const result = await finalizeUserAvatarUploadService(
      { db: db as never, storage: storage as never },
      'user_1',
      { storagePath: 'users/user_1/avatar/profile.jpg' },
    );

    expect(result.photoPath).toBe('users/user_1/avatar/profile.jpg');
    expect(store.users.user_1.photoPath).toBe('users/user_1/avatar/profile.jpg');
  });
});
