import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseServices } from './client';
import {
  normalizeProviderAvailability,
} from '../features/shared/utils/providerAvailability';

function getAvailabilityDocRef(db, uid) {
  return doc(db, 'providers', uid, 'availability', 'profile');
}

export async function fetchProviderAvailabilityProfile(uid, locale = 'ro') {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(getAvailabilityDocRef(db, uid));

  if (!snapshot.exists()) {
    return normalizeProviderAvailability(null, locale);
  }

  return normalizeProviderAvailability(snapshot.data(), locale);
}

export async function saveProviderAvailabilityProfile(uid, payload, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const normalized = normalizeProviderAvailability(payload, locale);
  const callable = httpsCallable(functions, 'saveProviderAvailability');
  const response = await callable({
    uid,
    ...normalized,
  });
  return normalizeProviderAvailability(response.data, locale);
}

export async function clearProviderAvailabilityProfile(uid, locale = 'ro') {
  return saveProviderAvailabilityProfile(uid, {
    weekSchedule: [],
    blockedDates: [],
  }, locale);
}
