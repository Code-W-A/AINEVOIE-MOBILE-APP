import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="allReviews/allReviewsScreen" />
      <Stack.Screen name="bookingSuccess/bookingSuccessScreen" options={{ gestureEnabled: false }} />
      <Stack.Screen name="cancelledBooking/cancelledBookingScreen" />
      <Stack.Screen name="cancelledBookingDetail/cancelledBookingDetailScreen" />
      <Stack.Screen name="deleteAccount/deleteAccountScreen" />
      <Stack.Screen name="editProfile/editProfileScreen" />
      <Stack.Screen name="favorite/favoriteScreen" />
      <Stack.Screen name="message/messageScreen" />
      <Stack.Screen name="location/locationScreen" />
      <Stack.Screen name="notificationPreferences/notificationPreferencesScreen" />
      <Stack.Screen name="notifications/notificationsScreen" />
      <Stack.Screen name="checkout/checkoutScreen" />
      <Stack.Screen name="paymentMethod/paymentMethodScreen" />
      <Stack.Screen name="paymentStatus/paymentStatusScreen" options={{ gestureEnabled: false }} />
      <Stack.Screen name="pastBooking/pastBookingScreen" />
      <Stack.Screen name="pastBookingDetail/pastBookingDetailScreen" />
      <Stack.Screen name="privacyPolicy/privacyPolicyScreen" />
      <Stack.Screen name="professionalServices/professionalServicesScreen" />
      <Stack.Screen name="rateProvider/rateProviderScreen" />
      <Stack.Screen name="search/searchScreen" />
      <Stack.Screen name="security/securityScreen" />
      <Stack.Screen name="selectAddress/selectAddressScreen" />
      <Stack.Screen name="selectDateAndTime/selectDateAndTimeScreen" />
      <Stack.Screen name="serviceProvider/serviceProviderScreen" />
      <Stack.Screen name="serviceProviderList/serviceProviderListScreen" />
      <Stack.Screen name="settings/accountSettingsScreen" />
      <Stack.Screen name="settings/languageScreen" />
      <Stack.Screen name="support/supportScreen" />
      <Stack.Screen name="termsOfUse/termsOfUseScreen" />
      <Stack.Screen name="upcomingBooking/upcomingBookingScreen" />
      <Stack.Screen name="upcomingBookingDetail/upcomingBookingDetailScreen" />
    </Stack>
  );
}
