const defaultProviderImage = require('../../../../assets/images/provider-role/provider_7.jpg');

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getProviderDirectoryRecord({ providerId, providerName, avatarUrl } = {}) {
  const normalizedId = normalizeToken(providerId);
  const normalizedName = normalizeToken(providerName);

  return {
    id: normalizedId || normalizedName || 'provider-generic',
    name: providerName || 'Prestator',
    image: avatarUrl ? { uri: avatarUrl } : defaultProviderImage,
  };
}

export function getProviderDisplaySnapshot({ providerId, providerName, providerRole, avatarUrl } = {}) {
  const matchedProvider = getProviderDirectoryRecord({ providerId, providerName, avatarUrl });

  return {
    providerId: matchedProvider.id,
    providerName: providerName || matchedProvider.name,
    providerRole: providerRole || matchedProvider.category || 'Serviciu',
    providerImage: matchedProvider.image,
  };
}
