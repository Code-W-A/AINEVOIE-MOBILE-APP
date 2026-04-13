import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchProviderProfile, fetchUserProfile } from '../src/firebase/profileStore';
import {
  resolveStoragePathDownloadUrl,
  uploadProviderAvatarAsset,
  uploadUserAvatarAsset,
} from '../src/firebase/storageUploads';

const AVATAR_STORAGE_KEY = '@ainevoie/demo-avatars';
const LEGACY_AVATAR_STORAGE_KEY = '@urbanhome/demo-avatars';

async function readAvatarStore() {
  try {
    const storedAvatars = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);

    if (storedAvatars) {
      return storedAvatars ? JSON.parse(storedAvatars) : {};
    }

    const legacyAvatars = await AsyncStorage.getItem(LEGACY_AVATAR_STORAGE_KEY);

    if (!legacyAvatars) {
      return {};
    }

    await AsyncStorage.setItem(AVATAR_STORAGE_KEY, legacyAvatars);
    await AsyncStorage.removeItem(LEGACY_AVATAR_STORAGE_KEY);
    return JSON.parse(legacyAvatars);
  } catch {
    return {};
  }
}

export function useDemoAvatar(role) {
  const { session } = useSession();
  const [avatarUri, setAvatarUri] = useState(null);

  const loadAvatar = useCallback(async () => {
    if (session.isAuthenticated && session.activeRole === role && session.uid && !session.configError) {
      try {
        const remoteProfile = role === 'provider'
          ? await fetchProviderProfile(session.uid)
          : await fetchUserProfile(session.uid);
        const remotePath = role === 'provider'
          ? remoteProfile?.professionalProfile?.avatarPath
          : remoteProfile?.photoPath;

        if (remotePath) {
          const downloadURL = await resolveStoragePathDownloadUrl(remotePath);
          setAvatarUri(downloadURL);
          return;
        }
      } catch {
      }
    }

    const storedAvatars = await readAvatarStore();
    setAvatarUri(storedAvatars[role] || null);
  }, [role, session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadAvatar();
    }, [loadAvatar])
  );

  const saveAvatar = useCallback(async (uri, asset = null) => {
    if (session.isAuthenticated && session.activeRole === role && session.uid && !session.configError) {
      const sourceAsset = asset || { uri };
      const uploadResult = role === 'provider'
        ? await uploadProviderAvatarAsset(session.uid, sourceAsset)
        : await uploadUserAvatarAsset(session.uid, sourceAsset);
      setAvatarUri(uploadResult.downloadURL);
      return uploadResult.downloadURL;
    }

    const storedAvatars = await readAvatarStore();
    const nextAvatars = {
      ...storedAvatars,
      [role]: uri,
    };

    await AsyncStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(nextAvatars));
    await AsyncStorage.removeItem(LEGACY_AVATAR_STORAGE_KEY);
    setAvatarUri(uri);
    return uri;
  }, [role, session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  return {
    avatarUri,
    saveAvatar,
  };
}
