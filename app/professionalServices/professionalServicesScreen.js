import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ProfessionalServicesScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/professionalServices/professionalServicesScreen', params }} />;
}
