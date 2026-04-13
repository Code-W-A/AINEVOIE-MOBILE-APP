import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ServiceProviderScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/serviceProvider/serviceProviderScreen', params }} />;
}
