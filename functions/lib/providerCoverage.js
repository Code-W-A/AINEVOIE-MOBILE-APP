"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCoverageArea = normalizeCoverageArea;
exports.buildCoverageAreaText = buildCoverageAreaText;
exports.hasCompleteCoverageHierarchy = hasCompleteCoverageHierarchy;
exports.hasCompleteCoverageArea = hasCompleteCoverageArea;
exports.deriveCoverageTags = deriveCoverageTags;
const romaniaLocations_1 = require("./romaniaLocations");
const shared_1 = require("./shared");
function normalizeNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const nextValue = Number(String(value).replace(',', '.'));
    return Number.isFinite(nextValue) ? nextValue : null;
}
function normalizeCoverageArea(value) {
    const source = value && typeof value === 'object' ? value : {};
    const hierarchy = (0, romaniaLocations_1.resolveRomaniaCoverageHierarchy)(source);
    const country = (0, romaniaLocations_1.getRomaniaCountry)();
    return {
        countryCode: hierarchy.countryCode || country.countryCode,
        countryName: hierarchy.countryName || country.countryNameLocal,
        countyCode: hierarchy.countyCode,
        countyName: hierarchy.countyName,
        cityCode: hierarchy.cityCode,
        cityName: hierarchy.cityName,
        placeId: (0, shared_1.sanitizeString)(source.placeId),
        locationLabel: (0, romaniaLocations_1.normalizeRomaniaLocationLabel)(source.locationLabel),
        formattedAddress: (0, shared_1.sanitizeString)(source.formattedAddress),
        centerLat: normalizeNumber(source.centerLat),
        centerLng: normalizeNumber(source.centerLng),
    };
}
function buildCoverageAreaText(value) {
    return (0, romaniaLocations_1.buildRomaniaCoverageAreaText)(normalizeCoverageArea(value));
}
function hasCompleteCoverageHierarchy(value) {
    return (0, romaniaLocations_1.isRomaniaCoverageHierarchyComplete)(normalizeCoverageArea(value));
}
function hasCompleteCoverageArea(value) {
    const normalized = normalizeCoverageArea(value);
    return Boolean((0, romaniaLocations_1.isRomaniaCoverageHierarchyComplete)(normalized)
        && normalized.placeId
        && normalized.locationLabel
        && normalized.formattedAddress
        && Number.isFinite(normalized.centerLat)
        && Number.isFinite(normalized.centerLng));
}
function deriveCoverageTags(value, fallbackText) {
    const normalized = normalizeCoverageArea(value);
    const tags = [
        normalized.countryName,
        normalized.countyName,
        normalized.cityName,
        normalized.locationLabel,
        ...(0, shared_1.sanitizeString)(fallbackText)
            .split(/[,/]| si | and |;/i)
            .map((item) => item.trim()),
    ].filter(Boolean);
    return Array.from(new Set(tags)).slice(0, 4);
}
