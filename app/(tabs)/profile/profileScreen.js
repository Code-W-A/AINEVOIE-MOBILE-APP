import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ProfileScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/(tabs)/profile/profileScreen', params }} />;
}
