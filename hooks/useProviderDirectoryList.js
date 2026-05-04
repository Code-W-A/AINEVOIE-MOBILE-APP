import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchProviderDirectoryList } from '../src/firebase/providerDirectoryStore';

export function useProviderDirectoryList() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextProviders = await fetchProviderDirectoryList();
      setProviders(nextProviders);
      setIsLoading(false);
      return nextProviders;
    } catch (nextError) {
      setError(nextError);
      setProviders([]);
      setIsLoading(false);
      return [];
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProviders();
    }, [loadProviders]),
  );

  return {
    providers,
    data: providers,
    list: providers,
    isLoading,
    error,
    loadProviders,
    reload: loadProviders,
  };
}
