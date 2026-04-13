export const DEFAULT_MOCK_CURRENCY = 'RON';

const HOUR_IN_MINUTES = 60;
const DAY_IN_MINUTES = 24 * HOUR_IN_MINUTES;

const DIACRITICS_MAP = {
  ă: 'a',
  â: 'a',
  î: 'i',
  ș: 's',
  ş: 's',
  ț: 't',
  ţ: 't',
};

function padTimeSegment(value) {
  return String(value).padStart(2, '0');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[ăâîșşțţ]/g, (char) => DIACRITICS_MAP[char] || char);
}

export function digitsOnly(value) {
  return String(value || '').replace(/\D+/g, '');
}

export function normalizeMockCurrency(currency) {
  const normalized = String(currency || '').trim().toUpperCase();

  if (!normalized || normalized === 'USD') {
    return DEFAULT_MOCK_CURRENCY;
  }

  return normalized;
}

export function normalizeRateValue(value) {
  const digits = digitsOnly(value);
  return digits.replace(/^0+(?=\d)/, '');
}

export function formatRateDisplay(value, fallback = 'Nespecificat') {
  const normalizedRate = normalizeRateValue(value);
  return normalizedRate ? `${normalizedRate} ${DEFAULT_MOCK_CURRENCY}` : fallback;
}

export function formatHourlyRate(value, currency = DEFAULT_MOCK_CURRENCY, fallback = `16 ${DEFAULT_MOCK_CURRENCY}/oră`) {
  const normalizedRate = normalizeRateValue(value);

  if (!normalizedRate) {
    return fallback;
  }

  return `${normalizedRate} ${normalizeMockCurrency(currency)}/oră`;
}

export function formatMoney(amount, currency = DEFAULT_MOCK_CURRENCY) {
  const numericAmount = Number(amount);
  const fixedAmount = Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '0';
  return `${fixedAmount} ${normalizeMockCurrency(currency)}`;
}

export function formatDurationInput(value) {
  const digits = digitsOnly(value).slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function durationToMinutes(value) {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return null;
  }

  const canonicalMatch = trimmedValue.match(/^(\d{1,2}):(\d{1,2})$/);

  if (canonicalMatch) {
    const hours = Number(canonicalMatch[1]);
    const minutes = Number(canonicalMatch[2]);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= HOUR_IN_MINUTES) {
      return null;
    }

    const total = (hours * HOUR_IN_MINUTES) + minutes;
    return total > 0 && total < DAY_IN_MINUTES ? total : null;
  }

  const normalizedText = normalizeText(trimmedValue);
  const hourMatch = normalizedText.match(/^(\d{1,2})\s*(h|ora|ore)$/);

  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    const total = hours * HOUR_IN_MINUTES;
    return total > 0 && total < DAY_IN_MINUTES ? total : null;
  }

  const minuteMatch = normalizedText.match(/^(\d{1,3})\s*(min|minute)$/);

  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);
    return minutes > 0 && minutes < DAY_IN_MINUTES ? minutes : null;
  }

  const digits = digitsOnly(trimmedValue);

  if (digits.length > 0 && digits.length <= 2) {
    const hours = Number(digits);
    const total = hours * HOUR_IN_MINUTES;
    return total > 0 && total < DAY_IN_MINUTES ? total : null;
  }

  return null;
}

export function normalizeDurationValue(value) {
  const totalMinutes = durationToMinutes(value);

  if (!totalMinutes) {
    return '';
  }

  const hours = Math.floor(totalMinutes / HOUR_IN_MINUTES);
  const minutes = totalMinutes % HOUR_IN_MINUTES;

  return `${padTimeSegment(hours)}:${padTimeSegment(minutes)}`;
}

export function isCanonicalDurationValue(value) {
  return /^\d{2}:\d{2}$/.test(String(value || '').trim()) && Boolean(durationToMinutes(value));
}

export function formatDurationDisplay(value, fallback = '—') {
  const normalizedDuration = normalizeDurationValue(value);
  return normalizedDuration || fallback;
}
