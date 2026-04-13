import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchProviderDirectoryProfile } from '../src/firebase/providerDirectoryStore';

export function useProviderPublicProfile(providerId) {
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProvider = useCallback(async () => {
    if (!providerId) {
      setProvider(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const nextProvider = await fetchProviderDirectoryProfile(providerId);
      setProvider(nextProvider);
    } catch {
      setProvider(null);
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      void loadProvider();
    }, [loadProvider]),
  );

  return {
    provider,
    isLoading,
    loadProvider,
  };
}
