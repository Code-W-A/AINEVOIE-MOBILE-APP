function readPublicBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

export const FEATURES = {
  wallet: false,
  favorites: false,
  notifications: false,
  messaging: true,
  paymentDemoMode: readPublicBoolean(process.env.EXPO_PUBLIC_PAYMENT_DEMO_MODE),
};

export function isFeatureEnabled(key) {
  return Boolean(FEATURES[key]);
}

export function isPaymentDemoModeEnabled() {
  return isFeatureEnabled('paymentDemoMode');
}
