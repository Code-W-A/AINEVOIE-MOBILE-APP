import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseServices } from './client';
import { resolveStoragePathDownloadUrl } from './storageUploads';
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
    avatarUrl: null,
    serviceSummaries: Array.isArray(payload?.serviceSummaries)
      ? payload.serviceSummaries.map((service) => normalizeProviderServiceRecord(service))
      : [],
    searchKeywordsNormalized: Array.isArray(payload?.searchKeywordsNormalized) ? payload.searchKeywordsNormalized : [],
    updatedAt: payload?.updatedAt || null,
  };
}

async function withResolvedAvatar(record) {
  if (!record.avatarPath) {
    return record;
  }

  try {
    const avatarUrl = await resolveStoragePathDownloadUrl(record.avatarPath);
    return {
      ...record,
      avatarUrl,
    };
  } catch {
    return record;
  }
}

export async function fetchProviderDirectoryList() {
  const { db } = getFirebaseServices();
  const snapshot = await getDocs(query(
    collection(db, 'providerDirectory'),
    where('status', '==', 'approved'),
  ));

  return Promise.all(snapshot.docs.map((item) => (
    withResolvedAvatar(normalizeProviderDirectoryRecord(item.id, item.data()))
  )));
}

export async function fetchProviderDirectoryProfile(providerId) {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'providerDirectory', providerId));

  if (!snapshot.exists() || snapshot.data()?.status !== 'approved') {
    return null;
  }

  return withResolvedAvatar(normalizeProviderDirectoryRecord(snapshot.id, snapshot.data()));
}
