import {
  buildRomaniaCoverageAreaText,
  getRomaniaCountry,
  isRomaniaCoverageHierarchyComplete,
  normalizeRomaniaLocationLabel,
  resolveRomaniaCoverageHierarchy,
} from './romaniaLocations';
import { sanitizeString } from './shared';

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(String(value).replace(',', '.'));
  return Number.isFinite(nextValue) ? nextValue : null;
}

export function normalizeCoverageArea(value: unknown) {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const hierarchy = resolveRomaniaCoverageHierarchy(source);
  const country = getRomaniaCountry();

  return {
    countryCode: hierarchy.countryCode || country.countryCode,
    countryName: hierarchy.countryName || country.countryNameLocal,
    countyCode: hierarchy.countyCode,
    countyName: hierarchy.countyName,
    cityCode: hierarchy.cityCode,
    cityName: hierarchy.cityName,
    placeId: sanitizeString(source.placeId),
    locationLabel: normalizeRomaniaLocationLabel(source.locationLabel),
    formattedAddress: sanitizeString(source.formattedAddress),
    centerLat: normalizeNumber(source.centerLat),
    centerLng: normalizeNumber(source.centerLng),
  };
}

export function buildCoverageAreaText(value: unknown) {
  return buildRomaniaCoverageAreaText(normalizeCoverageArea(value));
}

export function hasCompleteCoverageHierarchy(value: unknown) {
  return isRomaniaCoverageHierarchyComplete(normalizeCoverageArea(value));
}

export function hasCompleteCoverageArea(value: unknown) {
  const normalized = normalizeCoverageArea(value);

  return Boolean(
    isRomaniaCoverageHierarchyComplete(normalized)
    && normalized.placeId
    && normalized.locationLabel
    && normalized.formattedAddress
    && Number.isFinite(normalized.centerLat)
    && Number.isFinite(normalized.centerLng)
  );
}

export function deriveCoverageTags(value: unknown, fallbackText: unknown) {
  const normalized = normalizeCoverageArea(value);
  const tags = [
    normalized.countryName,
    normalized.countyName,
    normalized.cityName,
    normalized.locationLabel,
    ...sanitizeString(fallbackText)
      .split(/[,/]| si | and |;/i)
      .map((item) => item.trim()),
  ].filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 4);
}
