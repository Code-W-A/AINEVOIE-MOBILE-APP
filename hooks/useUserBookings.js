import AsyncStorage from '@react-native-async-storage/async-storage';
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
  normalizeBookingRecord,
  sortBookingsByUpdatedDesc,
} from '../src/features/shared/utils/bookings';
import { getUserSeedBookingById, userBookingSeeds } from '../src/features/user/data/userBookingSeeds';
import { normalizeRequestDetails } from '../src/features/shared/utils/bookingRequestDetails';
import { DEFAULT_MOCK_CURRENCY, normalizeMockCurrency } from '../src/features/shared/utils/mockFormatting';
import { normalizePaymentPayload } from '../src/features/shared/utils/paymentUi';
import { getProviderDisplaySnapshot } from '../src/features/shared/utils/providerDirectory';
import { tr } from '../src/features/shared/localization';
import {
  createProviderRequestFromUserBooking,
  syncProviderBookingCancellation,
  syncProviderBookingPayment,
} from './useProviderBookings';
import { readStoredUserProfile } from './useUserProfile';

const USER_BOOKINGS_STORAGE_KEY = '@ainevoie/user-bookings';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readStoredBookings() {
  try {
    const storedValue = await AsyncStorage.getItem(USER_BOOKINGS_STORAGE_KEY);
    const parsed = storedValue ? safeJsonParse(storedValue) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStoredBookings(bookings) {
  await AsyncStorage.setItem(USER_BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
}

function mergeBookings({ stored, seed }) {
  const map = new Map();
  seed.forEach((booking) => {
    map.set(booking.id, normalizeLocalBooking(booking));
  });
  stored.forEach((booking) => {
    map.set(booking.id, normalizeLocalBooking(booking));
  });
  return Array.from(map.values());
}

function buildTransactionId() {
  const entropy = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `TX-${Date.now()}-${entropy}`;
}

function normalizeLocalProviderDecision(decision) {
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

function normalizeLocalCancellation(cancellation) {
  if (cancellation?.cancelledBy !== 'user') {
    return null;
  }

  return {
    cancelledBy: 'user',
    reason: String(cancellation?.reason || '').trim(),
    cancelledAt: cancellation?.cancelledAt || new Date().toISOString(),
  };
}

function normalizeLocalBooking(booking) {
  const providerSnapshot = getProviderDisplaySnapshot({
    providerId: booking?.providerId,
    providerName: booking?.providerName,
    providerRole: booking?.providerRole,
  });
  const normalizedPrice = booking?.price
    ? {
      ...booking.price,
      currency: normalizeMockCurrency(booking.price.currency),
      unit: booking.price.unit || 'oră',
      estimatedHours: Number(booking.price.estimatedHours) || 1,
    }
    : {
      amount: 0,
      currency: DEFAULT_MOCK_CURRENCY,
      unit: 'oră',
      estimatedHours: 1,
    };

  return {
    ...booking,
    providerId: providerSnapshot.providerId,
    providerName: providerSnapshot.providerName,
    providerRole: providerSnapshot.providerRole,
    providerImage: booking?.providerImage ?? providerSnapshot.providerImage,
    requestDetails: normalizeRequestDetails(booking?.requestDetails, normalizedPrice.estimatedHours),
    price: normalizedPrice,
    payment: normalizePaymentPayload(booking?.payment),
    providerDecision: normalizeLocalProviderDecision(booking?.providerDecision),
    cancellation: normalizeLocalCancellation(booking?.cancellation),
  };
}

function upsertBookingInList(bookings, booking, sortByUpdated = true) {
  const nextBookings = [
    booking,
    ...bookings.filter((item) => item.id !== booking.id),
  ];

  return sortByUpdated ? sortBookingsByUpdatedDesc(nextBookings) : nextBookings;
}

export function useUserBookings() {
  const { locale } = useLocale();
  const { session } = useSession();
  const canUseRemote = Boolean(session.isAuthenticated && session.uid && !session.configError);
  const [storedBookings, setStoredBookings] = useState([]);
  const [remoteBookings, setRemoteBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);

    if (canUseRemote && session.uid) {
      try {
        const nextRemoteBookings = await fetchUserBookings(session.uid, locale);
        setRemoteBookings(nextRemoteBookings);
        setIsLoading(false);
        return nextRemoteBookings;
      } catch {
      }
    }

    const nextStoredBookings = await readStoredBookings();
    setStoredBookings(nextStoredBookings);
    setIsLoading(false);
    return nextStoredBookings;
  }, [canUseRemote, locale, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  const mergedLocalBookings = useMemo(
    () => mergeBookings({ stored: storedBookings, seed: userBookingSeeds }),
    [storedBookings],
  );

  const bookings = canUseRemote ? remoteBookings : mergedLocalBookings;

  const getBookingById = useCallback((id) => {
    if (!id) {
      return null;
    }

    return bookings.find((booking) => booking.id === id || booking.bookingId === id) ?? null;
  }, [bookings]);

  const upsertStoredBooking = useCallback(async (booking) => {
    if (!booking?.id) {
      throw new Error('Invalid booking payload.');
    }

    const nextBookings = await readStoredBookings();
    const index = nextBookings.findIndex((entry) => entry.id === booking.id);

    if (index >= 0) {
      nextBookings[index] = booking;
    } else {
      nextBookings.unshift(booking);
    }

    await writeStoredBookings(nextBookings);
    setStoredBookings(nextBookings);
    return booking;
  }, []);

  const upsertRemoteBooking = useCallback((booking) => {
    setRemoteBookings((currentBookings) => upsertBookingInList(currentBookings, booking));
    return booking;
  }, []);

  const createBooking = useCallback(async ({ draft, payment }) => {
    const normalizedRequestDetails = normalizeRequestDetails(draft?.requestDetails, draft?.price?.estimatedHours);

    if (canUseRemote && session.uid) {
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
          status: payment?.status || 'in_progress',
          method: payment?.method || 'card',
          last4: payment?.last4,
          transactionId: payment?.transactionId,
        },
      }, locale);

      return upsertRemoteBooking(savedBooking);
    }

    const now = new Date().toISOString();
    const id = `bk_${Date.now()}`;
    const providerSnapshot = getProviderDisplaySnapshot({
      providerId: draft?.providerId,
      providerName: draft?.providerName,
      providerRole: draft?.providerRole,
    });
    const nextBooking = normalizeLocalBooking({
      id,
      dateLabel: draft?.dateLabel || tr('selectDateTime.defaultDateLabel'),
      timeLabel: draft?.timeLabel || tr('selectDateTime.defaultTimeLabel'),
      providerId: providerSnapshot.providerId,
      providerName: providerSnapshot.providerName,
      providerRole: providerSnapshot.providerRole,
      providerImage: draft?.providerImage ?? providerSnapshot.providerImage,
      serviceId: draft?.serviceId || '',
      serviceName: draft?.serviceName || tr('checkout.service'),
      address: draft?.address || '—',
      price: draft?.price || { amount: 0, currency: DEFAULT_MOCK_CURRENCY, unit: 'oră', estimatedHours: 1 },
      requestDetails: normalizedRequestDetails,
      bookingStatus: draft?.bookingStatus || 'upcoming',
      payment: {
        status: payment?.status || 'in_progress',
        method: payment?.method || 'card',
        last4: payment?.last4,
        transactionId: payment?.transactionId,
        updatedAt: payment?.updatedAt || now,
      },
      createdAt: now,
      updatedAt: now,
    });

    const savedBooking = await upsertStoredBooking(nextBooking);
    const userProfile = await readStoredUserProfile();
    await createProviderRequestFromUserBooking(savedBooking, {
      name: userProfile.name,
    });
    return savedBooking;
  }, [canUseRemote, locale, session.uid, upsertRemoteBooking, upsertStoredBooking]);

  const updateBookingPayment = useCallback(async (bookingId, patch) => {
    if (!bookingId) {
      throw new Error('Missing bookingId.');
    }

    if (canUseRemote && session.uid) {
      const savedBooking = await updateBookingPaymentSummary(bookingId, patch, locale);
      return upsertRemoteBooking(savedBooking);
    }

    const stored = await readStoredBookings();
    const existing = stored.find((entry) => entry.id === bookingId) ?? getUserSeedBookingById(bookingId);

    if (!existing) {
      throw new Error('Booking not found.');
    }

    const now = new Date().toISOString();
    const nextBooking = normalizeLocalBooking({
      ...existing,
      payment: {
        ...normalizePaymentPayload(existing?.payment),
        ...(patch || {}),
        updatedAt: now,
        transactionId: patch?.transactionId ?? existing?.payment?.transactionId ?? (patch?.status === 'paid' ? buildTransactionId() : undefined),
      },
      updatedAt: now,
    });

    const savedBooking = await upsertStoredBooking(nextBooking);
    await syncProviderBookingPayment(savedBooking.id, savedBooking.payment);
    return savedBooking;
  }, [canUseRemote, locale, session.uid, upsertRemoteBooking, upsertStoredBooking]);

  const cancelBooking = useCallback(async (bookingId, reason = '') => {
    if (!bookingId) {
      throw new Error('Missing bookingId.');
    }

    if (canUseRemote && session.uid) {
      const cancelledBooking = await cancelBookingRequest(bookingId, reason, locale);
      return upsertRemoteBooking(cancelledBooking);
    }

    const existing = getBookingById(bookingId);

    if (!existing) {
      throw new Error('Booking not found.');
    }

    const cancellation = normalizeLocalCancellation({
      cancelledBy: 'user',
      reason,
      cancelledAt: new Date().toISOString(),
    });

    const savedBooking = await upsertStoredBooking(normalizeLocalBooking({
      ...existing,
      bookingStatus: 'cancelled',
      cancellation,
      updatedAt: new Date().toISOString(),
    }));

    await syncProviderBookingCancellation(savedBooking.id, cancellation);
    return savedBooking;
  }, [canUseRemote, getBookingById, locale, session.uid, upsertRemoteBooking, upsertStoredBooking]);

  return {
    bookings,
    storedBookings,
    isLoading,
    loadBookings,
    getBookingById,
    upsertBooking: upsertStoredBooking,
    createBooking,
    updateBookingPayment,
    cancelBooking,
  };
}
