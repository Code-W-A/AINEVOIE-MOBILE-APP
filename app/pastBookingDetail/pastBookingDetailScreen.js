import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PastBookingDetailScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/pastBookingDetail/pastBookingDetailScreen', params }} />;
}
