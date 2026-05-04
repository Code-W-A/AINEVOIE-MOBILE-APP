import {
  ACCOUNT_STATUSES,
  computeBootstrapProfileFlags,
  DEFAULT_NOTIFICATION_PREFERENCES,
  deriveRomaniaHierarchyFromPlacemark,
  findRomaniaCity,
  getRomaniaCitiesByCounty,
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

  it('lists Bucharest sectors as city choices while keeping legacy Bucharest compatible', () => {
    expect(getRomaniaCitiesByCounty('B')).toEqual([
      { cityCode: 'sector-1', cityName: 'Sector 1' },
      { cityCode: 'sector-2', cityName: 'Sector 2' },
      { cityCode: 'sector-3', cityName: 'Sector 3' },
      { cityCode: 'sector-4', cityName: 'Sector 4' },
      { cityCode: 'sector-5', cityName: 'Sector 5' },
      { cityCode: 'sector-6', cityName: 'Sector 6' },
    ]);
    expect(findRomaniaCity('B', 'Sector 3')).toEqual(expect.objectContaining({
      cityCode: 'sector-3',
      cityName: 'Sector 3',
    }));
    expect(findRomaniaCity('B', 'București')).toEqual(expect.objectContaining({
      cityCode: 'bucuresti',
      cityName: 'București',
    }));
  });

  it('derives Bucharest sector from placemark hierarchy or formatted address', () => {
    expect(deriveRomaniaHierarchyFromPlacemark({
      countryName: 'România',
      region: 'București',
      district: 'Sector 6',
    })).toEqual(expect.objectContaining({
      countyCode: 'B',
      countyName: 'București',
      cityCode: 'sector-6',
      cityName: 'Sector 6',
    }));

    expect(deriveRomaniaHierarchyFromPlacemark({
      countryName: 'România',
      region: 'București',
      city: 'București',
      formattedAddress: 'Bulevardul Iuliu Maniu 10, Sector 6, București, România',
    })).toEqual(expect.objectContaining({
      cityCode: 'sector-6',
      cityName: 'Sector 6',
    }));
  });
});
