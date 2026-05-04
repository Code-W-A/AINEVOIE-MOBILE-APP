import {
  buildRomaniaCoverageAreaText,
  findRomaniaCity,
  findRomaniaCounty,
  getRomaniaCountry,
  isRomaniaCoverageHierarchyComplete,
  resolveRomaniaCoverageHierarchy,
} from './romaniaLocations';
import { badRequest, failedPrecondition } from './errors';
import { sanitizeString } from './shared';

type SearchPayload = {
  query?: string,
  countyCode?: string,
  cityCode?: string,
};

type ResolvePayload = {
  placeId?: string,
  countyCode?: string,
  cityCode?: string,
};

type SearchDeps = {
  mapsApiKey: string,
  fetchImpl?: typeof fetch,
};

function getFetchImpl(fetchImpl?: typeof fetch) {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof fetch !== 'function') {
    throw failedPrecondition('Fetch is not available in the current runtime.');
  }

  return fetch;
}

function requireMapsApiKey(value: string) {
  const apiKey = sanitizeString(value);

  if (!apiKey) {
    throw failedPrecondition('GOOGLE_MAPS_API_KEY is not configured.');
  }

  return apiKey;
}

function getSelectedHierarchy(payload: { countyCode?: string, cityCode?: string }) {
  const county = findRomaniaCounty(payload.countyCode);
  const city = county ? findRomaniaCity(county.countyCode, payload.cityCode) : null;

  if (!county || !city) {
    throw badRequest('A valid Romania county and city selection is required.');
  }

  return {
    countryCode: getRomaniaCountry().countryCode,
    countryName: getRomaniaCountry().countryNameLocal,
    countyCode: county.countyCode,
    countyName: county.countyName,
    cityCode: city.cityCode,
    cityName: city.cityName,
  };
}

function getAddressComponent(result: Record<string, any>, types: string[]) {
  const component = Array.isArray(result.address_components)
    ? result.address_components.find((item) => (
        Array.isArray(item.types) && types.every((type) => item.types.includes(type))
      ))
    : null;

  if (!component) {
    return '';
  }

  return sanitizeString(component.long_name || component.short_name);
}

function buildLocationLabel(formattedAddress: string) {
  return sanitizeString(formattedAddress.split(',')[0]);
}

export async function searchCoveragePlaceSuggestionsService(
  { mapsApiKey, fetchImpl }: SearchDeps,
  rawPayload: SearchPayload,
) {
  const query = sanitizeString(rawPayload.query);

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
  const payload = await response.json() as Record<string, any>;
  const status = sanitizeString(payload.status);

  if (!response.ok || (status && status !== 'OK' && status !== 'ZERO_RESULTS')) {
    throw failedPrecondition('Google Places autocomplete request failed.');
  }

  const predictions = Array.isArray(payload.predictions) ? payload.predictions : [];
  const suggestions = predictions.slice(0, 5).map((item) => ({
    placeId: sanitizeString(item.place_id),
    primaryText: sanitizeString(item.structured_formatting?.main_text) || sanitizeString(item.description),
    secondaryText: sanitizeString(item.structured_formatting?.secondary_text),
    fullText: sanitizeString(item.description),
  })).filter((item) => item.placeId && item.fullText);

  return { suggestions };
}

export async function resolveCoveragePlaceSelectionService(
  { mapsApiKey, fetchImpl }: SearchDeps,
  rawPayload: ResolvePayload,
) {
  const placeId = sanitizeString(rawPayload.placeId);

  if (!placeId) {
    throw badRequest('A valid Google place selection is required.');
  }

  const selectedHierarchy = getSelectedHierarchy(rawPayload);
  const fetcher = getFetchImpl(fetchImpl);
  const apiKey = requireMapsApiKey(mapsApiKey);
  const requestUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');

  requestUrl.searchParams.set('place_id', placeId);
  requestUrl.searchParams.set('language', 'ro');
  requestUrl.searchParams.set('key', apiKey);

  const response = await fetcher(requestUrl.toString());
  const payload = await response.json() as Record<string, any>;
  const status = sanitizeString(payload.status);

  if (!response.ok || status !== 'OK') {
    throw failedPrecondition('Google Places resolve request failed.');
  }

  const result = Array.isArray(payload.results) ? payload.results[0] : null;

  if (!result) {
    throw failedPrecondition('Google Places did not return a resolvable result.');
  }

  const resolvedHierarchy = resolveRomaniaCoverageHierarchy({
    countryName: getAddressComponent(result, ['country']),
    countyName: getAddressComponent(result, ['administrative_area_level_1', 'political']),
    sublocality: getAddressComponent(result, ['sublocality_level_1', 'political'])
      || getAddressComponent(result, ['sublocality', 'political'])
      || getAddressComponent(result, ['administrative_area_level_2', 'political']),
    district: getAddressComponent(result, ['administrative_area_level_3', 'political']),
    cityName: getAddressComponent(result, ['locality', 'political'])
      || getAddressComponent(result, ['administrative_area_level_3', 'political'])
      || getAddressComponent(result, ['postal_town', 'political']),
    formattedAddress: sanitizeString(result.formatted_address),
  });

  if (!isRomaniaCoverageHierarchyComplete(resolvedHierarchy)) {
    throw failedPrecondition('The selected place is not a valid Romania city result.');
  }

  if (
    resolvedHierarchy.countyCode !== selectedHierarchy.countyCode
    || resolvedHierarchy.cityCode !== selectedHierarchy.cityCode
  ) {
    throw failedPrecondition('The selected place does not match the chosen county and city.');
  }

  const location = result.geometry?.location || {};
  const centerLat = Number(location.lat);
  const centerLng = Number(location.lng);

  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
    throw failedPrecondition('The selected place is missing coordinates.');
  }

  const formattedAddress = sanitizeString(result.formatted_address);
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
    coverageAreaText: buildRomaniaCoverageAreaText(coverageArea),
  };
}
