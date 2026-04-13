export const USER_HOME_ROUTE = '/user/(tabs)/home/homeScreen';
export const PROVIDER_HOME_ROUTE = '/provider/(tabs)/booking/bookingScreen';
export const USER_LOGIN_ROUTE = '/auth/userLoginScreen';
export const PROVIDER_LOGIN_ROUTE = '/auth/providerLoginScreen';
export const USER_SIGNUP_ROUTE = '/auth/userSignupScreen';
export const PROVIDER_SIGNUP_ROUTE = '/auth/providerSignupScreen';
export const USER_PHONE_LOGIN_ROUTE = '/auth/userPhoneLoginScreen';
export const USER_PHONE_SIGNUP_ROUTE = '/auth/userPhoneSignupScreen';
export const PROVIDER_PHONE_LOGIN_ROUTE = '/auth/providerPhoneLoginScreen';
export const PROVIDER_PHONE_SIGNUP_ROUTE = '/auth/providerPhoneSignupScreen';
export const USER_FORGOT_PASSWORD_ROUTE = '/auth/userForgotPasswordScreen';
export const PROVIDER_FORGOT_PASSWORD_ROUTE = '/auth/providerForgotPasswordScreen';
export const USER_RESET_PASSWORD_ROUTE = '/auth/userResetPasswordScreen';
export const PROVIDER_RESET_PASSWORD_ROUTE = '/auth/providerResetPasswordScreen';
export const USER_ONBOARDING_ROUTE = '/auth/userOnboardingScreen';
export const PROVIDER_ONBOARDING_ROUTE = '/auth/providerOnboardingScreen';
export const USER_LOCATION_SETUP_ROUTE = '/auth/userLocationSetupScreen';

export function getHomeRoute(role) {
  return role === 'provider' ? PROVIDER_HOME_ROUTE : USER_HOME_ROUTE;
}

export function getAuthRouteForRole(role) {
  return role === 'provider' ? PROVIDER_LOGIN_ROUTE : USER_LOGIN_ROUTE;
}

export function getEmailAuthRouteForRoleIntent(role, intent) {
  if (role === 'provider') {
    return intent === 'signup' ? PROVIDER_SIGNUP_ROUTE : PROVIDER_LOGIN_ROUTE;
  }

  return intent === 'signup' ? USER_SIGNUP_ROUTE : USER_LOGIN_ROUTE;
}

export function getPhoneAuthRouteForRoleIntent(role, intent) {
  if (role === 'provider') {
    return intent === 'signup' ? PROVIDER_PHONE_SIGNUP_ROUTE : PROVIDER_PHONE_LOGIN_ROUTE;
  }

  return intent === 'signup' ? USER_PHONE_SIGNUP_ROUTE : USER_PHONE_LOGIN_ROUTE;
}

export function getForgotPasswordRouteForRole(role) {
  return role === 'provider' ? PROVIDER_FORGOT_PASSWORD_ROUTE : USER_FORGOT_PASSWORD_ROUTE;
}

export function getResetPasswordRouteForRole(role) {
  return role === 'provider' ? PROVIDER_RESET_PASSWORD_ROUTE : USER_RESET_PASSWORD_ROUTE;
}

export function getOnboardingRouteForRole(role) {
  return role === 'provider' ? PROVIDER_ONBOARDING_ROUTE : USER_ONBOARDING_ROUTE;
}

export function getPostBootstrapRoute(bootstrap) {
  if (!bootstrap?.role) {
    return '/auth/loginScreen';
  }

  if (bootstrap.role === 'user' && bootstrap.profileFlags?.needsProfileCompletion) {
    return USER_LOCATION_SETUP_ROUTE;
  }

  if (
    bootstrap.role === 'provider'
    && (bootstrap.providerStatus === 'pre_registered' || bootstrap.profileFlags?.needsProviderOnboarding)
  ) {
    return PROVIDER_ONBOARDING_ROUTE;
  }

  return getHomeRoute(bootstrap.role);
}

export function getAuthenticatedEntryRoute(session) {
  if (!session?.isAuthenticated || !session?.activeRole) {
    return '/auth/loginScreen';
  }

  if (session.activeRole === 'user' && session.bootstrap?.profileFlags?.needsProfileCompletion) {
    return USER_LOCATION_SETUP_ROUTE;
  }

  if (session.activeRole === 'provider' && session.providerStatus === 'pre_registered') {
    return PROVIDER_ONBOARDING_ROUTE;
  }

  return getHomeRoute(session.activeRole);
}

export function getLegacyUserRoute(segments) {
  if (!segments || segments.length === 0) {
    return USER_HOME_ROUTE;
  }

  return `/user/${segments.join('/')}`;
}

export function isLegacyUserSegment(firstSegment) {
  return !['auth', 'provider', 'user'].includes(firstSegment);
}
