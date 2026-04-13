import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function BookingScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/(tabs)/booking/bookingScreen', params }} />;
}
