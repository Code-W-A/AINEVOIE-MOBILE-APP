import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function UpcomingBookingDetailScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/upcomingBookingDetail/upcomingBookingDetailScreen', params }} />;
}
