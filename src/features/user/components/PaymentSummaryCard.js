import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../../constant/styles';
import { useLocale } from '../../../../context/localeContext';
import { DiscoveryPrimitives, DiscoveryRadius, DiscoverySpacing, DiscoveryTypography } from '../../shared/styles/discoverySystem';
import { formatMoney } from '../../shared/utils/mockFormatting';
import { getPaymentMethodLabel, getPaymentStatusUi } from '../../shared/utils/paymentUi';

export default function PaymentSummaryCard({ booking, onPayNow }) {
  const { t } = useLocale();
  const payment = booking?.payment || {};
  const statusChip = getPaymentStatusUi(payment.status);
  const total = formatMoney(booking?.price?.amount ?? 0, booking?.price?.currency);
  const method = getPaymentMethodLabel(payment.method, payment.last4);
  const transactionId = payment.transactionId || (payment.status === 'failed' ? t('payment.unavailable') : '—');
  const canRetryPayment = payment.status === 'unpaid' || payment.status === 'failed';

  return (
    <View style={styles.cardWrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('payment.summaryTitle')}</Text>
        <View style={[DiscoveryPrimitives.chip, { backgroundColor: statusChip.backgroundColor }]}>
          <Text style={[DiscoveryTypography.chip, { color: statusChip.color }]}>{statusChip.label}</Text>
        </View>
      </View>

      <View style={styles.metaWrap}>
        {row({ icon: 'attach-money', label: t('payment.total'), value: total })}
        {row({ icon: 'payment', label: t('payment.method'), value: method })}
        {row({ icon: 'tag', label: t('payment.transactionId'), value: transactionId })}
      </View>

      {canRetryPayment && typeof onPayNow === 'function' ? (
        <TouchableOpacity activeOpacity={0.92} onPress={onPayNow} style={styles.payNowButton}>
          <MaterialCommunityIcons name="credit-card-outline" size={18} color={Colors.whiteColor} />
          <Text style={styles.payNowText}>{payment.status === 'failed' ? t('payment.retry') : t('payment.payNow')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function row({ icon, label, value }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaIconWrap}>
        <MaterialIcons name={icon} size={18} color={Colors.discoveryMutedColor} />
      </View>
      <View style={{ flex: 1, marginLeft: DiscoverySpacing.md }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    ...DiscoveryPrimitives.contentSurface,
    padding: DiscoverySpacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Fonts.blackColor18Bold,
  },
  metaWrap: {
    marginTop: DiscoverySpacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DiscoverySpacing.sm,
  },
  metaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    ...DiscoveryTypography.caption,
  },
  metaValue: {
    ...Fonts.blackColor14Bold,
    marginTop: 4,
  },
  payNowButton: {
    ...DiscoveryPrimitives.primaryButton,
    flexDirection: 'row',
    marginTop: DiscoverySpacing.lg,
    borderRadius: DiscoveryRadius.pill,
  },
  payNowText: {
    ...Fonts.whiteColor16Bold,
    marginLeft: DiscoverySpacing.sm,
  },
});
