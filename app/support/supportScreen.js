import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SupportScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/support/supportScreen', params }} />;
}
