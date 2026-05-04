import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { writeAuditEvent } from './audit';
import { badRequest, failedPrecondition } from './errors';
import { PROVIDER_STATUSES, sanitizeString } from './shared';
import { writeStructuredLog } from './logging';

type ProviderAvailabilityDeps = {
  db: Firestore,
};

const PROVIDER_WEEK_DAYS = [
  { dayKey: 'monday', label: 'Luni', shortLabel: 'Lu' },
  { dayKey: 'tuesday', label: 'Marți', shortLabel: 'Ma' },
  { dayKey: 'wednesday', label: 'Miercuri', shortLabel: 'Mi' },
  { dayKey: 'thursday', label: 'Joi', shortLabel: 'Jo' },
  { dayKey: 'friday', label: 'Vineri', shortLabel: 'Vi' },
  { dayKey: 'saturday', label: 'Sâmbătă', shortLabel: 'Sâ' },
  { dayKey: 'sunday', label: 'Duminică', shortLabel: 'Du' },
];

function createDefaultWeekSchedule() {
  return PROVIDER_WEEK_DAYS.map((day) => ({
    dayKey: day.dayKey,
    label: day.label,
    shortLabel: day.shortLabel,
    isEnabled: false,
    timeRanges: [],
  }));
}

function normalizeTimeRange(range: unknown, index = 0) {
  const source = range && typeof range === 'object' ? range as Record<string, unknown> : {};

  return {
    id: sanitizeString(source.id) || `range_${index}`,
    startTime: sanitizeString(source.startTime) || '09:00',
    endTime: sanitizeString(source.endTime) || '17:00',
  };
}

type NormalizedTimeRange = ReturnType<typeof normalizeTimeRange>;

function sortRanges(timeRanges: NormalizedTimeRange[]) {
  return [...timeRanges].sort((firstRange, secondRange) => firstRange.startTime.localeCompare(secondRange.startTime));
}

function normalizeBlockedDate(blockedDate: unknown, index = 0) {
  const source = blockedDate && typeof blockedDate === 'object' ? blockedDate as Record<string, unknown> : {};

  return {
    id: sanitizeString(source.id) || `blocked_${index}`,
    dateKey: sanitizeString(source.dateKey),
    createdAt: source.createdAt || null,
  };
}

function isValidTimeFormat(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function normalizeProviderAvailabilityData(payload: unknown) {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const fallbackSchedule = createDefaultWeekSchedule();
  const payloadSchedule = Array.isArray(source.weekSchedule) ? source.weekSchedule : [];
  const payloadBlockedDates = Array.isArray(source.blockedDates) ? source.blockedDates : [];
  const blockedDateMap = new Map<string, ReturnType<typeof normalizeBlockedDate>>();

  payloadBlockedDates
    .map(normalizeBlockedDate)
    .filter((item) => item.dateKey)
    .forEach((item) => {
      blockedDateMap.set(item.dateKey, item);
    });

  return {
    weekSchedule: fallbackSchedule.map((fallbackDay) => {
      const matchingDay = payloadSchedule.find((item) => (
        item
        && typeof item === 'object'
        && sanitizeString((item as Record<string, unknown>).dayKey) === fallbackDay.dayKey
      )) as Record<string, unknown> | undefined;

      return {
        dayKey: fallbackDay.dayKey,
        label: fallbackDay.label,
        shortLabel: fallbackDay.shortLabel,
        isEnabled: Boolean(matchingDay?.isEnabled),
        timeRanges: sortRanges((Array.isArray(matchingDay?.timeRanges) ? matchingDay?.timeRanges : []).map(normalizeTimeRange)),
      };
    }),
    blockedDates: Array.from(blockedDateMap.values()).sort((firstItem, secondItem) => firstItem.dateKey.localeCompare(secondItem.dateKey)),
    updatedAt: source.updatedAt || null,
  };
}

export function hasConfiguredAvailability(weekSchedule: Array<{ isEnabled: boolean, timeRanges: unknown[] }>) {
  return weekSchedule.some((day) => day.isEnabled && day.timeRanges.length > 0);
}

function validateWeekSchedule(weekSchedule: Array<{
  dayKey: string,
  label: string,
  isEnabled: boolean,
  timeRanges: Array<{ startTime: string, endTime: string }>,
}>) {
  weekSchedule.forEach((day) => {
    if (!day.isEnabled) {
      return;
    }

    if (!day.timeRanges.length) {
      throw badRequest(`Add at least one valid time range for ${day.label}.`);
    }

    day.timeRanges.forEach((range, index) => {
      if (!isValidTimeFormat(range.startTime) || !isValidTimeFormat(range.endTime)) {
        throw badRequest(`Use HH:MM time values for ${day.label}.`);
      }

      const startMinutes = minutesFromTime(range.startTime);
      const endMinutes = minutesFromTime(range.endTime);

      if (startMinutes >= endMinutes) {
        throw badRequest(`The start time must be before the end time for ${day.label}.`);
      }

      if (index > 0) {
        const previousRange = day.timeRanges[index - 1];
        const previousEndMinutes = minutesFromTime(previousRange.endTime);

        if (startMinutes < previousEndMinutes) {
          throw badRequest(`Time ranges cannot overlap for ${day.label}.`);
        }
      }
    });
  });
}

function validateBlockedDates(payload: unknown) {
  const blockedDates = Array.isArray((payload as Record<string, unknown> | null)?.blockedDates)
    ? (payload as Record<string, unknown>).blockedDates as unknown[]
    : [];
  const seenDateKeys = new Set<string>();

  blockedDates
    .map(normalizeBlockedDate)
    .forEach((blockedDate) => {
      if (!blockedDate.dateKey) {
        return;
      }

      if (seenDateKeys.has(blockedDate.dateKey)) {
        throw badRequest(`Duplicate blocked date detected for ${blockedDate.dateKey}.`);
      }

      seenDateKeys.add(blockedDate.dateKey);
    });
}

export function formatAvailabilitySummary(weekSchedule: Array<{ isEnabled: boolean, label: string, timeRanges: Array<{ startTime: string, endTime: string }> }>) {
  const enabledDays = weekSchedule.filter((day) => day.isEnabled && day.timeRanges.length);

  if (!enabledDays.length) {
    return '';
  }

  return enabledDays
    .map((day) => `${day.label}: ${day.timeRanges.map((range) => `${range.startTime}-${range.endTime}`).join(', ')}`)
    .join(' • ');
}

export function getAvailabilityDayChips(weekSchedule: Array<{ isEnabled: boolean, label: string, timeRanges: unknown[] }>) {
  return weekSchedule
    .filter((day) => day.isEnabled && day.timeRanges.length > 0)
    .map((day) => day.label);
}

export async function saveProviderAvailabilityProfileService(
  { db }: ProviderAvailabilityDeps,
  providerId: string,
  payload: unknown,
) {
  const providerRef = db.collection('providers').doc(providerId);
  const providerSnap = await providerRef.get();

  if (!providerSnap.exists) {
    throw failedPrecondition('Provider profile is missing.');
  }

  const providerData = providerSnap.data() || {};
  const previousAvailabilitySummary = sanitizeString(providerData.professionalProfile?.availabilitySummary);
  const previousConfigured = Boolean(previousAvailabilitySummary);

  if (providerData.role !== 'provider') {
    throw failedPrecondition('Only provider accounts can manage availability.');
  }

  if (providerData.status === PROVIDER_STATUSES.SUSPENDED) {
    throw failedPrecondition('Suspended providers cannot update availability.');
  }

  validateBlockedDates(payload);

  const normalized = normalizeProviderAvailabilityData(payload);
  validateWeekSchedule(normalized.weekSchedule);

  const availabilitySummary = formatAvailabilitySummary(normalized.weekSchedule);
  const availabilityDayChips = getAvailabilityDayChips(normalized.weekSchedule);
  const configured = hasConfiguredAvailability(normalized.weekSchedule);
  const availabilityRef = providerRef.collection('availability').doc('profile');

  await availabilityRef.set({
    weekSchedule: normalized.weekSchedule,
    blockedDates: normalized.blockedDates,
    availabilitySummary,
    availabilityDayChips,
    hasConfiguredAvailability: configured,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await providerRef.set({
    professionalProfile: {
      availabilitySummary,
    },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  writeStructuredLog('info', {
    action: 'save_provider_availability',
    uid: providerId,
    role: 'provider',
    resourceType: 'provider_availability',
    resourceId: `${providerId}/profile`,
    outcome: configured ? 'saved' : 'cleared',
  }, 'Provider availability profile was saved.');

  await writeAuditEvent({ db }, {
    action: 'provider.availability.save',
    actorUid: providerId,
    actorRole: 'provider',
    resourceType: 'provider_availability',
    resourceId: `${providerId}/profile`,
    statusFrom: previousConfigured ? 'configured' : 'empty',
    statusTo: configured ? 'configured' : 'empty',
    result: 'success',
    context: {
      blockedDateCount: normalized.blockedDates.length,
      enabledDayCount: availabilityDayChips.length,
    },
  });

  return {
    ...normalized,
    availabilitySummary,
    availabilityDayChips,
    hasConfiguredAvailability: configured,
  };
}

export async function fetchProviderAvailabilityProfile(
  { db }: ProviderAvailabilityDeps,
  providerId: string,
) {
  const availabilitySnap = await db.collection('providers').doc(providerId).collection('availability').doc('profile').get();
  return availabilitySnap.exists ? normalizeProviderAvailabilityData(availabilitySnap.data()) : normalizeProviderAvailabilityData(null);
}
