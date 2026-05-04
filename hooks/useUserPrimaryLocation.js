import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { clearUserPrimaryLocation, fetchUserProfile, saveUserPrimaryLocation } from '../src/firebase/profileStore';
import { getFirebaseServices } from '../src/firebase/client';
import { isValidStoredLocation } from '../utils/locationUtils';

function mapRemotePrimaryLocation(remoteProfile, fallbackUpdatedAt = null) {
  if (!remoteProfile?.primaryLocation) {
    return null;
  }

  return {
    formattedAddress: remoteProfile.primaryLocation.formattedAddress,
    latitude: Number(remoteProfile.primaryLocation.lat),
    longitude: Number(remoteProfile.primaryLocation.lng),
    countryCode: remoteProfile.primaryLocation.countryCode || '',
    countryName: remoteProfile.primaryLocation.countryName || '',
    countyCode: remoteProfile.primaryLocation.countyCode || '',
    countyName: remoteProfile.primaryLocation.countyName || '',
    cityCode: remoteProfile.primaryLocation.cityCode || '',
    cityName: remoteProfile.primaryLocation.cityName || '',
    source: remoteProfile.primaryLocation.source === 'manual' ? 'manual' : 'gps',
    updatedAt: remoteProfile.updatedAt || fallbackUpdatedAt || new Date().toISOString(),
  };
}

export function useUserPrimaryLocation() {
  const { session, refreshBootstrap } = useSession();
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === 'user'
    && session.uid
    && !session.configError,
  );

  const loadLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!canUseRemote) {
      setLocation(null);
      setIsLoading(false);
      return null;
    }

    try {
      const remoteProfile = await fetchUserProfile(session.uid);
      const remoteLocation = mapRemotePrimaryLocation(remoteProfile);
      const normalizedLocation = isValidStoredLocation(remoteLocation) ? remoteLocation : null;
      setLocation(normalizedLocation);
      setIsLoading(false);
      return normalizedLocation;
    } catch (nextError) {
      console.error('[UserPrimaryLocation][load] remote load failed', {
        uid: session.uid,
        code: nextError?.code || null,
        name: nextError?.name || null,
        message: nextError?.message || 'Unknown remote load error',
      });
      setError(nextError);
      setLocation(null);
      setIsLoading(false);
      return null;
    }
  }, [canUseRemote, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadLocation();
    }, [loadLocation])
  );

  const saveLocation = useCallback(async (nextLocation) => {
    if (!isValidStoredLocation(nextLocation)) {
      throw new Error('Invalid primary location payload.');
    }

    if (!canUseRemote) {
      throw new Error('Primary location can be saved only by the authenticated user.');
    }

    const payload = {
      ...nextLocation,
      latitude: Number(nextLocation.latitude),
      longitude: Number(nextLocation.longitude),
      updatedAt: nextLocation.updatedAt || new Date().toISOString(),
    };
    const { auth } = getFirebaseServices();
    const refreshAuthToken = async (reason) => {
      if (!auth.currentUser) {
        return;
      }

      console.log('[UserPrimaryLocation][save] refreshing auth token', {
        uid: session.uid,
        reason,
      });
      await auth.currentUser.getIdToken(true);
    };

    console.log('[UserPrimaryLocation][save] start', {
      uid: session.uid,
      source: payload.source,
      hasAddress: Boolean(payload.formattedAddress),
      latitude: Number(payload.latitude.toFixed(4)),
      longitude: Number(payload.longitude.toFixed(4)),
    });

    try {
      await refreshAuthToken('before-save');
      const remoteProfile = await saveUserPrimaryLocation(session.uid, payload);
      const remoteLocation = mapRemotePrimaryLocation(remoteProfile, payload.updatedAt) || payload;
      console.log('[UserPrimaryLocation][save] success', {
        uid: session.uid,
        source: remoteLocation.source,
        hasAddress: Boolean(remoteLocation.formattedAddress),
      });
      setLocation(remoteLocation);
      return remoteLocation;
    } catch (firstError) {
      console.error('[UserPrimaryLocation][save] first attempt failed', {
        uid: session.uid,
        code: firstError?.code || null,
        name: firstError?.name || null,
        message: firstError?.message || 'Unknown save error',
      });

      await refreshBootstrap();
      await refreshAuthToken('after-bootstrap-refresh');

      const remoteProfile = await saveUserPrimaryLocation(session.uid, payload);
      const remoteLocation = mapRemotePrimaryLocation(remoteProfile, payload.updatedAt) || payload;
      console.log('[UserPrimaryLocation][save] success-after-retry', {
        uid: session.uid,
        source: remoteLocation.source,
        hasAddress: Boolean(remoteLocation.formattedAddress),
      });
      setLocation(remoteLocation);
      return remoteLocation;
    }
  }, [canUseRemote, refreshBootstrap, session.uid]);

  const clearLocation = useCallback(async () => {
    if (!canUseRemote) {
      throw new Error('Primary location can be cleared only by the authenticated user.');
    }

    await clearUserPrimaryLocation(session.uid);
    setLocation(null);
    return null;
  }, [canUseRemote, session.uid]);

  return {
    location,
    data: location,
    isLoading,
    error,
    loadLocation,
    reload: loadLocation,
    saveLocation,
    clearLocation,
  };
}
