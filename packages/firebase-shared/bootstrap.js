const {
  ACCOUNT_STATUSES,
  PROVIDER_STATUSES,
  ROLES,
} = require('./enums');

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeAuthProviders(authProviders) {
  if (!Array.isArray(authProviders)) {
    return [];
  }

  return Array.from(
    new Set(
      authProviders
        .map((value) => sanitizeString(value))
        .filter(Boolean)
    )
  );
}

function sanitizeBootstrapPayload(payload) {
  const intendedRole = payload?.intendedRole === ROLES.PROVIDER ? ROLES.PROVIDER : payload?.intendedRole === ROLES.USER ? ROLES.USER : null;
  const displayName = sanitizeString(payload?.displayName);
  const locale = sanitizeString(payload?.locale).toLowerCase() === 'en' ? 'en' : 'ro';

  return {
    intendedRole,
    displayName,
    locale,
  };
}

function computeBootstrapProfileFlags({ role, accountStatus, providerStatus, hasPrimaryLocation }) {
  const normalizedRole = role === ROLES.PROVIDER ? ROLES.PROVIDER : ROLES.USER;
  const normalizedAccountStatus = accountStatus === ACCOUNT_STATUSES.DISABLED ? ACCOUNT_STATUSES.DISABLED : ACCOUNT_STATUSES.ACTIVE;
  const normalizedProviderStatus = normalizedRole === ROLES.PROVIDER && providerStatus ? providerStatus : null;

  return {
    needsProfileCompletion: normalizedRole === ROLES.USER ? !hasPrimaryLocation : false,
    needsProviderOnboarding: normalizedRole === ROLES.PROVIDER
      ? normalizedProviderStatus === PROVIDER_STATUSES.PRE_REGISTERED || !normalizedProviderStatus
      : false,
    isProviderApproved: normalizedProviderStatus === PROVIDER_STATUSES.APPROVED,
    isSuspended: normalizedAccountStatus === ACCOUNT_STATUSES.DISABLED || normalizedProviderStatus === PROVIDER_STATUSES.SUSPENDED,
  };
}

module.exports = {
  computeBootstrapProfileFlags,
  sanitizeAuthProviders,
  sanitizeBootstrapPayload,
  sanitizeString,
};
