export declare const ROLES: Readonly<{
  USER: 'user';
  PROVIDER: 'provider';
  ADMIN: 'admin';
  SUPPORT: 'support';
}>;

export declare const ACCOUNT_STATUSES: Readonly<{
  ACTIVE: 'active';
  DISABLED: 'disabled';
}>;

export declare const PROVIDER_STATUSES: Readonly<{
  PRE_REGISTERED: 'pre_registered';
  PENDING_REVIEW: 'pending_review';
  APPROVED: 'approved';
  REJECTED: 'rejected';
  SUSPENDED: 'suspended';
}>;

export declare const PROVIDER_DOCUMENT_TYPES: Readonly<{
  IDENTITY: 'identity';
  PROFESSIONAL: 'professional';
}>;

export declare const PROVIDER_REVIEW_ACTIONS: Readonly<{
  APPROVE: 'approve';
  REJECT: 'reject';
  SUSPEND: 'suspend';
  REINSTATE: 'reinstate';
}>;

export declare const UI_PROVIDER_VERIFICATION_STATUSES: Readonly<{
  DRAFT: 'draft';
  PENDING: 'pending';
  APPROVED: 'approved';
  REJECTED: 'rejected';
  SUSPENDED: 'suspended';
}>;

export declare const SERVICE_STATUSES: Readonly<{
  DRAFT: 'draft';
  ACTIVE: 'active';
  INACTIVE: 'inactive';
  ARCHIVED: 'archived';
}>;

export declare const BOOKING_STATUSES: Readonly<{
  REQUESTED: 'requested';
  CONFIRMED: 'confirmed';
  RESCHEDULE_PROPOSED: 'reschedule_proposed';
  REJECTED: 'rejected';
  CANCELLED_BY_USER: 'cancelled_by_user';
  CANCELLED_BY_PROVIDER: 'cancelled_by_provider';
  COMPLETED: 'completed';
}>;

export declare const PAYMENT_STATUSES: Readonly<{
  UNPAID: 'unpaid';
  IN_PROGRESS: 'in_progress';
  PAID: 'paid';
  FAILED: 'failed';
}>;

export declare const REVIEW_STATUSES: Readonly<{
  PUBLISHED: 'published';
  HIDDEN_BY_ADMIN: 'hidden_by_admin';
}>;

export declare const DEFAULT_LOCALE: 'ro';

export declare const DEFAULT_NOTIFICATION_PREFERENCES: Readonly<{
  bookings: true;
  messages: true;
  promoSystem: true;
}>;

export type Role = typeof ROLES[keyof typeof ROLES];
export type AccountStatus = typeof ACCOUNT_STATUSES[keyof typeof ACCOUNT_STATUSES];
export type ProviderStatus = typeof PROVIDER_STATUSES[keyof typeof PROVIDER_STATUSES];
export type ProviderDocumentType = typeof PROVIDER_DOCUMENT_TYPES[keyof typeof PROVIDER_DOCUMENT_TYPES];
export type ProviderReviewAction = typeof PROVIDER_REVIEW_ACTIONS[keyof typeof PROVIDER_REVIEW_ACTIONS];
export type UiProviderVerificationStatus = typeof UI_PROVIDER_VERIFICATION_STATUSES[keyof typeof UI_PROVIDER_VERIFICATION_STATUSES];
export type ServiceStatus = typeof SERVICE_STATUSES[keyof typeof SERVICE_STATUSES];
export type BookingStatus = typeof BOOKING_STATUSES[keyof typeof BOOKING_STATUSES];
export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES];
export type ReviewStatus = typeof REVIEW_STATUSES[keyof typeof REVIEW_STATUSES];

export declare function isRole(value: unknown): value is Role;
export declare function isAccountStatus(value: unknown): value is AccountStatus;
export declare function isProviderStatus(value: unknown): value is ProviderStatus;
export declare function isProviderDocumentType(value: unknown): value is ProviderDocumentType;
export declare function isProviderReviewAction(value: unknown): value is ProviderReviewAction;
export declare function isServiceStatus(value: unknown): value is ServiceStatus;
export declare function isBookingStatus(value: unknown): value is BookingStatus;
export declare function isPaymentStatus(value: unknown): value is PaymentStatus;
export declare function isReviewStatus(value: unknown): value is ReviewStatus;

export declare function sanitizeString(value: unknown): string;
export declare function sanitizeAuthProviders(authProviders: unknown): string[];

export declare function sanitizeBootstrapPayload(payload: {
  intendedRole?: unknown;
  displayName?: unknown;
  locale?: unknown;
} | null | undefined): {
  intendedRole: Role | null;
  displayName: string;
  locale: 'ro' | 'en';
};

export declare function computeBootstrapProfileFlags(args: {
  role: Role | null | undefined;
  accountStatus: AccountStatus | null | undefined;
  providerStatus: ProviderStatus | null | undefined;
  hasPrimaryLocation: boolean;
}): {
  needsProfileCompletion: boolean;
  needsProviderOnboarding: boolean;
  isProviderApproved: boolean;
  isSuspended: boolean;
};

export declare function toUiProviderVerificationStatus(
  status: ProviderStatus | null | undefined
): UiProviderVerificationStatus;

export declare function fromUiProviderVerificationStatus(
  status: UiProviderVerificationStatus | null | undefined
): ProviderStatus;

export declare function getRomaniaCountry(): {
  countryCode: 'RO';
  countryName: 'Romania';
  countryNameLocal: 'România';
};

export declare function getRomaniaCounties(): Array<{
  countyCode: string;
  countyName: string;
}>;

export declare function getRomaniaCitiesByCounty(countyCode: unknown): Array<{
  cityCode: string;
  cityName: string;
}>;

export declare function findRomaniaCounty(value: unknown): null | {
  countyCode: string;
  countyName: string;
  aliases: string[];
  cities: Array<{
    cityCode: string;
    cityName: string;
    aliases: string[];
  }>;
};

export declare function findRomaniaCity(countyCode: unknown, value: unknown): null | {
  cityCode: string;
  cityName: string;
  aliases: string[];
};

export declare function resolveRomaniaCoverageHierarchy(input?: Record<string, unknown>): {
  countryCode: string;
  countryName: string;
  countyCode: string;
  countyName: string;
  cityCode: string;
  cityName: string;
};

export declare function deriveRomaniaHierarchyFromPlacemark(input?: Record<string, unknown>): {
  countryCode: string;
  countryName: string;
  countyCode: string;
  countyName: string;
  cityCode: string;
  cityName: string;
};

export declare function buildRomaniaCoverageAreaText(input?: Record<string, unknown>): string;
export declare function isRomaniaCoverageHierarchyComplete(input?: Record<string, unknown>): boolean;
export declare function normalizeRomaniaLocationLabel(value: unknown): string;
