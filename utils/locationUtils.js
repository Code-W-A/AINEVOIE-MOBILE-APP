import { Linking, Platform } from 'react-native';

export function isValidStoredLocation(location) {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  return Boolean(
    location?.formattedAddress?.trim()
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
  );
}

export function formatLocationAddress(placemark) {
  if (!placemark) {
    return '';
  }

  const parts = [
    placemark.name,
    [placemark.street, placemark.streetNumber].filter(Boolean).join(' ').trim(),
    placemark.district,
    placemark.city || placemark.subregion,
    placemark.region,
  ]
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean);

  return [...new Set(parts)].join(', ');
}

export function getMapsFallbackUrl(location) {
  return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=driving`;
}

export async function getAvailableNavigationApps(location) {
  if (!isValidStoredLocation(location)) {
    return [];
  }

  const destination = `${location.latitude},${location.longitude}`;
  const apps = [
    {
      id: 'waze',
      label: 'Waze',
      support: 'Trafic live și rutare rapidă',
      icon: 'navigation',
      url: `waze://?ll=${destination}&navigate=yes`,
    },
    Platform.OS === 'android'
      ? {
          id: 'google-maps',
          label: 'Google Maps',
          support: 'Navigație clasică Google',
          icon: 'map',
          url: `google.navigation:q=${destination}`,
        }
      : {
          id: 'google-maps',
          label: 'Google Maps',
          support: 'Navigație clasică Google',
          icon: 'map',
          url: `comgooglemaps://?daddr=${destination}&directionsmode=driving`,
        },
    Platform.OS === 'ios'
      ? {
          id: 'apple-maps',
          label: 'Apple Maps',
          support: 'Navigație nativă iPhone',
          icon: 'explore',
          url: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
        }
      : null,
  ].filter(Boolean);

  const availableApps = [];

  for (const app of apps) {
    try {
      const canOpen = await Linking.canOpenURL(app.url);

      if (canOpen) {
        availableApps.push(app);
      }
    } catch {
      // Ignore unavailable providers and rely on the remaining installed apps.
    }
  }

  return availableApps;
}

export async function openNavigationApp(app, location) {
  const fallbackUrl = getMapsFallbackUrl(location);

  try {
    const canOpen = await Linking.canOpenURL(app.url);

    if (canOpen) {
      await Linking.openURL(app.url);
      return true;
    }
  } catch {
    // Fall back to the browser maps route below.
  }

  await Linking.openURL(fallbackUrl);
  return false;
}

export async function openNavigationFallback(location) {
  await Linking.openURL(getMapsFallbackUrl(location));
}
