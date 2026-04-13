import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export function resolveStorageBucket(
  projectId = process.env.GCLOUD_PROJECT || '',
  firebaseConfigRaw = process.env.FIREBASE_CONFIG || '',
) {
  try {
    const parsedConfig = JSON.parse(firebaseConfigRaw || '{}');
    const storageBucket = String(parsedConfig.storageBucket || '').trim();

    if (storageBucket) {
      return storageBucket;
    }
  } catch {
    // Ignore invalid FIREBASE_CONFIG and fall back to the project id heuristic.
  }

  const normalizedProjectId = String(projectId || '').trim();

  if (!normalizedProjectId) {
    return undefined;
  }

  return `${normalizedProjectId}.firebasestorage.app`;
}

const storageBucket = resolveStorageBucket();

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
      ...(storageBucket ? { storageBucket } : {}),
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export { adminApp };
