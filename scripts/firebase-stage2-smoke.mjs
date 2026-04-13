import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { getDoc, getFirestore, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

function readEnv(filePath) {
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

function getEnvConfig() {
  const env = readEnv('.env');

  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
    functionsRegion: env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'europe-west1',
  };
}

function bytesForFile(type) {
  if (type === 'png') {
    return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  }

  return Uint8Array.from([255, 216, 255, 217]);
}

function normalizeCallableError(error) {
  return {
    code: error?.code || null,
    message: error?.message || String(error),
    details: error?.details || null,
  };
}

async function uploadRawAsset(storage, path, bytes, contentType) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, bytes, { contentType });
  return path;
}

async function main() {
  const config = getEnvConfig();
  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  }, `stage2-smoke-${Date.now()}`);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, config.functionsRegion);
  const storage = getStorage(app);

  const bootstrapSession = httpsCallable(functions, 'bootstrapSession');
  const finalizeUserAvatarUpload = httpsCallable(functions, 'finalizeUserAvatarUpload');
  const finalizeProviderAvatarUpload = httpsCallable(functions, 'finalizeProviderAvatarUpload');
  const finalizeProviderDocumentUpload = httpsCallable(functions, 'finalizeProviderDocumentUpload');
  const submitProviderOnboarding = httpsCallable(functions, 'submitProviderOnboarding');
  const adminReviewProvider = httpsCallable(functions, 'adminReviewProvider');

  const suffix = Date.now();
  const password = 'Stage2Smoke!123';
  const results = [];

  const userEmail = `stage2-user-${suffix}@example.com`;
  const userCredential = await createUserWithEmailAndPassword(auth, userEmail, password);
  const userBootstrap = await bootstrapSession({
    intendedRole: 'user',
    displayName: 'Stage2 Smoke User',
  });
  await auth.currentUser.getIdToken(true);

  const userAvatarPath = await uploadRawAsset(
    storage,
    `users/${userCredential.user.uid}/avatar/smoke-user.png`,
    bytesForFile('png'),
    'image/png',
  );
  const userFinalize = await finalizeUserAvatarUpload({ storagePath: userAvatarPath });
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

  results.push({
    step: 'user_flow',
    email: userEmail,
    uid: userCredential.user.uid,
    bootstrap: userBootstrap.data,
    finalizedPhotoPath: userFinalize.data?.photoPath || null,
    storedPhotoPath: userDoc.data()?.photoPath || null,
  });

  await signOut(auth);

  const providerEmail = `stage2-provider-${suffix}@example.com`;
  const providerCredential = await createUserWithEmailAndPassword(auth, providerEmail, password);
  const providerBootstrap = await bootstrapSession({
    intendedRole: 'provider',
    displayName: 'Stage2 Smoke Provider',
  });
  await auth.currentUser.getIdToken(true);

  const providerAvatarPath = await uploadRawAsset(
    storage,
    `providers/${providerCredential.user.uid}/avatar/smoke-provider.png`,
    bytesForFile('png'),
    'image/png',
  );
  const providerAvatarFinalize = await finalizeProviderAvatarUpload({ storagePath: providerAvatarPath });

  const identityPath = await uploadRawAsset(
    storage,
    `providers/${providerCredential.user.uid}/documents/identity/smoke-identity.jpg`,
    bytesForFile('jpg'),
    'image/jpeg',
  );
  const professionalPath = await uploadRawAsset(
    storage,
    `providers/${providerCredential.user.uid}/documents/professional/smoke-professional.jpg`,
    bytesForFile('jpg'),
    'image/jpeg',
  );

  const identityFinalize = await finalizeProviderDocumentUpload({
    documentType: 'identity',
    storagePath: identityPath,
    originalFileName: 'smoke-identity.jpg',
  });
  const professionalFinalize = await finalizeProviderDocumentUpload({
    documentType: 'professional',
    storagePath: professionalPath,
    originalFileName: 'smoke-professional.jpg',
  });

  const submitResult = await submitProviderOnboarding({
    businessName: 'Stage2 Smoke Business',
    displayName: 'Stage2 Smoke Provider',
    specialization: 'Electrician',
    baseRateAmount: 150,
    coverageAreaText: 'Bucuresti si Ilfov',
    shortBio: 'Smoke test provider profile for Stage 2.',
    availabilitySummary: 'Luni-Vineri, 09:00-18:00',
  });
  await auth.currentUser.getIdToken(true);

  const providerDoc = await getDoc(doc(db, 'providers', providerCredential.user.uid));
  const providerDirectoryDoc = await getDoc(doc(db, 'providerDirectory', providerCredential.user.uid));

  let adminReviewError = null;
  try {
    await adminReviewProvider({
      providerId: providerCredential.user.uid,
      action: 'approve',
    });
  } catch (error) {
    adminReviewError = normalizeCallableError(error);
  }

  results.push({
    step: 'provider_flow',
    email: providerEmail,
    uid: providerCredential.user.uid,
    bootstrap: providerBootstrap.data,
    avatarPath: providerAvatarFinalize.data?.avatarPath || null,
    identityDocument: identityFinalize.data || null,
    professionalDocument: professionalFinalize.data || null,
    submitResult: submitResult.data || null,
    providerStatus: providerDoc.data()?.status || null,
    reviewState: providerDoc.data()?.reviewState || null,
    adminReview: providerDoc.data()?.adminReview || null,
    directoryExistsWhilePending: providerDirectoryDoc.exists(),
    adminReviewAsProvider: adminReviewError,
  });

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: normalizeCallableError(error),
  }, null, 2));
  process.exit(1);
});
