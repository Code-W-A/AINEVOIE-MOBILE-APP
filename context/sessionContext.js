import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseAuthSignOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { DEFAULT_LOCALE } from '@ainevoie/firebase-shared';
import { callBootstrapSession } from '../src/firebase/bootstrap';
import { buildMaskedPhoneNumber, getGoogleAuthConfigError, normalizePhoneToE164 } from '../src/firebase/authHelpers';
import { getFirebaseConfigError, getFirebaseServices, isFirebaseConfigured } from '../src/firebase/client';

const SESSION_STORAGE_KEY = '@ainevoie/session';
const LEGACY_SESSION_STORAGE_KEY = '@urbanhome/session';

const defaultAuthFlow = {
  role: null,
  authMethod: 'email',
  intent: 'login',
  phoneNumber: '',
  email: '',
  name: '',
};

const defaultAuthContext = {
  authMethod: 'email',
  phoneNumber: '',
  email: '',
};

const defaultPersistedSession = {
  lastRole: 'user',
  authFlow: defaultAuthFlow,
  authContext: defaultAuthContext,
};

const SessionContext = createContext(null);

function normalizeAuthFlow(authFlow) {
  return {
    role: authFlow?.role === 'provider' ? 'provider' : authFlow?.role === 'user' ? 'user' : null,
    authMethod: ['email', 'phone', 'google', 'apple'].includes(authFlow?.authMethod) ? authFlow.authMethod : 'email',
    intent: authFlow?.intent === 'signup' ? 'signup' : 'login',
    phoneNumber: String(authFlow?.phoneNumber || '').trim(),
    email: String(authFlow?.email || '').trim(),
    name: String(authFlow?.name || '').trim(),
  };
}

function normalizeAuthContext(authContext) {
  return {
    authMethod: ['email', 'phone', 'google', 'apple'].includes(authContext?.authMethod) ? authContext.authMethod : 'email',
    phoneNumber: String(authContext?.phoneNumber || '').trim(),
    email: String(authContext?.email || '').trim(),
  };
}

function getPersistedShape(session) {
  return {
    lastRole: session.lastRole,
    authFlow: normalizeAuthFlow(session.authFlow),
    authContext: normalizeAuthContext(session.authContext),
  };
}

function getAuthMethodFromUser(user) {
  const providerIds = Array.isArray(user?.providerData) ? user.providerData.map((provider) => provider?.providerId).filter(Boolean) : [];

  if (providerIds.includes('phone')) {
    return 'phone';
  }

  if (providerIds.includes('google.com')) {
    return 'google';
  }

  if (providerIds.includes('apple.com')) {
    return 'apple';
  }

  return 'email';
}

function getAuthContextFromUser(user) {
  if (!user) {
    return defaultAuthContext;
  }

  return {
    authMethod: getAuthMethodFromUser(user),
    phoneNumber: String(user.phoneNumber || '').trim(),
    email: String(user.email || '').trim(),
  };
}

function getSignupBootstrapPayload(authFlow) {
  if (authFlow?.intent !== 'signup') {
    return {};
  }

  return {
    intendedRole: authFlow.role === 'provider' ? 'provider' : 'user',
    displayName: String(authFlow.name || '').trim(),
    locale: DEFAULT_LOCALE,
  };
}

async function readStoredSession() {
  const currentValue = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

  if (currentValue) {
    return currentValue;
  }

  const legacyValue = await AsyncStorage.getItem(LEGACY_SESSION_STORAGE_KEY);

  if (!legacyValue) {
    return null;
  }

  await AsyncStorage.setItem(SESSION_STORAGE_KEY, legacyValue);
  await AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  return legacyValue;
}

export function SessionProvider({ children }) {
  const authFlowRef = useRef(defaultAuthFlow);
  const phoneConfirmationRef = useRef(null);
  const manualBootstrapRef = useRef(false);
  const bootstrapRequestIdRef = useRef(0);
  const persistChainRef = useRef(Promise.resolve());
  const [session, setSession] = useState({
    ...defaultPersistedSession,
    isHydrated: false,
    isBootstrapping: false,
    isAuthenticated: false,
    uid: null,
    activeRole: null,
    accountStatus: null,
    providerStatus: null,
    bootstrap: null,
    bootstrapError: null,
    configError: getFirebaseConfigError(),
  });

  const persistSession = useCallback(async (updater) => {
    let nextSessionState;

    setSession((currentSession) => {
      nextSessionState = typeof updater === 'function' ? updater(currentSession) : updater;
      return nextSessionState;
    });

    if (!nextSessionState) {
      return;
    }

    const persistedShape = getPersistedShape(nextSessionState);
    persistChainRef.current = persistChainRef.current
      .then(() => AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persistedShape)))
      .then(() => AsyncStorage.removeItem(LEGACY_SESSION_STORAGE_KEY))
      .catch(() => undefined);

    await persistChainRef.current;
  }, []);

  useEffect(() => {
    authFlowRef.current = session.authFlow;
  }, [session.authFlow]);

  const markSignedOut = useCallback(async (reason = null) => {
    phoneConfirmationRef.current = null;
    await persistSession((currentSession) => ({
      ...currentSession,
      isHydrated: true,
      isBootstrapping: false,
      isAuthenticated: false,
      uid: null,
      activeRole: null,
      accountStatus: null,
      providerStatus: null,
      bootstrap: null,
      authFlow: defaultAuthFlow,
      authContext: defaultAuthContext,
      bootstrapError: reason,
      configError: getFirebaseConfigError(),
    }));
  }, [persistSession]);

  const performBootstrap = useCallback(async (firebaseUser, payload = {}) => {
    const requestId = ++bootstrapRequestIdRef.current;

    await persistSession((currentSession) => ({
      ...currentSession,
      isHydrated: false,
      isBootstrapping: true,
      isAuthenticated: false,
      uid: firebaseUser.uid,
      authContext: getAuthContextFromUser(firebaseUser),
      bootstrapError: null,
      configError: getFirebaseConfigError(),
    }));

    try {
      const bootstrap = await callBootstrapSession(payload);
      await firebaseUser.getIdToken(true);

      if (bootstrapRequestIdRef.current !== requestId) {
        return bootstrap;
      }

      await persistSession((currentSession) => ({
        ...currentSession,
        isHydrated: true,
        isBootstrapping: false,
        isAuthenticated: true,
        uid: firebaseUser.uid,
        activeRole: bootstrap.role,
        lastRole: bootstrap.role,
        accountStatus: bootstrap.accountStatus,
        providerStatus: bootstrap.providerStatus,
        bootstrap,
        authFlow: defaultAuthFlow,
        authContext: getAuthContextFromUser(firebaseUser),
        bootstrapError: null,
        configError: null,
      }));

      return bootstrap;
    } catch (error) {
      if (bootstrapRequestIdRef.current === requestId) {
        await markSignedOut(error instanceof Error ? error.message : 'Bootstrap failed.');
      }

      const { auth } = getFirebaseServices();
      await firebaseAuthSignOut(auth).catch(() => undefined);
      throw error;
    }
  }, [markSignedOut, persistSession]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};
    let hydrateTimer = null;

    async function hydrateSession() {
      try {
        const rawValue = await readStoredSession();
        const parsedSession = rawValue ? JSON.parse(rawValue) : defaultPersistedSession;

        if (!isMounted) {
          return;
        }

        authFlowRef.current = normalizeAuthFlow(parsedSession?.authFlow);

        await persistSession((currentSession) => ({
          ...currentSession,
          ...defaultPersistedSession,
          lastRole: parsedSession?.lastRole === 'provider' ? 'provider' : 'user',
          authFlow: normalizeAuthFlow(parsedSession?.authFlow),
          authContext: normalizeAuthContext(parsedSession?.authContext),
          isHydrated: false,
          configError: getFirebaseConfigError(),
        }));

        if (!isFirebaseConfigured()) {
          await markSignedOut(getFirebaseConfigError());
          return;
        }

        hydrateTimer = setTimeout(() => {
          if (!isMounted) {
            return;
          }
          void markSignedOut(null);
        }, 6000);

        const { auth } = getFirebaseServices();
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (hydrateTimer) {
            clearTimeout(hydrateTimer);
            hydrateTimer = null;
          }

          if (!isMounted || manualBootstrapRef.current) {
            return;
          }

          if (!firebaseUser) {
            void markSignedOut(null);
            return;
          }

          void performBootstrap(firebaseUser, getSignupBootstrapPayload(authFlowRef.current));
        });
      } catch {
        if (!isMounted) {
          return;
        }

        await markSignedOut(getFirebaseConfigError());
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
      if (hydrateTimer) {
        clearTimeout(hydrateTimer);
        hydrateTimer = null;
      }
      unsubscribe();
    };
  }, [markSignedOut, performBootstrap, persistSession]);

  const setLastRole = useCallback(async (role) => {
    await persistSession((currentSession) => ({
      ...currentSession,
      lastRole: role === 'provider' ? 'provider' : 'user',
    }));
  }, [persistSession]);

  const startAuthFlow = useCallback(async (payload) => {
    const normalizedRole = payload?.role === 'provider' ? 'provider' : 'user';

    await persistSession((currentSession) => ({
      ...currentSession,
      lastRole: normalizedRole,
      authFlow: normalizeAuthFlow({
        ...payload,
        role: normalizedRole,
      }),
    }));
  }, [persistSession]);

  const clearAuthFlow = useCallback(async () => {
    phoneConfirmationRef.current = null;
    await persistSession((currentSession) => ({
      ...currentSession,
      authFlow: defaultAuthFlow,
    }));
  }, [persistSession]);

  const signUpWithEmail = useCallback(async ({ role, name, email, password }) => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    const normalizedRole = role === 'provider' ? 'provider' : 'user';
    await startAuthFlow({
      role: normalizedRole,
      authMethod: 'email',
      intent: 'signup',
      email: email.trim(),
      name: name.trim(),
      phoneNumber: '',
    });

    const { auth } = getFirebaseServices();
    manualBootstrapRef.current = true;

    try {
      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (name.trim()) {
        await updateProfile(credentials.user, {
          displayName: name.trim(),
        });
      }

      return await performBootstrap(auth.currentUser || credentials.user, {
        intendedRole: normalizedRole,
        displayName: name.trim(),
        locale: DEFAULT_LOCALE,
      });
    } finally {
      manualBootstrapRef.current = false;
    }
  }, [performBootstrap, startAuthFlow]);

  const signInWithEmail = useCallback(async ({ email, password, roleHint }) => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    if (roleHint) {
      await setLastRole(roleHint);
    }

    await clearAuthFlow();
    const { auth } = getFirebaseServices();
    manualBootstrapRef.current = true;

    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);
      return await performBootstrap(credentials.user, {});
    } finally {
      manualBootstrapRef.current = false;
    }
  }, [clearAuthFlow, performBootstrap, setLastRole]);

  const signInWithGoogle = useCallback(async ({
    role,
    intent = 'login',
    idToken,
    accessToken,
    displayName = '',
  }) => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    if (getGoogleAuthConfigError()) {
      throw new Error(getGoogleAuthConfigError());
    }

    if (!String(idToken || '').trim() && !String(accessToken || '').trim()) {
      throw new Error('Google authentication did not return a usable token.');
    }

    const normalizedRole = role === 'provider' ? 'provider' : 'user';
    const normalizedIntent = intent === 'signup' ? 'signup' : 'login';
    const normalizedDisplayName = String(displayName || '').trim();

    await setLastRole(normalizedRole);
    await startAuthFlow({
      role: normalizedRole,
      authMethod: 'google',
      intent: normalizedIntent,
      email: '',
      name: normalizedDisplayName,
      phoneNumber: '',
    });

    const { auth } = getFirebaseServices();
    manualBootstrapRef.current = true;

    try {
      const credential = GoogleAuthProvider.credential(
        String(idToken || '').trim() || null,
        String(accessToken || '').trim() || null,
      );
      const credentials = await signInWithCredential(auth, credential);
      const resolvedDisplayName = normalizedDisplayName || credentials.user.displayName || '';

      if (resolvedDisplayName && credentials.user.displayName !== resolvedDisplayName) {
        await updateProfile(credentials.user, {
          displayName: resolvedDisplayName,
        });
      }

      return await performBootstrap(auth.currentUser || credentials.user, {
        intendedRole: normalizedRole,
        displayName: resolvedDisplayName,
        locale: DEFAULT_LOCALE,
      });
    } finally {
      manualBootstrapRef.current = false;
    }
  }, [performBootstrap, setLastRole, startAuthFlow]);

  const requestPhoneOtp = useCallback(async ({
    role,
    intent = 'login',
    phoneNumber,
    displayName = '',
  }) => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    const normalizedPhoneNumber = normalizePhoneToE164(phoneNumber);

    if (!normalizedPhoneNumber) {
      console.warn('[PhoneAuth][requestOtp] validation failed', {
        role,
        intent,
        phoneNumberPreview: buildMaskedPhoneNumber(phoneNumber),
      });
      throw new Error('Enter a valid phone number in international format.');
    }

    const normalizedRole = role === 'provider' ? 'provider' : 'user';
    const normalizedIntent = intent === 'signup' ? 'signup' : 'login';
    const maskedPhoneNumber = buildMaskedPhoneNumber(normalizedPhoneNumber);

    console.log('[PhoneAuth][requestOtp] start', {
      role: normalizedRole,
      intent: normalizedIntent,
      platform: Platform.OS,
      firebaseConfigured: isFirebaseConfigured(),
      phoneNumberPreview: maskedPhoneNumber,
    });

    await setLastRole(normalizedRole);
    await startAuthFlow({
      role: normalizedRole,
      authMethod: 'phone',
      intent: normalizedIntent,
      email: '',
      name: String(displayName || '').trim(),
      phoneNumber: normalizedPhoneNumber,
    });

    const { auth } = getFirebaseServices();

    console.log('[PhoneAuth][requestOtp] calling signInWithPhoneNumber', {
      role: normalizedRole,
      intent: normalizedIntent,
      platform: Platform.OS,
      phoneNumberPreview: maskedPhoneNumber,
      authAppName: auth?.app?.name || null,
      authTenantId: auth?.tenantId || null,
    });

    try {
      phoneConfirmationRef.current = await signInWithPhoneNumber(auth, normalizedPhoneNumber);
      console.log('[PhoneAuth][requestOtp] success', {
        role: normalizedRole,
        intent: normalizedIntent,
        platform: Platform.OS,
        phoneNumberPreview: maskedPhoneNumber,
        confirmationReady: Boolean(phoneConfirmationRef.current),
      });
    } catch (error) {
      console.error('[PhoneAuth][requestOtp] failed', {
        role: normalizedRole,
        intent: normalizedIntent,
        platform: Platform.OS,
        phoneNumberPreview: maskedPhoneNumber,
        code: error?.code || null,
        name: error?.name || null,
        message: error?.message || 'Unknown phone auth error',
        stack: error?.stack || null,
      });
      throw error;
    }

    return {
      phoneNumber: normalizedPhoneNumber,
    };
  }, [setLastRole, startAuthFlow]);

  const resendPhoneOtp = useCallback(async () => {
    const authFlow = authFlowRef.current;

    return requestPhoneOtp({
      role: authFlow.role === 'provider' ? 'provider' : 'user',
      intent: authFlow.intent === 'signup' ? 'signup' : 'login',
      phoneNumber: authFlow.phoneNumber,
      displayName: authFlow.name,
    });
  }, [requestPhoneOtp]);

  const confirmPhoneOtp = useCallback(async ({ code }) => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    const confirmation = phoneConfirmationRef.current;

    if (!confirmation) {
      throw new Error('The verification session expired. Request a new OTP code.');
    }

    const verificationCode = String(code || '').trim();

    if (verificationCode.length !== 4) {
      throw new Error('Enter the 4-digit verification code.');
    }

    const { auth } = getFirebaseServices();
    const authFlow = authFlowRef.current;
    const normalizedRole = authFlow.role === 'provider' ? 'provider' : 'user';
    const resolvedDisplayName = String(authFlow.name || '').trim();

    manualBootstrapRef.current = true;

    try {
      const credentials = await confirmation.confirm(verificationCode);

      if (resolvedDisplayName && credentials.user.displayName !== resolvedDisplayName) {
        await updateProfile(credentials.user, {
          displayName: resolvedDisplayName,
        });
      }

      const bootstrap = await performBootstrap(auth.currentUser || credentials.user, {
        intendedRole: normalizedRole,
        displayName: resolvedDisplayName,
        locale: DEFAULT_LOCALE,
      });

      phoneConfirmationRef.current = null;
      return bootstrap;
    } finally {
      manualBootstrapRef.current = false;
    }
  }, [performBootstrap]);

  const refreshBootstrap = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    const { auth } = getFirebaseServices();

    if (!auth.currentUser) {
      throw new Error('No authenticated Firebase user is available.');
    }

    manualBootstrapRef.current = true;

    try {
      return await performBootstrap(auth.currentUser, {});
    } finally {
      manualBootstrapRef.current = false;
    }
  }, [performBootstrap]);

  const requestPasswordReset = useCallback(async (email) => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    const { auth } = getFirebaseServices();
    await sendPasswordResetEmail(auth, String(email || '').trim());
  }, []);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    if (!isFirebaseConfigured()) {
      throw new Error(getFirebaseConfigError());
    }

    const { auth } = getFirebaseServices();
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      throw new Error('Password update is available only for email/password accounts.');
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }, []);

  const signOut = useCallback(async (nextRole) => {
    if (nextRole) {
      await setLastRole(nextRole);
    }

    phoneConfirmationRef.current = null;

    if (isFirebaseConfigured()) {
      const { auth } = getFirebaseServices();
      await firebaseAuthSignOut(auth);
    }

    await markSignedOut(null);
  }, [markSignedOut, setLastRole]);

  const value = useMemo(() => ({
    session,
    setLastRole,
    startAuthFlow,
    clearAuthFlow,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    requestPhoneOtp,
    resendPhoneOtp,
    confirmPhoneOtp,
    refreshBootstrap,
    requestPasswordReset,
    changePassword,
    signOut,
  }), [
    changePassword,
    clearAuthFlow,
    confirmPhoneOtp,
    refreshBootstrap,
    requestPhoneOtp,
    requestPasswordReset,
    resendPhoneOtp,
    session,
    setLastRole,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    signUpWithEmail,
    startAuthFlow,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return value;
}
