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
  formatAvailabilitySummary,
  getAvailabilityDayChips,
  getBlockedDateKeys,
  getProviderWeekDays,
  hasConfiguredAvailability,
  normalizeProviderAvailability,
} from '../src/features/shared/utils/providerAvailability';

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
  const [data, setData] = useState(() => normalizeProviderAvailability(null, locale));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProviderAvailability = useCallback(async () => {
    if (!canUseRemote || !resolvedProviderId) {
      setIsLoading(false);
      return normalizeProviderAvailability(null, locale);
    }

    setIsLoading(true);
    setError(null);

    try {
      const remoteValue = await fetchProviderAvailabilityProfile(resolvedProviderId, locale);
      const normalizedRemoteValue = normalizeProviderAvailability(remoteValue, locale);
      setData(normalizedRemoteValue);
      setIsLoading(false);
      return normalizedRemoteValue;
    } catch (nextError) {
      const emptyValue = normalizeProviderAvailability(null, locale);
      setError(nextError);
      setData(emptyValue);
      setIsLoading(false);
      return emptyValue;
    }
  }, [canUseRemote, locale, resolvedProviderId]);

  useFocusEffect(
    useCallback(() => {
      void loadProviderAvailability();
    }, [loadProviderAvailability]),
  );

  const assertCanEdit = useCallback(() => {
    if (!canEdit || !resolvedProviderId) {
      throw new Error('Availability can be edited only by the authenticated provider.');
    }
  }, [canEdit, resolvedProviderId]);

  const saveProviderAvailability = useCallback(async (updater) => {
    assertCanEdit();
    const baseValue = normalizeProviderAvailability(data, locale);
    const nextValue = typeof updater === 'function'
      ? updater(baseValue)
      : normalizeProviderAvailability(updater, locale);
    const normalized = normalizeProviderAvailability({
      ...nextValue,
      updatedAt: new Date().toISOString(),
    }, locale);
    const remoteValue = await saveProviderAvailabilityProfile(resolvedProviderId, normalized, locale);
    const normalizedRemoteValue = normalizeProviderAvailability(remoteValue, locale);
    setData(normalizedRemoteValue);
    return normalizedRemoteValue;
  }, [assertCanEdit, data, locale, resolvedProviderId]);

  const clearProviderAvailability = useCallback(async () => {
    assertCanEdit();
    const cleared = await clearProviderAvailabilityProfile(resolvedProviderId, locale);
    const normalizedCleared = normalizeProviderAvailability(cleared, locale);
    setData(normalizedCleared);
    return normalizedCleared;
  }, [assertCanEdit, locale, resolvedProviderId]);

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
    error,
    canEditAvailability: canEdit,
    hasConfiguredAvailability: hasConfiguredRemoteAvailability,
    availabilitySummary,
    availabilityDayChips,
    blockedDateKeys,
    loadProviderAvailability,
    reload: loadProviderAvailability,
    saveProviderAvailability,
    clearProviderAvailability,
  };
}
