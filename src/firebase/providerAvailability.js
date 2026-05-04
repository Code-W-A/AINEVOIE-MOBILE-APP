import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFirebaseServices } from './client';
import {
  formatAvailabilitySummary,
  getAvailabilityDayChips,
  hasConfiguredAvailability,
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
  const { auth, db } = getFirebaseServices();
  const normalized = normalizeProviderAvailability(payload, locale);
  const currentUser = auth.currentUser;

  console.log('[ProviderAvailability][saveProviderAvailabilityProfile:auth]', {
    uid,
    currentUserUid: currentUser?.uid || null,
    hasCurrentUser: Boolean(currentUser),
  });

  if (!currentUser) {
    throw new Error('Sesiunea Firebase Auth nu este activă. Deloghează-te și autentifică-te din nou.');
  }

  if (currentUser.uid !== uid) {
    throw new Error('Sesiunea Firebase Auth nu corespunde contului curent. Deloghează-te și autentifică-te din nou.');
  }

  const availabilitySummary = formatAvailabilitySummary(normalized.weekSchedule);
  const availabilityDayChips = getAvailabilityDayChips(normalized.weekSchedule);
  const configured = hasConfiguredAvailability(normalized.weekSchedule);

  console.log('[ProviderAvailability][saveProviderAvailabilityProfile:start]', {
    uid,
    enabledDayCount: availabilityDayChips.length,
    blockedDateCount: normalized.blockedDates.length,
  });

  try {
    await currentUser.getIdToken(true);
    console.log('[ProviderAvailability][saveProviderAvailabilityProfile:token_ready]', {
      uid,
    });

    const batch = writeBatch(db);
    const providerRef = doc(db, 'providers', uid);
    const availabilityRef = getAvailabilityDocRef(db, uid);

    batch.set(availabilityRef, {
      weekSchedule: normalized.weekSchedule,
      blockedDates: normalized.blockedDates,
      availabilitySummary,
      availabilityDayChips,
      hasConfiguredAvailability: configured,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    batch.update(providerRef, {
      'professionalProfile.availabilitySummary': availabilitySummary,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    const normalizedResponse = normalizeProviderAvailability({
      ...normalized,
      availabilitySummary,
      availabilityDayChips,
      hasConfiguredAvailability: configured,
      updatedAt: new Date().toISOString(),
    }, locale);

    console.log('[ProviderAvailability][saveProviderAvailabilityProfile:success]', {
      uid,
      enabledDayCount: availabilityDayChips.length,
      blockedDateCount: normalizedResponse.blockedDates.length,
    });

    return normalizedResponse;
  } catch (error) {
    console.error('[ProviderAvailability][saveProviderAvailabilityProfile:error]', {
      uid,
      code: error?.code,
      message: error?.message,
      details: error?.details,
    });
    throw error;
  }
}

export async function clearProviderAvailabilityProfile(uid, locale = 'ro') {
  return saveProviderAvailabilityProfile(uid, {
    weekSchedule: [],
    blockedDates: [],
  }, locale);
}
