import {
  findRomaniaCity,
  findRomaniaCounty,
  getRomaniaCountry,
  normalizeRomaniaLocationLabel,
} from '@ainevoie/firebase-shared';

const GOOGLE_MAPS_API_KEY = String(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
    || '',
).trim();

function sanitizeText(value) {
  return String(value || '').trim();
}

function requireGoogleMapsApiKey() {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Căutarea adresei nu este configurată. Adaugă EXPO_PUBLIC_GOOGLE_MAPS_API_KEY în .env.');
  }

  return GOOGLE_MAPS_API_KEY;
}

function getSelectedHierarchy(payload = {}) {
  const country = getRomaniaCountry();
  const county = findRomaniaCounty(payload.countyCode);
  const city = county ? findRomaniaCity(county.countyCode, payload.cityCode) : null;

  if (!county || !city) {
    throw new Error('Selectează județul și orașul înainte să cauți adresa.');
  }

  return {
    countryCode: country.countryCode,
    countryName: country.countryNameLocal,
    countyCode: county.countyCode,
    countyName: county.countyName,
    cityCode: city.cityCode,
    cityName: city.cityName,
  };
}

async function fetchJson(url, errorMessage) {
  const response = await fetch(url);
  const rawBody = await response.text();
  let payload = null;

  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    console.error('[ProviderCoverageSearch][google:parse_error]', {
      status: response.status,
      bodyStart: rawBody.slice(0, 80),
    });
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    console.error('[ProviderCoverageSearch][google:http_error]', {
      status: response.status,
      payload,
    });
    throw new Error(errorMessage);
  }

  return payload;
}

function getAddressComponent(result, types) {
  const component = Array.isArray(result?.address_components)
    ? result.address_components.find((item) => (
        Array.isArray(item.types) && types.every((type) => item.types.includes(type))
      ))
    : null;

  return sanitizeText(component?.long_name || component?.short_name);
}

function buildLocationLabel(formattedAddress) {
  return normalizeRomaniaLocationLabel(String(formattedAddress || '').split(',')[0]);
}

function getResultCoordinates(result) {
  const location = result?.geometry?.location || {};
  const lat = Number(location.lat);
  const lng = Number(location.lng);

  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

export async function searchCoveragePlaceSuggestions(payload = {}) {
  const query = sanitizeText(payload.query);

  if (query.length < 2) {
    return { suggestions: [] };
  }

  const hierarchy = getSelectedHierarchy(payload);
  const requestUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');

  requestUrl.searchParams.set('input', `${query}, ${hierarchy.cityName}, ${hierarchy.countyName}, Romania`);
  requestUrl.searchParams.set('components', 'country:ro');
  requestUrl.searchParams.set('language', 'ro');
  requestUrl.searchParams.set('types', 'geocode');
  requestUrl.searchParams.set('key', requireGoogleMapsApiKey());

  console.log('[ProviderCoverageSearch][google:autocomplete:start]', {
    queryLength: query.length,
    countyCode: hierarchy.countyCode,
    cityCode: hierarchy.cityCode,
  });

  const responsePayload = await fetchJson(
    requestUrl.toString(),
    'Căutarea adresei a eșuat. Verifică cheia Google Maps și încearcă din nou.',
  );
  const status = sanitizeText(responsePayload?.status);

  if (status && status !== 'OK' && status !== 'ZERO_RESULTS') {
    console.error('[ProviderCoverageSearch][google:autocomplete_status]', {
      status,
      errorMessage: responsePayload?.error_message,
    });
    throw new Error(responsePayload?.error_message || 'Google Places nu a putut returna sugestii.');
  }

  const predictions = Array.isArray(responsePayload?.predictions) ? responsePayload.predictions : [];
  const suggestions = predictions.slice(0, 5).map((item) => ({
    placeId: sanitizeText(item.place_id),
    primaryText: sanitizeText(item.structured_formatting?.main_text) || sanitizeText(item.description),
    secondaryText: sanitizeText(item.structured_formatting?.secondary_text),
    fullText: sanitizeText(item.description),
  })).filter((item) => item.placeId && item.fullText);

  console.log('[ProviderCoverageSearch][google:autocomplete:success]', {
    suggestionCount: suggestions.length,
  });

  return { suggestions };
}

export async function resolveCoveragePlaceSelection(payload = {}) {
  const placeId = sanitizeText(payload.placeId);

  if (!placeId) {
    throw new Error('Selectează o adresă validă din listă.');
  }

  const hierarchy = getSelectedHierarchy(payload);
  const requestUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');

  requestUrl.searchParams.set('place_id', placeId);
  requestUrl.searchParams.set('language', 'ro');
  requestUrl.searchParams.set('key', requireGoogleMapsApiKey());

  console.log('[ProviderCoverageSearch][google:resolve:start]', {
    placeId,
    countyCode: hierarchy.countyCode,
    cityCode: hierarchy.cityCode,
  });

  const responsePayload = await fetchJson(
    requestUrl.toString(),
    'Adresa selectată nu a putut fi validată. Încearcă alt rezultat.',
  );
  const status = sanitizeText(responsePayload?.status);

  if (status !== 'OK') {
    console.error('[ProviderCoverageSearch][google:resolve_status]', {
      status,
      errorMessage: responsePayload?.error_message,
    });
    throw new Error(responsePayload?.error_message || 'Google Geocoding nu a putut valida adresa.');
  }

  const result = Array.isArray(responsePayload?.results) ? responsePayload.results[0] : null;
  const formattedAddress = sanitizeText(result?.formatted_address);
  const { lat, lng } = getResultCoordinates(result);

  if (!result || !formattedAddress || lat === null || lng === null) {
    throw new Error('Adresa selectată nu are coordonate valide.');
  }

  const resolvedCountry = getAddressComponent(result, ['country']);
  const isRomaniaResult = !resolvedCountry || resolvedCountry.toLowerCase().includes('rom');

  if (!isRomaniaResult) {
    throw new Error('Selectează o adresă din România.');
  }

  const coverageArea = {
    ...hierarchy,
    placeId,
    locationLabel: buildLocationLabel(formattedAddress),
    formattedAddress,
    centerLat: lat,
    centerLng: lng,
  };

  console.log('[ProviderCoverageSearch][google:resolve:success]', {
    placeId,
    hasCoordinates: true,
  });

  return { coverageArea };
}
