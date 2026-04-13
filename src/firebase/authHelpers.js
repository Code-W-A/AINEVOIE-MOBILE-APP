import { Platform } from 'react-native';

export const E164_MAX_DIGITS = 15;

export function getGoogleAuthConfig() {
  return {
    webClientId: String(process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID || '').trim(),
    iosClientId: String(process.env.EXPO_PUBLIC_GOOGLE_AUTH_IOS_CLIENT_ID || '').trim(),
    androidClientId: String(process.env.EXPO_PUBLIC_GOOGLE_AUTH_ANDROID_CLIENT_ID || '').trim(),
  };
}

export function getGooglePlatformClientId() {
  const config = getGoogleAuthConfig();

  if (Platform.OS === 'ios') {
    return config.iosClientId;
  }

  if (Platform.OS === 'android') {
    return config.androidClientId;
  }

  return config.webClientId;
}

export function isGoogleAuthConfigured() {
  return Boolean(getGooglePlatformClientId());
}

export function getGoogleAuthConfigError() {
  if (isGoogleAuthConfigured()) {
    return null;
  }

  return 'Google auth is not configured. Add the EXPO_PUBLIC_GOOGLE_AUTH_* client IDs before using this method.';
}

export function sanitizePhoneInput(value) {
  const rawValue = String(value || '');
  const hasLeadingPlus = rawValue.trim().startsWith('+');
  const digits = rawValue.replace(/\D+/g, '');

  if (!digits) {
    return '';
  }

  return hasLeadingPlus ? `+${digits}` : digits;
}

export function extractPhoneDigits(value, maxDigits = E164_MAX_DIGITS) {
  return String(value || '').replace(/\D+/g, '').slice(0, maxDigits);
}

export function buildPhoneValueFromDigits(value) {
  const digits = extractPhoneDigits(value);
  return digits ? `+${digits}` : '';
}

export function normalizePhoneToE164(value) {
  const rawValue = sanitizePhoneInput(value);

  if (!rawValue) {
    return '';
  }

  if (rawValue.startsWith('+')) {
    const digits = rawValue.replace(/\D+/g, '');
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : '';
  }

  if (rawValue.startsWith('00')) {
    const digits = rawValue.slice(2).replace(/\D+/g, '');
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : '';
  }

  if (rawValue.startsWith('40') && rawValue.length === 11) {
    return `+${rawValue}`;
  }

  if (rawValue.startsWith('0') && rawValue.length === 10) {
    return `+4${rawValue}`;
  }

  if (rawValue.length >= 10 && rawValue.length <= 15) {
    return `+${rawValue}`;
  }

  return '';
}

export function isValidPhoneNumber(value) {
  return Boolean(normalizePhoneToE164(value));
}

export function buildMaskedPhoneNumber(phoneNumber) {
  const normalizedPhoneNumber = normalizePhoneToE164(phoneNumber);
  const digits = normalizedPhoneNumber.replace(/\D+/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length <= 4) {
    return digits;
  }

  return `${digits.slice(0, 3)} ••• ${digits.slice(-2)}`;
}
