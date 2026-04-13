import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PrivacyPolicyScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/privacyPolicy/privacyPolicyScreen', params }} />;
}
