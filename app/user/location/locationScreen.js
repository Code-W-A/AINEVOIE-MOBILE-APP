import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import SharedUserLocationScreen from '../../../src/features/shared/screens/SharedUserLocationScreen';

export default function UserLocationScreen() {
  const params = useLocalSearchParams();
  const flow = params.context === 'booking' ? 'booking' : 'profile';

  return <SharedUserLocationScreen flow={flow} />;
}
