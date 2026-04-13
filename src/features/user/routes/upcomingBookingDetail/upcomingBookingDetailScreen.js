import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Modal, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { handleDemoCall } from '../../../../../utils/demoActions';
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryRadius, DiscoveryTypography } from '../../../shared/styles/discoverySystem';
import { useUserBookings } from '../../../../../hooks/useUserBookings';
import PaymentSummaryCard from '../../components/PaymentSummaryCard';
import ServiceRequestCard from '../../components/ServiceRequestCard';

const { width } = Dimensions.get('screen');

const UpcomingBookingDetailScreen = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { getBookingById, cancelBooking } = useUserBookings();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;
  const booking = bookingId ? getBookingById(bookingId) : null;
  const [showCancelBookingDialog, setShowCancelBookingDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const lifecycleStatus = booking?.lifecycleStatus || booking?.status || 'requested';
  const isRequested = lifecycleStatus === 'requested';
  const isConfirmed = ['confirmed', 'reschedule_proposed', 'completed'].includes(lifecycleStatus);
  const isCompleted = lifecycleStatus === 'completed';
  const displayBookingId = booking?.id ? booking.id.slice(-4).toUpperCase() : '2097';
  const bookingTimeline = [
    { title: t('bookingDetail.requestSent'), description: t('bookingDetail.requestSentDescription'), isDone: true },
    {
      title: t('bookingDetail.bookingConfirmed'),
      description: isRequested
        ? t('payment.statusSuccessSubtitle')
        : `${booking?.dateLabel || '—'} • ${booking?.timeLabel || '—'}`,
      isDone: isConfirmed,
    },
    { title: t('bookingDetail.interventionStarts'), description: t('bookingDetail.interventionStartsDescription'), isDone: isCompleted },
    {
      title: t('bookingDetail.interventionCompleted'),
      description: `${t('serviceRequest.estimatedDuration')}: ${booking?.requestDetails?.estimatedHours || booking?.price?.estimatedHours || 1}`,
      isDone: isCompleted,
    },
  ];

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
      <View style={{ flex: 1 }}>
        {header()}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {personDetail()}
          {bookingStatusInfo()}
          {serviceRequestSummary()}
          {paymentSummary()}
        </ScrollView>
      </View>
      {cancelBookingButton()}
      {bookingCancelDialog()}
    </View>
  );

  function bookingCancelDialog() {
    return (
      <Modal visible={showCancelBookingDialog} onDismiss={() => { setShowCancelBookingDialog(false); }}>
        <View style={styles.dialogWrapStyle}>
          <Text style={styles.dialogTitleStyle}>{t('bookingDetail.cancelDialogTitle')}</Text>
          <Text style={styles.dialogSubtitleStyle}>{t('bookingDetail.cancelDialogBody')}</Text>
          <TextInput
            label={t('bookingDetail.cancelReason')}
            mode="outlined"
            value={cancelReason}
            onChangeText={(value) => {
              setCancelReason(value);
              if (cancelError) {
                setCancelError('');
              }
            }}
            multiline
            numberOfLines={4}
            outlineColor={cancelError ? Colors.redColor : Colors.discoveryBorderColor}
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
            style={styles.cancelReasonFieldStyle}
          />
          {cancelError ? <Text style={styles.cancelErrorTextStyle}>{cancelError}</Text> : null}
          <View style={styles.cancelAndYesButtonWrapStyle}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShowCancelBookingDialog(false)} style={styles.cancelButtonStyle}>
              <Text style={styles.cancelButtonText}>{t('bookingDetail.cancelDismiss')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isCancelling}
              onPress={() => { void handleBookingCancellation(); }}
              style={styles.yesButtonStyle}
            >
              <Text style={styles.yesButtonText}>{isCancelling ? t('bookingDetail.cancelling') : t('bookingDetail.cancelConfirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  async function handleBookingCancellation() {
    if (!booking?.id || isCancelling) {
      return;
    }

    setIsCancelling(true);

    try {
      const cancelledBooking = await cancelBooking(booking.id, cancelReason.trim());
      setShowCancelBookingDialog(false);
      router.replace({
        pathname: '/user/cancelledBookingDetail/cancelledBookingDetailScreen',
        params: {
          bookingId: cancelledBooking.id,
          justCancelled: '1',
        },
      });
    } catch {
      setCancelError(t('bookingDetail.cancelError'));
    } finally {
      setIsCancelling(false);
    }
  }

  function cancelBookingButton() {
    return (
      <View style={styles.footerWrap}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setShowCancelBookingDialog(true)} style={styles.cancelBookingButtonStyle}>
          <Text style={styles.cancelBookingText}>{t('bookingDetail.cancelBooking')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function bookingStatusInfo() {
    return (
      <View style={styles.cardWrap}>
        <Text style={styles.sectionTitle}>{t('bookingDetail.statusTitle')}</Text>
        <View style={{ marginTop: DiscoverySpacing.md }}>
          {bookingTimeline.map((step, index) => (
            <View key={step.title}>
              {bookingStatus(step)}
              {index !== bookingTimeline.length - 1 ? dashLine({ dashColor: step.isDone ? Colors.discoveryAccentColor : Colors.discoveryBorderColor }) : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  function bookingStatus({ title, description, isDone }) {
    return (
      <View style={styles.bookingStatusRowStyle}>
        <View style={[styles.bookingStatusTicMarkStyle, isDone ? styles.activeStatusMark : styles.inactiveStatusMark]}>
          {isDone ? <MaterialIcons name="check" size={14} color={Colors.whiteColor} /> : null}
        </View>
        <View style={{ marginLeft: DiscoverySpacing.lg, flex: 1 }}>
          <Text style={styles.statusTitle}>{title}</Text>
          <Text style={styles.statusDescription}>{description}</Text>
        </View>
      </View>
    );
  }

  function dashLine({ dashColor }) {
    return <View style={[styles.dashlineStyle, { borderColor: dashColor }]} />;
  }

  function serviceRequestSummary() {
    if (!booking) {
      return null;
    }

    return (
      <View style={{ marginTop: DiscoverySpacing.xl }}>
        <ServiceRequestCard booking={booking} />
      </View>
    );
  }

  function personDetail() {
    return (
      <View style={styles.personDetailWrapStyle}>
        <Image source={booking?.providerImage || require('../../../../../assets/images/provider/provider_7.jpg')} style={styles.personImageStyle} resizeMode="cover" />
        <View style={styles.personContentWrap}>
          <View style={DiscoveryPrimitives.chip}>
            <Text style={DiscoveryTypography.chip}>{t('bookingDetail.activeChip')}</Text>
          </View>
          <Text style={styles.personName}>{booking?.providerName || 'Casa în Ordine'}</Text>
          <Text style={styles.personRole}>{booking?.providerRole || 'Specialist curățenie'}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              void handleDemoCall(booking?.providerName || 'Casa în Ordine');
            }}
            style={styles.callRowStyle}
          >
            <MaterialIcons name="call" size={18} color={Colors.discoveryAccentColor} />
            <Text style={styles.callLabelStyle}>{t('bookingDetail.callNow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function paymentSummary() {
    if (!booking) {
      return null;
    }

    return (
      <View style={{ marginTop: DiscoverySpacing.xl }}>
        <PaymentSummaryCard
          booking={booking}
          onPayNow={['unpaid', 'failed'].includes(booking.payment?.status) ? () => router.push({ pathname: '/user/checkout/checkoutScreen', params: { bookingId: booking.id } }) : undefined}
        />
      </View>
    );
  }

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
        </TouchableOpacity>
        <Text style={DiscoveryTypography.heroEyebrow}>{t('bookingDetail.eyebrow')}</Text>
        <Text style={styles.headerTitle}>{`${t('bookingDetail.idPrefix')} ${displayBookingId}`}</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.discoveryBackgroundColor,
  },
  headerWrapStyle: {
    ...DiscoveryPrimitives.headerSurface,
  },
  headerTitle: {
    ...DiscoveryTypography.heroTitle,
    marginTop: DiscoverySpacing.lg,
  },
  scrollContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingVertical: DiscoverySpacing.xl,
    paddingBottom: DiscoverySpacing.xxl,
  },
  personDetailWrapStyle: {
    ...DiscoveryPrimitives.elevatedSurface,
    padding: DiscoverySpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  personImageStyle: {
    height: 96,
    width: 96,
    borderRadius: DiscoveryRadius.md,
  },
  personContentWrap: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  personName: {
    ...Fonts.blackColor20Bold,
    marginTop: DiscoverySpacing.md,
  },
  personRole: {
    ...DiscoveryTypography.caption,
    marginTop: 4,
  },
  callRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.lg,
  },
  callLabelStyle: {
    ...Fonts.primaryColor16Medium,
    color: Colors.discoveryAccentColor,
    marginLeft: DiscoverySpacing.xs,
  },
  cardWrap: {
    ...DiscoveryPrimitives.contentSurface,
    marginTop: DiscoverySpacing.xl,
    padding: DiscoverySpacing.xl,
  },
  sectionTitle: {
    ...Fonts.blackColor18Bold,
  },
  bookingStatusRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingStatusTicMarkStyle: {
    height: 22,
    width: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
  },
  activeStatusMark: {
    backgroundColor: Colors.discoveryAccentColor,
    borderColor: Colors.discoveryAccentColor,
  },
  inactiveStatusMark: {
    backgroundColor: Colors.whiteColor,
    borderColor: Colors.discoveryBorderColor,
  },
  dashlineStyle: {
    height: 38,
    width: 1,
    borderWidth: 0.7,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginLeft: 10,
    marginVertical: 4,
  },
  statusTitle: {
    ...Fonts.blackColor14Bold,
  },
  statusDescription: {
    ...DiscoveryTypography.caption,
    marginTop: 2,
  },
  footerWrap: {
    backgroundColor: Colors.whiteColor,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
    paddingBottom: DiscoverySpacing.xl,
    borderTopLeftRadius: DiscoveryRadius.lg,
    borderTopRightRadius: DiscoveryRadius.lg,
  },
  cancelBookingButtonStyle: {
    ...DiscoveryPrimitives.primaryButton,
    backgroundColor: Colors.redColor,
  },
  cancelBookingText: {
    ...Fonts.whiteColor16Bold,
  },
  dialogWrapStyle: {
    borderRadius: DiscoveryRadius.lg,
    width: width - 40,
    padding: DiscoverySpacing.xl,
    backgroundColor: Colors.whiteColor,
    alignSelf: 'center',
  },
  dialogTitleStyle: {
    textAlign: 'center',
    ...Fonts.blackColor18Bold,
  },
  dialogSubtitleStyle: {
    ...DiscoveryTypography.bodyMuted,
    textAlign: 'center',
    marginTop: DiscoverySpacing.sm,
  },
  cancelReasonFieldStyle: {
    marginTop: DiscoverySpacing.lg,
    backgroundColor: Colors.whiteColor,
  },
  cancelErrorTextStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.redColor,
    marginTop: 8,
    marginLeft: 4,
  },
  cancelButtonStyle: {
    flex: 0.47,
    backgroundColor: Colors.whiteColor,
    borderRadius: DiscoveryRadius.pill,
    borderColor: Colors.discoveryBorderColor,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DiscoverySpacing.md,
  },
  cancelButtonText: {
    ...Fonts.blackColor14Medium,
  },
  yesButtonStyle: {
    flex: 0.47,
    backgroundColor: Colors.redColor,
    borderRadius: DiscoveryRadius.pill,
    paddingVertical: DiscoverySpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesButtonText: {
    ...Fonts.whiteColor14Bold,
  },
  cancelAndYesButtonWrapStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: DiscoverySpacing.xl,
  },
});

export default UpcomingBookingDetailScreen;
