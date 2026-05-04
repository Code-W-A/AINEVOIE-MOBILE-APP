import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { DEFAULT_NOTIFICATION_PREFERENCES, deriveRomaniaHierarchyFromPlacemark } from '@ainevoie/firebase-shared';
import { getFirebaseServices } from './client';
import {
  buildCoverageAreaPatch,
  normalizeCoverageAreaForm,
} from '../features/shared/utils/providerCoverage';

function normalizeNotificationPreferences(preferences) {
  return {
    bookings: preferences?.bookings !== false,
    messages: preferences?.messages !== false,
    promoSystem: preferences?.promoSystem !== false,
  };
}

function normalizeLocation(location) {
  if (!location?.formattedAddress) {
    return null;
  }

  const hierarchy = deriveRomaniaHierarchyFromPlacemark({
    countryCode: location.countryCode,
    countryName: location.countryName,
    countyCode: location.countyCode,
    countyName: location.countyName,
    cityCode: location.cityCode,
    cityName: location.cityName,
    formattedAddress: location.formattedAddress,
  });

  return {
    formattedAddress: String(location.formattedAddress || '').trim(),
    latitude: Number(location.latitude ?? location.lat ?? 0),
    longitude: Number(location.longitude ?? location.lng ?? 0),
    countryCode: hierarchy.countryCode,
    countryName: hierarchy.countryName,
    countyCode: hierarchy.countyCode,
    countyName: hierarchy.countyName,
    cityCode: hierarchy.cityCode,
    cityName: hierarchy.cityName,
    source: location.source === 'manual' ? 'manual' : 'gps',
    updatedAt: location.updatedAt || new Date().toISOString(),
  };
}

function normalizeProviderDocuments(documents, fallback = {}) {
  return {
    identity: {
      uri: fallback?.identity?.uri || null,
      name: documents?.identity?.originalFileName || fallback?.identity?.name || '',
      status: documents?.identity?.status === 'uploaded' ? 'added' : 'missing',
    },
    professional: {
      uri: fallback?.professional?.uri || null,
      name: documents?.professional?.originalFileName || fallback?.professional?.name || '',
      status: documents?.professional?.status === 'uploaded' ? 'added' : 'missing',
    },
  };
}

export function mapUserDocToHookData(payload, fallback = {}) {
  return {
    name: payload?.displayName || fallback.name || '',
    email: payload?.email || fallback.email || '',
    password: '',
    phoneNumber: payload?.phoneNumber || fallback.phoneNumber || '',
  };
}

export function mapProviderDocToHookData(payload, fallback = {}) {
  const professionalProfile = payload?.professionalProfile || {};
  const coverageAreaConfig = normalizeCoverageAreaForm(
    professionalProfile.coverageArea || fallback.professionalProfile?.coverageAreaConfig,
  );
  const coveragePatch = buildCoverageAreaPatch(coverageAreaConfig);

  return {
    account: {
      name: professionalProfile.displayName || fallback.account?.name || '',
      email: payload?.email || fallback.account?.email || '',
      password: '',
    },
    professionalProfile: {
      businessName: professionalProfile.businessName || fallback.professionalProfile?.businessName || '',
      displayName: professionalProfile.displayName || fallback.professionalProfile?.displayName || '',
      specialization: professionalProfile.specialization || fallback.professionalProfile?.specialization || '',
      baseRate: professionalProfile.baseRateAmount ? String(professionalProfile.baseRateAmount) : fallback.professionalProfile?.baseRate || '',
      coverageArea: professionalProfile.coverageAreaText || coveragePatch.coverageAreaText || fallback.professionalProfile?.coverageArea || '',
      coverageAreaConfig,
      shortBio: professionalProfile.shortBio || fallback.professionalProfile?.shortBio || '',
      availabilitySummary: professionalProfile.availabilitySummary || fallback.professionalProfile?.availabilitySummary || '',
    },
    documents: normalizeProviderDocuments(payload?.documents, fallback.documents),
    currentStep: fallback.currentStep || 0,
    verificationStatus: payload?.status || fallback.verificationStatus || 'draft',
    completedAt: payload?.reviewState?.submittedAt || fallback.completedAt || null,
    updatedAt: fallback.updatedAt || null,
  };
}

export async function fetchUserProfile(uid) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function fetchProviderProfile(uid) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'providers', uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveUserProfilePatch(uid, patch) {
  const { db } = getFirebaseServices();
  const userRef = doc(db, 'users', uid);
  const nextPatch = {
    updatedAt: serverTimestamp(),
    ...patch,
  };

  await updateDoc(userRef, nextPatch);
  return fetchUserProfile(uid);
}

export async function saveProviderProfilePatch(uid, patch) {
  const { db } = getFirebaseServices();
  const providerRef = doc(db, 'providers', uid);
  const professionalProfilePatch = patch?.professionalProfile || null;
  const nextPatch = {
    updatedAt: serverTimestamp(),
    ...patch,
  };

  if (professionalProfilePatch && typeof professionalProfilePatch === 'object') {
    delete nextPatch.professionalProfile;

    Object.entries(professionalProfilePatch).forEach(([key, value]) => {
      nextPatch[`professionalProfile.${key}`] = value;
    });
  }

  await updateDoc(providerRef, nextPatch);
  return fetchProviderProfile(uid);
}

export async function saveUserPrimaryLocation(uid, location) {
  const nextLocation = normalizeLocation(location);

  if (!nextLocation) {
    throw new Error('A valid primary location is required.');
  }

  console.log('[ProfileStore][saveUserPrimaryLocation] patch', {
    uid,
    source: nextLocation.source,
    hasAddress: Boolean(nextLocation.formattedAddress),
    latitude: Number(nextLocation.latitude.toFixed(4)),
    longitude: Number(nextLocation.longitude.toFixed(4)),
  });

  return saveUserProfilePatch(uid, {
    primaryLocation: {
      formattedAddress: nextLocation.formattedAddress,
      lat: nextLocation.latitude,
      lng: nextLocation.longitude,
      countryCode: nextLocation.countryCode,
      countryName: nextLocation.countryName,
      countyCode: nextLocation.countyCode,
      countyName: nextLocation.countyName,
      cityCode: nextLocation.cityCode,
      cityName: nextLocation.cityName,
      source: nextLocation.source,
    },
    profileCompletion: {
      hasPrimaryLocation: true,
    },
  });
}

export async function clearUserPrimaryLocation(uid) {
  return saveUserProfilePatch(uid, {
    primaryLocation: null,
    'profileCompletion.hasPrimaryLocation': false,
  });
}

export async function saveRoleNotificationPreferences(role, uid, preferences) {
  const normalizedPreferences = normalizeNotificationPreferences(preferences);

  if (role === 'provider') {
    return saveProviderProfilePatch(uid, {
      notificationPreferences: normalizedPreferences,
    });
  }

  return saveUserProfilePatch(uid, {
    notificationPreferences: normalizedPreferences,
  });
}

export async function saveRoleLocale(role, uid, locale) {
  const normalizedLocale = locale === 'en' ? 'en' : 'ro';

  if (role === 'provider') {
    return saveProviderProfilePatch(uid, {
      locale: normalizedLocale,
    });
  }

  return saveUserProfilePatch(uid, {
    locale: normalizedLocale,
  });
}

export function getDefaultNotificationPreferences() {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}
