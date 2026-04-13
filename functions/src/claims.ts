import {
  ACCOUNT_STATUSES,
  PROVIDER_STATUSES,
  ROLES,
  isProviderStatus,
  isRole,
} from './shared';

type ClaimsArgs = {
  role: string,
  providerStatus?: string | null,
  accountStatus?: string | null,
};

export function buildClaims({ role, providerStatus, accountStatus }: ClaimsArgs) {
  const normalizedRole = isRole(role) ? role : ROLES.USER;
  const normalizedProviderStatus = isProviderStatus(providerStatus) ? providerStatus : null;
  const normalizedAccountStatus = accountStatus === ACCOUNT_STATUSES.DISABLED ? ACCOUNT_STATUSES.DISABLED : ACCOUNT_STATUSES.ACTIVE;

  return {
    role: normalizedRole,
    providerStatus: normalizedProviderStatus,
    isSuspended: normalizedAccountStatus === ACCOUNT_STATUSES.DISABLED || normalizedProviderStatus === PROVIDER_STATUSES.SUSPENDED,
  };
}

export function claimsMatchState(currentClaims: Record<string, unknown> | undefined, nextClaims: ReturnType<typeof buildClaims>) {
  return currentClaims?.role === nextClaims.role
    && currentClaims?.providerStatus === nextClaims.providerStatus
    && currentClaims?.isSuspended === nextClaims.isSuspended;
}
