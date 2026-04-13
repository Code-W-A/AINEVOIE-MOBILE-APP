import { Firestore } from 'firebase-admin/firestore';
import { sanitizeString } from './shared';

type ProviderServicesDeps = {
  db: Firestore,
};

export const SERVICE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});

function normalizeServiceStatus(value: unknown) {
  if (value === SERVICE_STATUSES.DRAFT) {
    return SERVICE_STATUSES.DRAFT;
  }

  if (value === SERVICE_STATUSES.INACTIVE) {
    return SERVICE_STATUSES.INACTIVE;
  }

  if (value === SERVICE_STATUSES.ARCHIVED) {
    return SERVICE_STATUSES.ARCHIVED;
  }

  return SERVICE_STATUSES.ACTIVE;
}

function normalizeNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

export function normalizeProviderServiceData(serviceId: string, payload: unknown) {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};

  return {
    serviceId: sanitizeString(source.serviceId) || sanitizeString(serviceId),
    providerId: sanitizeString(source.providerId),
    name: sanitizeString(source.name) || 'Serviciu',
    description: sanitizeString(source.description),
    categoryKey: sanitizeString(source.categoryKey),
    categoryLabel: sanitizeString(source.categoryLabel) || 'Serviciu',
    status: normalizeServiceStatus(source.status),
    baseRateAmount: normalizeNumber(source.baseRateAmount),
    baseRateCurrency: sanitizeString(source.baseRateCurrency) || 'RON',
    estimatedDurationMinutes: normalizeNumber(source.estimatedDurationMinutes),
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  };
}

export function isPublicProviderService(service: ReturnType<typeof normalizeProviderServiceData>) {
  return service.status === SERVICE_STATUSES.ACTIVE;
}

function sortServices(services: Array<ReturnType<typeof normalizeProviderServiceData>>) {
  return [...services].sort((firstService, secondService) => {
    if (firstService.status !== secondService.status) {
      return firstService.status === SERVICE_STATUSES.ACTIVE ? -1 : 1;
    }

    return firstService.name.localeCompare(secondService.name);
  });
}

export function buildProviderServiceSummaries(services: Array<ReturnType<typeof normalizeProviderServiceData>>) {
  return sortServices(services)
    .filter(isPublicProviderService)
    .map((service) => ({
      serviceId: service.serviceId,
      name: service.name,
      categoryKey: service.categoryKey,
      categoryLabel: service.categoryLabel,
      status: service.status,
      baseRateAmount: service.baseRateAmount,
      baseRateCurrency: service.baseRateCurrency,
      estimatedDurationMinutes: service.estimatedDurationMinutes,
    }));
}

export function derivePrimaryCategory(
  services: Array<ReturnType<typeof normalizeProviderServiceData>>,
  fallbackCategory: string,
) {
  return buildProviderServiceSummaries(services)[0]?.categoryLabel || sanitizeString(fallbackCategory) || 'Serviciu';
}

export function deriveServiceKeywords(services: Array<ReturnType<typeof normalizeProviderServiceData>>) {
  return sortServices(services)
    .filter((service) => service.status !== SERVICE_STATUSES.ARCHIVED)
    .flatMap((service) => [
      service.name,
      service.description,
      service.categoryKey,
      service.categoryLabel,
    ]);
}

export async function fetchProviderServices(
  { db }: ProviderServicesDeps,
  providerId: string,
) {
  const servicesSnap = await db.collection('providers').doc(providerId).collection('services').get();

  return sortServices(
    servicesSnap.docs.map((docSnap) => normalizeProviderServiceData(docSnap.id, docSnap.data())),
  );
}
