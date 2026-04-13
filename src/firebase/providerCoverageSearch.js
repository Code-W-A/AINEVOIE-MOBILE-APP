import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from './client';

function normalizeCoverageCallableError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';

  if (code === 'functions/not-found') {
    return new Error('Căutarea adresei nu este disponibilă (funcția backend nu este deployată în acest proiect).');
  }

  if (code === 'functions/failed-precondition' && String(error?.message || '').includes('GOOGLE_MAPS_API_KEY')) {
    return new Error('Căutarea adresei nu este configurată (lipsește GOOGLE_MAPS_API_KEY în Cloud Functions).');
  }

  return error instanceof Error ? error : new Error('Căutarea adresei a eșuat.');
}

export async function searchCoveragePlaceSuggestions(payload) {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'searchCoveragePlaceSuggestions');
  try {
    const response = await callable(payload || {});
    return response.data;
  } catch (error) {
    throw normalizeCoverageCallableError(error);
  }
}

export async function resolveCoveragePlaceSelection(payload) {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, 'resolveCoveragePlaceSelection');
  try {
    const response = await callable(payload || {});
    return response.data;
  } catch (error) {
    throw normalizeCoverageCallableError(error);
  }
}
