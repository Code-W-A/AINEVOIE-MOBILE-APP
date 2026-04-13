export const ROLES = Object.freeze({
  USER: 'user',
  PROVIDER: 'provider',
  ADMIN: 'admin',
  SUPPORT: 'support',
});

export const ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled',
});

export const PROVIDER_STATUSES = Object.freeze({
  PRE_REGISTERED: 'pre_registered',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

export const PROVIDER_DOCUMENT_TYPES = Object.freeze({
  IDENTITY: 'identity',
  PROFESSIONAL: 'professional',
});

export const PROVIDER_REVIEW_ACTIONS = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
  SUSPEND: 'suspend',
  REINSTATE: 'reinstate',
});

export const SERVICE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});

export const DEFAULT_LOCALE = 'ro' as const;

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  bookings: true,
  messages: true,
  promoSystem: true,
});

function isOneOf(values: string[], value: unknown) {
  return typeof value === 'string' && values.includes(value);
}

export function isRole(value: unknown): value is string {
  return isOneOf(Object.values(ROLES), value);
}

export function isProviderStatus(value: unknown): value is string {
  return isOneOf(Object.values(PROVIDER_STATUSES), value);
}

export function isProviderDocumentType(value: unknown): value is string {
  return isOneOf(Object.values(PROVIDER_DOCUMENT_TYPES), value);
}

export function isProviderReviewAction(value: unknown): value is string {
  return isOneOf(Object.values(PROVIDER_REVIEW_ACTIONS), value);
}

export function isServiceStatus(value: unknown): value is string {
  return isOneOf(Object.values(SERVICE_STATUSES), value);
}

export function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function sanitizeStoragePath(value: unknown) {
  const path = sanitizeString(value).replace(/^\/+/, '');

  if (!path || path.includes('..') || path.startsWith('gs://')) {
    return '';
  }

  return path;
}

export function sanitizeAuthProviders(authProviders: unknown) {
  if (!Array.isArray(authProviders)) {
    return [];
  }

  return Array.from(
    new Set(
      authProviders
        .map((value) => sanitizeString(value))
        .filter(Boolean),
    ),
  );
}

export function sanitizeBootstrapPayload(payload: unknown): {
  intendedRole: string | null,
  displayName: string,
  locale: 'ro' | 'en',
} {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const intendedRole = source.intendedRole === ROLES.PROVIDER
    ? ROLES.PROVIDER
    : source.intendedRole === ROLES.USER
      ? ROLES.USER
      : null;

  return {
    intendedRole,
    displayName: sanitizeString(source.displayName),
    locale: sanitizeString(source.locale).toLowerCase() === 'en' ? 'en' : 'ro',
  };
}

export function computeBootstrapProfileFlags({
  role,
  accountStatus,
  providerStatus,
  hasPrimaryLocation,
}: {
  role: string,
  accountStatus: string,
  providerStatus: string | null,
  hasPrimaryLocation: boolean,
}) {
  const normalizedRole = role === ROLES.PROVIDER ? ROLES.PROVIDER : ROLES.USER;
  const normalizedAccountStatus = accountStatus === ACCOUNT_STATUSES.DISABLED
    ? ACCOUNT_STATUSES.DISABLED
    : ACCOUNT_STATUSES.ACTIVE;
  const normalizedProviderStatus = normalizedRole === ROLES.PROVIDER && providerStatus
    ? providerStatus
    : null;

  return {
    needsProfileCompletion: normalizedRole === ROLES.USER ? !hasPrimaryLocation : false,
    needsProviderOnboarding: normalizedRole === ROLES.PROVIDER
      ? normalizedProviderStatus === PROVIDER_STATUSES.PRE_REGISTERED || !normalizedProviderStatus
      : false,
    isProviderApproved: normalizedProviderStatus === PROVIDER_STATUSES.APPROVED,
    isSuspended: normalizedAccountStatus === ACCOUNT_STATUSES.DISABLED
      || normalizedProviderStatus === PROVIDER_STATUSES.SUSPENDED,
  };
}
