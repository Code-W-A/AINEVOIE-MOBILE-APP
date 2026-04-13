import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFirebaseServices } from './client';
import {
  buildCoverageAreaText,
  getCoverageAreaTags,
  normalizeCoverageAreaRecord,
} from '../features/shared/utils/providerCoverage';
import { normalizeProviderServiceRecord } from '../features/shared/utils/providerServices';

function sanitizeText(value) {
  return String(value || '').trim();
}

function normalizeProviderDirectoryRecord(id, payload) {
  const coverageArea = normalizeCoverageAreaRecord({
    countryCode: payload?.countryCode,
    countryName: payload?.countryName,
    countyCode: payload?.countyCode,
    countyName: payload?.countyName,
    cityCode: payload?.cityCode,
    cityName: payload?.cityName,
  });
  const coverageAreaText = sanitizeText(payload?.coverageAreaText)
    || buildCoverageAreaText(coverageArea);

  return {
    providerId: sanitizeText(payload?.providerId) || id,
    status: sanitizeText(payload?.status) || 'approved',
    displayName: sanitizeText(payload?.displayName) || 'Prestator',
    categoryPrimary: sanitizeText(payload?.categoryPrimary) || 'Serviciu',
    countryCode: coverageArea.countryCode,
    countryName: coverageArea.countryName,
    countyCode: coverageArea.countyCode,
    countyName: coverageArea.countyName,
    cityCode: coverageArea.cityCode,
    cityName: coverageArea.cityName,
    coverageAreaText,
    coverageTags: Array.isArray(payload?.coverageTags) && payload.coverageTags.length
      ? payload.coverageTags.filter(Boolean)
      : getCoverageAreaTags(coverageArea, coverageAreaText),
    hasConfiguredAvailability: payload?.hasConfiguredAvailability === true,
    availabilitySummary: sanitizeText(payload?.availabilitySummary),
    availabilityDayChips: Array.isArray(payload?.availabilityDayChips)
      ? payload.availabilityDayChips.filter(Boolean)
      : [],
    description: sanitizeText(payload?.description),
    baseRateAmount: Number(payload?.baseRateAmount) || 0,
    baseRateCurrency: sanitizeText(payload?.baseRateCurrency) || 'RON',
    ratingAverage: Number(payload?.ratingAverage) || 0,
    reviewCount: Number(payload?.reviewCount) || 0,
    jobCount: Number(payload?.jobCount) || 0,
    avatarPath: sanitizeText(payload?.avatarPath) || null,
    serviceSummaries: Array.isArray(payload?.serviceSummaries)
      ? payload.serviceSummaries.map((service) => normalizeProviderServiceRecord(service))
      : [],
    searchKeywordsNormalized: Array.isArray(payload?.searchKeywordsNormalized) ? payload.searchKeywordsNormalized : [],
    updatedAt: payload?.updatedAt || null,
  };
}

export async function fetchProviderDirectoryList() {
  const { db } = getFirebaseServices();
  const snapshot = await getDocs(collection(db, 'providerDirectory'));

  return snapshot.docs.map((item) => normalizeProviderDirectoryRecord(item.id, item.data()));
}

export async function fetchProviderDirectoryProfile(providerId) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'providerDirectory', providerId));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeProviderDirectoryRecord(snapshot.id, snapshot.data());
}
