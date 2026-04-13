import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchProviderProfile, fetchUserProfile, getDefaultNotificationPreferences, saveRoleNotificationPreferences } from '../src/firebase/profileStore';

const NOTIFICATION_PREFERENCES_STORAGE_KEY = '@ainevoie/notification-preferences';

const defaultRolePreferences = getDefaultNotificationPreferences();

function normalizeRole(role) {
  return role === 'provider' ? 'provider' : 'user';
}

function normalizePreferences(preferences) {
  return {
    bookings: preferences?.bookings !== false,
    messages: preferences?.messages !== false,
    promoSystem: preferences?.promoSystem !== false,
  };
}

function normalizeStore(store) {
  return {
    user: normalizePreferences(store?.user),
    provider: normalizePreferences(store?.provider),
  };
}

async function readStoredPreferences() {
  try {
    const storedValue = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    return storedValue ? normalizeStore(JSON.parse(storedValue)) : normalizeStore({});
  } catch {
    return normalizeStore({});
  }
}

export function useNotificationPreferences(role) {
  const { session } = useSession();
  const normalizedRole = normalizeRole(role);
  const [preferences, setPreferences] = useState(defaultRolePreferences);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);

    if (session.isAuthenticated && session.activeRole === normalizedRole && session.uid && !session.configError) {
      try {
        const remoteProfile = normalizedRole === 'provider'
          ? await fetchProviderProfile(session.uid)
          : await fetchUserProfile(session.uid);

        if (remoteProfile) {
          setPreferences(normalizePreferences(remoteProfile.notificationPreferences));
          setIsLoading(false);
          return;
        }
      } catch {
      }
    }

    const storedValue = await readStoredPreferences();
    setPreferences(storedValue[normalizedRole]);
    setIsLoading(false);
  }, [normalizedRole, session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences])
  );

  const savePreferences = useCallback(async (updater) => {
    const currentStore = await readStoredPreferences();
    const currentValue = session.isAuthenticated && session.activeRole === normalizedRole
      ? preferences
      : currentStore[normalizedRole];
    const nextValue = typeof updater === 'function' ? updater(currentValue) : updater;
    const normalizedValue = normalizePreferences(nextValue);

    if (session.isAuthenticated && session.activeRole === normalizedRole && session.uid && !session.configError) {
      const remoteProfile = await saveRoleNotificationPreferences(normalizedRole, session.uid, normalizedValue);
      const nextPreferences = normalizePreferences(remoteProfile?.notificationPreferences);
      setPreferences(nextPreferences);
      return nextPreferences;
    }

    const nextStore = {
      ...currentStore,
      [normalizedRole]: normalizedValue,
    };

    await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_STORAGE_KEY, JSON.stringify(nextStore));
    setPreferences(normalizedValue);
    return normalizedValue;
  }, [normalizedRole, preferences, session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  return {
    preferences,
    isLoading,
    loadPreferences,
    savePreferences,
  };
}
