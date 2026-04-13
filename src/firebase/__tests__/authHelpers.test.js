/* global describe, it, expect */

import { buildMaskedPhoneNumber, buildPhoneValueFromDigits, extractPhoneDigits, normalizePhoneToE164 } from '../authHelpers';

describe('authHelpers phone normalization', () => {
  it('normalizes Romanian local numbers to E.164', () => {
    expect(normalizePhoneToE164('0722 123 456')).toBe('+40722123456');
  });

  it('keeps international format when already provided', () => {
    expect(normalizePhoneToE164('+40722123456')).toBe('+40722123456');
  });

  it('converts 00-prefixed international numbers to E.164', () => {
    expect(normalizePhoneToE164('0040722123456')).toBe('+40722123456');
  });

  it('returns empty string for invalid numbers', () => {
    expect(normalizePhoneToE164('1234')).toBe('');
  });

  it('masks normalized phone numbers for OTP copy', () => {
    expect(buildMaskedPhoneNumber('0722123456')).toBe('407 ••• 56');
  });

  it('extracts digits only and caps them to E.164 max length', () => {
    expect(extractPhoneDigits('+40 722-123-456 abc')).toBe('40722123456');
    expect(extractPhoneDigits('12345678901234567890')).toBe('123456789012345');
  });

  it('rebuilds a phone value with a single leading plus', () => {
    expect(buildPhoneValueFromDigits('+40 722 123 456')).toBe('+40722123456');
    expect(buildPhoneValueFromDigits('')).toBe('');
  });
});
