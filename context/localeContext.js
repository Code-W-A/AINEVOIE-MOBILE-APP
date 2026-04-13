import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createTranslator,
  getDevicePreferredLocale,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  setRuntimeLocale,
  supportedLocales,
} from '../src/features/shared/localization';
import { useSession } from './sessionContext';
import { saveRoleLocale } from '../src/firebase/profileStore';

const LocaleContext = createContext(null);

async function readStoredLocale() {
  try {
    const storedValue = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    return storedValue ? normalizeLocale(storedValue) : null;
  } catch {
    return null;
  }
}

export function LocaleProvider({ children }) {
  const { session } = useSession();
  const [locale, setLocaleState] = useState('ro');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateLocale() {
      const storedLocale = await readStoredLocale();
      const nextLocale = storedLocale || getDevicePreferredLocale();

      if (!isMounted) {
        return;
      }

      setLocaleState(nextLocale);
      setRuntimeLocale(nextLocale);
      setIsHydrated(true);
    }

    hydrateLocale();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setRuntimeLocale(locale);
  }, [locale]);

  const setLocale = useCallback(async (nextLocale) => {
    const normalizedLocale = normalizeLocale(nextLocale);
    setLocaleState(normalizedLocale);
    setRuntimeLocale(normalizedLocale);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, normalizedLocale);

    if (session.isAuthenticated && session.activeRole && session.uid && !session.configError) {
      await saveRoleLocale(session.activeRole, session.uid, normalizedLocale).catch(() => undefined);
    }
  }, [session.activeRole, session.configError, session.isAuthenticated, session.uid]);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo(() => ({
    locale,
    isHydrated,
    supportedLocales,
    setLocale,
    t,
  }), [isHydrated, locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error('useLocale must be used within LocaleProvider');
  }

  return value;
}
