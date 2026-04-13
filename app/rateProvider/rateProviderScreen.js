import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RateProviderScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/rateProvider/rateProviderScreen', params }} />;
}
