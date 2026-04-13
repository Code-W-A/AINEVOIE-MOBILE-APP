import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function UpcomingBookingScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/upcomingBooking/upcomingBookingScreen', params }} />;
}
