import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { useCallback, useState } from 'react';

export default function useDoubleBackExit(timeoutMs = 1000) {
  const [backClickCount, setBackClickCount] = useState(0);

  const springBackHint = useCallback(() => {
    setBackClickCount(1);
    const timeoutId = setTimeout(() => {
      setBackClickCount(0);
    }, timeoutMs);

    return () => clearTimeout(timeoutId);
  }, [timeoutMs]);

  const backAction = useCallback(() => {
    if (backClickCount === 1) {
      BackHandler.exitApp();
      return true;
    }

    springBackHint();
    return true;
  }, [backClickCount, springBackHint]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => {
        backHandler.remove();
      };
    }, [backAction])
  );

  return backClickCount;
}
