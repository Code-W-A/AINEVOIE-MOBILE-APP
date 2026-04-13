import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchProviderDirectoryList } from '../src/firebase/providerDirectoryStore';

export function useProviderDirectoryList() {
  const [providers, setProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextProviders = await fetchProviderDirectoryList();
      setProviders(nextProviders);
    } catch {
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProviders();
    }, [loadProviders]),
  );

  return {
    providers,
    isLoading,
    loadProviders,
  };
}
