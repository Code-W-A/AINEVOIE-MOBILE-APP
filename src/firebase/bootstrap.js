import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from './client';

export async function callBootstrapSession(payload = {}) {
  const { functions } = getFirebaseServices();
  const bootstrapSession = httpsCallable(functions, 'bootstrapSession');
  const response = await bootstrapSession(payload);
  return response.data;
}

export async function submitProviderOnboarding(payload) {
  const { functions } = getFirebaseServices();
  const submitProviderOnboardingCallable = httpsCallable(functions, 'submitProviderOnboarding');
  const response = await submitProviderOnboardingCallable(payload);
  return response.data;
}
