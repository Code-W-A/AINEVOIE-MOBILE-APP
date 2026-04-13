import { Stack } from 'expo-router';

export default function ProviderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
      <Stack.Screen name="auth/otpScreen" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="allBookings/allBookingsScreen" />
      <Stack.Screen name="bookingRequest/bookingRequestScreen" />
      <Stack.Screen name="deleteAccount/deleteAccountScreen" />
      <Stack.Screen name="nextBookingRequestDetail/nextBookingRequestDetailScreen" />
      <Stack.Screen name="upcomingBookingDetail/upcomingBookingDetailScreen" />
      <Stack.Screen name="message/messageScreen" />
      <Stack.Screen name="notificationPreferences/notificationPreferencesScreen" />
      <Stack.Screen name="notifications/notificationsScreen" />
      <Stack.Screen name="availability/providerAvailabilityScreen" />
      <Stack.Screen name="security/securityScreen" />
      <Stack.Screen name="settings/accountSettingsScreen" />
      <Stack.Screen name="settings/languageScreen" />
      <Stack.Screen name="services/providerServicesScreen" />
      <Stack.Screen name="services/serviceFormScreen" />
      <Stack.Screen name="editProfile/editProfileScreen" />
      <Stack.Screen name="privacyPolicy/privacyPolicyScreen" />
      <Stack.Screen name="termsOfUse/termsOfUseScreen" />
      <Stack.Screen name="support/supportScreen" />
    </Stack>
  );
}
