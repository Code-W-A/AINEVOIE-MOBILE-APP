import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useLocale } from '../context/localeContext';
import { useSession } from '../context/sessionContext';
import {
  archiveProviderService,
  fetchOwnerProviderServices,
  saveProviderService,
  setProviderServiceStatus,
} from '../src/firebase/providerServices';
import { fetchProviderDirectoryProfile } from '../src/firebase/providerDirectoryStore';
import {
  getActiveProviderServices,
  normalizeProviderServiceRecord,
  PROVIDER_SERVICE_STATUSES,
} from '../src/features/shared/utils/providerServices';

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
  const [error, setError] = useState(null);

  const loadServices = useCallback(async () => {
    if (!resolvedProviderId) {
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);

    if (canUseRemoteOwner) {
      try {
        const remoteServices = sanitizeOwnerServices(await fetchOwnerProviderServices(resolvedProviderId, locale));
        setServices(remoteServices);
        setIsLoading(false);
        return remoteServices;
      } catch (nextError) {
        setError(nextError);
        setServices([]);
        setIsLoading(false);
        return [];
      }
    }

    if (isPublicMode) {
      try {
        const providerProfile = await fetchProviderDirectoryProfile(resolvedProviderId);
        const publicServices = sortServices(
          (providerProfile?.serviceSummaries || []).map((service) => normalizeProviderServiceRecord({
            ...service,
            providerId: resolvedProviderId,
          }, locale)),
        );
        setServices(publicServices);
        setIsLoading(false);
        return publicServices;
      } catch (nextError) {
        setError(nextError);
        setServices([]);
        setIsLoading(false);
        return [];
      }
    }

    setServices([]);
    setIsLoading(false);
    return [];
  }, [canUseRemoteOwner, isPublicMode, locale, resolvedProviderId]);

  useFocusEffect(
    useCallback(() => {
      void loadServices();
    }, [loadServices]),
  );

  const assertCanEdit = useCallback(() => {
    if (!canUseRemoteOwner || !resolvedProviderId) {
      throw new Error('Provider services can be edited only by the authenticated provider.');
    }
  }, [canUseRemoteOwner, resolvedProviderId]);

  const saveServiceRecord = useCallback(async (servicePayload) => {
    assertCanEdit();
    const savedService = await saveProviderService(resolvedProviderId, servicePayload, locale);

    setServices((currentServices) => {
      const filteredServices = currentServices.filter((service) => service.serviceId !== savedService.serviceId);
      return sanitizeOwnerServices([savedService, ...filteredServices]);
    });

    return savedService;
  }, [assertCanEdit, locale, resolvedProviderId]);

  const archiveService = useCallback(async (serviceId) => {
    if (!serviceId) {
      throw new Error('Missing serviceId.');
    }

    assertCanEdit();
    await archiveProviderService(resolvedProviderId, serviceId, locale);
    setServices((currentServices) => currentServices.filter((service) => service.serviceId !== serviceId));
    return null;
  }, [assertCanEdit, locale, resolvedProviderId]);

  const toggleServiceActive = useCallback(async (serviceId) => {
    if (!serviceId) {
      throw new Error('Missing serviceId.');
    }

    assertCanEdit();
    const existingService = services.find((service) => service.serviceId === serviceId || service.id === serviceId);

    if (!existingService) {
      return null;
    }

    const nextStatus = existingService.status === PROVIDER_SERVICE_STATUSES.ACTIVE
      ? PROVIDER_SERVICE_STATUSES.INACTIVE
      : PROVIDER_SERVICE_STATUSES.ACTIVE;
    const updatedService = await setProviderServiceStatus(resolvedProviderId, serviceId, nextStatus, locale);

    setServices((currentServices) => sanitizeOwnerServices(
      currentServices.map((service) => (
        service.serviceId === serviceId ? updatedService : service
      )),
    ));

    return updatedService;
  }, [assertCanEdit, locale, resolvedProviderId, services]);

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
    data: services,
    list: services,
    activeServices,
    isLoading,
    error,
    loadServices,
    reload: loadServices,
    saveService: saveServiceRecord,
    archiveService,
    deleteService: archiveService,
    toggleServiceActive,
    getServiceById,
    isOwnerMode,
  };
}
