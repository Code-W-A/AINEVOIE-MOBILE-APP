import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TermsOfUseScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/termsOfUse/termsOfUseScreen', params }} />;
}
