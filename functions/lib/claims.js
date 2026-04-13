"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClaims = buildClaims;
exports.claimsMatchState = claimsMatchState;
const shared_1 = require("./shared");
function buildClaims({ role, providerStatus, accountStatus }) {
    const normalizedRole = (0, shared_1.isRole)(role) ? role : shared_1.ROLES.USER;
    const normalizedProviderStatus = (0, shared_1.isProviderStatus)(providerStatus) ? providerStatus : null;
    const normalizedAccountStatus = accountStatus === shared_1.ACCOUNT_STATUSES.DISABLED ? shared_1.ACCOUNT_STATUSES.DISABLED : shared_1.ACCOUNT_STATUSES.ACTIVE;
    return {
        role: normalizedRole,
        providerStatus: normalizedProviderStatus,
        isSuspended: normalizedAccountStatus === shared_1.ACCOUNT_STATUSES.DISABLED || normalizedProviderStatus === shared_1.PROVIDER_STATUSES.SUSPENDED,
    };
}
function claimsMatchState(currentClaims, nextClaims) {
    return currentClaims?.role === nextClaims.role
        && currentClaims?.providerStatus === nextClaims.providerStatus
        && currentClaims?.isSuspended === nextClaims.isSuspended;
}
