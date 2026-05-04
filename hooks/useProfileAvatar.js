import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchProviderProfile, fetchUserProfile } from '../src/firebase/profileStore';
import {
  resolveStoragePathDownloadUrl,
  uploadProviderAvatarAsset,
  uploadUserAvatarAsset,
} from '../src/firebase/storageUploads';

export function useProfileAvatar(role) {
  const { session } = useSession();
  const [avatarUri, setAvatarUri] = useState(null);
  const [error, setError] = useState(null);

  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === role
    && session.uid
    && !session.configError,
  );

  const loadAvatar = useCallback(async () => {
    setError(null);

    if (!canUseRemote) {
      setAvatarUri(null);
      return null;
    }

    try {
      const remoteProfile = role === 'provider'
        ? await fetchProviderProfile(session.uid)
        : await fetchUserProfile(session.uid);
      const remotePath = role === 'provider'
        ? remoteProfile?.professionalProfile?.avatarPath
        : remoteProfile?.photoPath;

      if (!remotePath) {
        setAvatarUri(null);
        return null;
      }

      const downloadURL = await resolveStoragePathDownloadUrl(remotePath);
      setAvatarUri(downloadURL);
      return downloadURL;
    } catch (nextError) {
      setError(nextError);
      setAvatarUri(null);
      return null;
    }
  }, [canUseRemote, role, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadAvatar();
    }, [loadAvatar])
  );

  const saveAvatar = useCallback(async (uri, asset = null) => {
    if (!canUseRemote) {
      throw new Error('Avatar can be edited only by the authenticated role.');
    }

    const sourceAsset = asset || { uri };
    const uploadResult = role === 'provider'
      ? await uploadProviderAvatarAsset(session.uid, sourceAsset)
      : await uploadUserAvatarAsset(session.uid, sourceAsset);
    setAvatarUri(uploadResult.downloadURL);
    return uploadResult.downloadURL;
  }, [canUseRemote, role, session.uid]);

  return {
    avatarUri,
    error,
    loadAvatar,
    reload: loadAvatar,
    saveAvatar,
  };
}
