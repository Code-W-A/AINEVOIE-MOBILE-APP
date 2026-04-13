import { authMessages } from './messages/auth';
import { bookingMessages } from './messages/booking';
import { navigationMessages } from './messages/navigation';
import { sharedMessages } from './messages/shared';

export const LOCALE_STORAGE_KEY = '@ainevoie/locale';

export const supportedLocales = [
  { code: 'ro', label: 'Română' },
  { code: 'en', label: 'English' },
];

const translationCatalog = {
  ro: {
    ...navigationMessages.ro,
    ...authMessages.ro,
    ...sharedMessages.ro,
    ...bookingMessages.ro,
  },
  en: {
    ...navigationMessages.en,
    ...authMessages.en,
    ...sharedMessages.en,
    ...bookingMessages.en,
  },
};

let runtimeLocale = 'ro';

export function normalizeLocale(value) {
  return String(value || '').toLowerCase().startsWith('en') ? 'en' : 'ro';
}

export function getDevicePreferredLocale() {
  try {
    return normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'ro';
  }
}

export function setRuntimeLocale(locale) {
  runtimeLocale = normalizeLocale(locale);
}

export function getRuntimeLocale() {
  return runtimeLocale;
}

function getNestedValue(source, path) {
  return String(path || '')
    .split('.')
    .reduce((currentValue, key) => (
      currentValue && Object.prototype.hasOwnProperty.call(currentValue, key)
        ? currentValue[key]
        : undefined
    ), source);
}

function interpolate(template, params = {}) {
  return Object.keys(params).reduce((currentTemplate, key) => (
    currentTemplate.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(params[key]))
  ), template);
}

export function translate(locale, key, params) {
  const normalizedLocale = normalizeLocale(locale);
  const message = getNestedValue(translationCatalog[normalizedLocale], key)
    ?? getNestedValue(translationCatalog.ro, key);

  if (typeof message !== 'string') {
    return key;
  }

  return interpolate(message, params);
}

export function createTranslator(locale) {
  return (key, params) => translate(locale, key, params);
}

export function tr(key, params) {
  return translate(runtimeLocale, key, params);
}
