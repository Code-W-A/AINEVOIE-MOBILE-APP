import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, LogBox, StatusBar } from 'react-native';
import { LocaleProvider, useLocale } from '../context/localeContext';
import { SessionProvider, useSession } from '../context/sessionContext';
import { OnboardingProvider, useOnboarding } from '../context/onboardingContext';
import {
  getAuthRouteForRole,
  getAuthenticatedEntryRoute,
  getHomeRoute,
  getLegacyUserRoute,
  isLegacyUserSegment,
} from '../utils/roleRoutes';
import { FORCE_ONBOARDING_ENTRY } from '../utils/devFlags';

LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync();

function RouteGuard() {
  const { session } = useSession();
  const { onboarding } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();
  const isSessionHydrated = session.isHydrated;
  const isAuthenticated = session.isAuthenticated;
  const activeRole = session.activeRole;
  const needsUserProfileCompletion = Boolean(session.bootstrap?.profileFlags?.needsProfileCompletion);
  const providerStatus = session.providerStatus;

  useEffect(() => {
    if (!isSessionHydrated || !onboarding.isHydrated || segments.length === 0) {
      return;
    }

    const [firstSegment, secondSegment] = segments;
    const isAuthRoute = firstSegment === 'auth';
    const isProviderAuthRoute = firstSegment === 'provider' && secondSegment === 'auth';
    const isUserRoute = firstSegment === 'user';
    const isProviderRoute = firstSegment === 'provider' && secondSegment !== 'auth';
    const isLegacyUserRoute = isLegacyUserSegment(firstSegment);
    const isIntroOnboardingRoute = isAuthRoute && secondSegment === 'onboardingScreen';
    const isUserOnboardingRoute = isAuthRoute && secondSegment === 'userOnboardingScreen';
    const isProviderOnboardingRoute = isAuthRoute && secondSegment === 'providerOnboardingScreen';
    const isUserLocationSetupRoute = isAuthRoute && secondSegment === 'userLocationSetupScreen';

    let redirectPath = null;

    if (FORCE_ONBOARDING_ENTRY && !onboarding.hasSeenIntro) {
      const isDevelopmentOnboardingRoute = isIntroOnboardingRoute || isUserOnboardingRoute || isProviderOnboardingRoute;

      if (!isDevelopmentOnboardingRoute) {
        redirectPath = '/auth/onboardingScreen';
      }
    } else
    if (!isAuthenticated) {
      if (!onboarding.hasSeenIntro) {
        if (!isIntroOnboardingRoute && (isAuthRoute || isProviderAuthRoute || isUserRoute || isProviderRoute || isLegacyUserRoute)) {
          redirectPath = '/auth/onboardingScreen';
        }
      } else if (isIntroOnboardingRoute) {
        redirectPath = '/auth/loginScreen';
      } else if (isUserOnboardingRoute) {
        redirectPath = getAuthRouteForRole('user');
      } else if (isProviderOnboardingRoute && onboarding.hasSeenProviderOnboarding) {
        redirectPath = getAuthRouteForRole('provider');
      } else if (isUserRoute || isProviderRoute || isLegacyUserRoute) {
        redirectPath = '/auth/loginScreen';
      }
    } else if (activeRole === 'user') {
      if (needsUserProfileCompletion) {
        if (!isUserLocationSetupRoute) {
          redirectPath = getAuthenticatedEntryRoute(session);
        }
      } else if (isAuthRoute || isProviderAuthRoute || isProviderRoute) {
        redirectPath = getHomeRoute('user');
      } else if (isLegacyUserRoute) {
        redirectPath = getLegacyUserRoute(segments);
      }
    } else if (activeRole === 'provider') {
      if (providerStatus === 'pre_registered') {
        if (!isProviderOnboardingRoute) {
          redirectPath = getAuthenticatedEntryRoute(session);
        }
      } else if (isAuthRoute || isProviderAuthRoute || isUserRoute || isLegacyUserRoute) {
        redirectPath = getHomeRoute('provider');
      }
    }

    if (redirectPath) {
      router.replace(redirectPath);
    }
  }, [
    onboarding.hasSeenIntro,
    onboarding.hasSeenProviderOnboarding,
    onboarding.hasSeenUserOnboarding,
    onboarding.isHydrated,
    activeRole,
    isAuthenticated,
    isSessionHydrated,
    needsUserProfileCompletion,
    providerStatus,
    router,
    segments,
    session,
  ]);

  return null;
}

function RootNavigator() {
  const { session } = useSession();
  const { onboarding } = useOnboarding();
  const { isHydrated: isLocaleHydrated } = useLocale();

  const [loaded] = useFonts({
    Montserrat_Regular: require('../assets/fonts/montserrat/Montserrat-Regular.ttf'),
    Montserrat_Medium: require('../assets/fonts/montserrat/Montserrat-Medium.ttf'),
    Montserrat_SemiBold: require('../assets/fonts/montserrat/Montserrat-SemiBold.ttf'),
    Montserrat_Bold: require('../assets/fonts/montserrat/Montserrat-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded && session.isHydrated && onboarding.isHydrated && isLocaleHydrated) {
      SplashScreen.hideAsync();
    }

    const subscription = AppState.addEventListener('change', () => {
      StatusBar.setBarStyle('light-content');
    });

    return () => {
      subscription.remove();
    };
  }, [isLocaleHydrated, loaded, onboarding.isHydrated, session.isHydrated]);

  if (!loaded || !isLocaleHydrated) {
    return null;
  }

  return (
    <>
      <RouteGuard />
      <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="user" options={{ headerShown: false }} />
        <Stack.Screen name="provider" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <LocaleProvider>
        <OnboardingProvider>
          <RootNavigator />
        </OnboardingProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
