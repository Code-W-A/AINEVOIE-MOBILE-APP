"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCoveragePlaceSuggestionsService = searchCoveragePlaceSuggestionsService;
exports.resolveCoveragePlaceSelectionService = resolveCoveragePlaceSelectionService;
const romaniaLocations_1 = require("./romaniaLocations");
const errors_1 = require("./errors");
const shared_1 = require("./shared");
function getFetchImpl(fetchImpl) {
    if (fetchImpl) {
        return fetchImpl;
    }
    if (typeof fetch !== 'function') {
        throw (0, errors_1.failedPrecondition)('Fetch is not available in the current runtime.');
    }
    return fetch;
}
function requireMapsApiKey(value) {
    const apiKey = (0, shared_1.sanitizeString)(value);
    if (!apiKey) {
        throw (0, errors_1.failedPrecondition)('GOOGLE_MAPS_API_KEY is not configured.');
    }
    return apiKey;
}
function getSelectedHierarchy(payload) {
    const county = (0, romaniaLocations_1.findRomaniaCounty)(payload.countyCode);
    const city = county ? (0, romaniaLocations_1.findRomaniaCity)(county.countyCode, payload.cityCode) : null;
    if (!county || !city) {
        throw (0, errors_1.badRequest)('A valid Romania county and city selection is required.');
    }
    return {
        countryCode: (0, romaniaLocations_1.getRomaniaCountry)().countryCode,
        countryName: (0, romaniaLocations_1.getRomaniaCountry)().countryNameLocal,
        countyCode: county.countyCode,
        countyName: county.countyName,
        cityCode: city.cityCode,
        cityName: city.cityName,
    };
}
function getAddressComponent(result, types) {
    const component = Array.isArray(result.address_components)
        ? result.address_components.find((item) => (Array.isArray(item.types) && types.every((type) => item.types.includes(type))))
        : null;
    if (!component) {
        return '';
    }
    return (0, shared_1.sanitizeString)(component.long_name || component.short_name);
}
function buildLocationLabel(formattedAddress) {
    return (0, shared_1.sanitizeString)(formattedAddress.split(',')[0]);
}
async function searchCoveragePlaceSuggestionsService({ mapsApiKey, fetchImpl }, rawPayload) {
    const query = (0, shared_1.sanitizeString)(rawPayload.query);
    if (query.length < 2) {
        return { suggestions: [] };
    }
    const hierarchy = getSelectedHierarchy(rawPayload);
    const fetcher = getFetchImpl(fetchImpl);
    const apiKey = requireMapsApiKey(mapsApiKey);
    const requestUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    requestUrl.searchParams.set('input', `${query}, ${hierarchy.cityName}, ${hierarchy.countyName}, Romania`);
    requestUrl.searchParams.set('components', 'country:ro');
    requestUrl.searchParams.set('language', 'ro');
    requestUrl.searchParams.set('types', 'geocode');
    requestUrl.searchParams.set('key', apiKey);
    const response = await fetcher(requestUrl.toString());
    const payload = await response.json();
    const status = (0, shared_1.sanitizeString)(payload.status);
    if (!response.ok || (status && status !== 'OK' && status !== 'ZERO_RESULTS')) {
        throw (0, errors_1.failedPrecondition)('Google Places autocomplete request failed.');
    }
    const predictions = Array.isArray(payload.predictions) ? payload.predictions : [];
    const suggestions = predictions.slice(0, 5).map((item) => ({
        placeId: (0, shared_1.sanitizeString)(item.place_id),
        primaryText: (0, shared_1.sanitizeString)(item.structured_formatting?.main_text) || (0, shared_1.sanitizeString)(item.description),
        secondaryText: (0, shared_1.sanitizeString)(item.structured_formatting?.secondary_text),
        fullText: (0, shared_1.sanitizeString)(item.description),
    })).filter((item) => item.placeId && item.fullText);
    return { suggestions };
}
async function resolveCoveragePlaceSelectionService({ mapsApiKey, fetchImpl }, rawPayload) {
    const placeId = (0, shared_1.sanitizeString)(rawPayload.placeId);
    if (!placeId) {
        throw (0, errors_1.badRequest)('A valid Google place selection is required.');
    }
    const selectedHierarchy = getSelectedHierarchy(rawPayload);
    const fetcher = getFetchImpl(fetchImpl);
    const apiKey = requireMapsApiKey(mapsApiKey);
    const requestUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    requestUrl.searchParams.set('place_id', placeId);
    requestUrl.searchParams.set('language', 'ro');
    requestUrl.searchParams.set('key', apiKey);
    const response = await fetcher(requestUrl.toString());
    const payload = await response.json();
    const status = (0, shared_1.sanitizeString)(payload.status);
    if (!response.ok || status !== 'OK') {
        throw (0, errors_1.failedPrecondition)('Google Places resolve request failed.');
    }
    const result = Array.isArray(payload.results) ? payload.results[0] : null;
    if (!result) {
        throw (0, errors_1.failedPrecondition)('Google Places did not return a resolvable result.');
    }
    const resolvedHierarchy = (0, romaniaLocations_1.resolveRomaniaCoverageHierarchy)({
        countryName: getAddressComponent(result, ['country']),
        countyName: getAddressComponent(result, ['administrative_area_level_1', 'political']),
        sublocality: getAddressComponent(result, ['sublocality_level_1', 'political'])
            || getAddressComponent(result, ['sublocality', 'political'])
            || getAddressComponent(result, ['administrative_area_level_2', 'political']),
        district: getAddressComponent(result, ['administrative_area_level_3', 'political']),
        cityName: getAddressComponent(result, ['locality', 'political'])
            || getAddressComponent(result, ['administrative_area_level_3', 'political'])
            || getAddressComponent(result, ['postal_town', 'political']),
        formattedAddress: (0, shared_1.sanitizeString)(result.formatted_address),
    });
    if (!(0, romaniaLocations_1.isRomaniaCoverageHierarchyComplete)(resolvedHierarchy)) {
        throw (0, errors_1.failedPrecondition)('The selected place is not a valid Romania city result.');
    }
    if (resolvedHierarchy.countyCode !== selectedHierarchy.countyCode
        || resolvedHierarchy.cityCode !== selectedHierarchy.cityCode) {
        throw (0, errors_1.failedPrecondition)('The selected place does not match the chosen county and city.');
    }
    const location = result.geometry?.location || {};
    const centerLat = Number(location.lat);
    const centerLng = Number(location.lng);
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
        throw (0, errors_1.failedPrecondition)('The selected place is missing coordinates.');
    }
    const formattedAddress = (0, shared_1.sanitizeString)(result.formatted_address);
    const coverageArea = {
        ...selectedHierarchy,
        placeId,
        locationLabel: buildLocationLabel(formattedAddress) || selectedHierarchy.cityName,
        formattedAddress,
        centerLat,
        centerLng,
    };
    return {
        coverageArea,
        coverageAreaText: (0, romaniaLocations_1.buildRomaniaCoverageAreaText)(coverageArea),
    };
}
