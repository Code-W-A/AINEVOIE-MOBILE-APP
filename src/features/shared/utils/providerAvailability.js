const PROVIDER_WEEK_DAYS = [
  { dayKey: 'monday', ro: { label: 'Luni', shortLabel: 'Lu' }, en: { label: 'Monday', shortLabel: 'Mon' } },
  { dayKey: 'tuesday', ro: { label: 'Marți', shortLabel: 'Ma' }, en: { label: 'Tuesday', shortLabel: 'Tue' } },
  { dayKey: 'wednesday', ro: { label: 'Miercuri', shortLabel: 'Mi' }, en: { label: 'Wednesday', shortLabel: 'Wed' } },
  { dayKey: 'thursday', ro: { label: 'Joi', shortLabel: 'Jo' }, en: { label: 'Thursday', shortLabel: 'Thu' } },
  { dayKey: 'friday', ro: { label: 'Vineri', shortLabel: 'Vi' }, en: { label: 'Friday', shortLabel: 'Fri' } },
  { dayKey: 'saturday', ro: { label: 'Sâmbătă', shortLabel: 'Sâ' }, en: { label: 'Saturday', shortLabel: 'Sat' } },
  { dayKey: 'sunday', ro: { label: 'Duminică', shortLabel: 'Du' }, en: { label: 'Sunday', shortLabel: 'Sun' } },
];

function sanitizeText(value) {
  return String(value || '').trim();
}

function sortRanges(timeRanges = []) {
  return [...timeRanges].sort((firstRange, secondRange) => (
    String(firstRange.startTime || '').localeCompare(String(secondRange.startTime || ''))
  ));
}

function normalizeTimeRange(range, index = 0) {
  return {
    id: sanitizeText(range?.id) || `range_${Date.now()}_${index}`,
    startTime: sanitizeText(range?.startTime) || '09:00',
    endTime: sanitizeText(range?.endTime) || '17:00',
  };
}

function normalizeBlockedDate(blockedDate, index = 0) {
  return {
    id: sanitizeText(blockedDate?.id) || `blocked_${Date.now()}_${index}`,
    dateKey: sanitizeText(blockedDate?.dateKey),
    createdAt: blockedDate?.createdAt || new Date().toISOString(),
  };
}

function sortBlockedDates(blockedDates = []) {
  return [...blockedDates].sort((firstItem, secondItem) => firstItem.dateKey.localeCompare(secondItem.dateKey));
}

export function getProviderWeekDays(locale = 'ro') {
  const normalizedLocale = locale === 'en' ? 'en' : 'ro';

  return PROVIDER_WEEK_DAYS.map((day) => ({
    dayKey: day.dayKey,
    label: day[normalizedLocale].label,
    shortLabel: day[normalizedLocale].shortLabel,
  }));
}

export function createDefaultWeekSchedule(locale = 'ro') {
  return getProviderWeekDays(locale).map((day) => ({
    dayKey: day.dayKey,
    label: day.label,
    shortLabel: day.shortLabel,
    isEnabled: false,
    timeRanges: [],
  }));
}

function normalizeDay(day, fallbackDay) {
  return {
    dayKey: fallbackDay.dayKey,
    label: fallbackDay.label,
    shortLabel: fallbackDay.shortLabel,
    isEnabled: Boolean(day?.isEnabled),
    timeRanges: sortRanges((day?.timeRanges || []).map(normalizeTimeRange)),
  };
}

export function normalizeProviderAvailability(payload, locale = 'ro') {
  const fallbackSchedule = createDefaultWeekSchedule(locale);
  const payloadSchedule = Array.isArray(payload?.weekSchedule) ? payload.weekSchedule : [];
  const payloadBlockedDates = Array.isArray(payload?.blockedDates) ? payload.blockedDates : [];
  const blockedDateMap = new Map();

  payloadBlockedDates
    .map(normalizeBlockedDate)
    .filter((item) => item.dateKey)
    .forEach((item) => {
      blockedDateMap.set(item.dateKey, item);
    });

  return {
    weekSchedule: fallbackSchedule.map((fallbackDay) => {
      const matchingDay = payloadSchedule.find((item) => item?.dayKey === fallbackDay.dayKey);
      return normalizeDay(matchingDay, fallbackDay);
    }),
    blockedDates: sortBlockedDates(Array.from(blockedDateMap.values())),
    updatedAt: payload?.updatedAt || null,
  };
}

export function hasConfiguredAvailability(weekSchedule) {
  return (weekSchedule || []).some((day) => day.isEnabled && day.timeRanges.length > 0);
}

export function formatAvailabilitySummary(weekSchedule) {
  const enabledDays = (weekSchedule || []).filter((day) => day.isEnabled && day.timeRanges.length);

  if (!enabledDays.length) {
    return '';
  }

  return enabledDays
    .map((day) => `${day.label}: ${day.timeRanges.map((range) => `${range.startTime}-${range.endTime}`).join(', ')}`)
    .join(' • ');
}

export function getAvailabilityDayChips(weekSchedule) {
  return (weekSchedule || [])
    .filter((day) => day.isEnabled && day.timeRanges.length > 0)
    .map((day) => day.label);
}

export function getBlockedDateKeys(blockedDates) {
  return (blockedDates || []).map((item) => item.dateKey).filter(Boolean);
}

function dateKeyToDate(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function getDayKeyForDate(dateKey) {
  const weekDay = dateKeyToDate(dateKey).getUTCDay();
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][weekDay];
}

function minutesFromTime(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return (hours * 60) + minutes;
}

function formatMinutesAsTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

export function getScheduleForDate(dateKey, weekSchedule = []) {
  const dayKey = getDayKeyForDate(dateKey);
  return weekSchedule.find((day) => day.dayKey === dayKey) || null;
}

export function isDateBlocked(dateKey, blockedDateKeys = []) {
  return blockedDateKeys.includes(dateKey);
}

export function isDateSelectable(dateKey, weekSchedule = [], blockedDateKeys = []) {
  if (isDateBlocked(dateKey, blockedDateKeys)) {
    return false;
  }

  const day = getScheduleForDate(dateKey, weekSchedule);
  return Boolean(day?.isEnabled && day.timeRanges.length);
}

export function buildSlotsForDate(dateKey, weekSchedule = [], blockedDateKeys = [], slotDurationMinutes = 60) {
  if (!isDateSelectable(dateKey, weekSchedule, blockedDateKeys)) {
    return [];
  }

  const day = getScheduleForDate(dateKey, weekSchedule);

  return day.timeRanges.flatMap((range) => {
    const startMinutes = minutesFromTime(range.startTime);
    const endMinutes = minutesFromTime(range.endTime);
    const slots = [];

    for (let currentStart = startMinutes; currentStart + slotDurationMinutes <= endMinutes; currentStart += slotDurationMinutes) {
      const startLabel = formatMinutesAsTime(currentStart);
      const endLabel = formatMinutesAsTime(currentStart + slotDurationMinutes);

      slots.push({
        key: startLabel,
        label: `${startLabel}-${endLabel}`,
        startTime: startLabel,
        endTime: endLabel,
      });
    }

    return slots;
  });
}
