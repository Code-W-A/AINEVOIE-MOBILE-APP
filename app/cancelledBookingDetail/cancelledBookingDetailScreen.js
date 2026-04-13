import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CancelledBookingDetailScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/cancelledBookingDetail/cancelledBookingDetailScreen', params }} />;
}
