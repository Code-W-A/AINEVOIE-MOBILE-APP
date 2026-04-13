import {
  DEFAULT_MOCK_CURRENCY,
  durationToMinutes,
  formatDurationDisplay,
  normalizeDurationValue,
  normalizeRateValue,
} from './mockFormatting';

export const PROVIDER_SERVICE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
});

const SERVICE_CATEGORY_DEFINITIONS = [
  {
    key: 'cleaning',
    labels: { ro: 'Curățenie', en: 'Cleaning' },
    image: require('../../../../assets/images/service-image/full-home-cleaning.jpg'),
    aliases: ['curatenie', 'curățenie', 'cleaning'],
  },
  {
    key: 'plumbing',
    labels: { ro: 'Instalații', en: 'Plumbing' },
    image: require('../../../../assets/images/service-image/car-cleaning.jpg'),
    aliases: ['instalatii', 'instalații', 'instalator', 'instalatii sanitare', 'plumbing'],
  },
  {
    key: 'electrical',
    labels: { ro: 'Electrician', en: 'Electrical' },
    image: require('../../../../assets/images/service-image/bathroom-cleaning.jpg'),
    aliases: ['electrician', 'electrice', 'electrical'],
  },
  {
    key: 'painting',
    labels: { ro: 'Zugrav', en: 'Painting' },
    image: require('../../../../assets/images/service-image/kitchen-cleaning.jpg'),
    aliases: ['zugrav', 'vopsitor', 'painting'],
  },
  {
    key: 'yoga',
    labels: { ro: 'Yoga', en: 'Yoga' },
    image: require('../../../../assets/images/service-image/carpet-cleaning.jpg'),
    aliases: ['yoga'],
  },
  {
    key: 'beauty',
    labels: { ro: 'Cosmetică', en: 'Beauty' },
    image: require('../../../../assets/images/service-image/sofa-cleaning.jpg'),
    aliases: ['cosmetica', 'cosmetică', 'beauty', 'salon'],
  },
];

function normalizeLocale(locale = 'ro') {
  return locale === 'en' ? 'en' : 'ro';
}

function sanitizeText(value) {
  return String(value || '').trim();
}

function normalizeToken(value) {
  return sanitizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function minutesToDuration(minutes) {
  const numericMinutes = Number(minutes);

  if (!Number.isFinite(numericMinutes) || numericMinutes <= 0) {
    return '';
  }

  const hours = Math.floor(numericMinutes / 60);
  const remainingMinutes = numericMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

function normalizeServiceStatus(status, isActive) {
  if (status === PROVIDER_SERVICE_STATUSES.DRAFT) {
    return PROVIDER_SERVICE_STATUSES.DRAFT;
  }

  if (status === PROVIDER_SERVICE_STATUSES.INACTIVE) {
    return PROVIDER_SERVICE_STATUSES.INACTIVE;
  }

  if (status === PROVIDER_SERVICE_STATUSES.ARCHIVED) {
    return PROVIDER_SERVICE_STATUSES.ARCHIVED;
  }

  if (typeof isActive === 'boolean') {
    return isActive ? PROVIDER_SERVICE_STATUSES.ACTIVE : PROVIDER_SERVICE_STATUSES.INACTIVE;
  }

  return PROVIDER_SERVICE_STATUSES.ACTIVE;
}

export function getServiceCategoryCatalog(locale = 'ro') {
  const normalizedLocale = normalizeLocale(locale);

  return SERVICE_CATEGORY_DEFINITIONS.map((category) => ({
    key: category.key,
    label: category.labels[normalizedLocale],
    image: category.image,
  }));
}

export function getServiceCategoryByKey(categoryKey, locale = 'ro') {
  const normalizedLocale = normalizeLocale(locale);
  const matchedCategory = SERVICE_CATEGORY_DEFINITIONS.find((category) => category.key === sanitizeText(categoryKey));

  if (!matchedCategory) {
    return null;
  }

  return {
    key: matchedCategory.key,
    label: matchedCategory.labels[normalizedLocale],
    image: matchedCategory.image,
  };
}

export function getServiceCategoryLabel(categoryKey, locale = 'ro', fallback = 'Serviciu') {
  return getServiceCategoryByKey(categoryKey, locale)?.label || sanitizeText(fallback) || 'Serviciu';
}

export function resolveServiceCategory(value, locale = 'ro') {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedValue = normalizeToken(value);

  if (!normalizedValue) {
    return {
      key: SERVICE_CATEGORY_DEFINITIONS[0].key,
      label: SERVICE_CATEGORY_DEFINITIONS[0].labels[normalizedLocale],
      image: SERVICE_CATEGORY_DEFINITIONS[0].image,
    };
  }

  const matchedCategory = SERVICE_CATEGORY_DEFINITIONS.find((category) => (
    normalizeToken(category.key) === normalizedValue
    || normalizeToken(category.labels.ro) === normalizedValue
    || normalizeToken(category.labels.en) === normalizedValue
    || category.aliases.some((alias) => normalizedValue.includes(normalizeToken(alias)))
  )) || SERVICE_CATEGORY_DEFINITIONS[0];

  return {
    key: matchedCategory.key,
    label: matchedCategory.labels[normalizedLocale],
    image: matchedCategory.image,
  };
}

export function normalizeProviderServiceRecord(service, locale = 'ro') {
  const category = resolveServiceCategory(
    service?.categoryKey
      || service?.categoryLabel
      || service?.category
      || service?.specialization,
    locale,
  );
  const status = normalizeServiceStatus(service?.status, service?.isActive);
  const normalizedRate = normalizeRateValue(service?.baseRateAmount ?? service?.baseRate ?? '');
  const durationMinutes = Number.isFinite(Number(service?.estimatedDurationMinutes))
    ? Number(service.estimatedDurationMinutes)
    : durationToMinutes(service?.duration || '') || 0;
  const duration = durationMinutes ? minutesToDuration(durationMinutes) : normalizeDurationValue(service?.duration || '');
  const serviceId = sanitizeText(service?.serviceId || service?.id);

  return {
    serviceId,
    id: serviceId,
    providerId: sanitizeText(service?.providerId),
    name: sanitizeText(service?.name),
    description: sanitizeText(service?.description),
    categoryKey: category.key,
    categoryLabel: getServiceCategoryLabel(category.key, locale, service?.categoryLabel || service?.category),
    status,
    isActive: status === PROVIDER_SERVICE_STATUSES.ACTIVE,
    baseRateAmount: Number(normalizedRate || 0),
    baseRateCurrency: sanitizeText(service?.baseRateCurrency) || DEFAULT_MOCK_CURRENCY,
    estimatedDurationMinutes: durationMinutes || 0,
    baseRate: normalizedRate,
    duration: formatDurationDisplay(duration, ''),
    createdAt: service?.createdAt || null,
    updatedAt: service?.updatedAt || null,
    createdBy: sanitizeText(service?.createdBy),
    updatedBy: sanitizeText(service?.updatedBy),
    schemaVersion: Number(service?.schemaVersion) || 1,
  };
}

export function buildProviderServiceWritePayload(service, locale = 'ro') {
  const normalized = normalizeProviderServiceRecord(service, locale);

  return {
    serviceId: normalized.serviceId,
    providerId: normalized.providerId,
    name: normalized.name,
    description: normalized.description,
    categoryKey: normalized.categoryKey,
    categoryLabel: normalized.categoryLabel,
    status: normalized.status,
    baseRateAmount: normalized.baseRateAmount,
    baseRateCurrency: normalized.baseRateCurrency || DEFAULT_MOCK_CURRENCY,
    estimatedDurationMinutes: normalized.estimatedDurationMinutes,
    schemaVersion: normalized.schemaVersion || 1,
  };
}

export function getActiveProviderServices(services = []) {
  return services.filter((service) => service.status === PROVIDER_SERVICE_STATUSES.ACTIVE);
}
