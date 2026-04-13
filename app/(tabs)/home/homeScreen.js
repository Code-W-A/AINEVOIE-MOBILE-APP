import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function HomeScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/(tabs)/home/homeScreen', params }} />;
}
