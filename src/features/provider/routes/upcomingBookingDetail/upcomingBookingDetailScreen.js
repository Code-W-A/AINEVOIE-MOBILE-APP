import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, Alert, Pressable } from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useProviderBookings } from '../../../../../hooks/useProviderBookings';
import { useUserPrimaryLocation } from '../../../../../hooks/useUserPrimaryLocation';
import {
  getAvailableNavigationApps,
  isValidStoredLocation,
  openNavigationApp,
  openNavigationFallback,
} from '../../../../../utils/locationUtils';
import {
  DiscoveryPrimitives,
  DiscoveryRadius,
  DiscoverySpacing,
  DiscoveryTypography,
} from '../../../shared/styles/discoverySystem';
import { getProviderBookingStatusUi } from '../../utils/providerBookingUi';
import PaymentSummaryCard from '../../../user/components/PaymentSummaryCard';

const RESCHEDULE_DAY_OPTIONS = ['Astăzi', 'Mâine', '17 martie', '18 martie'];
const RESCHEDULE_TIME_OPTIONS = ['08:00', '09:00', '10:30', '12:00', '14:00', '16:00', '18:00'];

const UpcomingBookingDetailScreen = () => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';
  const { location } = useUserPrimaryLocation();
  const { activeBookings, getBookingById, rescheduleBooking, completeBooking } = useProviderBookings();
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [availableMapsApps, setAvailableMapsApps] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Mâine');
  const [selectedTime, setSelectedTime] = useState('11:00');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [feedbackState, setFeedbackState] = useState(null);

  const booking = useMemo(
    () => getBookingById(bookingId) || activeBookings[0] || null,
    [activeBookings, bookingId, getBookingById]
  );
  const statusUi = getProviderBookingStatusUi(booking?.status);

  const hasNavigationLocation = isValidStoredLocation(location);
  const bookingAddress = useMemo(
    () => location?.formattedAddress || booking?.address || '',
    [booking?.address, location]
  );

  if (!booking) {
    return (
      <View style={styles.screen}>
        <MyStatusBar backgroundColor={Colors.discoveryBackgroundColor} barStyle="dark-content" />
        <View style={styles.emptyWrapStyle}>
          <Text style={styles.emptyTitleStyle}>Programarea nu mai este disponibilă</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.goBack()} style={styles.primarySingleButtonStyle}>
            <Text style={styles.primarySingleButtonTextStyle}>Înapoi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function handleOpenNavigationChooser() {
    if (!hasNavigationLocation) {
      return;
    }

    try {
      const apps = await getAvailableNavigationApps(location);

      if (!apps.length) {
        await openNavigationFallback(location);
        return;
      }

      setAvailableMapsApps(apps);
      setShowMapsModal(true);
    } catch {
      Alert.alert('Navigație indisponibilă', 'Nu am putut deschide momentan aplicația de hărți.');
    }
  }

  async function handleOpenNavigationApp(app) {
    setShowMapsModal(false);

    try {
      await openNavigationApp(app, location);
    } catch {
      Alert.alert('Navigație indisponibilă', 'Nu am putut deschide aplicația selectată.');
    }
  }

  async function handleCompleteBooking() {
    await completeBooking(booking.id);
    setFeedbackState({
      title: 'Lucrarea a fost marcată ca finalizată',
      subtitle: 'Programarea rămâne vizibilă în istoric cu statusul actualizat.',
    });
  }

  async function handleReschedule() {
    await rescheduleBooking(booking.id, selectedDay, selectedTime, rescheduleReason.trim());
    setShowRescheduleSheet(false);
    setFeedbackState({
      title: 'Programarea a fost reprogramată',
      subtitle: `Noua propunere este ${selectedDay} • ${selectedTime}.`,
    });
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryBackgroundColor} barStyle="dark-content" />
      <View style={styles.contentWrap}>
        {header()}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {customerImage()}
          {customerDetails()}
        </ScrollView>
        {footerActions()}
      </View>
      {renderMapsModal()}
      {renderRescheduleModal()}
      {renderFeedbackModal()}
    </View>
  );

  function renderMapsModal() {
    return (
      <Modal
        animationType="slide"
        transparent
        visible={showMapsModal}
        onRequestClose={() => setShowMapsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMapsModal(false)}
          style={styles.bottomSheetBackdropStyle}
        >
          <View style={styles.bottomSheetContainerStyle}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.bottomSheetWrapStyle}>
              <View style={styles.bottomSheetHandleStyle} />
              <Text style={styles.bottomSheetTitleStyle}>Alege aplicația de navigație</Text>
              <Text style={styles.bottomSheetSubtitleStyle}>Deschidem ruta către locația clientului.</Text>

              {availableMapsApps.map((app) => (
                <TouchableOpacity
                  key={app.id}
                  activeOpacity={0.88}
                  onPress={() => {
                    void handleOpenNavigationApp(app);
                  }}
                  style={styles.bottomSheetActionStyle}
                >
                  <View style={styles.bottomSheetIconWrapStyle}>
                    <MaterialIcons name={app.icon} size={20} color={Colors.brandSecondaryColor} />
                  </View>
                  <View style={styles.bottomSheetActionTextWrapStyle}>
                    <Text style={styles.bottomSheetActionLabelStyle}>{app.label}</Text>
                    <Text style={styles.bottomSheetActionHintStyle}>{app.support}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  function renderRescheduleModal() {
    return (
      <Modal transparent animationType="slide" visible={showRescheduleSheet} onRequestClose={() => setShowRescheduleSheet(false)}>
        <View style={styles.modalOverlayStyle}>
          <Pressable style={styles.modalBackdropStyle} onPress={() => setShowRescheduleSheet(false)} />
          <View style={styles.modalSheetStyle}>
            <View style={styles.modalHandleStyle} />
            <Text style={styles.modalTitleStyle}>Amână / reprogramează</Text>
            <Text style={styles.modalSubtitleStyle}>Alege rapid noua zi și noua oră pentru programarea curentă.</Text>

            <Text style={styles.modalSectionTitleStyle}>Zi</Text>
            <View style={styles.optionWrapStyle}>
              {RESCHEDULE_DAY_OPTIONS.map((option) => (
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

            <Text style={styles.modalSectionTitleStyle}>Oră</Text>
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
              label="Notă opțională"
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
              <Text style={styles.modalPrimaryButtonTextStyle}>Confirmă reprogramarea</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderFeedbackModal() {
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
              <Text style={styles.feedbackButtonTextStyle}>Înapoi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function footerActions() {
    if (booking.status === 'completed') {
      return (
        <View style={styles.footerWrapStyle}>
          <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.completedFooterButtonStyle}>
            <Text style={styles.completedFooterButtonTextStyle}>Lucrare finalizată</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.footerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => setShowRescheduleSheet(true)} style={styles.secondaryFooterButtonStyle}>
          <Text style={styles.secondaryFooterButtonTextStyle}>Amână</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleCompleteBooking(); }} style={styles.markAsCompleteButtonStyle}>
          <Text style={styles.markAsCompleteButtonText}>Finalizează lucrarea</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function customerDetails() {
    return (
      <View style={styles.detailsSectionWrapStyle}>
        <View style={styles.sectionTitleRowStyle}>
          <Text style={styles.detailsSectionTitle}>Informații esențiale</Text>
          <View style={[styles.statusChipStyle, { backgroundColor: statusUi.backgroundColor }]}>
            <MaterialIcons name={statusUi.icon} size={14} color={statusUi.color} />
            <Text style={[styles.statusChipTextStyle, { color: statusUi.color }]}>{statusUi.label}</Text>
          </View>
        </View>
        <View style={styles.detailsCardWrapStyle}>
          {customerInfo({ title: 'Client', value: booking.clientName })}
          {customerInfo({ title: 'Adresă', value: bookingAddress })}
          {customerInfo({ title: 'Serviciu', value: booking.serviceLabel })}
          {customerInfo({ title: 'Data și ora', value: `${booking.scheduledDate} • ${booking.scheduledTime}`, isLast: true })}
        </View>
        {booking.providerDecision?.reason || booking.cancellation?.reason ? (
          <View style={[styles.detailsCardWrapStyle, styles.decisionCardWrapStyle]}>
            {customerInfo({
              title: booking.cancellation?.reason ? 'Motiv anulare' : 'Notă reprogramare',
              value: booking.cancellation?.reason || booking.providerDecision?.reason || '—',
              isLast: true,
            })}
          </View>
        ) : null}
        <View style={styles.paymentCardWrapStyle}>
          <PaymentSummaryCard booking={booking} />
        </View>

        {hasNavigationLocation ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              void handleOpenNavigationChooser();
            }}
            style={styles.navigateButtonStyle}
          >
            <MaterialIcons name="near-me" size={18} color={Colors.brandSecondaryColor} />
            <Text style={styles.navigateButtonTextStyle}>Navighează către client</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  function customerInfo({ title, value, isLast = false }) {
    return (
      <View style={[styles.customerInfoWrapStyle, isLast && styles.customerInfoLastWrapStyle]}>
        <Text style={styles.customerInfoTitle}>{title}</Text>
        <Text style={styles.customerInfoValue}>{value}</Text>
      </View>
    );
  }

  function customerImage() {
    return (
      <View style={styles.identityCardWrapStyle}>
        <Image
          source={booking.image}
          style={styles.customerImageWrapStyle}
          resizeMode="cover"
        />
        <View style={styles.identityTextWrapStyle}>
          <Text style={styles.identityEyebrow}>Client</Text>
          <Text style={styles.customerNameText}>{booking.clientName}</Text>
          <Text style={styles.identityPrimaryMetaText}>{booking.serviceLabel}</Text>
          <Text style={styles.identitySecondaryMetaText}>{`${booking.scheduledDate} • ${booking.scheduledTime}`}</Text>
        </View>
      </View>
    );
  }

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.brandSecondaryColor} />
        </TouchableOpacity>
        <View style={styles.headerTextWrapStyle}>
          <Text style={styles.headerEyebrow}>Programări</Text>
          <Text style={styles.headerTitle}>Detalii programare</Text>
          <Text style={styles.headerSupportText}>ID #{booking.id}</Text>
        </View>
      </View>
    );
  }
};

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
  navigateButtonStyle: {
    ...DiscoveryPrimitives.secondaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.md,
    minHeight: 52,
  },
  navigateButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.brandSecondaryColor,
    fontWeight: '700',
    marginLeft: 10,
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
  secondaryFooterButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  secondaryFooterButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: Colors.brandSecondaryColor,
    fontWeight: '700',
  },
  completedFooterButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedFooterButtonTextStyle: {
    ...DiscoveryTypography.body,
    color: '#2D8C57',
    fontWeight: '700',
  },
  markAsCompleteButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: Colors.discoveryAccentColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  markAsCompleteButtonText: {
    ...DiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
  bottomSheetBackdropStyle: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 17, 28, 0.32)',
  },
  bottomSheetContainerStyle: {
    justifyContent: 'flex-end',
  },
  bottomSheetWrapStyle: {
    backgroundColor: Colors.whiteColor,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
    paddingBottom: DiscoverySpacing.xl,
  },
  bottomSheetHandleStyle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: '#D8DEE8',
    marginBottom: DiscoverySpacing.md,
  },
  bottomSheetTitleStyle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
  },
  bottomSheetSubtitleStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 8,
    marginBottom: DiscoverySpacing.md,
  },
  bottomSheetActionStyle: {
    ...DiscoveryPrimitives.contentSurface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DiscoverySpacing.md,
    paddingVertical: DiscoverySpacing.md,
    marginTop: DiscoverySpacing.sm,
  },
  bottomSheetIconWrapStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.discoverySoftSurfaceColor,
  },
  bottomSheetActionTextWrapStyle: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  bottomSheetActionLabelStyle: {
    ...Fonts.blackColor16Bold,
    color: Colors.brandSecondaryColor,
  },
  bottomSheetActionHintStyle: {
    ...DiscoveryTypography.caption,
    marginTop: 4,
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

export default UpcomingBookingDetailScreen;
