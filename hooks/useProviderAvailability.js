import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../context/localeContext';
import { useSession } from '../context/sessionContext';
import {
  clearProviderAvailabilityProfile,
  fetchProviderAvailabilityProfile,
  saveProviderAvailabilityProfile,
} from '../src/firebase/providerAvailability';
import {
  createDefaultWeekSchedule,
  formatAvailabilitySummary,
  getAvailabilityDayChips,
  getBlockedDateKeys,
  getProviderWeekDays,
  hasConfiguredAvailability,
  normalizeProviderAvailability,
} from '../src/features/shared/utils/providerAvailability';

const PROVIDER_AVAILABILITY_STORAGE_KEY = '@ainevoie/provider-availability';
const LEGACY_PROVIDER_AVAILABILITY_STORAGE_KEY = '@urbanhome/provider-availability';

const defaultProviderAvailability = {
  weekSchedule: createDefaultWeekSchedule('ro'),
  blockedDates: [],
  updatedAt: null,
};

async function readStoredProviderAvailability() {
  try {
    const storedValue = await AsyncStorage.getItem(PROVIDER_AVAILABILITY_STORAGE_KEY);

    if (storedValue) {
      return normalizeProviderAvailability(JSON.parse(storedValue));
    }

    const legacyValue = await AsyncStorage.getItem(LEGACY_PROVIDER_AVAILABILITY_STORAGE_KEY);

    if (!legacyValue) {
      return defaultProviderAvailability;
    }

    await AsyncStorage.setItem(PROVIDER_AVAILABILITY_STORAGE_KEY, legacyValue);
    await AsyncStorage.removeItem(LEGACY_PROVIDER_AVAILABILITY_STORAGE_KEY);
    return normalizeProviderAvailability(JSON.parse(legacyValue));
  } catch {
    return defaultProviderAvailability;
  }
}

async function persistLocalAvailability(payload) {
  await AsyncStorage.setItem(PROVIDER_AVAILABILITY_STORAGE_KEY, JSON.stringify(payload));
  await AsyncStorage.removeItem(LEGACY_PROVIDER_AVAILABILITY_STORAGE_KEY);
}

export { formatAvailabilitySummary, getProviderWeekDays };

export function useProviderAvailability(providerId = null) {
  const { locale } = useLocale();
  const { session } = useSession();
  const resolvedProviderId = providerId || (session.isAuthenticated && session.activeRole === 'provider' ? session.uid : null);
  const canUseRemote = Boolean(resolvedProviderId && !session.configError);
  const canEdit = Boolean(
    resolvedProviderId
    && session.isAuthenticated
    && session.activeRole === 'provider'
    && session.uid === resolvedProviderId
    && !session.configError,
  );
  const [data, setData] = useState(defaultProviderAvailability);
  const [isLoading, setIsLoading] = useState(true);

  const loadProviderAvailability = useCallback(async () => {
    setIsLoading(true);

    if (canUseRemote && resolvedProviderId) {
      try {
        let remoteValue = await fetchProviderAvailabilityProfile(resolvedProviderId, locale);
        const remoteHasContent = hasConfiguredAvailability(remoteValue.weekSchedule) || remoteValue.blockedDates.length > 0;

        if (!remoteHasContent && canEdit) {
          const localValue = await readStoredProviderAvailability();
          const localHasContent = hasConfiguredAvailability(localValue.weekSchedule) || localValue.blockedDates.length > 0;

          if (localHasContent) {
            remoteValue = await saveProviderAvailabilityProfile(resolvedProviderId, localValue, locale);
          }
        }

        const normalizedRemoteValue = normalizeProviderAvailability(remoteValue, locale);
        setData(normalizedRemoteValue);

        if (canEdit) {
          await persistLocalAvailability(normalizedRemoteValue);
        }

        setIsLoading(false);
        return;
      } catch {
      }
    }

    const storedValue = await readStoredProviderAvailability();
    setData(normalizeProviderAvailability(storedValue, locale));
    setIsLoading(false);
  }, [canEdit, canUseRemote, locale, resolvedProviderId]);

  useFocusEffect(
    useCallback(() => {
      void loadProviderAvailability();
    }, [loadProviderAvailability]),
  );

  const saveProviderAvailability = useCallback(async (updater) => {
    const currentValue = canUseRemote && resolvedProviderId
      ? await fetchProviderAvailabilityProfile(resolvedProviderId, locale).catch(() => readStoredProviderAvailability())
      : await readStoredProviderAvailability();
    const baseValue = normalizeProviderAvailability(currentValue, locale);
    const nextValue = typeof updater === 'function'
      ? updater(baseValue)
      : normalizeProviderAvailability(updater, locale);
    const normalized = normalizeProviderAvailability({
      ...nextValue,
      updatedAt: new Date().toISOString(),
    }, locale);

    if (canEdit && resolvedProviderId) {
      const remoteValue = await saveProviderAvailabilityProfile(resolvedProviderId, normalized, locale);
      const normalizedRemoteValue = normalizeProviderAvailability(remoteValue, locale);
      await persistLocalAvailability(normalizedRemoteValue);
      setData(normalizedRemoteValue);
      return normalizedRemoteValue;
    }

    await persistLocalAvailability(normalized);
    setData(normalized);
    return normalized;
  }, [canEdit, canUseRemote, locale, resolvedProviderId]);

  const clearProviderAvailability = useCallback(async () => {
    if (canEdit && resolvedProviderId) {
      const cleared = await clearProviderAvailabilityProfile(resolvedProviderId, locale);
      const normalizedCleared = normalizeProviderAvailability(cleared, locale);
      await persistLocalAvailability(normalizedCleared);
      setData(normalizedCleared);
      return;
    }

    await AsyncStorage.removeItem(PROVIDER_AVAILABILITY_STORAGE_KEY);
    await AsyncStorage.removeItem(LEGACY_PROVIDER_AVAILABILITY_STORAGE_KEY);
    setData(defaultProviderAvailability);
  }, [canEdit, locale, resolvedProviderId]);

  const localizedData = useMemo(
    () => normalizeProviderAvailability(data, locale),
    [data, locale],
  );

  const hasConfiguredRemoteAvailability = useMemo(
    () => hasConfiguredAvailability(localizedData.weekSchedule),
    [localizedData.weekSchedule],
  );

  const availabilitySummary = useMemo(
    () => formatAvailabilitySummary(localizedData.weekSchedule),
    [localizedData.weekSchedule],
  );

  const availabilityDayChips = useMemo(
    () => getAvailabilityDayChips(localizedData.weekSchedule),
    [localizedData.weekSchedule],
  );

  const blockedDateKeys = useMemo(
    () => getBlockedDateKeys(localizedData.blockedDates),
    [localizedData.blockedDates],
  );

  return {
    data: localizedData,
    isLoading,
    canEditAvailability: canEdit,
    hasConfiguredAvailability: hasConfiguredRemoteAvailability,
    availabilitySummary,
    availabilityDayChips,
    blockedDateKeys,
    loadProviderAvailability,
    saveProviderAvailability,
    clearProviderAvailability,
  };
}
