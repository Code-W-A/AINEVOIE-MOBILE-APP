import { FieldValue } from 'firebase-admin/firestore';
import { SCHEMA_VERSION } from './config';
import {
  ACCOUNT_STATUSES,
  DEFAULT_LOCALE,
  DEFAULT_NOTIFICATION_PREFERENCES,
  PROVIDER_STATUSES,
  ROLES,
} from './shared';

type UserProfileArgs = {
  uid: string,
  createdBy: string,
  displayName: string,
  email: string | null,
  phoneNumber: string | null,
  authProviders: string[],
  locale?: 'ro' | 'en',
};

type ProviderProfileArgs = UserProfileArgs;

export function buildUserProfileDoc({
  uid,
  createdBy,
  displayName,
  email,
  phoneNumber,
  authProviders,
  locale = DEFAULT_LOCALE,
}: UserProfileArgs) {
  const now = FieldValue.serverTimestamp();

  return {
    uid,
    role: ROLES.USER,
    accountStatus: ACCOUNT_STATUSES.ACTIVE,
    displayName,
    email,
    phoneNumber,
    authProviders,
    photoPath: null,
    locale,
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    primaryLocation: null,
    profileCompletion: {
      hasPrimaryLocation: false,
    },
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy,
    updatedBy: createdBy,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function buildProviderProfileDoc({
  uid,
  createdBy,
  displayName,
  email,
  phoneNumber,
  authProviders,
  locale = DEFAULT_LOCALE,
}: ProviderProfileArgs) {
  const now = FieldValue.serverTimestamp();

  return {
    uid,
    role: ROLES.PROVIDER,
    status: PROVIDER_STATUSES.PRE_REGISTERED,
    accountStatus: ACCOUNT_STATUSES.ACTIVE,
    email,
    phoneNumber,
    authProviders,
    locale,
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    professionalProfile: {
      businessName: '',
      displayName,
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
        status: 'missing',
        storagePath: null,
        originalFileName: null,
        uploadedAt: null,
      },
      professional: {
        status: 'missing',
        storagePath: null,
        originalFileName: null,
        uploadedAt: null,
      },
    },
    reviewState: {
      submittedAt: null,
      lastReviewedAt: null,
    },
    adminReview: {
      reviewedBy: null,
      action: null,
      reason: null,
      reviewedAt: null,
    },
    suspension: null,
    lastPublishedAt: null,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy,
    updatedBy: createdBy,
    schemaVersion: SCHEMA_VERSION,
  };
}
