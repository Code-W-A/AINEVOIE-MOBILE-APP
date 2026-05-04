import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../context/localeContext';
import { useSession } from '../context/sessionContext';
import {
  cancelBookingRequest,
  createBookingRequest,
  fetchUserBookings,
  updateBookingPaymentSummary,
} from '../src/firebase/bookings';
import {
  BOOKING_TIMEZONE,
  sortBookingsByUpdatedDesc,
} from '../src/features/shared/utils/bookings';
import { normalizeRequestDetails } from '../src/features/shared/utils/bookingRequestDetails';

function upsertBookingInList(bookings, booking) {
  return sortBookingsByUpdatedDesc([
    booking,
    ...bookings.filter((item) => item.id !== booking.id),
  ]);
}

export function useUserBookings() {
  const { locale } = useLocale();
  const { session } = useSession();
  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === 'user'
    && session.uid
    && !session.configError,
  );
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBookings = useCallback(async () => {
    if (!canUseRemote) {
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextBookings = await fetchUserBookings(session.uid, locale);
      setBookings(nextBookings);
      return nextBookings;
    } catch (nextError) {
      setBookings([]);
      setError(nextError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [canUseRemote, locale, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  const getBookingById = useCallback((id) => {
    if (!id) {
      return null;
    }

    return bookings.find((booking) => booking.id === id || booking.bookingId === id) ?? null;
  }, [bookings]);

  const upsertRemoteBooking = useCallback((booking) => {
    setBookings((currentBookings) => upsertBookingInList(currentBookings, booking));
    return booking;
  }, []);

  const assertRemoteAccess = useCallback(() => {
    if (!canUseRemote || !session.uid) {
      throw new Error('Autentificarea este necesară pentru programări reale.');
    }
  }, [canUseRemote, session.uid]);

  const createBooking = useCallback(async ({ draft, payment }) => {
    assertRemoteAccess();

    const normalizedRequestDetails = normalizeRequestDetails(
      draft?.requestDetails,
      draft?.price?.estimatedHours,
    );
    const savedBooking = await createBookingRequest({
      providerId: draft?.providerId,
      serviceId: draft?.serviceId,
      scheduledDateKey: draft?.scheduledDateKey,
      scheduledStartTime: draft?.scheduledStartTime,
      timezone: draft?.timezone || BOOKING_TIMEZONE,
      address: draft?.address,
      idempotencyKey: draft?.requestKey,
      requestDetails: normalizedRequestDetails,
      paymentSummary: {
        status: payment?.status || 'unpaid',
        method: payment?.method || 'unknown',
        last4: payment?.last4,
        transactionId: payment?.transactionId,
      },
    }, locale);

    return upsertRemoteBooking(savedBooking);
  }, [assertRemoteAccess, locale, upsertRemoteBooking]);

  const updateBookingPayment = useCallback(async (bookingId, patch) => {
    if (!bookingId) {
      throw new Error('Missing bookingId.');
    }

    assertRemoteAccess();
    const savedBooking = await updateBookingPaymentSummary(bookingId, patch, locale);
    return upsertRemoteBooking(savedBooking);
  }, [assertRemoteAccess, locale, upsertRemoteBooking]);

  const cancelBooking = useCallback(async (bookingId, reason = '') => {
    if (!bookingId) {
      throw new Error('Missing bookingId.');
    }

    assertRemoteAccess();
    const cancelledBooking = await cancelBookingRequest(bookingId, reason, locale);
    return upsertRemoteBooking(cancelledBooking);
  }, [assertRemoteAccess, locale, upsertRemoteBooking]);

  const value = useMemo(() => ({
    bookings,
    data: bookings,
    list: bookings,
    storedBookings: [],
    isLoading,
    error,
    loadBookings,
    reload: loadBookings,
    getBookingById,
    upsertBooking: upsertRemoteBooking,
    createBooking,
    updateBookingPayment,
    cancelBooking,
  }), [bookings, cancelBooking, createBooking, error, getBookingById, isLoading, loadBookings, updateBookingPayment, upsertRemoteBooking]);

  return value;
}
