import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function BookingSuccessScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/bookingSuccess/bookingSuccessScreen', params }} />;
}
