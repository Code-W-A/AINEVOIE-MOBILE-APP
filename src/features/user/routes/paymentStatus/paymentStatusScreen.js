import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { DiscoveryPrimitives, DiscoveryRadius, DiscoverySpacing, DiscoveryTypography } from '../../../shared/styles/discoverySystem';
import { useUserBookings } from '../../../../../hooks/useUserBookings';
import { formatMoney } from '../../../shared/utils/mockFormatting';
import { getPaymentMethodLabel, getPaymentStatusUi } from '../../../shared/utils/paymentUi';

export default function PaymentStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { getBookingById, updateBookingPayment } = useUserBookings();

  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;
  const paymentOutcome = typeof params.paymentOutcome === 'string' ? params.paymentOutcome : '';
  const booking = bookingId ? getBookingById(bookingId) : null;

  const [phase, setPhase] = useState('processing');
  const shouldFail = paymentOutcome === 'failed'
    || (paymentOutcome !== 'success' && booking?.payment?.method === 'card' && booking?.payment?.last4 === '0000');

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    setPhase('processing');

    const timer = setTimeout(() => {
      void updateBookingPayment(bookingId, { status: shouldFail ? 'failed' : 'paid' }).finally(() => {
        setPhase(shouldFail ? 'failed' : 'success');
      });
    }, 1300);

    return () => clearTimeout(timer);
  }, [bookingId, shouldFail, updateBookingPayment]);

  const totalLabel = useMemo(() => formatMoney(booking?.price?.amount ?? 0, booking?.price?.currency), [booking?.price?.amount, booking?.price?.currency]);
  const methodLabel = useMemo(() => getPaymentMethodLabel(booking?.payment?.method, booking?.payment?.last4), [booking?.payment?.last4, booking?.payment?.method]);
  const phaseStatusUi = useMemo(() => {
    if (phase === 'processing') {
      return getPaymentStatusUi('in_progress');
    }

    if (phase === 'failed') {
      return getPaymentStatusUi('failed');
    }

    return getPaymentStatusUi('paid');
  }, [phase]);

  const isProcessing = phase === 'processing';
  const isSuccess = phase === 'success';
  const isFailed = phase === 'failed';

  const titleText = isSuccess
    ? t('payment.statusSuccessTitle')
    : isFailed
      ? t('payment.statusFailedTitle')
      : t('payment.statusProcessingTitle');
  const subtitleText = isSuccess
    ? t('payment.statusSuccessSubtitle')
    : isFailed
      ? t('payment.statusFailedSubtitle')
      : t('payment.statusProcessingSubtitle');
  const transactionLabel = booking?.payment?.transactionId || (isFailed ? t('payment.unavailable') : t('payment.generating'));

  function handleRetry() {
    if (!bookingId) {
      return;
    }

    router.replace({ pathname: '/user/paymentMethod/paymentMethodScreen', params: { bookingId } });
  }

  function handleBackToCheckout() {
    if (!bookingId) {
      return;
    }

    router.replace({ pathname: '/user/checkout/checkoutScreen', params: { bookingId } });
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
      <View style={styles.brandBackdrop} />
      <View style={styles.contentWrap}>
        <View style={styles.statusCard}>
          <View style={[DiscoveryPrimitives.badge, { backgroundColor: phaseStatusUi.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: phaseStatusUi.color }]}>{phaseStatusUi.label}</Text>
          </View>

          <View style={[styles.iconWrap, isFailed ? styles.iconWrapFailed : null]}>
            {isProcessing ? (
              <ActivityIndicator size="large" color={Colors.discoveryAccentColor} />
            ) : isFailed ? (
              <View style={styles.failedIcon}>
                <MaterialIcons name="close" size={22} color={Colors.whiteColor} />
              </View>
            ) : (
              <View style={styles.successIcon}>
                <MaterialIcons name="check" size={22} color={Colors.whiteColor} />
              </View>
            )}
          </View>

          <Text style={styles.titleText}>{titleText}</Text>
          <Text style={styles.subtitleText}>{subtitleText}</Text>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Total</Text>
              <Text style={styles.metaValue}>{totalLabel}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('payment.method')}</Text>
              <Text style={styles.metaValue}>{methodLabel}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('payment.transactionId')}</Text>
              <Text style={styles.metaValue}>{transactionLabel}</Text>
            </View>
          </View>

          {booking?.providerName ? (
            <View style={styles.providerRow}>
              <View style={styles.providerBadge}>
                <MaterialCommunityIcons name="account-outline" size={16} color={Colors.discoveryMutedColor} />
              </View>
              <Text style={styles.providerText} numberOfLines={1}>{booking.providerName}</Text>
            </View>
          ) : null}
        </View>

        {isFailed ? (
          <>
            <TouchableOpacity activeOpacity={0.92} onPress={handleRetry} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t('payment.retry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.92} onPress={handleBackToCheckout} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('payment.backToCheckout')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.92}
            disabled={!isSuccess}
            onPress={() => router.replace('/user/bookingSuccess/bookingSuccessScreen')}
            style={[styles.primaryButton, !isSuccess ? styles.primaryButtonDisabled : null]}
          >
            <Text style={styles.primaryButtonText}>{isSuccess ? t('payment.continue') : t('payment.processing')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  brandBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: Colors.discoveryDarkColor,
    borderBottomLeftRadius: DiscoveryRadius.xl,
    borderBottomRightRadius: DiscoveryRadius.xl,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: DiscoverySpacing.xl,
  },
  statusCard: {
    ...DiscoveryPrimitives.elevatedSurface,
    padding: DiscoverySpacing.xl,
    alignItems: 'center',
  },
  badgeText: {
    ...Fonts.blackColor14Bold,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(211,84,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DiscoverySpacing.lg,
  },
  iconWrapFailed: {
    backgroundColor: 'rgba(217,72,65,0.08)',
  },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.discoveryAccentColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D94841',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    ...Fonts.blackColor24Bold,
    textAlign: 'center',
    marginTop: DiscoverySpacing.lg,
  },
  subtitleText: {
    ...DiscoveryTypography.bodyMuted,
    textAlign: 'center',
    marginTop: DiscoverySpacing.md,
  },
  metaCard: {
    width: '100%',
    marginTop: DiscoverySpacing.xl,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    borderRadius: DiscoveryRadius.lg,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    padding: DiscoverySpacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaLabel: {
    ...DiscoveryTypography.caption,
  },
  metaValue: {
    ...Fonts.blackColor14Bold,
    marginLeft: DiscoverySpacing.md,
    flexShrink: 1,
    textAlign: 'right',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.lg,
  },
  providerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DiscoverySpacing.sm,
  },
  providerText: {
    ...Fonts.blackColor14Bold,
  },
  primaryButton: {
    ...DiscoveryPrimitives.primaryButton,
    marginTop: DiscoverySpacing.xl,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.discoveryMutedColor,
    opacity: 0.75,
  },
  primaryButtonText: {
    ...Fonts.whiteColor16Bold,
  },
  secondaryButton: {
    ...DiscoveryPrimitives.secondaryButton,
    marginTop: DiscoverySpacing.md,
  },
  secondaryButtonText: {
    ...Fonts.blackColor16Bold,
    color: Colors.discoveryAccentColor,
  },
});
