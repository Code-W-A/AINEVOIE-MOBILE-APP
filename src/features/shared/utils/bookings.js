import { getProviderDisplaySnapshot } from './providerDirectory';
import { DEFAULT_MOCK_CURRENCY } from './mockFormatting';
import { normalizePaymentPayload } from './paymentUi';

export const BOOKING_TIMEZONE = 'Europe/Bucharest';

export const BOOKING_LIFECYCLE_STATUSES = Object.freeze({
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  RESCHEDULE_PROPOSED: 'reschedule_proposed',
  REJECTED: 'rejected',
  CANCELLED_BY_USER: 'cancelled_by_user',
  CANCELLED_BY_PROVIDER: 'cancelled_by_provider',
  COMPLETED: 'completed',
});

export const USER_BOOKING_STATUSES = Object.freeze({
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

const DEFAULT_CLIENT_IMAGE = require('../../../../assets/images/user/user_5.jpg');

const MONTH_INDEX_BY_LABEL = {
  ianuarie: 0,
  january: 0,
  februarie: 1,
  february: 1,
  martie: 2,
  march: 2,
  aprilie: 3,
  april: 3,
  mai: 4,
  may: 4,
  iunie: 5,
  june: 5,
  iulie: 6,
  july: 6,
  august: 7,
  septembrie: 8,
  september: 8,
  octombrie: 9,
  october: 9,
  noiembrie: 10,
  november: 10,
  decembrie: 11,
  december: 11,
};

function sanitizeText(value) {
  return String(value || '').trim();
}

function normalizeToken(value) {
  return sanitizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't');
}

function capitalizeFirstLetter(value) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getLocaleTag(locale = 'ro') {
  return locale === 'en' ? 'en-GB' : 'ro-RO';
}

function getTimeZoneDateParts(date, timeZone = BOOKING_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
}

export function formatDateKey(date, timeZone = BOOKING_TIMEZONE) {
  const parts = getTimeZoneDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return formatDateKey(nextDate, 'UTC');
}

export function toDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
}

export function getTimestampMillis(value) {
  const date = toDateValue(value);
  return date ? date.getTime() : 0;
}

export function formatBookingDateLabel(value, locale = 'ro', timeZone = BOOKING_TIMEZONE) {
  const date = toDateValue(value);

  if (!date) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat(getLocaleTag(locale), {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  return capitalizeFirstLetter(formatter.format(date).replace(/\./g, ''));
}

export function formatBookingTimeLabel(value, locale = 'ro', timeZone = BOOKING_TIMEZONE) {
  const date = toDateValue(value);

  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getRelativeBookingDayLabel(value, locale = 'ro', timeZone = BOOKING_TIMEZONE) {
  const date = toDateValue(value);

  if (!date) {
    return '';
  }

  const todayKey = formatDateKey(new Date(), timeZone);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const valueKey = formatDateKey(date, timeZone);

  if (valueKey === todayKey) {
    return locale === 'en' ? 'Today' : 'Astăzi';
  }

  if (valueKey === tomorrowKey) {
    return locale === 'en' ? 'Tomorrow' : 'Mâine';
  }

  return formatBookingDateLabel(date, locale, timeZone);
}

export function resolveDateKeyFromLabel(label, locale = 'ro', timeZone = BOOKING_TIMEZONE) {
  const normalizedLabel = normalizeToken(label);
  const todayKey = formatDateKey(new Date(), timeZone);

  if (!normalizedLabel) {
    return todayKey;
  }

  if (normalizedLabel === 'astazi' || normalizedLabel === 'today') {
    return todayKey;
  }

  if (normalizedLabel === 'maine' || normalizedLabel === 'tomorrow') {
    return addDaysToDateKey(todayKey, 1);
  }

  const match = normalizedLabel.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);

  if (!match) {
    return todayKey;
  }

  const [, dayLabel, monthLabel, yearLabel] = match;
  const monthIndex = MONTH_INDEX_BY_LABEL[monthLabel];

  if (typeof monthIndex !== 'number') {
    return todayKey;
  }

  const nowParts = getTimeZoneDateParts(new Date(), timeZone);
  const year = Number(yearLabel || nowParts.year);
  const day = String(dayLabel).padStart(2, '0');
  const month = String(monthIndex + 1).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function deriveUserBookingStatus(lifecycleStatus) {
  if (lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.COMPLETED) {
    return USER_BOOKING_STATUSES.COMPLETED;
  }

  if (
    lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.REJECTED
    || lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.CANCELLED_BY_USER
    || lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.CANCELLED_BY_PROVIDER
  ) {
    return USER_BOOKING_STATUSES.CANCELLED;
  }

  return USER_BOOKING_STATUSES.UPCOMING;
}

export function deriveProviderUiStatus(lifecycleStatus) {
  if (lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.REQUESTED) {
    return 'new';
  }

  if (lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.RESCHEDULE_PROPOSED) {
    return 'rescheduled';
  }

  if (
    lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.CANCELLED_BY_USER
    || lifecycleStatus === BOOKING_LIFECYCLE_STATUSES.CANCELLED_BY_PROVIDER
  ) {
    return 'cancelled';
  }

  return sanitizeText(lifecycleStatus) || BOOKING_LIFECYCLE_STATUSES.REQUESTED;
}

function normalizeProviderDecision(decision, locale = 'ro', timeZone = BOOKING_TIMEZONE) {
  if (!decision?.type) {
    return null;
  }

  const proposedStartAt = toDateValue(decision.proposedStartAt);

  return {
    type: decision.type === 'rejected' ? 'rejected' : 'rescheduled',
    reason: sanitizeText(decision.reason),
    proposedStartAt: proposedStartAt ? proposedStartAt.toISOString() : null,
    proposedDateLabel: proposedStartAt ? formatBookingDateLabel(proposedStartAt, locale, timeZone) : '',
    proposedTimeLabel: proposedStartAt ? formatBookingTimeLabel(proposedStartAt, locale, timeZone) : '',
    decidedAt: decision?.decidedAt || null,
  };
}

function normalizeCancellation(cancellation) {
  if (!cancellation?.cancelledBy) {
    return null;
  }

  return {
    cancelledBy: sanitizeText(cancellation.cancelledBy),
    reason: sanitizeText(cancellation.reason),
    cancelledAt: cancellation.cancelledAt || null,
  };
}

function buildProviderStatusMeta(providerUiStatus, booking) {
  if (providerUiStatus === 'new') {
    return 'Cerere nouă';
  }

  if (providerUiStatus === 'rescheduled') {
    return `Reprogramată pentru ${booking.scheduledDate} • ${booking.scheduledTime}`;
  }

  if (providerUiStatus === 'completed') {
    return 'Lucrare finalizată';
  }

  if (providerUiStatus === 'rejected') {
    return booking.providerDecision?.reason
      ? `Respinsă · ${booking.providerDecision.reason}`
      : 'Respinsă';
  }

  if (providerUiStatus === 'cancelled') {
    return booking.cancellation?.reason
      ? `Anulată · ${booking.cancellation.reason}`
      : 'Anulată';
  }

  return `Confirmată pentru ${booking.scheduledDate} • ${booking.scheduledTime}`;
}

export function normalizeBookingRecord(record, locale = 'ro') {
  const bookingId = sanitizeText(record?.bookingId || record?.id);
  const lifecycleStatus = sanitizeText(record?.status || record?.lifecycleStatus || BOOKING_LIFECYCLE_STATUSES.REQUESTED);
  const scheduledStartAt = toDateValue(record?.scheduledStartAt);
  const timeZone = sanitizeText(record?.timezone) || BOOKING_TIMEZONE;
  const requestDetails = {
    description: sanitizeText(record?.requestDetails?.description),
    estimatedHours: Math.max(1, Number(record?.requestDetails?.estimatedHours || record?.pricingSnapshot?.estimatedHours || record?.price?.estimatedHours || 1)),
  };
  const price = {
    amount: Number(record?.pricingSnapshot?.amount ?? record?.price?.amount) || 0,
    currency: sanitizeText(record?.pricingSnapshot?.currency || record?.price?.currency) || DEFAULT_MOCK_CURRENCY,
    unit: sanitizeText(record?.pricingSnapshot?.unit || record?.price?.unit) || 'hour',
    estimatedHours: requestDetails.estimatedHours,
  };
  const providerSnapshot = getProviderDisplaySnapshot({
    providerId: sanitizeText(record?.providerId),
    providerName: sanitizeText(record?.providerSnapshot?.displayName || record?.providerName),
    providerRole: sanitizeText(record?.serviceSnapshot?.name || record?.providerRole || 'Serviciu'),
  });
  const providerDecision = normalizeProviderDecision(record?.providerDecision, locale, timeZone);
  const cancellation = normalizeCancellation(record?.cancellation);
  const booking = {
    id: bookingId,
    bookingId,
    userId: sanitizeText(record?.userId),
    providerId: sanitizeText(record?.providerId),
    serviceId: sanitizeText(record?.serviceId),
    status: lifecycleStatus,
    lifecycleStatus,
    providerUiStatus: deriveProviderUiStatus(lifecycleStatus),
    bookingStatus: deriveUserBookingStatus(lifecycleStatus),
    scheduledDateKey: scheduledStartAt ? formatDateKey(scheduledStartAt, timeZone) : '',
    scheduledStartTime: scheduledStartAt ? formatBookingTimeLabel(scheduledStartAt, locale, timeZone) : '',
    dateLabel: scheduledStartAt ? formatBookingDateLabel(scheduledStartAt, locale, timeZone) : '',
    timeLabel: scheduledStartAt ? formatBookingTimeLabel(scheduledStartAt, locale, timeZone) : '',
    scheduledDate: scheduledStartAt ? formatBookingDateLabel(scheduledStartAt, locale, timeZone) : '',
    scheduledTime: scheduledStartAt ? formatBookingTimeLabel(scheduledStartAt, locale, timeZone) : '',
    dayLabel: scheduledStartAt ? getRelativeBookingDayLabel(scheduledStartAt, locale, timeZone) : '',
    timezone: timeZone,
    providerName: providerSnapshot.providerName,
    providerRole: sanitizeText(record?.serviceSnapshot?.name || record?.providerRole || 'Serviciu'),
    providerImage: record?.providerImage || providerSnapshot.providerImage,
    clientName: sanitizeText(record?.userSnapshot?.displayName || record?.clientName) || 'Client',
    image: record?.image || DEFAULT_CLIENT_IMAGE,
    serviceName: sanitizeText(record?.serviceSnapshot?.name || record?.serviceName) || 'Serviciu',
    serviceLabel: sanitizeText(record?.serviceSnapshot?.name || record?.serviceName) || 'Serviciu',
    address: sanitizeText(record?.userSnapshot?.primaryLocation?.formattedAddress || record?.address),
    requestDetails,
    price,
    payment: normalizePaymentPayload(record?.paymentSummary || record?.payment),
    providerDecision,
    cancellation,
    completion: record?.completion || null,
    reviewSummary: record?.reviewSummary || null,
    createdAt: record?.createdAt || null,
    updatedAt: record?.updatedAt || null,
  };

  return {
    ...booking,
    statusMeta: buildProviderStatusMeta(booking.providerUiStatus, booking),
  };
}

export function sortBookingsByUpdatedDesc(bookings = []) {
  return [...bookings].sort((firstItem, secondItem) => {
    const updatedDelta = getTimestampMillis(secondItem.updatedAt) - getTimestampMillis(firstItem.updatedAt);

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return getTimestampMillis(secondItem.createdAt) - getTimestampMillis(firstItem.createdAt);
  });
}

export function sortBookingsByScheduleAsc(bookings = []) {
  return [...bookings].sort((firstItem, secondItem) => {
    const firstMillis = getTimestampMillis(firstItem.scheduledStartAt);
    const secondMillis = getTimestampMillis(secondItem.scheduledStartAt);

    if (firstMillis !== secondMillis) {
      return firstMillis - secondMillis;
    }

    return getTimestampMillis(secondItem.updatedAt) - getTimestampMillis(firstItem.updatedAt);
  });
}
