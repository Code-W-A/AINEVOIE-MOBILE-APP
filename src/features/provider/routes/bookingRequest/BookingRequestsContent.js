import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { useProviderBookings } from '../../../../../hooks/useProviderBookings';
import { handleDemoCall } from '../../../../../utils/demoActions';
import {
  DiscoveryPrimitives,
  DiscoveryRadius,
  DiscoverySpacing,
  DiscoveryTypography,
} from '../../../shared/styles/discoverySystem';
import { getProviderBookingStatusUi, getProviderPaymentStatusUi } from '../../utils/providerBookingUi';

const BookingRequestsContent = ({ showBackButton }) => {
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useLocale();
  const { requestBookings } = useProviderBookings();

  function renderItem({ item }) {
    const statusUi = getProviderBookingStatusUi(item.status);
    const paymentUi = getProviderPaymentStatusUi(item.payment?.status);

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push({ pathname: '/provider/nextBookingRequestDetail/nextBookingRequestDetailScreen', params: { bookingId: item.id } })}
        style={styles.requestWrapStyle}
      >
        <View style={styles.requestIdentityWrapStyle}>
          <Image source={item.image} style={styles.requestImageStyle} resizeMode="cover" />
          <View style={styles.requestContentWrapStyle}>
            <Text numberOfLines={1} style={styles.requestNameText}>
              {item.clientName}
            </Text>
            <Text numberOfLines={1} style={styles.requestWorkLabelStyle}>
              {item.serviceLabel}
            </Text>
            <Text style={styles.requestMetaText}>{`${item.scheduledDate} • ${item.scheduledTime}`}</Text>
            <Text numberOfLines={1} style={styles.requestSupportText}>
              {`${item.requestDetails?.estimatedHours || 1}h · ${item.requestDetails?.description || t('providerRequests.noDetails')}`}
            </Text>
          </View>
        </View>
        <View style={styles.actionColumnStyle}>
          <View style={styles.requestBadgesColumnStyle}>
            <View style={[styles.requestStatusWrapStyle, { backgroundColor: statusUi.backgroundColor }]}>
              <MaterialIcons name={statusUi.icon} size={14} color={statusUi.color} />
              <Text style={[styles.requestStatusText, { color: statusUi.color }]}>{statusUi.label}</Text>
            </View>
            <View style={[styles.requestStatusWrapStyle, { backgroundColor: paymentUi.backgroundColor, marginTop: DiscoverySpacing.xs }]}>
              <MaterialIcons name={paymentUi.icon} size={14} color={paymentUi.color} />
              <Text style={[styles.requestStatusText, { color: paymentUi.color }]}>{paymentUi.shortLabel}</Text>
            </View>
          </View>
          <View style={styles.requestActionsRowStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={(event) => {
                event.stopPropagation();
                router.push({ pathname: '/provider/message/messageScreen', params: { name: item.clientName } });
              }}
              style={styles.requestActionButtonStyle}
            >
              <MaterialIcons name="chat" size={17} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={(event) => {
                event.stopPropagation();
                void handleDemoCall(item.clientName);
              }}
              style={[styles.requestActionButtonStyle, styles.requestActionButtonSpacingStyle]}
            >
              <MaterialIcons name="call" size={16} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryBackgroundColor} barStyle="dark-content" />
      <View style={styles.contentWrap}>
        {header()}
        <FlatList
          data={requestBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={(
            <View style={styles.emptyStateWrapStyle}>
              <Text style={styles.emptyStateTitleStyle}>{t('providerRequests.emptyTitle')}</Text>
              <Text style={styles.emptyStateTextStyle}>{t('providerRequests.emptyBody')}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        {showBackButton ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.pop()}
            style={styles.headerBackButtonStyle}
          >
            <MaterialIcons name="arrow-back" size={22} color={Colors.brandSecondaryColor} />
          </TouchableOpacity>
        ) : null}
        <View style={showBackButton ? styles.headerTextWrapWithBackStyle : null}>
          <Text style={styles.headerEyebrow}>{t('providerRequests.headerEyebrow')}</Text>
          <Text style={styles.headerTitle}>{showBackButton ? t('providerRequests.listTitle') : t('providerRequests.shortListTitle')}</Text>
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
  headerTextWrapWithBackStyle: {
    marginLeft: DiscoverySpacing.md,
  },
  headerEyebrow: {
    ...Fonts.grayColor12Bold,
    color: Colors.discoveryMutedColor,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerTitle: {
    ...DiscoveryTypography.screenTitle,
    color: Colors.brandSecondaryColor,
    marginTop: DiscoverySpacing.xs,
  },
  listContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingBottom: DiscoverySpacing.xl,
  },
  requestWrapStyle: {
    ...DiscoveryPrimitives.listItemRow,
    alignItems: 'center',
    paddingHorizontal: DiscoverySpacing.md,
    paddingVertical: DiscoverySpacing.md,
    marginTop: DiscoverySpacing.md,
  },
  requestIdentityWrapStyle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: DiscoverySpacing.sm,
  },
  requestImageStyle: {
    width: 58,
    height: 58,
    borderRadius: DiscoveryRadius.md,
  },
  requestContentWrapStyle: {
    flex: 1,
    minWidth: 0,
    marginLeft: DiscoverySpacing.md,
  },
  requestNameText: {
    ...Fonts.blackColor16Bold,
    color: Colors.brandSecondaryColor,
  },
  requestWorkLabelStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 2,
  },
  requestMetaText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginTop: DiscoverySpacing.sm,
  },
  requestSupportText: {
    ...DiscoveryTypography.caption,
    color: Colors.brandSecondaryColor,
    marginTop: 4,
  },
  actionColumnStyle: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 58,
  },
  requestBadgesColumnStyle: {
    alignItems: 'flex-end',
    marginBottom: DiscoverySpacing.sm,
  },
  requestStatusWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  requestStatusText: {
    ...DiscoveryTypography.caption,
    marginLeft: 4,
  },
  requestActionsRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestActionButtonStyle: {
    ...DiscoveryPrimitives.softIconButton,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    borderColor: 'transparent',
  },
  requestActionButtonSpacingStyle: {
    marginLeft: DiscoverySpacing.xs,
  },
  emptyStateWrapStyle: {
    ...DiscoveryPrimitives.contentSurface,
    marginTop: DiscoverySpacing.lg,
    paddingHorizontal: DiscoverySpacing.lg,
    paddingVertical: DiscoverySpacing.lg,
    alignItems: 'center',
  },
  emptyStateTitleStyle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
    textAlign: 'center',
  },
  emptyStateTextStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: DiscoverySpacing.sm,
    textAlign: 'center',
  },
});

export default BookingRequestsContent;
