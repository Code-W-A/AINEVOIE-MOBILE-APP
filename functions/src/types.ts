export type NotificationPreferences = {
  bookings: boolean,
  messages: boolean,
  promoSystem: boolean,
};

export type PrimaryLocation = {
  formattedAddress: string,
  lat: number | null,
  lng: number | null,
  source: 'gps' | 'manual',
};

export type BootstrapSessionResponse = {
  uid: string,
  role: 'user' | 'provider',
  accountStatus: 'active' | 'disabled',
  providerStatus: 'pre_registered' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | null,
  authProviders: string[],
  profileFlags: {
    needsProfileCompletion: boolean,
    needsProviderOnboarding: boolean,
    isProviderApproved: boolean,
    isSuspended: boolean,
  },
  bootstrapOutcome: 'created_profile' | 'repaired_profile' | 'repaired_claims' | 'ok',
};
