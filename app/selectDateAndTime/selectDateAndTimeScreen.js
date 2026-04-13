import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SelectDateAndTimeScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/selectDateAndTime/selectDateAndTimeScreen', params }} />;
}
