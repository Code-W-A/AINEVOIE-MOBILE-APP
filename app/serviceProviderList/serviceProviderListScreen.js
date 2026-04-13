import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ServiceProviderListScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/serviceProviderList/serviceProviderListScreen', params }} />;
}
