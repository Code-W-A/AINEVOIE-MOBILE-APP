import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
      <Stack.Screen name="onboardingScreen" options={{ gestureEnabled: false }} />
      <Stack.Screen name="userOnboardingScreen" />
      <Stack.Screen name="providerOnboardingScreen" />
      <Stack.Screen name="loginScreen" options={{ gestureEnabled: false }} />
      <Stack.Screen name="userLoginScreen" />
      <Stack.Screen name="providerLoginScreen" />
      <Stack.Screen name="userPhoneLoginScreen" />
      <Stack.Screen name="providerPhoneLoginScreen" />
      <Stack.Screen name="userForgotPasswordScreen" />
      <Stack.Screen name="providerForgotPasswordScreen" />
      <Stack.Screen name="userResetPasswordScreen" />
      <Stack.Screen name="providerResetPasswordScreen" />
      <Stack.Screen name="userSignupScreen" />
      <Stack.Screen name="providerSignupScreen" />
      <Stack.Screen name="userPhoneSignupScreen" />
      <Stack.Screen name="providerPhoneSignupScreen" />
      <Stack.Screen name="userLocationSetupScreen" />
      <Stack.Screen name="privacyPolicyScreen" />
      <Stack.Screen name="termsOfUseScreen" />
      <Stack.Screen name="registerScreen" />
      <Stack.Screen name="otpScreen" />
    </Stack>
  );
}
