const ROLES = Object.freeze({
  USER: 'user',
  PROVIDER: 'provider',
  ADMIN: 'admin',
  SUPPORT: 'support',
});

const ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled',
});

const PROVIDER_STATUSES = Object.freeze({
  PRE_REGISTERED: 'pre_registered',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

const PROVIDER_DOCUMENT_TYPES = Object.freeze({
  IDENTITY: 'identity',
  PROFESSIONAL: 'professional',
});

const PROVIDER_REVIEW_ACTIONS = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
  SUSPEND: 'suspend',
  REINSTATE: 'reinstate',
});

const UI_PROVIDER_VERIFICATION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

const SERVICE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});

const BOOKING_STATUSES = Object.freeze({
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  RESCHEDULE_PROPOSED: 'reschedule_proposed',
  REJECTED: 'rejected',
  CANCELLED_BY_USER: 'cancelled_by_user',
  CANCELLED_BY_PROVIDER: 'cancelled_by_provider',
  COMPLETED: 'completed',
});

const PAYMENT_STATUSES = Object.freeze({
  UNPAID: 'unpaid',
  IN_PROGRESS: 'in_progress',
  PAID: 'paid',
  FAILED: 'failed',
});

const REVIEW_STATUSES = Object.freeze({
  PUBLISHED: 'published',
  HIDDEN_BY_ADMIN: 'hidden_by_admin',
});

const DEFAULT_LOCALE = 'ro';

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  bookings: true,
  messages: true,
  promoSystem: true,
});

function isOneOf(values, value) {
  return values.includes(value);
}

function isRole(value) {
  return isOneOf(Object.values(ROLES), value);
}

function isAccountStatus(value) {
  return isOneOf(Object.values(ACCOUNT_STATUSES), value);
}

function isProviderStatus(value) {
  return isOneOf(Object.values(PROVIDER_STATUSES), value);
}

function isProviderDocumentType(value) {
  return isOneOf(Object.values(PROVIDER_DOCUMENT_TYPES), value);
}

function isProviderReviewAction(value) {
  return isOneOf(Object.values(PROVIDER_REVIEW_ACTIONS), value);
}

function isServiceStatus(value) {
  return isOneOf(Object.values(SERVICE_STATUSES), value);
}

function isBookingStatus(value) {
  return isOneOf(Object.values(BOOKING_STATUSES), value);
}

function isPaymentStatus(value) {
  return isOneOf(Object.values(PAYMENT_STATUSES), value);
}

function isReviewStatus(value) {
  return isOneOf(Object.values(REVIEW_STATUSES), value);
}

module.exports = {
  ACCOUNT_STATUSES,
  BOOKING_STATUSES,
  DEFAULT_LOCALE,
  DEFAULT_NOTIFICATION_PREFERENCES,
  PAYMENT_STATUSES,
  PROVIDER_DOCUMENT_TYPES,
  PROVIDER_REVIEW_ACTIONS,
  PROVIDER_STATUSES,
  REVIEW_STATUSES,
  ROLES,
  SERVICE_STATUSES,
  UI_PROVIDER_VERIFICATION_STATUSES,
  isAccountStatus,
  isBookingStatus,
  isPaymentStatus,
  isProviderDocumentType,
  isProviderReviewAction,
  isProviderStatus,
  isReviewStatus,
  isRole,
  isServiceStatus,
};
