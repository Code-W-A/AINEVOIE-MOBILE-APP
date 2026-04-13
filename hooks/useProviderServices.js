import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../context/localeContext';
import { useSession } from '../context/sessionContext';
import {
  archiveProviderService,
  fetchOwnerProviderServices,
  migrateProviderServices,
  saveProviderService,
  setProviderServiceStatus,
} from '../src/firebase/providerServices';
import { fetchProviderDirectoryProfile } from '../src/firebase/providerDirectoryStore';
import {
  getActiveProviderServices,
  normalizeProviderServiceRecord,
  PROVIDER_SERVICE_STATUSES,
} from '../src/features/shared/utils/providerServices';

const PROVIDER_SERVICES_STORAGE_KEY = '@ainevoie/provider-services';
const LEGACY_PROVIDER_SERVICES_STORAGE_KEY = '@urbanhome/provider-services';

function getTimestampValue(value) {
  if (!value) {
    return 0;
  }

  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsedValue = new Date(value).getTime();
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function sortServices(services = []) {
  return [...services].sort((firstItem, secondItem) => {
    const updatedDelta = getTimestampValue(secondItem.updatedAt) - getTimestampValue(firstItem.updatedAt);

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return String(firstItem.name || '').localeCompare(String(secondItem.name || ''));
  });
}

function sanitizeOwnerServices(services = []) {
  return sortServices(
    services.filter((service) => service.status !== PROVIDER_SERVICE_STATUSES.ARCHIVED),
  );
}

async function readStoredServices(locale = 'ro') {
  try {
    const storedValue = await AsyncStorage.getItem(PROVIDER_SERVICES_STORAGE_KEY);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);
      return Array.isArray(parsedValue)
        ? sanitizeOwnerServices(parsedValue.map((service) => normalizeProviderServiceRecord(service, locale)))
        : [];
    }

    const legacyValue = await AsyncStorage.getItem(LEGACY_PROVIDER_SERVICES_STORAGE_KEY);

    if (!legacyValue) {
      return [];
    }

    await AsyncStorage.setItem(PROVIDER_SERVICES_STORAGE_KEY, legacyValue);
    await AsyncStorage.removeItem(LEGACY_PROVIDER_SERVICES_STORAGE_KEY);
    const parsedLegacyValue = JSON.parse(legacyValue);

    return Array.isArray(parsedLegacyValue)
      ? sanitizeOwnerServices(parsedLegacyValue.map((service) => normalizeProviderServiceRecord(service, locale)))
      : [];
  } catch {
    return [];
  }
}

async function persistServices(services = []) {
  await AsyncStorage.setItem(PROVIDER_SERVICES_STORAGE_KEY, JSON.stringify(services));
  await AsyncStorage.removeItem(LEGACY_PROVIDER_SERVICES_STORAGE_KEY);
}

export function useProviderServices(providerId = null) {
  const { locale } = useLocale();
  const { session } = useSession();
  const ownerProviderId = session.isAuthenticated && session.activeRole === 'provider' ? session.uid : null;
  const resolvedProviderId = providerId || ownerProviderId;
  const isOwnerMode = Boolean(
    resolvedProviderId
    && ownerProviderId
    && resolvedProviderId === ownerProviderId,
  );
  const canUseRemoteOwner = Boolean(isOwnerMode && !session.configError);
  const isPublicMode = Boolean(resolvedProviderId && !isOwnerMode);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadServices = useCallback(async () => {
    setIsLoading(true);

    if (canUseRemoteOwner && resolvedProviderId) {
      try {
        let remoteServices = sanitizeOwnerServices(await fetchOwnerProviderServices(resolvedProviderId, locale));

        if (!remoteServices.length) {
          const storedServices = await readStoredServices(locale);

          if (storedServices.length) {
            remoteServices = sanitizeOwnerServices(
              await migrateProviderServices(
                resolvedProviderId,
                storedServices,
                locale,
              ),
            );
          }
        }

        setServices(remoteServices);
        await persistServices(remoteServices);
        setIsLoading(false);
        return remoteServices;
      } catch {
      }
    }

    if (isPublicMode && resolvedProviderId) {
      try {
        const providerProfile = await fetchProviderDirectoryProfile(resolvedProviderId);
        const publicServices = sortServices(
          (providerProfile?.serviceSummaries || []).map((service) => normalizeProviderServiceRecord(service, locale)),
        );
        setServices(publicServices);
        setIsLoading(false);
        return publicServices;
      } catch {
        setServices([]);
        setIsLoading(false);
        return [];
      }
    }

    const storedServices = await readStoredServices(locale);
    setServices(storedServices);
    setIsLoading(false);
    return storedServices;
  }, [canUseRemoteOwner, isPublicMode, locale, resolvedProviderId]);

  useFocusEffect(
    useCallback(() => {
      void loadServices();
    }, [loadServices]),
  );

  const saveServiceRecord = useCallback(async (servicePayload) => {
    if (canUseRemoteOwner && resolvedProviderId) {
      const savedService = await saveProviderService(resolvedProviderId, servicePayload, locale);

      setServices((currentServices) => {
        const filteredServices = currentServices.filter((service) => service.serviceId !== savedService.serviceId);
        const nextServices = sanitizeOwnerServices([savedService, ...filteredServices]);
        void persistServices(nextServices);
        return nextServices;
      });

      return savedService;
    }

    const storedServices = await readStoredServices(locale);
    const localServiceId = String(servicePayload?.serviceId || servicePayload?.id || `svc_${Date.now()}`);
    const normalizedService = normalizeProviderServiceRecord({
      ...servicePayload,
      serviceId: localServiceId,
      id: localServiceId,
    }, locale);
    const nextServices = sanitizeOwnerServices([
      normalizedService,
      ...storedServices.filter((service) => service.serviceId !== normalizedService.serviceId),
    ]);
    await persistServices(nextServices);
    setServices(nextServices);
    return normalizedService;
  }, [canUseRemoteOwner, locale, resolvedProviderId]);

  const archiveService = useCallback(async (serviceId) => {
    if (!serviceId) {
      throw new Error('Missing serviceId.');
    }

    if (canUseRemoteOwner && resolvedProviderId) {
      await archiveProviderService(resolvedProviderId, serviceId, locale);
      setServices((currentServices) => {
        const nextServices = currentServices.filter((service) => service.serviceId !== serviceId);
        void persistServices(nextServices);
        return nextServices;
      });
      return null;
    }

    const storedServices = await readStoredServices(locale);
    const nextServices = storedServices.filter((service) => service.serviceId !== serviceId);
    await persistServices(nextServices);
    setServices(nextServices);
    return null;
  }, [canUseRemoteOwner, locale, resolvedProviderId]);

  const toggleServiceActive = useCallback(async (serviceId) => {
    if (!serviceId) {
      throw new Error('Missing serviceId.');
    }

    const existingService = services.find((service) => service.serviceId === serviceId || service.id === serviceId);

    if (!existingService) {
      return null;
    }

    const nextStatus = existingService.status === PROVIDER_SERVICE_STATUSES.ACTIVE
      ? PROVIDER_SERVICE_STATUSES.INACTIVE
      : PROVIDER_SERVICE_STATUSES.ACTIVE;

    if (canUseRemoteOwner && resolvedProviderId) {
      const updatedService = await setProviderServiceStatus(resolvedProviderId, serviceId, nextStatus, locale);

      setServices((currentServices) => {
        const nextServices = sanitizeOwnerServices(
          currentServices.map((service) => (
            service.serviceId === serviceId ? updatedService : service
          )),
        );
        void persistServices(nextServices);
        return nextServices;
      });

      return updatedService;
    }

    const nextServices = sanitizeOwnerServices(
      services.map((service) => (
        service.serviceId === serviceId
          ? normalizeProviderServiceRecord({ ...service, status: nextStatus }, locale)
          : service
      )),
    );
    await persistServices(nextServices);
    setServices(nextServices);
    return nextServices.find((service) => service.serviceId === serviceId) || null;
  }, [canUseRemoteOwner, locale, resolvedProviderId, services]);

  const getServiceById = useCallback((serviceId) => {
    if (!serviceId) {
      return null;
    }

    return services.find((service) => service.serviceId === serviceId || service.id === serviceId) || null;
  }, [services]);

  const activeServices = useMemo(
    () => getActiveProviderServices(services),
    [services],
  );

  return {
    services,
    activeServices,
    isLoading,
    loadServices,
    saveService: saveServiceRecord,
    archiveService,
    deleteService: archiveService,
    toggleServiceActive,
    getServiceById,
    isOwnerMode,
  };
}
