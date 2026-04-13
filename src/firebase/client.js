import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const functionsRegion = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'europe-west1';

let cachedServices = null;

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every((value) => String(value || '').trim().length > 0);
}

export function getFirebaseConfigError() {
  if (isFirebaseConfigured()) {
    return null;
  }

  return 'Firebase config is missing. Add the EXPO_PUBLIC_FIREBASE_* variables before using backend auth.';
}

export function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    throw new Error(getFirebaseConfigError());
  }

  if (cachedServices) {
    return cachedServices;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  let auth;

  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      auth = getAuth(app);
    }
  }

  const db = getFirestore(app);
  const functions = getFunctions(app, functionsRegion);
  const storage = getStorage(app);

  cachedServices = {
    app,
    auth,
    db,
    functions,
    storage,
  };

  return cachedServices;
}
