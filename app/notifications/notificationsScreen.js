import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function NotificationsScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/notifications/notificationsScreen', params }} />;
}
