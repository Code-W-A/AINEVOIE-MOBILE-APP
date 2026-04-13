import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../context/sessionContext';
import { useOnboarding } from '../context/onboardingContext';
import { getAuthenticatedEntryRoute } from '../utils/roleRoutes';
import { FORCE_ONBOARDING_ENTRY } from '../utils/devFlags';

const SplashScreen = () => {
  const router = useRouter();
  const { session } = useSession();
  const { onboarding } = useOnboarding();
  const isSessionHydrated = session.isHydrated;
  const isAuthenticated = session.isAuthenticated;
  const activeRole = session.activeRole;

  useEffect(() => {
    if (!isSessionHydrated || !onboarding.isHydrated) {
      return;
    }

    const nextRoute = FORCE_ONBOARDING_ENTRY && !onboarding.hasSeenIntro
      ? '/auth/onboardingScreen'
      : isAuthenticated && activeRole
        ? getAuthenticatedEntryRoute(session)
        : onboarding.hasSeenIntro ? '/auth/loginScreen' : '/auth/onboardingScreen';

    const timer = setTimeout(() => {
      router.replace(nextRoute);
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [activeRole, isAuthenticated, isSessionHydrated, onboarding.hasSeenIntro, onboarding.isHydrated, router, session]);

  return (
    <View style={styles.screen}>
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.splashImageStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  splashImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default SplashScreen;
