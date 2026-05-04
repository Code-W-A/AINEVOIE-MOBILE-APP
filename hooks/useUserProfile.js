import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchUserProfile, mapUserDocToHookData, saveUserProfilePatch } from '../src/firebase/profileStore';

export const defaultUserProfile = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
};

export function normalizeUserProfile(payload) {
  return {
    ...defaultUserProfile,
    ...(payload || {}),
  };
}

export function useUserProfile() {
  const { session } = useSession();
  const [data, setData] = useState(defaultUserProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === 'user'
    && session.uid
    && !session.configError,
  );

  const loadUserProfile = useCallback(async () => {
    if (!canUseRemote) {
      setIsLoading(false);
      return defaultUserProfile;
    }

    setIsLoading(true);
    setError(null);

    try {
      const remoteProfile = await fetchUserProfile(session.uid);
      const nextProfile = remoteProfile
        ? normalizeUserProfile(mapUserDocToHookData(remoteProfile, defaultUserProfile))
        : defaultUserProfile;
      setData(nextProfile);
      setIsLoading(false);
      return nextProfile;
    } catch (nextError) {
      setError(nextError);
      setData(defaultUserProfile);
      setIsLoading(false);
      return defaultUserProfile;
    }
  }, [canUseRemote, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadUserProfile();
    }, [loadUserProfile])
  );

  const saveUserProfile = useCallback(async (updater) => {
    if (!canUseRemote) {
      throw new Error('User profile can be edited only by the authenticated user.');
    }

    const baseValue = normalizeUserProfile(data);
    const nextValue = typeof updater === 'function' ? updater(baseValue) : normalizeUserProfile(updater);
    const normalized = normalizeUserProfile(nextValue);
    const remoteProfile = await saveUserProfilePatch(session.uid, {
      displayName: normalized.name,
      phoneNumber: normalized.phoneNumber || null,
    });
    const nextProfile = normalizeUserProfile(mapUserDocToHookData(remoteProfile, normalized));
    setData(nextProfile);
    return nextProfile;
  }, [canUseRemote, data, session.uid]);

  return {
    data,
    isLoading,
    error,
    loadUserProfile,
    reload: loadUserProfile,
    saveUserProfile,
  };
}
