import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MessageScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/message/messageScreen', params }} />;
}
