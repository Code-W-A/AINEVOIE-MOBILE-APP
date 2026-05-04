import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchProviderDirectoryProfile } from '../src/firebase/providerDirectoryStore';

export function useProviderPublicProfile(providerId) {
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(providerId));
  const [error, setError] = useState(null);

  const loadProvider = useCallback(async () => {
    if (!providerId) {
      setProvider(null);
      setIsLoading(false);
      return null;
    }

    setError(null);
    setIsLoading(true);

    try {
      const nextProvider = await fetchProviderDirectoryProfile(providerId);
      setProvider(nextProvider);
      return nextProvider;
    } catch (nextError) {
      setError(nextError);
      setProvider(null);
      return null;
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
    data: provider,
    isLoading,
    error,
    loadProvider,
    reload: loadProvider,
  };
}
