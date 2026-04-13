import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ChatScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/(tabs)/chat/chatScreen', params }} />;
}
