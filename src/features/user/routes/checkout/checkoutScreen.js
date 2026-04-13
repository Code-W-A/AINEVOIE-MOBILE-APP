import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLocale } from '../../../../../context/localeContext';
import { normalizeEstimatedHours, normalizeRequestDetails } from '../../../shared/utils/bookingRequestDetails';
import { DiscoveryPrimitives, DiscoveryRadius, DiscoverySpacing, DiscoveryTypography } from '../../../shared/styles/discoverySystem';
import { useUserPrimaryLocation } from '../../../../../hooks/useUserPrimaryLocation';
import { useUserBookings } from '../../../../../hooks/useUserBookings';
import { DEFAULT_MOCK_CURRENCY, formatMoney, normalizeMockCurrency } from '../../../shared/utils/mockFormatting';
import { getProviderDisplaySnapshot } from '../../../shared/utils/providerDirectory';

function parseNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function formatEstimatedHoursLabel(hours, t) {
  const safeHours = normalizeEstimatedHours(hours);
  return safeHours === 1 ? t('serviceRequest.oneHour') : t('serviceRequest.multipleHours', { hours: safeHours });
}

function buildWalletAvailability() {
  return {
    applePay: Platform.OS === 'ios',
    googlePay: Platform.OS === 'android',
  };
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { location } = useUserPrimaryLocation();
  const { getBookingById, updateBookingPayment, createBooking } = useUserBookings();

  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;
  const existingBooking = bookingId ? getBookingById(bookingId) : null;
  const requestKey = useMemo(
    () => (typeof params.requestKey === 'string' && params.requestKey ? params.requestKey : `req_${Date.now()}`),
    [params.requestKey],
  );

  const walletAvailability = buildWalletAvailability();

  const draft = useMemo(() => {
    if (existingBooking) {
      return {
        providerId: existingBooking.providerId,
        providerName: existingBooking.providerName,
        providerRole: existingBooking.providerRole,
        providerImage: existingBooking.providerImage,
        serviceId: existingBooking.serviceId,
        serviceName: existingBooking.serviceName,
        scheduledDateKey: existingBooking.scheduledDateKey,
        scheduledStartTime: existingBooking.scheduledStartTime,
        timezone: existingBooking.timezone,
        dateLabel: existingBooking.dateLabel,
        timeLabel: existingBooking.timeLabel,
        address: existingBooking.address,
        price: existingBooking.price,
        requestDetails: existingBooking.requestDetails,
        bookingStatus: existingBooking.bookingStatus,
        requestKey: existingBooking.requestKey || requestKey,
      };
    }

    const providerSnapshot = getProviderDisplaySnapshot({
      providerId: typeof params.providerId === 'string' ? params.providerId : '',
      providerName: typeof params.providerName === 'string' ? params.providerName : 'Prestator',
      providerRole: typeof params.providerRole === 'string' ? params.providerRole : 'Serviciu',
    });
    const serviceName = typeof params.serviceName === 'string' ? params.serviceName : 'Serviciu';
    const dateLabel = typeof params.dateLabel === 'string' ? params.dateLabel : 'Astăzi';
    const timeLabel = typeof params.timeLabel === 'string' ? params.timeLabel : '10:00 AM';
    const address = typeof params.address === 'string'
      ? params.address
      : (location?.formattedAddress || '—');
    const currency = normalizeMockCurrency(typeof params.currency === 'string' ? params.currency : DEFAULT_MOCK_CURRENCY);
    const ratePerHour = parseNumber(params.ratePerHour);
    const estimatedHours = normalizeEstimatedHours(params.estimatedHours);
    const amount = parseNumber(params.amount) || ratePerHour * estimatedHours;
    const requestDetails = normalizeRequestDetails({
      description: typeof params.requestDescription === 'string' ? params.requestDescription : '',
      estimatedHours,
    }, estimatedHours);

    return {
      providerId: providerSnapshot.providerId,
      providerName: providerSnapshot.providerName,
      providerRole: providerSnapshot.providerRole,
      providerImage: providerSnapshot.providerImage,
      serviceId: typeof params.serviceId === 'string' ? params.serviceId : '',
      serviceName,
      scheduledDateKey: typeof params.scheduledDateKey === 'string' ? params.scheduledDateKey : '',
      scheduledStartTime: typeof params.scheduledStartTime === 'string' ? params.scheduledStartTime : '',
      timezone: typeof params.timezone === 'string' ? params.timezone : 'Europe/Bucharest',
      dateLabel,
      timeLabel,
      address,
      price: {
        amount,
        currency,
        unit: 'oră',
        estimatedHours,
      },
      requestDetails,
      bookingStatus: 'upcoming',
      requestKey,
    };
  }, [existingBooking, location?.formattedAddress, params, requestKey, t]);

  const [selectedMethod, setSelectedMethod] = useState('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalLabel = formatMoney(draft.price?.amount ?? 0, draft.price?.currency);

  const isApplePayDisabled = !walletAvailability.applePay;
  const isGooglePayDisabled = !walletAvailability.googlePay;

  const isPayDisabled = selectedMethod === 'apple_pay' ? isApplePayDisabled : selectedMethod === 'google_pay' ? isGooglePayDisabled : false;

  async function handlePayPress() {
    if (isPayDisabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedMethod === 'card') {
        const nextParams = buildCheckoutParams(draft, bookingId);
        router.push({ pathname: '/user/paymentMethod/paymentMethodScreen', params: nextParams });
        return;
      }

      const payload = {
        status: 'in_progress',
        method: selectedMethod,
      };

      const nextBooking = bookingId
        ? await updateBookingPayment(bookingId, payload)
        : await createBooking({ draft, payment: payload });

      router.replace({
        pathname: '/user/paymentStatus/paymentStatusScreen',
        params: {
          bookingId: nextBooking.id,
          paymentOutcome: 'success',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
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
          {summaryRow({ icon: 'person', label: t('checkout.provider'), value: `${draft.providerName} · ${draft.providerRole}` })}
          {summaryRow({ icon: 'work', label: t('checkout.service'), value: draft.serviceName })}
          {summaryRow({ icon: 'event', label: t('checkout.dateTime'), value: `${draft.dateLabel} · ${draft.timeLabel}` })}
          {summaryRow({ icon: 'place', label: t('checkout.address'), value: draft.address })}
          {summaryRow({ icon: 'schedule', label: t('checkout.duration'), value: formatEstimatedHoursLabel(draft.requestDetails?.estimatedHours || draft.price?.estimatedHours, t) })}
          {summaryRow({ icon: 'description', label: t('checkout.requestDescription'), value: draft.requestDetails?.description || t('checkout.noDetails') })}
        </View>
      </View>
    );
  }

  function methodRow({ id, title, subtitle, icon, disabled }) {
    const isSelected = selectedMethod === id;
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        disabled={disabled}
        onPress={() => setSelectedMethod(id)}
        style={[
          styles.methodRow,
          isSelected ? styles.methodRowSelected : null,
          disabled ? styles.methodRowDisabled : null,
        ]}
      >
        <View style={[styles.methodIconWrap, isSelected ? styles.methodIconWrapSelected : null]}>
          <MaterialCommunityIcons name={icon} size={20} color={isSelected ? Colors.whiteColor : Colors.discoveryMutedColor} />
        </View>
        <View style={{ flex: 1, marginLeft: DiscoverySpacing.md }}>
          <Text style={styles.methodTitle}>{title}</Text>
          <Text style={styles.methodSubtitle}>{subtitle}</Text>
        </View>
        {isSelected ? <MaterialIcons name="check" size={18} color={Colors.discoveryAccentColor} /> : null}
      </TouchableOpacity>
    );
  }

  function paymentMethodCard() {
    return (
      <View style={[styles.card, { marginTop: DiscoverySpacing.xl }]}>
        <Text style={styles.cardTitle}>{t('checkout.paymentMethodTitle')}</Text>
        <View style={{ marginTop: DiscoverySpacing.lg }}>
          {methodRow({
            id: 'card',
            title: t('payment.card'),
            subtitle: t('checkout.cardSubtitle'),
            icon: 'credit-card-outline',
            disabled: false,
          })}
          {methodRow({
            id: 'apple_pay',
            title: 'Apple Pay',
            subtitle: walletAvailability.applePay ? t('checkout.applePaySubtitle') : t('checkout.applePayDisabled'),
            icon: 'apple',
            disabled: isApplePayDisabled,
          })}
          {methodRow({
            id: 'google_pay',
            title: 'Google Pay',
            subtitle: walletAvailability.googlePay ? t('checkout.googlePaySubtitle') : t('checkout.googlePayDisabled'),
            icon: 'google',
            disabled: isGooglePayDisabled,
          })}
        </View>
      </View>
    );
  }

  function totalCard() {
    const hours = draft.price?.estimatedHours ?? normalizeEstimatedHours(draft.requestDetails?.estimatedHours);
    const amount = draft.price?.amount ?? 0;

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
            <Text style={styles.totalValueStrong}>{formatMoney(amount, draft.price?.currency)}</Text>
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
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={isPayDisabled || isSubmitting}
          onPress={() => { void handlePayPress(); }}
          style={[styles.payButton, isPayDisabled || isSubmitting ? styles.payButtonDisabled : null]}
        >
          <Text style={styles.payButtonText}>{t('checkout.pay')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

function buildCheckoutParams(draft, bookingId) {
  const params = {
    providerId: draft.providerId,
    providerName: draft.providerName,
    providerRole: draft.providerRole,
    serviceId: draft.serviceId || '',
    serviceName: draft.serviceName,
    scheduledDateKey: draft.scheduledDateKey || '',
    scheduledStartTime: draft.scheduledStartTime || '',
    timezone: draft.timezone || 'Europe/Bucharest',
    dateLabel: draft.dateLabel,
    timeLabel: draft.timeLabel,
    address: draft.address,
    amount: String(draft.price?.amount ?? 0),
    currency: draft.price?.currency ?? DEFAULT_MOCK_CURRENCY,
    estimatedHours: String(draft.price?.estimatedHours ?? normalizeEstimatedHours(draft.requestDetails?.estimatedHours)),
    ratePerHour: String(parseNumber(draft.price?.amount ?? 0) / (parseNumber(draft.price?.estimatedHours ?? normalizeEstimatedHours(draft.requestDetails?.estimatedHours)) || normalizeEstimatedHours(draft.requestDetails?.estimatedHours))),
    requestDescription: draft.requestDetails?.description || '',
    requestKey: draft.requestKey || '',
  };

  if (bookingId) {
    params.bookingId = bookingId;
  }

  return params;
}

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
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
  methodRow: {
    ...DiscoveryPrimitives.listItemRow,
    marginBottom: DiscoverySpacing.md,
  },
  methodRowSelected: {
    borderColor: 'rgba(211,84,0,0.35)',
    backgroundColor: 'rgba(211,84,0,0.04)',
  },
  methodRowDisabled: {
    opacity: 0.55,
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.discoverySoftSurfaceColor,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
  },
  methodIconWrapSelected: {
    backgroundColor: Colors.discoveryAccentColor,
    borderColor: Colors.discoveryAccentColor,
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
