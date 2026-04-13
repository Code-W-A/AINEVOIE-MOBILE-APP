export const DEFAULT_ESTIMATED_HOURS = 2;

export function normalizeEstimatedHours(value, fallback = DEFAULT_ESTIMATED_HOURS) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return fallback;
  }
  return Math.round(nextValue);
}

export function normalizeRequestDetails(requestDetails, fallbackEstimatedHours = DEFAULT_ESTIMATED_HOURS) {
  return {
    description: String(requestDetails?.description || '').trim(),
    estimatedHours: normalizeEstimatedHours(requestDetails?.estimatedHours, fallbackEstimatedHours),
  };
}
