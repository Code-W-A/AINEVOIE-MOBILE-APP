import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../context/localeContext';
import { useSession } from '../context/sessionContext';
import {
  completeBookingRequest,
  confirmBookingRequest,
  fetchProviderBookings,
  proposeBookingReschedule,
  rejectBookingRequest,
} from '../src/firebase/bookings';
import {
  BOOKING_TIMEZONE,
  resolveDateKeyFromLabel,
  sortBookingsByScheduleAsc,
} from '../src/features/shared/utils/bookings';

function toProviderBooking(booking) {
  return {
    ...booking,
    status: booking.providerUiStatus,
    lifecycleStatus: booking.lifecycleStatus,
    image: booking.image,
  };
}

function sortProviderBookings(bookings = []) {
  return sortBookingsByScheduleAsc(bookings.map((booking) => ({
    ...booking,
    scheduledStartAt: booking.scheduledStartAt || booking.updatedAt,
  })));
}

function upsertRemoteBooking(bookings, booking) {
  return sortProviderBookings([
    booking,
    ...bookings.filter((item) => item.id !== booking.id),
  ]);
}

export function useProviderBookings() {
  const { locale } = useLocale();
  const { session } = useSession();
  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === 'provider'
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
      const remoteBookings = (await fetchProviderBookings(session.uid, locale)).map(toProviderBooking);
      const sortedBookings = sortProviderBookings(remoteBookings);
      setBookings(sortedBookings);
      return sortedBookings;
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

  const assertRemoteAccess = useCallback(() => {
    if (!canUseRemote || !session.uid) {
      throw new Error('Autentificarea ca prestator este necesară pentru programări reale.');
    }
  }, [canUseRemote, session.uid]);

  const confirmBooking = useCallback(async (bookingId) => {
    assertRemoteAccess();
    const savedBooking = toProviderBooking(await confirmBookingRequest(bookingId, locale));
    setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
    return savedBooking;
  }, [assertRemoteAccess, locale]);

  const rejectBooking = useCallback(async (bookingId, reason = '') => {
    assertRemoteAccess();
    const savedBooking = toProviderBooking(await rejectBookingRequest(bookingId, reason, locale));
    setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
    return savedBooking;
  }, [assertRemoteAccess, locale]);

  const rescheduleBooking = useCallback(async (bookingId, nextDateLabel, nextTimeLabel, reason = '') => {
    assertRemoteAccess();
    const currentBooking = bookings.find((booking) => booking.id === bookingId);
    const resolvedDateKey = resolveDateKeyFromLabel(nextDateLabel, locale, currentBooking?.timezone || BOOKING_TIMEZONE);
    const savedBooking = toProviderBooking(await proposeBookingReschedule({
      bookingId,
      scheduledDateKey: resolvedDateKey,
      scheduledStartTime: nextTimeLabel,
      timezone: currentBooking?.timezone || BOOKING_TIMEZONE,
      reason,
    }, locale));
    setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
    return savedBooking;
  }, [assertRemoteAccess, bookings, locale]);

  const completeBooking = useCallback(async (bookingId) => {
    assertRemoteAccess();
    const savedBooking = toProviderBooking(await completeBookingRequest(bookingId, locale));
    setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
    return savedBooking;
  }, [assertRemoteAccess, locale]);

  const getBookingById = useCallback((bookingId) => (
    bookings.find((booking) => booking.id === bookingId || booking.bookingId === bookingId) || null
  ), [bookings]);

  const requestBookings = useMemo(
    () => sortProviderBookings(bookings.filter((booking) => booking.status === 'new')),
    [bookings],
  );

  const activeBookings = useMemo(
    () => sortProviderBookings(bookings.filter((booking) => ['confirmed', 'rescheduled', 'completed'].includes(booking.status))),
    [bookings],
  );

  return {
    bookings,
    data: bookings,
    list: bookings,
    activeBookings,
    requestBookings,
    isLoading,
    error,
    loadBookings,
    reload: loadBookings,
    getBookingById,
    confirmBooking,
    rejectBooking,
    rescheduleBooking,
    completeBooking,
  };
}
