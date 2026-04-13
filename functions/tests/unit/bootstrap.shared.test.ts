import {
  ACCOUNT_STATUSES,
  computeBootstrapProfileFlags,
  DEFAULT_NOTIFICATION_PREFERENCES,
  PROVIDER_STATUSES,
  ROLES,
  sanitizeBootstrapPayload,
  toUiProviderVerificationStatus,
} from '@ainevoie/firebase-shared';

describe('firebase shared bootstrap helpers', () => {
  it('normalizes bootstrap payload safely', () => {
    expect(sanitizeBootstrapPayload({
      intendedRole: 'provider',
      displayName: '  Test Provider  ',
      locale: 'EN',
    })).toEqual({
      intendedRole: ROLES.PROVIDER,
      displayName: 'Test Provider',
      locale: 'en',
    });
  });

  it('maps backend provider status to current UI status', () => {
    expect(toUiProviderVerificationStatus(PROVIDER_STATUSES.PRE_REGISTERED)).toBe('draft');
    expect(toUiProviderVerificationStatus(PROVIDER_STATUSES.PENDING_REVIEW)).toBe('pending');
    expect(toUiProviderVerificationStatus(PROVIDER_STATUSES.SUSPENDED)).toBe('suspended');
  });

  it('computes user profile flags from role and location state', () => {
    expect(
      computeBootstrapProfileFlags({
        role: ROLES.USER,
        accountStatus: ACCOUNT_STATUSES.ACTIVE,
        providerStatus: null,
        hasPrimaryLocation: false,
      })
    ).toEqual({
      needsProfileCompletion: true,
      needsProviderOnboarding: false,
      isProviderApproved: false,
      isSuspended: false,
    });
  });

  it('keeps notification defaults enabled', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      bookings: true,
      messages: true,
      promoSystem: true,
    });
  });
});
