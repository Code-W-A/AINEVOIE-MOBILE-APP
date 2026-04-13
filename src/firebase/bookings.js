import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseServices } from './client';
import {
  normalizeBookingRecord,
  sortBookingsByScheduleAsc,
  sortBookingsByUpdatedDesc,
} from '../features/shared/utils/bookings';

function getBookingsCollectionRef(db) {
  return collection(db, 'bookings');
}

function normalizeBookingList(snapshot, locale = 'ro', sortMode = 'updated') {
  const normalized = snapshot.docs.map((item) => normalizeBookingRecord({
    bookingId: item.id,
    ...item.data(),
  }, locale));

  return sortMode === 'schedule'
    ? sortBookingsByScheduleAsc(normalized)
    : sortBookingsByUpdatedDesc(normalized);
}

function normalizeCallableBookingResponse(response, locale = 'ro') {
  if (!response?.booking) {
    throw new Error('Booking response is missing the booking payload.');
  }

  return normalizeBookingRecord(response.booking, locale);
}

export async function fetchUserBookings(uid, locale = 'ro') {
  const { db } = getFirebaseServices();
  const bookingQuery = query(getBookingsCollectionRef(db), where('userId', '==', uid));
  const snapshot = await getDocs(bookingQuery);
  return normalizeBookingList(snapshot, locale, 'updated');
}

export async function fetchProviderBookings(uid, locale = 'ro') {
  const { db } = getFirebaseServices();
  const bookingQuery = query(getBookingsCollectionRef(db), where('providerId', '==', uid));
  const snapshot = await getDocs(bookingQuery);
  return normalizeBookingList(snapshot, locale, 'schedule');
}

export async function createBookingRequest(payload, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'createBookingRequest');
  const response = await callable(payload);
  return normalizeCallableBookingResponse(response.data, locale);
}

export async function confirmBookingRequest(bookingId, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'confirmBooking');
  const response = await callable({ bookingId });
  return normalizeCallableBookingResponse(response.data, locale);
}

export async function rejectBookingRequest(bookingId, reason, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'rejectBooking');
  const response = await callable({ bookingId, reason });
  return normalizeCallableBookingResponse(response.data, locale);
}

export async function proposeBookingReschedule(payload, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'proposeBookingReschedule');
  const response = await callable(payload);
  return normalizeCallableBookingResponse(response.data, locale);
}

export async function cancelBookingRequest(bookingId, reason = '', locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'cancelBooking');
  const response = await callable({ bookingId, reason });
  return normalizeCallableBookingResponse(response.data, locale);
}

export async function completeBookingRequest(bookingId, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'completeBooking');
  const response = await callable({ bookingId });
  return normalizeCallableBookingResponse(response.data, locale);
}

export async function updateBookingPaymentSummary(bookingId, paymentSummary, locale = 'ro') {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'updateBookingPaymentSummary');
  const response = await callable({ bookingId, paymentSummary });
  return normalizeCallableBookingResponse(response.data, locale);
}
