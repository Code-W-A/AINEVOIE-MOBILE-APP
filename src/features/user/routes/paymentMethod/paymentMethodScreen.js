import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryTypography } from '../../../shared/styles/discoverySystem';

export default function PaymentMethodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;

  useEffect(() => {
    if (!bookingId) {
      router.replace('/user/(tabs)/booking/bookingScreen');
      return;
    }

    router.replace({
      pathname: '/user/checkout/checkoutScreen',
      params: { bookingId },
    });
  }, [bookingId, router]);

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
      <View style={styles.centeredWrap}>
        <ActivityIndicator size="large" color={Colors.discoveryAccentColor} />
        <Text style={styles.loadingText}>{t('payment.generating')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  centeredWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DiscoverySpacing.xl,
  },
  loadingText: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: DiscoverySpacing.md,
  },
});
