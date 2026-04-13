import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { fetchUserProfile, saveUserPrimaryLocation } from '../src/firebase/profileStore';
import { getFirebaseServices } from '../src/firebase/client';
import { isValidStoredLocation } from '../utils/locationUtils';

const USER_PRIMARY_LOCATION_STORAGE_KEY = '@ainevoie/user-primary-location';
const LEGACY_USER_PRIMARY_LOCATION_STORAGE_KEY = '@urbanhome/user-primary-location';

async function readStoredLocation() {
  try {
    const storedLocation = await AsyncStorage.getItem(USER_PRIMARY_LOCATION_STORAGE_KEY);

    if (storedLocation) {
      return JSON.parse(storedLocation);
    }

    const legacyLocation = await AsyncStorage.getItem(LEGACY_USER_PRIMARY_LOCATION_STORAGE_KEY);

    if (!legacyLocation) {
      return null;
    }

    await AsyncStorage.setItem(USER_PRIMARY_LOCATION_STORAGE_KEY, legacyLocation);
    await AsyncStorage.removeItem(LEGACY_USER_PRIMARY_LOCATION_STORAGE_KEY);
    return JSON.parse(legacyLocation);
  } catch {
    return null;
  }
}

export function useUserPrimaryLocation() {
  const { session, refreshBootstrap } = useSession();
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocation = useCallback(async () => {
    setIsLoading(true);

    if (session.isAuthenticated && session.activeRole === 'user' && session.uid && !session.configError) {
      try {
        const remoteProfile = await fetchUserProfile(session.uid);
        const remoteLocation = remoteProfile?.primaryLocation
          ? {
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
              updatedAt: remoteProfile.updatedAt || new Date().toISOString(),
            }
          : null;

        setLocation(isValidStoredLocation(remoteLocation) ? remoteLocation : null);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('[UserPrimaryLocation][load] remote load failed', {
          uid: session.uid,
          code: error?.code || null,
          name: error?.name || null,
          message: error?.message || 'Unknown remote load error',
        });
      }
    }

    const storedLocation = await readStoredLocation();
    setLocation(isValidStoredLocation(storedLocation) ? storedLocation : null);
    setIsLoading(false);
  }, [session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadLocation();
    }, [loadLocation])
  );

  const saveLocation = useCallback(async (nextLocation) => {
    if (!isValidStoredLocation(nextLocation)) {
      throw new Error('Invalid primary location payload.');
    }

    const payload = {
      ...nextLocation,
      latitude: Number(nextLocation.latitude),
      longitude: Number(nextLocation.longitude),
      updatedAt: nextLocation.updatedAt || new Date().toISOString(),
    };

    if (session.isAuthenticated && session.activeRole === 'user' && session.uid && !session.configError) {
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
        const remoteLocation = remoteProfile?.primaryLocation
          ? {
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
              updatedAt: remoteProfile.updatedAt || payload.updatedAt,
            }
          : payload;
        console.log('[UserPrimaryLocation][save] success', {
          uid: session.uid,
          source: remoteLocation.source,
          hasAddress: Boolean(remoteLocation.formattedAddress),
        });
        setLocation(remoteLocation);
        return remoteLocation;
      } catch (error) {
        console.error('[UserPrimaryLocation][save] first attempt failed', {
          uid: session.uid,
          code: error?.code || null,
          name: error?.name || null,
          message: error?.message || 'Unknown save error',
        });

        await refreshBootstrap();
        await refreshAuthToken('after-bootstrap-refresh');

        const remoteProfile = await saveUserPrimaryLocation(session.uid, payload);
        const remoteLocation = remoteProfile?.primaryLocation
          ? {
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
              updatedAt: remoteProfile.updatedAt || payload.updatedAt,
            }
          : payload;
        console.log('[UserPrimaryLocation][save] success-after-retry', {
          uid: session.uid,
          source: remoteLocation.source,
          hasAddress: Boolean(remoteLocation.formattedAddress),
        });
        setLocation(remoteLocation);
        return remoteLocation;
      }
    }

    await AsyncStorage.setItem(USER_PRIMARY_LOCATION_STORAGE_KEY, JSON.stringify(payload));
    await AsyncStorage.removeItem(LEGACY_USER_PRIMARY_LOCATION_STORAGE_KEY);
    setLocation(payload);
    return payload;
  }, [refreshBootstrap, session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  const clearLocation = useCallback(async () => {
    await AsyncStorage.removeItem(USER_PRIMARY_LOCATION_STORAGE_KEY);
    await AsyncStorage.removeItem(LEGACY_USER_PRIMARY_LOCATION_STORAGE_KEY);
    setLocation(null);
  }, []);

  return {
    location,
    isLoading,
    loadLocation,
    saveLocation,
    clearLocation,
  };
}
