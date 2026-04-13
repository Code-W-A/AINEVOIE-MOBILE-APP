import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLocale } from '../../../../../context/localeContext';
import { normalizeEstimatedHours, normalizeRequestDetails } from '../../../shared/utils/bookingRequestDetails';
import { DiscoveryPrimitives, DiscoveryRadius, DiscoverySpacing, DiscoveryTypography } from '../../../shared/styles/discoverySystem';
import { useUserBookings } from '../../../../../hooks/useUserBookings';
import { DEFAULT_MOCK_CURRENCY, formatMoney, normalizeMockCurrency } from '../../../shared/utils/mockFormatting';
import { getProviderDisplaySnapshot } from '../../../shared/utils/providerDirectory';

function digitsOnly(value) {
  return String(value || '').replace(/\D+/g, '');
}

function formatCardNumber(value) {
  const digits = digitsOnly(value).slice(0, 19);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidExpiry(expiry) {
  const raw = digitsOnly(expiry);
  if (raw.length !== 4) {
    return false;
  }
  const month = Number(raw.slice(0, 2));
  const year = Number(raw.slice(2, 4));
  if (month < 1 || month > 12) {
    return false;
  }
  return year >= 0;
}

function parseNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export default function PaymentMethodScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { updateBookingPayment, createBooking, getBookingById } = useUserBookings();

  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;
  const existingBooking = bookingId ? getBookingById(bookingId) : null;
  const requestKey = useMemo(
    () => (typeof params.requestKey === 'string' && params.requestKey ? params.requestKey : `req_${Date.now()}`),
    [params.requestKey],
  );

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
      providerName: typeof params.providerName === 'string' ? params.providerName : t('checkout.provider'),
      providerRole: typeof params.providerRole === 'string' ? params.providerRole : t('checkout.service'),
    });
    const serviceName = typeof params.serviceName === 'string' ? params.serviceName : t('checkout.service');
    const dateLabel = typeof params.dateLabel === 'string' ? params.dateLabel : t('selectDateTime.defaultDateLabel');
    const timeLabel = typeof params.timeLabel === 'string' ? params.timeLabel : t('selectDateTime.defaultTimeLabel');
    const address = typeof params.address === 'string' ? params.address : '—';
    const currency = normalizeMockCurrency(typeof params.currency === 'string' ? params.currency : DEFAULT_MOCK_CURRENCY);
    const amount = parseNumber(params.amount);
    const estimatedHours = normalizeEstimatedHours(params.estimatedHours);

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
        unit: t('serviceRequest.oneHour').includes('hour') ? 'hour' : 'oră',
        estimatedHours,
      },
      requestDetails: normalizeRequestDetails({
        description: typeof params.requestDescription === 'string' ? params.requestDescription : '',
        estimatedHours,
      }, estimatedHours),
      bookingStatus: 'upcoming',
      requestKey,
    };
  }, [existingBooking, params, requestKey, t]);

  const totalLabel = formatMoney(draft.price?.amount ?? 0, draft.price?.currency);

  const [form, setForm] = useState({
    name: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    saveCard: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) {
      next.name = t('card.nameRequired');
    }
    const cardDigits = digitsOnly(form.cardNumber);
    if (cardDigits.length < 13) {
      next.cardNumber = t('card.cardNumberRequired');
    }
    if (!isValidExpiry(form.expiry)) {
      next.expiry = t('card.expiryRequired');
    }
    const cvcDigits = digitsOnly(form.cvc);
    if (cvcDigits.length < 3) {
      next.cvc = t('card.cvcRequired');
    }
    return next;
  }

  async function handleContinue() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSubmitting(true);

    const cardDigits = digitsOnly(form.cardNumber);
    const last4 = cardDigits.slice(-4);
    const payload = {
      status: 'in_progress',
      method: 'card',
      last4,
    };

    try {
      const nextBooking = bookingId
        ? await updateBookingPayment(bookingId, payload)
        : await createBooking({ draft, payment: payload });

      router.replace({
        pathname: '/user/paymentStatus/paymentStatusScreen',
        params: {
          bookingId: nextBooking.id,
          paymentOutcome: last4 === '0000' ? 'failed' : 'success',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
      {header()}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('card.detailsTitle')}</Text>
            <Text style={styles.cardSubtitle}>{t('card.detailsSubtitle')}</Text>

            {field({
              fieldKey: 'name',
              label: t('card.nameOnCard'),
              value: form.name,
              placeholder: localePlaceholder('name'),
              onChangeText: (value) => setField('name', value),
              error: errors.name,
              keyboardType: 'default',
            })}

            {field({
              fieldKey: 'cardNumber',
              label: t('card.cardNumber'),
              value: form.cardNumber,
              placeholder: localePlaceholder('cardNumber'),
              onChangeText: (value) => setField('cardNumber', formatCardNumber(value)),
              error: errors.cardNumber,
              keyboardType: 'number-pad',
            })}

            <View style={styles.inlineRow}>
              <View style={{ flex: 1, marginRight: DiscoverySpacing.md }}>
                {field({
                  fieldKey: 'expiry',
                  label: t('card.expiry'),
                  value: form.expiry,
                  placeholder: localePlaceholder('expiry'),
                  onChangeText: (value) => setField('expiry', formatExpiry(value)),
                  error: errors.expiry,
                  keyboardType: 'number-pad',
                })}
              </View>
              <View style={{ flex: 1 }}>
                {field({
                  fieldKey: 'cvc',
                  label: t('card.cvc'),
                  value: form.cvc,
                  placeholder: localePlaceholder('cvc'),
                  onChangeText: (value) => setField('cvc', digitsOnly(value).slice(0, 4)),
                  error: errors.cvc,
                  keyboardType: 'number-pad',
                })}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => setField('saveCard', !form.saveCard)}
              style={styles.saveRow}
            >
              <View style={[styles.checkbox, form.saveCard ? styles.checkboxActive : null]}>
                {form.saveCard ? <MaterialIcons name="check" size={16} color={Colors.whiteColor} /> : null}
              </View>
              <Text style={styles.saveLabel}>{t('card.saveCard')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footerWrap}>
        <View style={styles.footerMeta}>
          <Text style={styles.footerMetaLabel}>{t('payment.total')}</Text>
          <Text style={styles.footerMetaValue}>{totalLabel}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={isSubmitting}
          onPress={() => { void handleContinue(); }}
          style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? t('payment.processing') : t('payment.continue')}</Text>
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
        <Text style={DiscoveryTypography.heroEyebrow}>{t('payment.screenEyebrow')}</Text>
        <Text style={styles.headerTitle}>{t('card.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('card.subtitle')}</Text>
      </View>
    );
  }

  function localePlaceholder(key) {
    if (key === 'name') {
      return t('card.nameOnCard');
    }

    if (key === 'cardNumber') {
      return '1234 5678 9012 3456';
    }

    if (key === 'expiry') {
      return 'MM/YY';
    }

    return '123';
  }

  function field({ fieldKey, label, value, placeholder, onChangeText, error, keyboardType }) {
    return (
      <View style={{ marginTop: DiscoverySpacing.lg }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
          <TextInput
            value={value}
            placeholder={placeholder}
            placeholderTextColor={Colors.discoverySubtleTextColor}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            style={styles.input}
            selectionColor={Colors.discoveryAccentColor}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {fieldKey === 'cardNumber' ? (
            <MaterialCommunityIcons name="credit-card-outline" size={18} color={Colors.discoveryMutedColor} />
          ) : null}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    marginTop: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldLabel: {
    ...DiscoveryTypography.caption,
    marginBottom: 8,
  },
  inputWrap: {
    ...DiscoveryPrimitives.inputSurface,
    minHeight: 54,
    paddingHorizontal: DiscoverySpacing.md,
    justifyContent: 'space-between',
  },
  inputWrapError: {
    borderColor: 'rgba(216,74,74,0.55)',
  },
  input: {
    ...Fonts.blackColor14Medium,
    flex: 1,
    marginRight: 10,
    paddingVertical: 0,
  },
  errorText: {
    ...DiscoveryTypography.caption,
    color: '#D84A4A',
    marginTop: 6,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.xl,
    paddingVertical: DiscoverySpacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.discoveryAccentColor,
    borderColor: Colors.discoveryAccentColor,
  },
  saveLabel: {
    ...Fonts.blackColor14Medium,
    marginLeft: DiscoverySpacing.md,
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
  primaryButton: {
    ...DiscoveryPrimitives.primaryButton,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.discoveryMutedColor,
    opacity: 0.75,
  },
  primaryButtonText: {
    ...Fonts.whiteColor16Bold,
  },
});
