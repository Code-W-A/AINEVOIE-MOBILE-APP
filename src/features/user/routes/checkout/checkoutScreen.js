import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { useUserBookings } from '../../../../../hooks/useUserBookings';
import { completeDemoPayment, createStripePaymentSheetSession } from '../../../../firebase/bookings';
import { isPaymentDemoModeEnabled } from '../../../shared/config/featureFlags';
import { DiscoveryPrimitives, DiscoveryRadius, DiscoverySpacing, DiscoveryTypography } from '../../../shared/styles/discoverySystem';
import { normalizeEstimatedHours } from '../../../shared/utils/bookingRequestDetails';
import { formatMoney } from '../../../shared/utils/mockFormatting';

function formatEstimatedHoursLabel(hours, t) {
  const safeHours = normalizeEstimatedHours(hours);
  return safeHours === 1 ? t('serviceRequest.oneHour') : t('serviceRequest.multipleHours', { hours: safeHours });
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { t } = useLocale();
  const { getBookingById, isLoading, reload } = useUserBookings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDemoPaymentMode = isPaymentDemoModeEnabled();

  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;
  const booking = bookingId ? getBookingById(bookingId) : null;
  const totalLabel = useMemo(
    () => formatMoney(booking?.price?.amount ?? 0, booking?.price?.currency),
    [booking?.price?.amount, booking?.price?.currency],
  );
  const canPay = booking?.lifecycleStatus === 'confirmed'
    && ['unpaid', 'failed'].includes(booking?.payment?.status);

  async function handlePayPress() {
    if (!bookingId || !canPay || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isDemoPaymentMode) {
        await completeDemoPayment(bookingId);
        await reload();
        router.replace({
          pathname: '/user/paymentStatus/paymentStatusScreen',
          params: {
            bookingId,
            processing: '1',
          },
        });
        return;
      }

      const session = await createStripePaymentSheetSession(bookingId);
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'AI Nevoie',
        paymentIntentClientSecret: session.paymentIntentClientSecret,
        returnURL: 'ainevoie://stripe-redirect',
        allowsDelayedPaymentMethods: false,
        applePay: {
          merchantCountryCode: 'RO',
        },
        googlePay: {
          merchantCountryCode: 'RO',
          testEnv: __DEV__,
        },
      });

      if (initError) {
        throw new Error(initError.message || t('payment.errorUnknown'));
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message || t('payment.errorUnknown'));
        }
        return;
      }

      await reload();
      router.replace({
        pathname: '/user/paymentStatus/paymentStatusScreen',
        params: {
          bookingId,
          processing: '1',
        },
      });
    } catch (error) {
      Alert.alert(t('payment.errorTitle'), error?.message || t('payment.errorUnknown'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || (bookingId && !booking)) {
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

  if (!bookingId || !booking) {
    return (
      <View style={styles.screen}>
        <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
        <View style={styles.centeredWrap}>
          <Text style={styles.unavailableTitle}>{t('payment.unavailable')}</Text>
          <TouchableOpacity activeOpacity={0.92} onPress={() => router.replace('/user/(tabs)/booking/bookingScreen')} style={styles.payButton}>
            <Text style={styles.payButtonText}>{t('payment.continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
      <View style={{ flex: 1 }}>
        {header()}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {summaryCard()}
          {paymentMethodCard()}
          {totalCard()}
        </ScrollView>
      </View>
      {footer()}
    </View>
  );

  function header() {
    return (
      <View style={styles.headerWrap}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
        </TouchableOpacity>
        <Text style={DiscoveryTypography.heroEyebrow}>{t('payment.screenEyebrow')}</Text>
        <Text style={styles.headerTitle}>{t('checkout.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('checkout.subtitle')}</Text>
      </View>
    );
  }

  function summaryRow({ icon, label, value }) {
    return (
      <View style={styles.summaryRow}>
        <View style={styles.summaryIconWrap}>
          <MaterialIcons name={icon} size={18} color={Colors.discoveryMutedColor} />
        </View>
        <View style={{ flex: 1, marginLeft: DiscoverySpacing.md }}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
        </View>
      </View>
    );
  }

  function summaryCard() {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('checkout.summaryTitle')}</Text>
        <View style={{ marginTop: DiscoverySpacing.lg }}>
          {summaryRow({ icon: 'person', label: t('checkout.provider'), value: `${booking.providerName} · ${booking.providerRole}` })}
          {summaryRow({ icon: 'work', label: t('checkout.service'), value: booking.serviceName })}
          {summaryRow({ icon: 'event', label: t('checkout.dateTime'), value: `${booking.dateLabel} · ${booking.timeLabel}` })}
          {summaryRow({ icon: 'place', label: t('checkout.address'), value: booking.address })}
          {summaryRow({ icon: 'schedule', label: t('checkout.duration'), value: formatEstimatedHoursLabel(booking.requestDetails?.estimatedHours || booking.price?.estimatedHours, t) })}
          {summaryRow({ icon: 'description', label: t('checkout.requestDescription'), value: booking.requestDetails?.description || t('checkout.noDetails') })}
        </View>
      </View>
    );
  }

  function paymentMethodCard() {
    return (
      <View style={[styles.card, { marginTop: DiscoverySpacing.xl }]}>
        <Text style={styles.cardTitle}>{t('checkout.paymentMethodTitle')}</Text>
        <View style={styles.stripeMethodWrap}>
          <View style={styles.methodIconWrap}>
            <MaterialCommunityIcons name="credit-card-outline" size={22} color={Colors.whiteColor} />
          </View>
          <View style={{ flex: 1, marginLeft: DiscoverySpacing.md }}>
            <Text style={styles.methodTitle}>{isDemoPaymentMode ? t('checkout.demoPaymentTitle') : 'Stripe PaymentSheet'}</Text>
            <Text style={styles.methodSubtitle}>
              {isDemoPaymentMode ? t('checkout.demoPaymentSubtitle') : t('checkout.stripeSheetSubtitle')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function totalCard() {
    const hours = booking.price?.estimatedHours ?? normalizeEstimatedHours(booking.requestDetails?.estimatedHours);
    const amount = booking.price?.amount ?? 0;

    return (
      <View style={[styles.card, { marginTop: DiscoverySpacing.xl }]}>
        <Text style={styles.cardTitle}>{t('checkout.totalTitle')}</Text>
        <View style={{ marginTop: DiscoverySpacing.lg }}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('checkout.estimatedDuration')}</Text>
            <Text style={styles.totalValue}>{formatEstimatedHoursLabel(hours, t)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('checkout.totalToPay')}</Text>
            <Text style={styles.totalValueStrong}>{formatMoney(amount, booking.price?.currency)}</Text>
          </View>
        </View>
      </View>
    );
  }

  function footer() {
    return (
      <View style={styles.footerWrap}>
        <View style={styles.footerMeta}>
          <Text style={styles.footerMetaLabel}>{t('payment.total')}</Text>
          <Text style={styles.footerMetaValue}>{totalLabel}</Text>
        </View>
        {!canPay ? (
          <Text style={styles.disabledReason}>{t('checkout.confirmedOnly')}</Text>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={!canPay || isSubmitting}
          onPress={() => { void handlePayPress(); }}
          style={[styles.payButton, !canPay || isSubmitting ? styles.payButtonDisabled : null]}
        >
          <Text style={styles.payButtonText}>{isSubmitting ? t('payment.processing') : t('checkout.pay')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
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
  unavailableTitle: {
    ...Fonts.blackColor18Bold,
    marginBottom: DiscoverySpacing.xl,
  },
  headerWrap: {
    ...DiscoveryPrimitives.headerSurface,
  },
  headerTitle: {
    ...DiscoveryTypography.heroTitle,
    marginTop: DiscoverySpacing.xs,
  },
  headerSubtitle: {
    ...DiscoveryTypography.heroBody,
    marginTop: DiscoverySpacing.sm,
  },
  scrollContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingVertical: DiscoverySpacing.xl,
    paddingBottom: DiscoverySpacing.xxl,
  },
  card: {
    ...DiscoveryPrimitives.contentSurface,
    padding: DiscoverySpacing.xl,
  },
  cardTitle: {
    ...Fonts.blackColor18Bold,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: DiscoverySpacing.sm,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  summaryLabel: {
    ...DiscoveryTypography.caption,
  },
  summaryValue: {
    ...Fonts.blackColor14Bold,
    marginTop: 4,
    lineHeight: 20,
  },
  stripeMethodWrap: {
    ...DiscoveryPrimitives.listItemRow,
    marginTop: DiscoverySpacing.lg,
  },
  methodIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.discoveryAccentColor,
  },
  methodTitle: {
    ...Fonts.blackColor14Bold,
  },
  methodSubtitle: {
    ...DiscoveryTypography.caption,
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DiscoverySpacing.sm,
  },
  totalLabel: {
    ...DiscoveryTypography.bodyMuted,
  },
  totalValue: {
    ...Fonts.blackColor14Bold,
  },
  totalValueStrong: {
    ...Fonts.blackColor18Bold,
    color: Colors.discoveryAccentColor,
  },
  footerWrap: {
    backgroundColor: Colors.whiteColor,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
    paddingBottom: DiscoverySpacing.xl,
    borderTopLeftRadius: DiscoveryRadius.lg,
    borderTopRightRadius: DiscoveryRadius.lg,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
  },
  footerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DiscoverySpacing.md,
  },
  footerMetaLabel: {
    ...DiscoveryTypography.caption,
  },
  footerMetaValue: {
    ...Fonts.blackColor18Bold,
  },
  disabledReason: {
    ...DiscoveryTypography.caption,
    marginBottom: DiscoverySpacing.md,
  },
  payButton: {
    ...DiscoveryPrimitives.primaryButton,
  },
  payButtonDisabled: {
    backgroundColor: Colors.discoveryMutedColor,
    opacity: 0.7,
  },
  payButtonText: {
    ...Fonts.whiteColor16Bold,
  },
});
