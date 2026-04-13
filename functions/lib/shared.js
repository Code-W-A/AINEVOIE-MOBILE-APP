"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NOTIFICATION_PREFERENCES = exports.DEFAULT_LOCALE = exports.SERVICE_STATUSES = exports.PROVIDER_REVIEW_ACTIONS = exports.PROVIDER_DOCUMENT_TYPES = exports.PROVIDER_STATUSES = exports.ACCOUNT_STATUSES = exports.ROLES = void 0;
exports.isRole = isRole;
exports.isProviderStatus = isProviderStatus;
exports.isProviderDocumentType = isProviderDocumentType;
exports.isProviderReviewAction = isProviderReviewAction;
exports.isServiceStatus = isServiceStatus;
exports.sanitizeString = sanitizeString;
exports.sanitizeStoragePath = sanitizeStoragePath;
exports.sanitizeAuthProviders = sanitizeAuthProviders;
exports.sanitizeBootstrapPayload = sanitizeBootstrapPayload;
exports.computeBootstrapProfileFlags = computeBootstrapProfileFlags;
exports.ROLES = Object.freeze({
    USER: 'user',
    PROVIDER: 'provider',
    ADMIN: 'admin',
    SUPPORT: 'support',
});
exports.ACCOUNT_STATUSES = Object.freeze({
    ACTIVE: 'active',
    DISABLED: 'disabled',
});
exports.PROVIDER_STATUSES = Object.freeze({
    PRE_REGISTERED: 'pre_registered',
    PENDING_REVIEW: 'pending_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
});
exports.PROVIDER_DOCUMENT_TYPES = Object.freeze({
    IDENTITY: 'identity',
    PROFESSIONAL: 'professional',
});
exports.PROVIDER_REVIEW_ACTIONS = Object.freeze({
    APPROVE: 'approve',
    REJECT: 'reject',
    SUSPEND: 'suspend',
    REINSTATE: 'reinstate',
});
exports.SERVICE_STATUSES = Object.freeze({
    DRAFT: 'draft',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived',
});
exports.DEFAULT_LOCALE = 'ro';
exports.DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
    bookings: true,
    messages: true,
    promoSystem: true,
});
function isOneOf(values, value) {
    return typeof value === 'string' && values.includes(value);
}
function isRole(value) {
    return isOneOf(Object.values(exports.ROLES), value);
}
function isProviderStatus(value) {
    return isOneOf(Object.values(exports.PROVIDER_STATUSES), value);
}
function isProviderDocumentType(value) {
    return isOneOf(Object.values(exports.PROVIDER_DOCUMENT_TYPES), value);
}
function isProviderReviewAction(value) {
    return isOneOf(Object.values(exports.PROVIDER_REVIEW_ACTIONS), value);
}
function isServiceStatus(value) {
    return isOneOf(Object.values(exports.SERVICE_STATUSES), value);
}
function sanitizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function sanitizeStoragePath(value) {
    const path = sanitizeString(value).replace(/^\/+/, '');
    if (!path || path.includes('..') || path.startsWith('gs://')) {
        return '';
    }
    return path;
}
function sanitizeAuthProviders(authProviders) {
    if (!Array.isArray(authProviders)) {
        return [];
    }
    return Array.from(new Set(authProviders
        .map((value) => sanitizeString(value))
        .filter(Boolean)));
}
function sanitizeBootstrapPayload(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const intendedRole = source.intendedRole === exports.ROLES.PROVIDER
        ? exports.ROLES.PROVIDER
        : source.intendedRole === exports.ROLES.USER
            ? exports.ROLES.USER
            : null;
    return {
        intendedRole,
        displayName: sanitizeString(source.displayName),
        locale: sanitizeString(source.locale).toLowerCase() === 'en' ? 'en' : 'ro',
    };
}
function computeBootstrapProfileFlags({ role, accountStatus, providerStatus, hasPrimaryLocation, }) {
    const normalizedRole = role === exports.ROLES.PROVIDER ? exports.ROLES.PROVIDER : exports.ROLES.USER;
    const normalizedAccountStatus = accountStatus === exports.ACCOUNT_STATUSES.DISABLED
        ? exports.ACCOUNT_STATUSES.DISABLED
        : exports.ACCOUNT_STATUSES.ACTIVE;
    const normalizedProviderStatus = normalizedRole === exports.ROLES.PROVIDER && providerStatus
        ? providerStatus
        : null;
    return {
        needsProfileCompletion: normalizedRole === exports.ROLES.USER ? !hasPrimaryLocation : false,
        needsProviderOnboarding: normalizedRole === exports.ROLES.PROVIDER
            ? normalizedProviderStatus === exports.PROVIDER_STATUSES.PRE_REGISTERED || !normalizedProviderStatus
            : false,
        isProviderApproved: normalizedProviderStatus === exports.PROVIDER_STATUSES.APPROVED,
        isSuspended: normalizedAccountStatus === exports.ACCOUNT_STATUSES.DISABLED
            || normalizedProviderStatus === exports.PROVIDER_STATUSES.SUSPENDED,
    };
}
