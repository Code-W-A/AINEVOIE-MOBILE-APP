import React from 'react';
import { Redirect } from 'expo-router';
import { getAuthRouteForRole } from '../../../../utils/roleRoutes';

export default function UserOnboardingScreen() {
  return <Redirect href={getAuthRouteForRole('user')} />;
}
