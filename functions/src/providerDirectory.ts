import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { PROVIDER_STATUSES, sanitizeString } from './shared';
import { writeStructuredLog } from './logging';
import { buildCoverageAreaText, deriveCoverageTags, normalizeCoverageArea } from './providerCoverage';
import {
  fetchProviderAvailabilityProfile,
  formatAvailabilitySummary,
  getAvailabilityDayChips,
  hasConfiguredAvailability,
} from './providerAvailability';
import {
  buildProviderServiceSummaries,
  derivePrimaryCategory,
  deriveServiceKeywords,
  fetchProviderServices,
  normalizeProviderServiceData,
} from './providerServices';
import { fetchProviderReviewAggregate } from './reviews';

type ProviderDirectoryDeps = {
  db: Firestore,
};

function normalizeKeywordToken(value: string) {
  return sanitizeString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toKeywordList(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => normalizeKeywordToken(String(value || '')).split(/\s+/))
        .filter(Boolean),
    ),
  ).slice(0, 40);
}

export function buildProviderDirectoryDoc(
  providerId: string,
  providerData: Record<string, any>,
  availabilityData: Record<string, any> | null = null,
  servicesData: Record<string, any>[] = [],
  reviewAggregate: { ratingAverage: number, reviewCount: number } | null = null,
) {
  const professionalProfile = providerData.professionalProfile || {};
  const displayName = sanitizeString(professionalProfile.businessName)
    || sanitizeString(professionalProfile.displayName)
    || 'Provider AI Nevoie';
  const normalizedServicesData = servicesData.map((service, index) => normalizeProviderServiceData(
    sanitizeString(service?.serviceId) || `service_${index}`,
    service,
  ));
  const serviceSummaries = buildProviderServiceSummaries(normalizedServicesData);
  const categoryPrimary = derivePrimaryCategory(normalizedServicesData, professionalProfile.specialization);
  const coverageArea = normalizeCoverageArea(professionalProfile.coverageArea);
  const coverageAreaText = buildCoverageAreaText(coverageArea)
    || sanitizeString(professionalProfile.coverageAreaText)
    || 'Acoperire nespecificată';
  const normalizedAvailability = availabilityData || null;
  const derivedAvailabilitySummary = normalizedAvailability && hasConfiguredAvailability(normalizedAvailability.weekSchedule)
    ? formatAvailabilitySummary(normalizedAvailability.weekSchedule)
    : '';
  const providerHasConfiguredAvailability = Boolean(
    normalizedAvailability && hasConfiguredAvailability(normalizedAvailability.weekSchedule),
  );
  const availabilitySummary = derivedAvailabilitySummary
    || sanitizeString(professionalProfile.availabilitySummary)
    || 'Disponibilitatea va fi publicată curând';
  const baseRateAmount = Number(professionalProfile.baseRateAmount);
  const validBaseRateAmount = Number.isFinite(baseRateAmount) && baseRateAmount > 0 ? baseRateAmount : 0;
  const ratingAverage = Number(reviewAggregate?.ratingAverage) || 0;
  const reviewCount = Number(reviewAggregate?.reviewCount) || 0;

  return {
    providerId,
    status: PROVIDER_STATUSES.APPROVED,
    displayName,
    categoryPrimary,
    countryCode: coverageArea.countryCode,
    countryName: coverageArea.countryName,
    countyCode: coverageArea.countyCode,
    countyName: coverageArea.countyName,
    cityCode: coverageArea.cityCode,
    cityName: coverageArea.cityName,
    coverageAreaText,
    coverageTags: deriveCoverageTags(coverageArea, coverageAreaText),
    hasConfiguredAvailability: providerHasConfiguredAvailability,
    availabilitySummary,
    availabilityDayChips: normalizedAvailability && hasConfiguredAvailability(normalizedAvailability.weekSchedule)
      ? getAvailabilityDayChips(normalizedAvailability.weekSchedule)
      : [],
    description: sanitizeString(professionalProfile.shortBio) || 'Profil profesional în curs de configurare.',
    baseRateAmount: validBaseRateAmount,
    baseRateCurrency: sanitizeString(professionalProfile.baseRateCurrency) || 'RON',
    ratingAverage,
    reviewCount,
    jobCount: 0,
    avatarPath: sanitizeString(professionalProfile.avatarPath) || null,
    serviceSummaries,
    searchKeywordsNormalized: toKeywordList([
      displayName,
      professionalProfile.businessName,
      professionalProfile.displayName,
      categoryPrimary,
      professionalProfile.coverageArea?.countryName,
      professionalProfile.coverageArea?.countyName,
      professionalProfile.coverageArea?.cityName,
      professionalProfile.coverageAreaText,
      professionalProfile.shortBio,
      ...deriveServiceKeywords(normalizedServicesData),
    ]),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export function shouldPublishProviderDirectory(providerData: Record<string, any>) {
  return providerData?.status === PROVIDER_STATUSES.APPROVED;
}

export async function syncProviderDirectorySnapshot(
  { db }: ProviderDirectoryDeps,
  providerId: string,
  providerData: Record<string, any>,
) {
  const directoryRef = db.collection('providerDirectory').doc(providerId);

  if (!shouldPublishProviderDirectory(providerData)) {
    await directoryRef.delete().catch(() => undefined);
    return { action: 'unpublished' as const };
  }

  const availabilityData = await fetchProviderAvailabilityProfile({ db }, providerId);
  const servicesData = await fetchProviderServices({ db }, providerId);
  const reviewAggregate = await fetchProviderReviewAggregate({ db }, providerId);
  await directoryRef.set(buildProviderDirectoryDoc(
    providerId,
    providerData,
    availabilityData,
    servicesData,
    reviewAggregate,
  ), { merge: true });
  return { action: 'published' as const };
}

export async function syncProviderDirectoryFromProviderRef(
  { db }: ProviderDirectoryDeps,
  providerId: string,
) {
  const providerSnap = await db.collection('providers').doc(providerId).get();

  if (!providerSnap.exists) {
    await db.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
    return { action: 'deleted_missing_provider' as const };
  }

  const providerData = providerSnap.data() || {};
  const result = await syncProviderDirectorySnapshot({ db }, providerId, providerData);

  writeStructuredLog('info', {
    action: 'sync_provider_directory',
    uid: providerId,
    role: 'provider',
    resourceType: 'providerDirectory',
    resourceId: providerId,
    statusTo: providerData.status || null,
    outcome: result.action,
  }, 'Provider directory snapshot was synchronized.');

  return result;
}
