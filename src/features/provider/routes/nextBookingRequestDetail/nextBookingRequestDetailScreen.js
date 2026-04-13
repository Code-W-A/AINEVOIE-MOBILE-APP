import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { useProviderBookings } from '../../../../../hooks/useProviderBookings';
import {
  DiscoveryPrimitives,
  DiscoveryRadius,
  DiscoverySpacing,
  DiscoveryTypography,
} from '../../../shared/styles/discoverySystem';
import { getProviderBookingStatusUi } from '../../utils/providerBookingUi';
import PaymentSummaryCard from '../../../user/components/PaymentSummaryCard';

const RESCHEDULE_TIME_OPTIONS = ['08:00', '09:00', '10:30', '12:00', '14:00', '16:00', '18:00'];

export default function NextBookingRequestDetailScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';
  const {
    requestBookings,
    getBookingById,
    confirmBooking,
    rejectBooking,
    rescheduleBooking,
  } = useProviderBookings();
  const rescheduleDayOptions = [t('providerBooking.today'), t('providerBooking.tomorrow'), '17 martie', '18 martie'];
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [showRejectSheet, setShowRejectSheet] = useState(false);
  const [selectedDay, setSelectedDay] = useState(t('providerBooking.tomorrow'));
  const [selectedTime, setSelectedTime] = useState('10:30');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [feedbackState, setFeedbackState] = useState(null);

  const booking = useMemo(
    () => getBookingById(bookingId) || requestBookings[0] || null,
    [bookingId, getBookingById, requestBookings]
  );
  const statusUi = getProviderBookingStatusUi(booking?.status);

  if (!booking) {
    return (
      <View style={styles.screen}>
        <MyStatusBar backgroundColor={Colors.discoveryBackgroundColor} barStyle="dark-content" />
        <View style={styles.emptyWrapStyle}>
          <Text style={styles.emptyTitleStyle}>{t('providerRequests.requestMissingTitle')}</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.goBack()} style={styles.primarySingleButtonStyle}>
            <Text style={styles.primarySingleButtonTextStyle}>{t('providerRequests.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function handleConfirm() {
    await confirmBooking(booking.id);
    setFeedbackState({
      title: t('providerRequests.confirmSuccessTitle'),
      subtitle: t('providerRequests.confirmSuccessSubtitle'),
    });
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setRejectError(t('providerRequests.rejectReasonRequired'));
      return;
    }

    await rejectBooking(booking.id, rejectReason.trim());
    setShowRejectSheet(false);
    setFeedbackState({
      title: t('providerRequests.rejectSuccessTitle'),
      subtitle: t('providerRequests.rejectSuccessSubtitle'),
    });
  }

  async function handleReschedule() {
    await rescheduleBooking(booking.id, selectedDay, selectedTime, rescheduleReason.trim());
    setShowRescheduleSheet(false);
    setFeedbackState({
      title: t('providerRequests.rescheduleSuccessTitle'),
      subtitle: t('providerRequests.rescheduleSuccessSubtitle', { day: selectedDay, time: selectedTime }),
    });
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryBackgroundColor} barStyle="dark-content" />
      <View style={styles.contentWrap}>
        {header()}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {identityCard()}
          {detailsCard()}
        </ScrollView>
        {footerActions()}
      </View>
      {rescheduleSheet()}
      {rejectSheet()}
      {feedbackModal()}
    </View>
  );

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.brandSecondaryColor} />
        </TouchableOpacity>
        <View style={styles.headerTextWrapStyle}>
          <Text style={styles.headerEyebrow}>{t('providerRequests.headerEyebrow')}</Text>
          <Text style={styles.headerTitle}>{t('providerRequests.headerTitle')}</Text>
          <Text style={styles.headerSupportText}>ID #{booking.id}</Text>
        </View>
      </View>
    );
  }

  function identityCard() {
    return (
      <View style={styles.identityCardWrapStyle}>
        <Image source={booking.image} style={styles.customerImageWrapStyle} resizeMode="cover" />
        <View style={styles.identityTextWrapStyle}>
          <Text style={styles.identityEyebrow}>{t('providerRequests.client')}</Text>
          <Text style={styles.customerNameText}>{booking.clientName}</Text>
          <Text style={styles.identityPrimaryMetaText}>{booking.serviceLabel}</Text>
          <Text style={styles.identitySecondaryMetaText}>{`${booking.scheduledDate} • ${booking.scheduledTime}`}</Text>
        </View>
      </View>
    );
  }

  function detailsCard() {
    return (
      <View style={styles.detailsSectionWrapStyle}>
        <View style={styles.sectionTitleRowStyle}>
          <Text style={styles.detailsSectionTitle}>{t('providerRequests.headerTitle')}</Text>
          <View style={[styles.statusChipStyle, { backgroundColor: statusUi.backgroundColor }]}>
            <MaterialIcons name={statusUi.icon} size={14} color={statusUi.color} />
            <Text style={[styles.statusChipTextStyle, { color: statusUi.color }]}>{statusUi.label}</Text>
          </View>
        </View>
        <View style={styles.detailsCardWrapStyle}>
          {detailRow(t('providerRequests.client'), booking.clientName)}
          {detailRow(t('checkout.address'), booking.address)}
          {detailRow(t('providerRequests.service'), booking.serviceLabel)}
          {detailRow(t('providerRequests.dateTime'), `${booking.scheduledDate} • ${booking.scheduledTime}`)}
          {detailRow(t('providerRequests.estimatedDuration'), `${booking.requestDetails?.estimatedHours || 1}h`)}
          {detailRow(t('serviceRequest.requestDescription'), booking.requestDetails?.description || t('providerRequests.noDetails'), true)}
        </View>
        {booking.providerDecision?.reason ? (
          <View style={[styles.detailsCardWrapStyle, styles.decisionCardWrapStyle]}>
            {detailRow(
              booking.providerDecision.type === 'rejected' ? t('providerRequests.rejectReasonTitle') : t('providerRequests.rescheduleNoteTitle'),
              booking.providerDecision.reason,
              true
            )}
          </View>
        ) : null}
        <View style={styles.paymentCardWrapStyle}>
          <PaymentSummaryCard booking={booking} />
        </View>
      </View>
    );
  }

  function detailRow(title, value, isLast = false) {
    return (
      <View style={[styles.customerInfoWrapStyle, isLast ? styles.customerInfoLastWrapStyle : null]}>
        <Text style={styles.customerInfoTitle}>{title}</Text>
        <Text style={styles.customerInfoValue}>{value}</Text>
      </View>
    );
  }

  function footerActions() {
    return (
      <View style={styles.footerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => setShowRejectSheet(true)} style={styles.rejectButtonStyle}>
          <Text style={styles.rejectButtonTextStyle}>{t('providerRequests.reject')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} onPress={() => setShowRescheduleSheet(true)} style={styles.secondaryButtonStyle}>
          <Text style={styles.secondaryButtonTextStyle}>{t('providerRequests.reschedule')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleConfirm(); }} style={styles.primaryButtonStyle}>
          <Text style={styles.primaryButtonTextStyle}>{t('providerRequests.confirm')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function rescheduleSheet() {
    return (
      <Modal transparent animationType="slide" visible={showRescheduleSheet} onRequestClose={() => setShowRescheduleSheet(false)}>
        <View style={styles.modalOverlayStyle}>
          <Pressable style={styles.modalBackdropStyle} onPress={() => setShowRescheduleSheet(false)} />
          <View style={styles.modalSheetStyle}>
            <View style={styles.modalHandleStyle} />
            <Text style={styles.modalTitleStyle}>{t('providerRequests.rescheduleTitle')}</Text>
            <Text style={styles.modalSubtitleStyle}>{t('providerRequests.rescheduleSubtitle')}</Text>

            <Text style={styles.modalSectionTitleStyle}>{t('providerRequests.dayTitle')}</Text>
            <View style={styles.optionWrapStyle}>
              {rescheduleDayOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.88}
                  onPress={() => setSelectedDay(option)}
                  style={[styles.optionChipStyle, selectedDay === option ? styles.optionChipActiveStyle : null]}
                >
                  <Text style={[styles.optionChipTextStyle, selectedDay === option ? styles.optionChipTextActiveStyle : null]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionTitleStyle}>{t('providerRequests.timeTitle')}</Text>
            <View style={styles.optionWrapStyle}>
              {RESCHEDULE_TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.88}
                  onPress={() => setSelectedTime(option)}
                  style={[styles.optionChipStyle, selectedTime === option ? styles.optionChipActiveStyle : null]}
                >
                  <Text style={[styles.optionChipTextStyle, selectedTime === option ? styles.optionChipTextActiveStyle : null]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label={t('providerRequests.optionalNote')}
              mode="outlined"
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              outlineColor={Colors.discoveryBorderColor}
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
              style={styles.modalInputStyle}
            />

            <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleReschedule(); }} style={styles.modalPrimaryButtonStyle}>
              <Text style={styles.modalPrimaryButtonTextStyle}>{t('providerRequests.confirmReschedule')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function rejectSheet() {
    return (
      <Modal transparent animationType="slide" visible={showRejectSheet} onRequestClose={() => setShowRejectSheet(false)}>
        <View style={styles.modalOverlayStyle}>
          <Pressable style={styles.modalBackdropStyle} onPress={() => setShowRejectSheet(false)} />
          <View style={styles.modalSheetStyle}>
            <View style={styles.modalHandleStyle} />
            <Text style={styles.modalTitleStyle}>{t('providerRequests.rejectTitle')}</Text>
            <Text style={styles.modalSubtitleStyle}>{t('providerRequests.rejectSubtitle')}</Text>

            <TextInput
              label={t('providerRequests.rejectReasonLabel')}
              mode="outlined"
              value={rejectReason}
              onChangeText={(value) => {
                setRejectReason(value);
                if (rejectError) {
                  setRejectError('');
                }
              }}
              multiline
              numberOfLines={4}
              outlineColor={rejectError ? Colors.redColor : Colors.discoveryBorderColor}
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
              style={styles.modalInputStyle}
            />
            {rejectError ? <Text style={styles.modalErrorTextStyle}>{rejectError}</Text> : null}

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!rejectReason.trim()}
              onPress={() => { void handleReject(); }}
              style={[styles.modalDangerButtonStyle, !rejectReason.trim() ? styles.modalDangerButtonDisabledStyle : null]}
            >
              <Text style={styles.modalPrimaryButtonTextStyle}>{t('providerRequests.confirmReject')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function feedbackModal() {
    return (
      <Modal transparent animationType="fade" visible={Boolean(feedbackState)} onRequestClose={() => setFeedbackState(null)}>
        <View style={styles.feedbackOverlayStyle}>
          <View style={styles.feedbackCardStyle}>
            <View style={styles.feedbackIconWrapStyle}>
              <MaterialIcons name="check-circle" size={26} color={Colors.discoveryAccentColor} />
            </View>
            <Text style={styles.feedbackTitleStyle}>{feedbackState?.title}</Text>
            <Text style={styles.feedbackSubtitleStyle}>{feedbackState?.subtitle}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setFeedbackState(null);
                navigation.goBack();
              }}
              style={styles.feedbackButtonStyle}
            >
              <Text style={styles.feedbackButtonTextStyle}>{t('providerRequests.backToList')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  contentWrap: {
    flex: 1,
  },
  headerWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
    paddingBottom: DiscoverySpacing.sm,
  },
  headerBackButtonStyle: {
    ...DiscoveryPrimitives.softIconButton,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerTextWrapStyle: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  headerEyebrow: {
    ...Fonts.grayColor12Bold,
    color: Colors.discoveryMutedColor,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerTitle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
    marginTop: 2,
  },
  headerSupportText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.xs,
    paddingBottom: DiscoverySpacing.lg,
  },
  identityCardWrapStyle: {
    ...DiscoveryPrimitives.contentSurface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: DiscoverySpacing.lg,
  },
  customerImageWrapStyle: {
    width: 72,
    height: 72,
    borderRadius: DiscoveryRadius.lg,
  },
  identityTextWrapStyle: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  identityEyebrow: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  customerNameText: {
    ...Fonts.blackColor18Bold,
    color: Colors.brandSecondaryColor,
    marginTop: 2,
  },
  identityPrimaryMetaText: {
    ...DiscoveryTypography.body,
    color: Colors.brandSecondaryColor,
    marginTop: DiscoverySpacing.xs,
  },
  identitySecondaryMetaText: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 2,
  },
  detailsSectionWrapStyle: {
    marginTop: DiscoverySpacing.lg,
  },
  sectionTitleRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DiscoverySpacing.sm,
  },
  detailsSectionTitle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
  },
  statusChipStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusChipTextStyle: {
    ...DiscoveryTypography.caption,
    marginLeft: 6,
  },
  detailsCardWrapStyle: {
    ...DiscoveryPrimitives.contentSurface,
    paddingHorizontal: DiscoverySpacing.lg,
  },
  decisionCardWrapStyle: {
    marginTop: DiscoverySpacing.md,
  },
  paymentCardWrapStyle: {
    marginTop: DiscoverySpacing.md,
  },
  customerInfoWrapStyle: {
    paddingVertical: DiscoverySpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.discoveryBorderColor,
  },
  customerInfoLastWrapStyle: {
    borderBottomWidth: 0,
  },
  customerInfoTitle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
  },
  customerInfoValue: {
    ...Fonts.blackColor16Bold,
    color: Colors.brandSecondaryColor,
    marginTop: 4,
    lineHeight: 22,
  },
  footerWrapStyle: {
    backgroundColor: Colors.discoveryBackgroundColor,
    borderTopWidth: 1,
    borderTopColor: Colors.discoveryBorderColor,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
    paddingBottom: DiscoverySpacing.lg,
    flexDirection: 'row',
  },
  rejectButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#F5C8C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rejectButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: '#D94841',
    fontWeight: '700',
  },
  secondaryButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  secondaryButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.brandSecondaryColor,
    fontWeight: '700',
  },
  primaryButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: Colors.discoveryAccentColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  primaryButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
  modalOverlayStyle: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropStyle: {
    flex: 1,
    backgroundColor: 'rgba(9, 17, 28, 0.32)',
  },
  modalSheetStyle: {
    backgroundColor: Colors.whiteColor,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
    paddingBottom: DiscoverySpacing.xl,
  },
  modalHandleStyle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: '#D8DEE8',
    marginBottom: DiscoverySpacing.md,
  },
  modalTitleStyle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
  },
  modalSubtitleStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  modalSectionTitleStyle: {
    ...Fonts.blackColor14Bold,
    color: Colors.brandSecondaryColor,
    marginTop: DiscoverySpacing.lg,
    marginBottom: DiscoverySpacing.sm,
  },
  optionWrapStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionChipStyle: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  optionChipActiveStyle: {
    backgroundColor: 'rgba(211,84,0,0.10)',
    borderColor: Colors.discoveryAccentColor,
  },
  optionChipTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.brandSecondaryColor,
  },
  optionChipTextActiveStyle: {
    color: Colors.discoveryAccentColor,
    fontWeight: '700',
  },
  modalInputStyle: {
    marginTop: DiscoverySpacing.md,
    backgroundColor: Colors.whiteColor,
  },
  modalErrorTextStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.redColor,
    marginTop: 8,
    marginLeft: 4,
  },
  modalPrimaryButtonStyle: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: Colors.discoveryAccentColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DiscoverySpacing.md,
  },
  modalPrimaryButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
  modalDangerButtonStyle: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: '#D94841',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DiscoverySpacing.md,
  },
  modalDangerButtonDisabledStyle: {
    opacity: 0.42,
  },
  feedbackOverlayStyle: {
    flex: 1,
    backgroundColor: 'rgba(9, 17, 28, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DiscoverySpacing.xl,
  },
  feedbackCardStyle: {
    ...DiscoveryPrimitives.contentSurface,
    width: '100%',
    paddingHorizontal: DiscoverySpacing.xl,
    paddingVertical: DiscoverySpacing.xl,
    alignItems: 'center',
  },
  feedbackIconWrapStyle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.discoverySoftSurfaceColor,
  },
  feedbackTitleStyle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
    marginTop: DiscoverySpacing.md,
    textAlign: 'center',
  },
  feedbackSubtitleStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: DiscoverySpacing.sm,
    textAlign: 'center',
  },
  feedbackButtonStyle: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: Colors.discoveryAccentColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DiscoverySpacing.lg,
    alignSelf: 'stretch',
  },
  feedbackButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
  emptyWrapStyle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DiscoverySpacing.xl,
  },
  emptyTitleStyle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
    textAlign: 'center',
  },
  primarySingleButtonStyle: {
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: Colors.discoveryAccentColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DiscoverySpacing.lg,
  },
  primarySingleButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
});
