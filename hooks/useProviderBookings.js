import AsyncStorage from '@react-native-async-storage/async-storage';
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
  normalizeBookingRecord,
  resolveDateKeyFromLabel,
  sortBookingsByScheduleAsc,
} from '../src/features/shared/utils/bookings';
import { normalizeRequestDetails } from '../src/features/shared/utils/bookingRequestDetails';
import { normalizePaymentPayload } from '../src/features/shared/utils/paymentUi';
import { getProviderDisplaySnapshot } from '../src/features/shared/utils/providerDirectory';

const PROVIDER_BOOKINGS_STORAGE_KEY = '@ainevoie/provider-bookings';
const LEGACY_PROVIDER_BOOKINGS_STORAGE_KEY = '@urbanhome/provider-bookings';
const defaultClientImage = require('../assets/images/user/user_5.jpg');

const seedProviderBookings = [
  {
    id: 'req_1',
    clientName: 'Andrei Popescu',
    serviceLabel: 'Curățenie locuință',
    address: 'Str. Aviatorilor 21, București',
    scheduledDate: '17 martie',
    scheduledTime: '13:00',
    dayLabel: '17 martie',
    status: 'new',
    image: require('../assets/images/user/user_1.jpg'),
    statusMeta: 'Cerere nouă',
    payment: {
      status: 'in_progress',
      method: 'card',
      last4: '4242',
      updatedAt: '2026-03-17T10:00:00.000Z',
    },
    updatedAt: '2026-03-17T10:00:00.000Z',
  },
  {
    id: 'bk_4',
    clientName: 'Andrei Marin',
    serviceLabel: 'Curățenie locuință',
    address: 'Str. Dristorului 30, București',
    scheduledDate: '16 martie',
    scheduledTime: '09:00',
    dayLabel: 'Mâine',
    status: 'confirmed',
    image: require('../assets/images/user/user_7.jpg'),
    statusMeta: 'Confirmată pentru mâine',
    payment: {
      status: 'paid',
      method: 'google_pay',
      transactionId: 'TX-DEMO-PR-012',
      updatedAt: '2026-03-15T09:40:00.000Z',
    },
    updatedAt: '2026-03-15T09:40:00.000Z',
  },
  {
    id: 'bk_5',
    clientName: 'Alexandra Matei',
    serviceLabel: 'Curățenie locuință',
    address: 'Bd. Tineretului 18, București',
    scheduledDate: '16 martie',
    scheduledTime: '11:00',
    dayLabel: 'Mâine',
    status: 'rescheduled',
    image: require('../assets/images/user/user_3.jpg'),
    statusMeta: 'Reprogramată pentru 16 martie, 11:00',
    payment: {
      status: 'unpaid',
      method: 'card',
      updatedAt: '2026-03-15T10:10:00.000Z',
    },
    updatedAt: '2026-03-15T10:10:00.000Z',
  },
];

function normalizeBooking(item) {
  const providerSnapshot = getProviderDisplaySnapshot({
    providerId: item?.providerId,
    providerName: item?.providerName,
    providerRole: item?.providerRole || item?.serviceLabel,
  });

  return {
    id: item?.id || `provider_booking_${Date.now()}`,
    clientName: item?.clientName || '',
    serviceLabel: item?.serviceLabel || '',
    address: item?.address || '',
    scheduledDate: item?.scheduledDate || '',
    scheduledTime: item?.scheduledTime || '',
    dayLabel: item?.dayLabel || item?.scheduledDate || '',
    status: item?.status || 'new',
    lifecycleStatus: item?.lifecycleStatus || item?.status || 'requested',
    image: item?.image || defaultClientImage,
    statusMeta: item?.statusMeta || '',
    providerId: providerSnapshot.providerId,
    providerName: providerSnapshot.providerName,
    providerRole: providerSnapshot.providerRole,
    requestDetails: normalizeRequestDetails(item?.requestDetails, 2),
    payment: normalizePaymentPayload(item?.payment),
    providerDecision: normalizeProviderDecision(item?.providerDecision),
    cancellation: normalizeCancellation(item?.cancellation),
    updatedAt: item?.updatedAt || new Date().toISOString(),
  };
}

function normalizeProviderDecision(decision) {
  if (!decision?.type) {
    return null;
  }

  return {
    type: decision.type === 'rejected' ? 'rejected' : 'rescheduled',
    reason: String(decision?.reason || '').trim(),
    proposedDateLabel: String(decision?.proposedDateLabel || '').trim(),
    proposedTimeLabel: String(decision?.proposedTimeLabel || '').trim(),
    decidedAt: decision?.decidedAt || new Date().toISOString(),
  };
}

function normalizeCancellation(cancellation) {
  if (!cancellation?.cancelledBy) {
    return null;
  }

  return {
    cancelledBy: String(cancellation.cancelledBy).trim(),
    reason: String(cancellation?.reason || '').trim(),
    cancelledAt: cancellation?.cancelledAt || new Date().toISOString(),
  };
}

function toLegacyProviderBooking(booking, locale = 'ro') {
  const normalizedBooking = normalizeBookingRecord(booking, locale);

  return {
    ...normalizedBooking,
    status: normalizedBooking.providerUiStatus,
    lifecycleStatus: normalizedBooking.lifecycleStatus,
    image: normalizedBooking.image || defaultClientImage,
  };
}

function sortProviderBookings(bookings = []) {
  return sortBookingsByScheduleAsc(bookings.map((booking) => ({
    ...booking,
    scheduledStartAt: booking.scheduledStartAt || booking.updatedAt,
  })));
}

async function writeStoredProviderBookings(bookings) {
  await AsyncStorage.setItem(PROVIDER_BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
  await AsyncStorage.removeItem(LEGACY_PROVIDER_BOOKINGS_STORAGE_KEY);
}

export async function readStoredProviderBookings() {
  try {
    const storedValue = await AsyncStorage.getItem(PROVIDER_BOOKINGS_STORAGE_KEY);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);
      return Array.isArray(parsedValue) ? parsedValue.map(normalizeBooking) : seedProviderBookings.map(normalizeBooking);
    }

    const legacyValue = await AsyncStorage.getItem(LEGACY_PROVIDER_BOOKINGS_STORAGE_KEY);

    if (!legacyValue) {
      return seedProviderBookings.map(normalizeBooking);
    }

    await AsyncStorage.setItem(PROVIDER_BOOKINGS_STORAGE_KEY, legacyValue);
    await AsyncStorage.removeItem(LEGACY_PROVIDER_BOOKINGS_STORAGE_KEY);
    const parsedLegacyValue = JSON.parse(legacyValue);
    return Array.isArray(parsedLegacyValue) ? parsedLegacyValue.map(normalizeBooking) : seedProviderBookings.map(normalizeBooking);
  } catch {
    return seedProviderBookings.map(normalizeBooking);
  }
}

export async function createProviderRequestFromUserBooking(userBooking, clientSnapshot = {}) {
  if (!userBooking?.id) {
    throw new Error('Missing user booking payload.');
  }

  const currentBookings = await readStoredProviderBookings();
  const providerSnapshot = getProviderDisplaySnapshot({
    providerId: userBooking.providerId,
    providerName: userBooking.providerName,
    providerRole: userBooking.providerRole,
  });

  const nextProviderRequest = normalizeBooking({
    id: userBooking.id,
    clientName: clientSnapshot.name || 'Client',
    serviceLabel: userBooking.serviceName || providerSnapshot.providerRole,
    address: userBooking.address || '',
    scheduledDate: userBooking.dateLabel || '',
    scheduledTime: userBooking.timeLabel || '',
    dayLabel: userBooking.dateLabel || '',
    status: 'new',
    image: clientSnapshot.image || defaultClientImage,
    statusMeta: 'Cerere nouă',
    providerId: providerSnapshot.providerId,
    providerName: providerSnapshot.providerName,
    providerRole: providerSnapshot.providerRole,
    requestDetails: normalizeRequestDetails(userBooking.requestDetails, userBooking?.price?.estimatedHours),
    payment: normalizePaymentPayload(userBooking.payment),
    updatedAt: userBooking.updatedAt || new Date().toISOString(),
  });

  const nextBookings = [
    nextProviderRequest,
    ...currentBookings.filter((booking) => booking.id !== nextProviderRequest.id),
  ];

  await writeStoredProviderBookings(nextBookings);
  return nextProviderRequest;
}

export async function syncProviderBookingPayment(bookingId, paymentPatch) {
  if (!bookingId) {
    throw new Error('Missing bookingId.');
  }

  const currentBookings = await readStoredProviderBookings();
  const existingBooking = currentBookings.find((booking) => booking.id === bookingId);

  if (!existingBooking) {
    return null;
  }

  const nextPayment = normalizePaymentPayload({
    ...existingBooking.payment,
    ...(paymentPatch || {}),
    updatedAt: paymentPatch?.updatedAt || new Date().toISOString(),
  });
  const nextBookings = currentBookings.map((booking) => (
    booking.id === bookingId
      ? normalizeBooking({
        ...booking,
        payment: nextPayment,
        updatedAt: new Date().toISOString(),
      })
      : booking
  ));

  await writeStoredProviderBookings(nextBookings);
  return nextBookings.find((booking) => booking.id === bookingId) || null;
}

export async function syncProviderBookingCancellation(bookingId, cancellationPatch) {
  if (!bookingId) {
    throw new Error('Missing bookingId.');
  }

  const currentBookings = await readStoredProviderBookings();
  const existingBooking = currentBookings.find((booking) => booking.id === bookingId);

  if (!existingBooking) {
    return null;
  }

  const cancellation = normalizeCancellation({
    ...existingBooking.cancellation,
    ...(cancellationPatch || {}),
    cancelledBy: 'user',
    cancelledAt: cancellationPatch?.cancelledAt || new Date().toISOString(),
  });
  const nextBookings = currentBookings.map((booking) => (
    booking.id === bookingId
      ? normalizeBooking({
        ...booking,
        status: 'cancelled',
        cancellation,
        updatedAt: new Date().toISOString(),
      })
      : booking
  ));

  await writeStoredProviderBookings(nextBookings);
  return nextBookings.find((booking) => booking.id === bookingId) || null;
}

function upsertRemoteBooking(bookings, booking) {
  return sortProviderBookings([
    booking,
    ...bookings.filter((item) => item.id !== booking.id),
  ]);
}

function upsertStoredBooking(bookings, booking) {
  return [
    booking,
    ...bookings.filter((item) => item.id !== booking.id),
  ];
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
  const [bookings, setBookings] = useState(seedProviderBookings.map(normalizeBooking));
  const [isLoading, setIsLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);

    if (canUseRemote && session.uid) {
      try {
        const remoteBookings = (await fetchProviderBookings(session.uid, locale)).map((booking) => toLegacyProviderBooking(booking, locale));
        const sortedRemoteBookings = sortProviderBookings(remoteBookings);
        setBookings(sortedRemoteBookings);
        setIsLoading(false);
        return sortedRemoteBookings;
      } catch {
      }
    }

    const storedBookings = await readStoredProviderBookings();
    setBookings(storedBookings);
    setIsLoading(false);
    return storedBookings;
  }, [canUseRemote, locale, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  const persistBookings = useCallback(async (nextBookings) => {
    await writeStoredProviderBookings(nextBookings);
    setBookings(nextBookings);
  }, []);

  const updateLocalBooking = useCallback(async (bookingId, updater) => {
    const currentBookings = await readStoredProviderBookings();
    const nextBookings = currentBookings.map((booking) => (
      booking.id === bookingId
        ? normalizeBooking({
          ...booking,
          ...(typeof updater === 'function' ? updater(booking) : updater),
          updatedAt: new Date().toISOString(),
        })
        : booking
    ));

    await persistBookings(nextBookings);
    return nextBookings.find((booking) => booking.id === bookingId) || null;
  }, [persistBookings]);

  const confirmBooking = useCallback(async (bookingId) => {
    if (canUseRemote && session.uid) {
      const savedBooking = toLegacyProviderBooking(await confirmBookingRequest(bookingId, locale), locale);
      setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
      return savedBooking;
    }

    return updateLocalBooking(bookingId, {
      status: 'confirmed',
      lifecycleStatus: 'confirmed',
      providerDecision: null,
    });
  }, [canUseRemote, locale, session.uid, updateLocalBooking]);

  const rejectBooking = useCallback(async (bookingId, reason = '') => {
    if (canUseRemote && session.uid) {
      const savedBooking = toLegacyProviderBooking(await rejectBookingRequest(bookingId, reason, locale), locale);
      setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
      return savedBooking;
    }

    return updateLocalBooking(bookingId, {
      status: 'rejected',
      lifecycleStatus: 'rejected',
      providerDecision: normalizeProviderDecision({
        type: 'rejected',
        reason,
      }),
    });
  }, [canUseRemote, locale, session.uid, updateLocalBooking]);

  const rescheduleBooking = useCallback(async (bookingId, nextDateLabel, nextTimeLabel, reason = '') => {
    if (canUseRemote && session.uid) {
      const currentBooking = bookings.find((booking) => booking.id === bookingId);
      const resolvedDateKey = resolveDateKeyFromLabel(nextDateLabel, locale, currentBooking?.timezone || BOOKING_TIMEZONE);
      const savedBooking = toLegacyProviderBooking(await proposeBookingReschedule({
        bookingId,
        scheduledDateKey: resolvedDateKey,
        scheduledStartTime: nextTimeLabel,
        timezone: currentBooking?.timezone || BOOKING_TIMEZONE,
        reason,
      }, locale), locale);
      setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
      return savedBooking;
    }

    return updateLocalBooking(bookingId, {
      status: 'rescheduled',
      lifecycleStatus: 'reschedule_proposed',
      scheduledDate: nextDateLabel,
      scheduledTime: nextTimeLabel,
      dayLabel: nextDateLabel,
      providerDecision: normalizeProviderDecision({
        type: 'rescheduled',
        reason,
        proposedDateLabel: nextDateLabel,
        proposedTimeLabel: nextTimeLabel,
      }),
    });
  }, [bookings, canUseRemote, locale, session.uid, updateLocalBooking]);

  const completeBooking = useCallback(async (bookingId) => {
    if (canUseRemote && session.uid) {
      const savedBooking = toLegacyProviderBooking(await completeBookingRequest(bookingId, locale), locale);
      setBookings((currentBookings) => upsertRemoteBooking(currentBookings, savedBooking));
      return savedBooking;
    }

    return updateLocalBooking(bookingId, {
      status: 'completed',
      lifecycleStatus: 'completed',
    });
  }, [canUseRemote, locale, session.uid, updateLocalBooking]);

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
    activeBookings,
    requestBookings,
    isLoading,
    loadBookings,
    getBookingById,
    confirmBooking,
    rejectBooking,
    rescheduleBooking,
    completeBooking,
  };
}
