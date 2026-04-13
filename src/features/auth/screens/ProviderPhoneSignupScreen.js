import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import SharedPhoneAuthScreen from './SharedPhoneAuthScreen';
import { useSession } from '../../../../context/sessionContext';
import { useProviderOnboarding } from '../../../../hooks/useProviderOnboarding';
import { authTheme } from '../theme/authTheme';

export default function ProviderPhoneSignupScreen() {
  const { session } = useSession();
  const { isLoading, onboardingProgress, data } = useProviderOnboarding();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: authTheme.auth.background }}>
        <ActivityIndicator size="small" color={authTheme.brand.primary} />
      </View>
    );
  }

  if (
    session.isAuthenticated
    && session.activeRole === 'provider'
    && onboardingProgress.canResume
    && data.verificationStatus !== 'pending'
  ) {
    return <Redirect href="/auth/providerOnboardingScreen" />;
  }

  return <SharedPhoneAuthScreen role="provider" intent="signup" />;
}
