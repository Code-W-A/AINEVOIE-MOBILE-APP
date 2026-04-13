import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function WalletScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/(tabs)/wallet/walletScreen', params }} />;
}
