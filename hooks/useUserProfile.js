import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchUserProfile, mapUserDocToHookData, saveUserProfilePatch } from '../src/firebase/profileStore';
import { roleDisplayConfig } from '../src/features/shared/config/roleDisplayConfig';

const USER_PROFILE_STORAGE_KEY = '@ainevoie/user-profile';
const LEGACY_USER_PROFILE_STORAGE_KEY = '@urbanhome/user-profile';

export const defaultUserProfile = {
  name: roleDisplayConfig.user.editProfileDefaults.name,
  email: roleDisplayConfig.user.editProfileDefaults.email,
  password: '',
  phoneNumber: roleDisplayConfig.user.editProfileDefaults.phoneNumber,
};

export function normalizeUserProfile(payload) {
  return {
    ...defaultUserProfile,
    ...(payload || {}),
  };
}

export async function readStoredUserProfile() {
  try {
    const storedValue = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);

    if (storedValue) {
      return normalizeUserProfile(JSON.parse(storedValue));
    }

    const legacyValue = await AsyncStorage.getItem(LEGACY_USER_PROFILE_STORAGE_KEY);

    if (!legacyValue) {
      return defaultUserProfile;
    }

    await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, legacyValue);
    await AsyncStorage.removeItem(LEGACY_USER_PROFILE_STORAGE_KEY);
    return normalizeUserProfile(JSON.parse(legacyValue));
  } catch {
    return defaultUserProfile;
  }
}

export function useUserProfile() {
  const { session } = useSession();
  const [data, setData] = useState(defaultUserProfile);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = useCallback(async () => {
    setIsLoading(true);
    if (session.isAuthenticated && session.activeRole === 'user' && session.uid && !session.configError) {
      try {
        const remoteProfile = await fetchUserProfile(session.uid);

        if (remoteProfile) {
          setData(normalizeUserProfile(mapUserDocToHookData(remoteProfile, defaultUserProfile)));
          setIsLoading(false);
          return;
        }
      } catch {
      }
    }

    const storedValue = await readStoredUserProfile();
    setData(normalizeUserProfile(storedValue));
    setIsLoading(false);
  }, [session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadUserProfile();
    }, [loadUserProfile])
  );

  const saveUserProfile = useCallback(async (updater) => {
    const currentValue = session.isAuthenticated && session.activeRole === 'user' && session.uid && !session.configError
      ? normalizeUserProfile(data)
      : await readStoredUserProfile();
    const baseValue = normalizeUserProfile(currentValue);
    const nextValue = typeof updater === 'function' ? updater(baseValue) : normalizeUserProfile(updater);
    const normalized = normalizeUserProfile(nextValue);

    if (session.isAuthenticated && session.activeRole === 'user' && session.uid && !session.configError) {
      const remoteProfile = await saveUserProfilePatch(session.uid, {
        displayName: normalized.name,
        phoneNumber: normalized.phoneNumber || null,
      });
      const nextProfile = normalizeUserProfile(mapUserDocToHookData(remoteProfile, normalized));
      setData(nextProfile);
      return nextProfile;
    }

    await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
    await AsyncStorage.removeItem(LEGACY_USER_PROFILE_STORAGE_KEY);
    setData(normalized);
    return normalized;
  }, [data, session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  return {
    data,
    isLoading,
    loadUserProfile,
    saveUserProfile,
  };
}
