import {
  buildRomaniaCoverageAreaText,
  getRomaniaCountry,
  isRomaniaCoverageHierarchyComplete,
  normalizeRomaniaLocationLabel,
  resolveRomaniaCoverageHierarchy,
} from '@ainevoie/firebase-shared';

function sanitizeText(value) {
  return String(value || '').trim();
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(String(value).replace(',', '.'));
  return Number.isFinite(nextValue) ? nextValue : null;
}

export function normalizeCoverageAreaRecord(value) {
  const source = value && typeof value === 'object' ? value : {};
  const hierarchy = resolveRomaniaCoverageHierarchy(source);
  const country = getRomaniaCountry();

  return {
    countryCode: hierarchy.countryCode || country.countryCode,
    countryName: hierarchy.countryName || country.countryNameLocal,
    countyCode: hierarchy.countyCode,
    countyName: hierarchy.countyName,
    cityCode: hierarchy.cityCode,
    cityName: hierarchy.cityName,
    placeId: sanitizeText(source?.placeId),
    locationLabel: normalizeRomaniaLocationLabel(source?.locationLabel),
    formattedAddress: sanitizeText(source?.formattedAddress),
    centerLat: normalizeNumber(source?.centerLat),
    centerLng: normalizeNumber(source?.centerLng),
  };
}

export function normalizeCoverageAreaForm(value) {
  const normalized = normalizeCoverageAreaRecord(value);

  return {
    countryCode: normalized.countryCode,
    countryName: normalized.countryName,
    countyCode: normalized.countyCode,
    countyName: normalized.countyName,
    cityCode: normalized.cityCode,
    cityName: normalized.cityName,
    placeId: normalized.placeId,
    locationLabel: normalized.locationLabel,
    formattedAddress: normalized.formattedAddress,
    centerLat: normalized.centerLat === null ? '' : String(normalized.centerLat),
    centerLng: normalized.centerLng === null ? '' : String(normalized.centerLng),
  };
}

export function buildCoverageAreaText(value) {
  return buildRomaniaCoverageAreaText(normalizeCoverageAreaRecord(value));
}

export function isCoverageAreaHierarchyComplete(value) {
  return isRomaniaCoverageHierarchyComplete(normalizeCoverageAreaRecord(value));
}

export function isCoverageAreaComplete(value) {
  const normalized = normalizeCoverageAreaRecord(value);

  return Boolean(
    isRomaniaCoverageHierarchyComplete(normalized)
    && normalized.placeId
    && normalized.locationLabel
    && normalized.formattedAddress
    && Number.isFinite(normalized.centerLat)
    && Number.isFinite(normalized.centerLng)
  );
}

export function buildCoverageAreaPatch(value) {
  const normalized = normalizeCoverageAreaRecord(value);

  return {
    coverageArea: normalized,
    coverageAreaText: buildCoverageAreaText(normalized),
  };
}

export function getCoverageAreaTags(value, fallbackText = '') {
  const normalized = normalizeCoverageAreaRecord(value);
  const tags = [
    normalized.countryName,
    normalized.countyName,
    normalized.cityName,
    normalized.locationLabel,
    ...String(fallbackText || '')
      .split(/[,/]| si | and |;/i)
      .map((item) => item.trim()),
  ].filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 4);
}

function normalizeHierarchyToken(value) {
  return sanitizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function matchesCoverageHierarchy(providerCoverage, location) {
  const provider = normalizeCoverageAreaRecord(providerCoverage);
  const normalizedLocation = location && typeof location === 'object' ? location : {};
  const providerCountry = normalizeHierarchyToken(provider.countryCode || provider.countryName);
  const locationCountry = normalizeHierarchyToken(normalizedLocation.countryCode || normalizedLocation.countryName);
  const providerCounty = normalizeHierarchyToken(provider.countyCode || provider.countyName);
  const locationCounty = normalizeHierarchyToken(normalizedLocation.countyCode || normalizedLocation.countyName);
  const providerCity = normalizeHierarchyToken(provider.cityCode || provider.cityName);
  const locationCity = normalizeHierarchyToken(normalizedLocation.cityCode || normalizedLocation.cityName);

  return Boolean(
    providerCountry
    && locationCountry
    && providerCountry === locationCountry
    && providerCounty
    && locationCounty
    && providerCounty === locationCounty
    && providerCity
    && locationCity
    && providerCity === locationCity
  );
}

export const PROVIDER_COVERAGE_DEFAULT_COUNTRY_CODE = 'RO';
