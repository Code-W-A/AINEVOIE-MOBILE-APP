import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ONBOARDING_STORAGE_KEY = '@ainevoie/onboarding';
const defaultPersistedOnboarding = {
  hasSeenIntro: false,
  hasSeenUserOnboarding: false,
  hasSeenProviderOnboarding: false,
};

const OnboardingContext = createContext(null);

function getPersistedShape(onboarding) {
  return {
    hasSeenIntro: onboarding.hasSeenIntro,
    hasSeenUserOnboarding: onboarding.hasSeenUserOnboarding,
    hasSeenProviderOnboarding: onboarding.hasSeenProviderOnboarding,
  };
}

async function readStoredOnboarding() {
  const storedValue = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);

  return storedValue ? JSON.parse(storedValue) : defaultPersistedOnboarding;
}

export function OnboardingProvider({ children }) {
  const [onboarding, setOnboarding] = useState({
    ...defaultPersistedOnboarding,
    isHydrated: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function hydrateOnboarding() {
      try {
        const storedOnboarding = await readStoredOnboarding();

        if (!isMounted) {
          return;
        }

        setOnboarding({
          isHydrated: true,
          hasSeenIntro: !!storedOnboarding?.hasSeenIntro,
          hasSeenUserOnboarding: !!storedOnboarding?.hasSeenUserOnboarding,
          hasSeenProviderOnboarding: !!storedOnboarding?.hasSeenProviderOnboarding,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setOnboarding({
          ...defaultPersistedOnboarding,
          isHydrated: true,
        });
      }
    }

    hydrateOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistOnboarding = useCallback(async (updater) => {
    let nextOnboardingState;

    setOnboarding((currentOnboarding) => {
      nextOnboardingState = typeof updater === 'function' ? updater(currentOnboarding) : updater;
      return nextOnboardingState;
    });

    if (!nextOnboardingState) {
      return;
    }

    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(getPersistedShape(nextOnboardingState)));
  }, []);

  const completeIntro = useCallback(async () => {
    await persistOnboarding((currentOnboarding) => ({
      ...currentOnboarding,
      hasSeenIntro: true,
    }));
  }, [persistOnboarding]);

  const completeRoleOnboarding = useCallback(async (role) => {
    await persistOnboarding((currentOnboarding) => ({
      ...currentOnboarding,
      hasSeenUserOnboarding: role === 'user' ? true : currentOnboarding.hasSeenUserOnboarding,
      hasSeenProviderOnboarding: role === 'provider' ? true : currentOnboarding.hasSeenProviderOnboarding,
    }));
  }, [persistOnboarding]);

  const resetOnboarding = useCallback(async () => {
    const nextState = {
      ...defaultPersistedOnboarding,
      isHydrated: true,
    };

    setOnboarding(nextState);
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(getPersistedShape(nextState)));
  }, []);

  const value = useMemo(() => ({
    onboarding,
    completeIntro,
    completeRoleOnboarding,
    resetOnboarding,
  }), [onboarding, completeIntro, completeRoleOnboarding, resetOnboarding]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);

  if (!value) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }

  return value;
}
