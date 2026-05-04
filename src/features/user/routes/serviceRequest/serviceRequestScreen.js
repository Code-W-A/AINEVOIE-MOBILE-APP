import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { DiscoveryPrimitives, DiscoveryRadius, DiscoverySpacing, DiscoveryTypography } from '../../../shared/styles/discoverySystem';
import { normalizeEstimatedHours } from '../../../shared/utils/bookingRequestDetails';
import { DEFAULT_MOCK_CURRENCY, formatMoney, normalizeMockCurrency } from '../../../shared/utils/mockFormatting';
import { useUserBookings } from '../../../../../hooks/useUserBookings';
import { useUserPrimaryLocation } from '../../../../../hooks/useUserPrimaryLocation';
import { getProviderDisplaySnapshot } from '../../../shared/utils/providerDirectory';

const durationOptions = [1, 2, 3, 4, 6, 8];

function parseNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function formatDurationLabel(hours, t) {
  return hours === 1
    ? t('serviceRequest.oneHour')
    : t('serviceRequest.multipleHours', { hours });
}

export default function ServiceRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { createBooking } = useUserBookings();
  const { location } = useUserPrimaryLocation();
  const ratePerHour = parseNumber(params.ratePerHour);
  const currency = normalizeMockCurrency(typeof params.currency === 'string' ? params.currency : DEFAULT_MOCK_CURRENCY);
  const [requestDescription, setRequestDescription] = useState(
    typeof params.requestDescription === 'string' ? params.requestDescription : ''
  );
  const [selectedHours, setSelectedHours] = useState(() => {
    if (typeof params.estimatedHours === 'string' && params.estimatedHours) {
      return normalizeEstimatedHours(params.estimatedHours, 0);
    }
    return null;
  });
  const [showDescriptionError, setShowDescriptionError] = useState(false);
  const [showDurationError, setShowDurationError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedTotal = useMemo(() => {
    if (!selectedHours) {
      return null;
    }

    return formatMoney(ratePerHour * selectedHours, currency);
  }, [currency, ratePerHour, selectedHours]);

  const isValid = requestDescription.trim().length > 0 && Boolean(selectedHours);

  function summaryRow({ icon, label, value }) {
    return (
      <View style={styles.summaryRow}>
        <View style={styles.summaryIconWrap}>
          <MaterialIcons name={icon} size={18} color={Colors.discoveryMutedColor} />
        </View>
        <View style={styles.summaryContentWrap}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={styles.summaryValue}>{value}</Text>
        </View>
      </View>
    );
  }

  async function handleContinue() {
    const hasDescription = requestDescription.trim().length > 0;
    const hasDuration = Boolean(selectedHours);
    setShowDescriptionError(!hasDescription);
    setShowDurationError(!hasDuration);

    if (!hasDescription || !hasDuration) {
      return;
    }

    setIsSubmitting(true);

    try {
      const providerSnapshot = getProviderDisplaySnapshot({
        providerId: typeof params.providerId === 'string' ? params.providerId : '',
        providerName: typeof params.providerName === 'string' ? params.providerName : '',
        providerRole: typeof params.providerRole === 'string' ? params.providerRole : '',
      });
      const draft = {
        providerId: providerSnapshot.providerId,
        providerName: providerSnapshot.providerName,
        providerRole: providerSnapshot.providerRole,
        providerImage: providerSnapshot.providerImage,
        serviceId: typeof params.serviceId === 'string' ? params.serviceId : '',
        serviceName: typeof params.serviceName === 'string' ? params.serviceName : t('serviceRequestForm.service'),
        scheduledDateKey: typeof params.scheduledDateKey === 'string' ? params.scheduledDateKey : '',
        scheduledStartTime: typeof params.scheduledStartTime === 'string' ? params.scheduledStartTime : '',
        timezone: typeof params.timezone === 'string' ? params.timezone : 'Europe/Bucharest',
        dateLabel: typeof params.dateLabel === 'string' ? params.dateLabel : t('selectDateTime.defaultDateLabel'),
        timeLabel: typeof params.timeLabel === 'string' ? params.timeLabel : t('selectDateTime.defaultTimeLabel'),
        address: typeof params.address === 'string' && params.address.trim()
          ? params.address.trim()
          : (location?.formattedAddress || '—'),
        price: {
          amount: ratePerHour * selectedHours,
          currency,
          unit: 'oră',
          estimatedHours: selectedHours,
        },
        requestDetails: {
          description: requestDescription.trim(),
          estimatedHours: selectedHours,
        },
        bookingStatus: 'upcoming',
        requestKey: typeof params.requestKey === 'string' && params.requestKey ? params.requestKey : `req_${Date.now()}`,
      };
      const booking = await createBooking({
        draft,
        payment: {
          status: 'unpaid',
          method: 'unknown',
        },
      });

      router.replace({
        pathname: '/user/bookingSuccess/bookingSuccessScreen',
        params: {
          bookingId: booking.id,
        },
      });
    } catch (error) {
      Alert.alert(t('payment.errorTitle'), error?.message || t('payment.errorUnknown'));
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('serviceRequestForm.detailsTitle')}</Text>
            <Text style={styles.cardSubtitle}>{t('serviceRequestForm.detailsSubtitle')}</Text>
            <TextInput
              label={t('serviceRequestForm.descriptionLabel')}
              mode="outlined"
              value={requestDescription}
              onChangeText={(value) => {
                setRequestDescription(value);
                if (showDescriptionError) {
                  setShowDescriptionError(false);
                }
              }}
              multiline
              numberOfLines={5}
              style={styles.textFieldStyle}
              contentStyle={styles.textFieldContentStyle}
              outlineColor={showDescriptionError ? Colors.redColor : Colors.discoveryBorderColor}
              activeOutlineColor={Colors.discoveryAccentColor}
              textColor={Colors.blackColor}
              selectionColor={Colors.discoveryAccentColor}
              theme={{
                colors: {
                  background: Colors.whiteColor,
                  onSurfaceVariant: Colors.discoveryMutedColor,
                  primary: Colors.discoveryAccentColor,
                },
                roundness: 20,
              }}
            />
            {showDescriptionError ? <Text style={styles.errorText}>{t('serviceRequestForm.descriptionRequired')}</Text> : null}
          </View>

          <View style={[styles.card, { marginTop: DiscoverySpacing.xl }]}>
            <Text style={styles.cardTitle}>{t('serviceRequestForm.durationTitle')}</Text>
            <Text style={styles.cardSubtitle}>{t('serviceRequestForm.durationSubtitle')}</Text>
            <View style={styles.durationWrap}>
              {durationOptions.map((hours) => {
                const isSelected = selectedHours === hours;
                return (
                  <TouchableOpacity
                    key={hours}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedHours(hours);
                      if (showDurationError) {
                        setShowDurationError(false);
                      }
                    }}
                    style={[styles.durationChip, isSelected ? styles.durationChipActive : null]}
                  >
                    <Text style={[styles.durationChipText, isSelected ? styles.durationChipTextActive : null]}>
                      {formatDurationLabel(hours, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {showDurationError ? <Text style={styles.errorText}>{t('serviceRequestForm.durationRequired')}</Text> : null}
            {estimatedTotal ? (
              <View style={styles.totalPreviewWrap}>
                <Text style={styles.totalPreviewLabel}>{t('serviceRequestForm.calculatedEstimate')}</Text>
                <Text style={styles.totalPreviewValue}>{estimatedTotal}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.card, { marginTop: DiscoverySpacing.xl }]}>
            <Text style={styles.cardTitle}>{t('serviceRequestForm.summaryTitle')}</Text>
            <View style={styles.summaryListWrap}>
              {summaryRow({ icon: 'person', label: t('serviceRequestForm.provider'), value: `${params.providerName || t('serviceRequestForm.provider')} · ${params.providerRole || t('serviceRequestForm.service')}` })}
              {summaryRow({ icon: 'work', label: t('serviceRequestForm.service'), value: params.serviceName || t('serviceRequestForm.service') })}
              {summaryRow({ icon: 'event', label: t('serviceRequestForm.dateTime'), value: `${params.dateLabel || t('selectDateTime.defaultDateLabel')} · ${params.timeLabel || t('selectDateTime.defaultTimeLabel')}` })}
              {summaryRow({ icon: 'place', label: t('serviceRequestForm.address'), value: params.address || '—' })}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.footerWrap}>
        <View style={styles.footerMetaWrap}>
          <Text style={styles.footerMetaLabel}>{t('serviceRequestForm.estimate')}</Text>
          <Text style={styles.footerMetaValue}>{estimatedTotal || t('serviceRequestForm.selectDuration')}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={!isValid || isSubmitting}
          onPress={() => { void handleContinue(); }}
          style={[styles.primaryButton, !isValid || isSubmitting ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? t('payment.processing') : t('serviceRequestForm.sendRequest')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  function header() {
    return (
      <View style={styles.headerWrap}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
        </TouchableOpacity>
        <Text style={DiscoveryTypography.heroEyebrow}>{t('serviceRequestForm.headerEyebrow')}</Text>
        <Text style={styles.headerTitle}>{t('serviceRequestForm.headerTitle')}</Text>
        <Text style={styles.headerSubtitle}>{t('serviceRequestForm.headerSubtitle')}</Text>
      </View>
    );
  }
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
  cardSubtitle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: DiscoverySpacing.xs,
  },
  textFieldStyle: {
    marginTop: DiscoverySpacing.lg,
    backgroundColor: Colors.whiteColor,
  },
  textFieldContentStyle: {
    paddingTop: DiscoverySpacing.sm,
    minHeight: 120,
  },
  errorText: {
    ...DiscoveryTypography.caption,
    color: Colors.redColor,
    marginTop: DiscoverySpacing.sm,
  },
  durationWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: DiscoverySpacing.lg,
  },
  durationChip: {
    minHeight: 42,
    borderRadius: DiscoveryRadius.pill,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.whiteColor,
    paddingHorizontal: DiscoverySpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DiscoverySpacing.sm,
    marginBottom: DiscoverySpacing.sm,
  },
  durationChipActive: {
    backgroundColor: Colors.discoveryChipBackgroundColor,
    borderColor: Colors.discoveryAccentColor,
  },
  durationChipText: {
    ...Fonts.grayColor14Medium,
  },
  durationChipTextActive: {
    ...Fonts.primaryColor14Medium,
    color: Colors.discoveryAccentColor,
  },
  totalPreviewWrap: {
    marginTop: DiscoverySpacing.sm,
    paddingTop: DiscoverySpacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.discoveryBorderColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalPreviewLabel: {
    ...DiscoveryTypography.caption,
  },
  totalPreviewValue: {
    ...Fonts.blackColor16Bold,
    color: Colors.discoveryAccentColor,
  },
  summaryListWrap: {
    marginTop: DiscoverySpacing.lg,
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
  summaryContentWrap: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  summaryLabel: {
    ...DiscoveryTypography.caption,
  },
  summaryValue: {
    ...Fonts.blackColor14Bold,
    marginTop: 4,
    lineHeight: 20,
  },
  footerWrap: {
    backgroundColor: Colors.whiteColor,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
    paddingBottom: DiscoverySpacing.xl,
    borderTopLeftRadius: DiscoveryRadius.lg,
    borderTopRightRadius: DiscoveryRadius.lg,
  },
  footerMetaWrap: {
    marginBottom: DiscoverySpacing.md,
  },
  footerMetaLabel: {
    ...DiscoveryTypography.caption,
  },
  footerMetaValue: {
    ...Fonts.blackColor16Bold,
    marginTop: 4,
  },
  primaryButton: {
    ...DiscoveryPrimitives.primaryButton,
  },
  primaryButtonDisabled: {
    opacity: 0.82,
  },
  primaryButtonText: {
    ...Fonts.whiteColor16Bold,
  },
});
