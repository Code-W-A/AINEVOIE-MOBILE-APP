import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchProviderProfile, fetchUserProfile, getDefaultNotificationPreferences, saveRoleNotificationPreferences } from '../src/firebase/profileStore';

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

export function useNotificationPreferences(role) {
  const { session } = useSession();
  const normalizedRole = normalizeRole(role);
  const [preferences, setPreferences] = useState(defaultRolePreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === normalizedRole
    && session.uid
    && !session.configError,
  );

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!canUseRemote) {
      setPreferences(defaultRolePreferences);
      setIsLoading(false);
      return defaultRolePreferences;
    }

    try {
      const remoteProfile = normalizedRole === 'provider'
        ? await fetchProviderProfile(session.uid)
        : await fetchUserProfile(session.uid);
      const nextPreferences = remoteProfile
        ? normalizePreferences(remoteProfile.notificationPreferences)
        : defaultRolePreferences;
      setPreferences(nextPreferences);
      setIsLoading(false);
      return nextPreferences;
    } catch (nextError) {
      setError(nextError);
      setPreferences(defaultRolePreferences);
      setIsLoading(false);
      return defaultRolePreferences;
    }
  }, [canUseRemote, normalizedRole, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences])
  );

  const savePreferences = useCallback(async (updater) => {
    if (!canUseRemote) {
      throw new Error('Notification preferences can be edited only by the authenticated role.');
    }

    const nextValue = typeof updater === 'function' ? updater(preferences) : updater;
    const normalizedValue = normalizePreferences(nextValue);
    const remoteProfile = await saveRoleNotificationPreferences(normalizedRole, session.uid, normalizedValue);
    const nextPreferences = normalizePreferences(remoteProfile?.notificationPreferences);
    setPreferences(nextPreferences);
    return nextPreferences;
  }, [canUseRemote, normalizedRole, preferences, session.uid]);

  return {
    preferences,
    isLoading,
    error,
    loadPreferences,
    reload: loadPreferences,
    savePreferences,
  };
}
