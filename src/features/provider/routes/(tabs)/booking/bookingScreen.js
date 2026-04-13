import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../../../../../../constant/styles';
import { useLocale } from '../../../../../../context/localeContext';
import { useProviderBookings } from '../../../../../../hooks/useProviderBookings';
import { useProviderOnboarding } from '../../../../../../hooks/useProviderOnboarding';
import { handleDemoCall } from '../../../../../../utils/demoActions';
import {
  DiscoveryPrimitives,
  DiscoveryRadius,
  DiscoverySpacing,
  DiscoveryTypography,
} from '../../../../shared/styles/discoverySystem';
import { getProviderBookingStatusUi, getProviderPaymentStatusUi } from '../../../utils/providerBookingUi';

function renderStatusLabel(status, textStyle, iconStyle) {
  const statusUi = getProviderBookingStatusUi(status);

  return (
    <View style={[iconStyle, { backgroundColor: statusUi.backgroundColor }]}>
      <MaterialIcons name={statusUi.icon} size={12} color={statusUi.color} />
      <Text style={[textStyle, { color: statusUi.color }]}>{statusUi.label}</Text>
    </View>
  );
}

function renderPaymentLabel(status, textStyle, iconStyle) {
  const paymentUi = getProviderPaymentStatusUi(status);

  return (
    <View style={[iconStyle, { backgroundColor: paymentUi.backgroundColor }]}>
      <MaterialIcons name={paymentUi.icon} size={12} color={paymentUi.color} />
      <Text style={[textStyle, { color: paymentUi.color }]}>{paymentUi.shortLabel}</Text>
    </View>
  );
}

const BookingScreen = () => {
  const router = useRouter();
  const { t } = useLocale();
  const { data: providerOnboarding } = useProviderOnboarding();
  const { activeBookings } = useProviderBookings();
  const isProviderPending = providerOnboarding.verificationStatus === 'pending';
  const visibleBookings = activeBookings.filter((booking) => booking.status !== 'completed');
  const nextBooking = visibleBookings[0] || null;
  const todayLabels = [t('providerBooking.today'), 'Astăzi', 'Today'];
  const tomorrowLabels = [t('providerBooking.tomorrow'), 'Mâine', 'Tomorrow'];
  const todayBookings = visibleBookings.filter((booking) => todayLabels.includes(booking.dayLabel));
  const tomorrowBookings = visibleBookings.filter((booking) => tomorrowLabels.includes(booking.dayLabel));

  const openMessage = (name) => {
    router.push({ pathname: '/provider/message/messageScreen', params: { name } });
  };

  const renderBookingRow = (item, dayLabel) => (
    <TouchableOpacity
      key={`${dayLabel}-${item.id}`}
      activeOpacity={0.92}
      onPress={() => router.push({ pathname: '/provider/upcomingBookingDetail/upcomingBookingDetailScreen', params: { bookingId: item.id } })}
      style={styles.bookingInfoWrapStyle}
    >
      <View style={styles.bookingIdentityWrapStyle}>
        <Image source={item.image} style={styles.bookingImageStyle} resizeMode="cover" />
        <View style={styles.bookingContentWrapStyle}>
          <Text numberOfLines={1} style={styles.bookingNameText}>
            {item.clientName}
          </Text>
          <Text numberOfLines={1} style={styles.bookingWorkLabelStyle}>
            {item.serviceLabel}
          </Text>
          <Text style={styles.bookingMetaText}>{`${dayLabel} • ${item.scheduledTime}`}</Text>
        </View>
      </View>
      <View style={styles.actionColumnStyle}>
        <View style={styles.badgesColumnStyle}>
          {renderStatusLabel(item.status, styles.bookingStatusText, styles.bookingStatusWrapStyle)}
          {renderPaymentLabel(item.payment?.status, styles.bookingStatusText, styles.bookingPaymentWrapStyle)}
        </View>
        <View style={styles.bookingActionsRowStyle}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={(event) => {
              event.stopPropagation();
              openMessage(item.clientName);
            }}
            style={styles.bookingActionButtonStyle}
          >
            <MaterialIcons name="chat" size={16} color={Colors.discoveryMutedColor} />
          </TouchableOpacity>
          <TouchableOpacity
              activeOpacity={0.9}
              onPress={(event) => {
                event.stopPropagation();
                void handleDemoCall(item.clientName);
              }}
              style={[styles.bookingActionButtonStyle, styles.bookingActionButtonSpacingStyle]}
            >
            <MaterialIcons name="call" size={15} color={Colors.discoveryMutedColor} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.contentWrap}>
        {header()}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {isProviderPending ? verificationBanner() : null}
          {nextBooking ? nextBookingInfo() : null}
          <Pressable
            onPress={() => router.push('/provider/allBookings/allBookingsScreen')}
            style={({ pressed }) => [styles.viewAllBookingsLinkWrapStyle, pressed ? styles.cardPressedStyle : null]}
          >
            <Text style={styles.viewAllBookingsLinkTextStyle}>{t('providerBooking.viewAll')}</Text>
          </Pressable>
          {upcomingBookingsInfo()}
        </ScrollView>
      </View>
    </View>
  );

  function upcomingBookingsInfo() {
    return (
      <View style={styles.sectionWrapStyle}>
        <Text style={styles.sectionTitleStyle}>{t('providerBooking.upcomingTitle')}</Text>
        {todayBookingsInfo()}
        {tomorrowBookingsInfo()}
      </View>
    );
  }

  function verificationBanner() {
    return (
      <View style={styles.verificationBannerStyle}>
        <View style={styles.verificationIconWrapStyle}>
          <MaterialIcons name="verified-user" size={18} color={Colors.discoveryAccentColor} />
        </View>
        <View style={styles.verificationTextWrapStyle}>
          <Text style={styles.verificationTitleStyle}>{t('providerBooking.verificationTitle')}</Text>
          <Text style={styles.verificationSubtitleStyle}>{t('providerBooking.verificationSubtitle')}</Text>
        </View>
      </View>
    );
  }

  function tomorrowBookingsInfo() {
    if (!tomorrowBookings.length) {
      return null;
    }

    return (
      <View style={styles.bookingGroupWrapStyle}>
        <Text style={styles.sectionTimeLabelStyle}>{t('providerBooking.tomorrow')}</Text>
        {tomorrowBookings.map((item) => renderBookingRow(item, t('providerBooking.tomorrow')))}
      </View>
    );
  }

  function todayBookingsInfo() {
    if (!todayBookings.length) {
      return null;
    }

    return (
      <View style={styles.bookingGroupWrapStyle}>
        <Text style={styles.todayLabelStyle}>{t('providerBooking.today')}</Text>
        {todayBookings.map((item) => renderBookingRow(item, t('providerBooking.today')))}
      </View>
    );
  }

  function nextBookingInfo() {
    if (!nextBooking) {
      return null;
    }

    return (
      <View style={styles.nextBookingInfoWrapStyle}>
        <View style={styles.heroTopRowStyle}>
          <Text style={styles.heroEyebrowInlineText}>{t('providerBooking.nextLabel')}</Text>
          <View style={styles.heroBadgeRowStyle}>
            {renderStatusLabel(nextBooking.status, styles.heroStatusText, styles.heroStatusWrapStyle)}
            {renderPaymentLabel(nextBooking.payment?.status, styles.heroStatusText, styles.heroPaymentStatusWrapStyle)}
          </View>
        </View>
        <View style={styles.heroIdentityWrapStyle}>
          <Image source={nextBooking.image} style={styles.heroImageStyle} resizeMode="cover" />
          <View style={styles.heroTextWrapStyle}>
            <Text style={styles.heroNameText}>{nextBooking.clientName}</Text>
            <Text style={styles.heroWorkLabelStyle}>{nextBooking.serviceLabel}</Text>
          </View>
        </View>
        <View style={styles.heroBottomRowStyle}>
          <Text style={styles.heroMetaText}>{`${nextBooking.dayLabel} • ${nextBooking.scheduledTime}`}</Text>
          <View style={styles.heroActionsRowStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                void handleDemoCall(nextBooking.clientName);
              }}
              style={styles.heroActionButtonStyle}
            >
              <MaterialIcons name="call" size={16} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openMessage(nextBooking.clientName)}
              style={[styles.heroActionButtonStyle, styles.heroActionButtonSpacingStyle]}
            >
              <MaterialIcons name="chat" size={16} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <View style={styles.headerTitleRowStyle}>
          <Text style={styles.headerTitle}>{t('providerBooking.screenTitle')}</Text>
          <Pressable
            onPress={() => router.push('/provider/notifications/notificationsScreen')}
            style={({ pressed }) => [styles.headerNotificationButtonStyle, pressed ? styles.cardPressedStyle : null]}
          >
            <MaterialIcons name="notifications-none" size={20} color={Colors.brandSecondaryColor} />
          </Pressable>
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
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.lg,
    paddingBottom: DiscoverySpacing.xs,
  },
  headerTitle: {
    ...DiscoveryTypography.screenTitle,
    color: Colors.brandSecondaryColor,
  },
  headerTitleRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerNotificationButtonStyle: {
    ...DiscoveryPrimitives.softIconButton,
  },
  scrollContent: {
    paddingBottom: DiscoverySpacing.xl,
  },
  viewAllBookingsLinkWrapStyle: {
    marginHorizontal: DiscoverySpacing.xl,
    marginTop: DiscoverySpacing.sm,
    alignSelf: 'flex-start',
  },
  viewAllBookingsLinkTextStyle: {
    ...Fonts.primaryColor14Medium,
    color: Colors.discoveryAccentColor,
  },
  verificationBannerStyle: {
    ...DiscoveryPrimitives.contentSurface,
    marginHorizontal: DiscoverySpacing.xl,
    marginTop: DiscoverySpacing.md,
    paddingHorizontal: DiscoverySpacing.md,
    paddingVertical: DiscoverySpacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verificationIconWrapStyle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(211,84,0,0.10)',
  },
  verificationTextWrapStyle: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  verificationTitleStyle: {
    ...Fonts.blackColor14Bold,
    color: Colors.brandSecondaryColor,
  },
  verificationSubtitleStyle: {
    ...DiscoveryTypography.caption,
    marginTop: 4,
    color: Colors.discoveryMutedColor,
  },
  sectionWrapStyle: {
    marginTop: DiscoverySpacing.md,
    paddingHorizontal: DiscoverySpacing.xl,
  },
  sectionTitleStyle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
  },
  cardPressedStyle: {
    opacity: 0.88,
  },
  nextBookingInfoWrapStyle: {
    ...DiscoveryPrimitives.contentSurface,
    marginHorizontal: DiscoverySpacing.xl,
    marginTop: DiscoverySpacing.md,
    paddingHorizontal: DiscoverySpacing.md,
    paddingVertical: DiscoverySpacing.lg,
  },
  heroTopRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadgeRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroEyebrowInlineText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroActionsRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroActionButtonStyle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  heroActionButtonSpacingStyle: {
    marginLeft: DiscoverySpacing.xs,
  },
  heroIdentityWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.md,
  },
  heroImageStyle: {
    width: 60,
    height: 60,
    borderRadius: DiscoveryRadius.md,
  },
  heroTextWrapStyle: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  heroNameText: {
    ...Fonts.blackColor18Bold,
    color: Colors.brandSecondaryColor,
  },
  heroWorkLabelStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 2,
  },
  heroBottomRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: DiscoverySpacing.md,
  },
  heroMetaText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
  },
  heroStatusWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroPaymentStatusWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: DiscoverySpacing.sm,
  },
  heroStatusText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginLeft: 4,
  },
  bookingGroupWrapStyle: {
    marginTop: DiscoverySpacing.md,
  },
  todayLabelStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginBottom: DiscoverySpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionTimeLabelStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginBottom: DiscoverySpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bookingInfoWrapStyle: {
    ...DiscoveryPrimitives.listItemRow,
    alignItems: 'flex-start',
    paddingHorizontal: DiscoverySpacing.md,
    paddingVertical: DiscoverySpacing.lg,
    marginBottom: DiscoverySpacing.md,
  },
  bookingIdentityWrapStyle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
    paddingRight: DiscoverySpacing.sm,
  },
  bookingImageStyle: {
    width: 54,
    height: 54,
    borderRadius: DiscoveryRadius.md,
  },
  bookingContentWrapStyle: {
    flex: 1,
    minWidth: 0,
    marginLeft: DiscoverySpacing.md,
  },
  bookingNameText: {
    ...Fonts.blackColor16Bold,
    color: Colors.brandSecondaryColor,
  },
  bookingWorkLabelStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 2,
  },
  bookingMetaText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginTop: DiscoverySpacing.xs,
  },
  actionColumnStyle: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingTop: 2,
  },
  badgesColumnStyle: {
    alignItems: 'flex-end',
  },
  bookingStatusWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingPaymentWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.xs,
    marginBottom: DiscoverySpacing.md,
  },
  bookingStatusText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginLeft: 4,
  },
  bookingActionsRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingActionButtonStyle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  bookingActionButtonSpacingStyle: {
    marginLeft: DiscoverySpacing.xs,
  },
});

export default BookingScreen;
