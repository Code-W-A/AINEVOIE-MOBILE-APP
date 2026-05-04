import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { getFirebaseConfigError, getFirebaseServices, isFirebaseConfigured } from './client';
import { resolveStoragePathDownloadUrl } from './storageUploads';
import {
  normalizeBookingRecord,
  sortBookingsByScheduleAsc,
  sortBookingsByUpdatedDesc,
} from '../features/shared/utils/bookings';

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error(getFirebaseConfigError());
  }
}

function getBookingsCollectionRef(db) {
  return collection(db, 'bookings');
}

async function withResolvedProviderAvatar(record) {
  const avatarPath = record?.providerSnapshot?.avatarPath;

  if (!avatarPath || record.providerImage) {
    return record;
  }

  try {
    const avatarUrl = await resolveStoragePathDownloadUrl(avatarPath);
    return {
      ...record,
      providerImage: { uri: avatarUrl },
    };
  } catch {
    return record;
  }
}

async function normalizeBookingList(snapshot, locale = 'ro', sortMode = 'updated') {
  const normalized = await Promise.all(snapshot.docs.map(async (item) => normalizeBookingRecord(
    await withResolvedProviderAvatar({
      bookingId: item.id,
      ...item.data(),
    }),
    locale,
  )));

  return sortMode === 'schedule'
    ? sortBookingsByScheduleAsc(normalized)
    : sortBookingsByUpdatedDesc(normalized);
}

async function normalizeCallableBookingResponse(response, locale = 'ro') {
  if (!response?.booking) {
    throw new Error('Booking response is missing the booking payload.');
  }

  return normalizeBookingRecord(await withResolvedProviderAvatar(response.booking), locale);
}

export async function fetchUserBookings(uid, locale = 'ro') {
  assertFirebaseConfigured();
  const { db } = getFirebaseServices();
  const bookingQuery = query(
    getBookingsCollectionRef(db),
    where('userId', '==', uid),
    orderBy('scheduledStartAt', 'desc'),
  );
  const snapshot = await getDocs(bookingQuery);
  return await normalizeBookingList(snapshot, locale, 'updated');
}

export async function fetchBookingDoc(bookingId, locale = 'ro') {
  assertFirebaseConfigured();
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'bookings', bookingId));
  if (!snapshot.exists()) {
    return null;
  }
  return normalizeBookingRecord(
    await withResolvedProviderAvatar({ bookingId: snapshot.id, ...snapshot.data() }),
    locale,
  );
}

export async function fetchProviderBookings(uid, locale = 'ro') {
  assertFirebaseConfigured();
  const { db } = getFirebaseServices();
  const bookingQuery = query(
    getBookingsCollectionRef(db),
    where('providerId', '==', uid),
    orderBy('scheduledStartAt', 'desc'),
  );
  const snapshot = await getDocs(bookingQuery);
  return await normalizeBookingList(snapshot, locale, 'schedule');
}

export async function createBookingRequest(payload, locale = 'ro') {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'createBookingRequest');
  const response = await callable(payload);
  return await normalizeCallableBookingResponse(response.data, locale);
}

export async function confirmBookingRequest(bookingId, locale = 'ro') {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'confirmBooking');
  const response = await callable({ bookingId });
  return await normalizeCallableBookingResponse(response.data, locale);
}

export async function rejectBookingRequest(bookingId, reason, locale = 'ro') {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'rejectBooking');
  const response = await callable({ bookingId, reason });
  return await normalizeCallableBookingResponse(response.data, locale);
}

export async function proposeBookingReschedule(payload, locale = 'ro') {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'proposeBookingReschedule');
  const response = await callable(payload);
  return await normalizeCallableBookingResponse(response.data, locale);
}

export async function cancelBookingRequest(bookingId, reason = '', locale = 'ro') {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'cancelBooking');
  const response = await callable({ bookingId, reason });
  return await normalizeCallableBookingResponse(response.data, locale);
}

export async function completeBookingRequest(bookingId, locale = 'ro') {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'completeBooking');
  const response = await callable({ bookingId });
  return await normalizeCallableBookingResponse(response.data, locale);
}

export async function updateBookingPaymentSummary(bookingId, paymentSummary, locale = 'ro') {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'updateBookingPaymentSummary');
  const response = await callable({ bookingId, paymentSummary });
  return await normalizeCallableBookingResponse(response.data, locale);
}

export async function createStripePaymentSheetSession(bookingId) {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'createStripePaymentSheetSession');
  const response = await callable({ bookingId });
  return response.data;
}

export async function completeDemoPayment(bookingId) {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'completeDemoPayment');
  const response = await callable({ bookingId });
  return response.data;
}
