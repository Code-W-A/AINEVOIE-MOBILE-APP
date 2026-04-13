import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Snackbar } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { Colors, Fonts } from '../../../../constant/styles';
import { getMockNotifications } from '../data/mockNotifications';
import {
  AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
  AinevoieDiscoverySpacing as DiscoverySpacing,
  AinevoieDiscoveryRadius as DiscoveryRadius,
  AinevoieDiscoveryTypography as DiscoveryTypography,
  AinevoieDiscoveryTokens as DiscoveryTokens,
} from '../styles/discoverySystem';

const { width } = Dimensions.get('window');
const DELETE_ACTION_WIDTH = 92;
const rowTranslateAnimatedValues = {};

function getNotificationIcon(type) {
  switch (type) {
    case 'booking_confirmed':
      return 'event-available';
    case 'booking_updated':
    case 'booking_rescheduled':
      return 'calendar-month';
    case 'booking_request':
      return 'assignment-late';
    case 'booking_cancelled':
      return 'event-busy';
    case 'booking_completed':
      return 'task-alt';
    case 'message_received':
      return 'chat-bubble-outline';
    case 'payment_update':
      return 'payments';
    case 'promo':
      return 'campaign';
    case 'announcement':
    case 'system':
    case 'marketing':
      return 'info-outline';
    case 'tips':
      return 'tips-and-updates';
    default:
      return 'notifications-none';
  }
}

function resolveNotificationDestination(role, notification) {
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const bookingId = typeof notification?.bookingId === 'string' ? notification.bookingId : '';
  const contactName = typeof notification?.contactName === 'string' ? notification.contactName.trim() : '';

  if (normalizedRole === 'user') {
    switch (notification?.type) {
      case 'booking_confirmed':
      case 'booking_updated':
        return bookingId ? { pathname: '/user/upcomingBookingDetail/upcomingBookingDetailScreen', params: { bookingId } } : null;
      case 'booking_cancelled':
        return bookingId ? { pathname: '/user/cancelledBookingDetail/cancelledBookingDetailScreen', params: { bookingId } } : null;
      case 'message_received':
        return contactName ? { pathname: '/user/message/messageScreen', params: { name: contactName } } : null;
      case 'payment_update':
        return bookingId ? { pathname: '/user/paymentStatus/paymentStatusScreen', params: { bookingId } } : null;
      default:
        return null;
    }
  }

  switch (notification?.type) {
    case 'booking_request':
      return bookingId ? { pathname: '/provider/nextBookingRequestDetail/nextBookingRequestDetailScreen', params: { bookingId } } : null;
    case 'message_received':
      return contactName ? { pathname: '/provider/message/messageScreen', params: { name: contactName } } : null;
    case 'booking_confirmed':
    case 'booking_rescheduled':
    case 'booking_completed':
      return bookingId ? { pathname: '/provider/upcomingBookingDetail/upcomingBookingDetailScreen', params: { bookingId } } : null;
    default:
      return null;
  }
}

function NotificationCard({ item, isNavigable, onPress, openDetailsLabel }) {
  return (
    <Pressable
      disabled={!isNavigable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.notificationCardPressable,
        isNavigable && pressed ? styles.notificationCardPressed : null,
      ]}
    >
      <View style={styles.notificationWrapStyle}>
        <View style={styles.notificationIconWrapStyle}>
          <MaterialIcons name={getNotificationIcon(item.type)} size={18} color={DiscoveryTokens.accentDark} />
        </View>

        <View style={styles.notificationContentWrap}>
          <View style={styles.notificationMetaRow}>
            <View style={styles.categoryChipStyle}>
              <Text numberOfLines={1} style={styles.categoryChipText}>{item.category}</Text>
            </View>

            <View style={styles.timeWrapStyle}>
              {item.isUnread ? <View style={styles.unreadDotStyle} /> : null}
              <Text numberOfLines={1} style={styles.timeTextStyle}>{item.timeLabel}</Text>
            </View>
          </View>

          <Text numberOfLines={1} style={styles.notificationTitle}>{item.title}</Text>
          <Text numberOfLines={2} ellipsizeMode="tail" style={styles.notificationDescription}>
            {item.description}
          </Text>

          {isNavigable ? (
            <View style={styles.navigationHintWrapStyle}>
              <Text style={styles.navigationHintTextStyle}>{openDetailsLabel}</Text>
              <MaterialIcons name="arrow-forward" size={16} color={DiscoveryTokens.accent} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function SharedNotificationsScreen({ role }) {
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const navigation = useNavigation();
  const router = useRouter();
  const { locale, t } = useLocale();
  const swipeListRef = useRef(null);
  const animationIsRunning = useRef(false);
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackBarMsg, setSnackBarMsg] = useState('');
  const [listData, setListData] = useState(() => getMockNotifications(normalizedRole));

  useEffect(() => {
    setListData(getMockNotifications(normalizedRole));
  }, [locale, normalizedRole]);

  listData.forEach((item) => {
    if (!rowTranslateAnimatedValues[item.id]) {
      rowTranslateAnimatedValues[item.id] = new Animated.Value(1);
    }
  });

  const actionableCount = useMemo(
    () => listData.filter((item) => Boolean(resolveNotificationDestination(normalizedRole, item))).length,
    [listData, normalizedRole]
  );

  function deleteRow(rowMap, rowKey) {
    if (animationIsRunning.current) {
      return;
    }

    animationIsRunning.current = true;
    rowMap?.[rowKey]?.closeRow?.();

    Animated.timing(rowTranslateAnimatedValues[rowKey], {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      setListData((currentData) => {
        const nextData = [...currentData];
        const prevIndex = currentData.findIndex((item) => item.id === rowKey);

        if (prevIndex >= 0) {
          const removedItem = currentData[prevIndex];
          nextData.splice(prevIndex, 1);
          setSnackBarMsg(t('notifications.deleted', { title: removedItem.title }));
          setShowSnackBar(true);
        }

        animationIsRunning.current = false;
        return nextData;
      });
    });
  }

  function handleNotificationPress(item) {
    const destination = resolveNotificationDestination(normalizedRole, item);

    if (!destination) {
      return;
    }

    swipeListRef.current?.safeCloseOpenRow?.();

    setListData((currentData) => currentData.map((entry) => (
      entry.id === item.id
        ? { ...entry, isUnread: false }
        : entry
    )));

    router.push(destination);
  }

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => navigation.pop()} style={({ pressed }) => [styles.backButtonStyle, pressed ? styles.backButtonPressedStyle : null]}>
            <MaterialIcons name="arrow-back" size={22} color={DiscoveryTokens.brandDark} />
          </Pressable>
          <Pressable
            onPress={() => router.push(`${normalizedRole === 'provider' ? '/provider' : '/user'}/notificationPreferences/notificationPreferencesScreen`)}
            style={({ pressed }) => [styles.backButtonStyle, styles.headerActionButtonStyle, pressed ? styles.backButtonPressedStyle : null]}
          >
            <MaterialIcons name="settings" size={20} color={DiscoveryTokens.brandDark} />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
      </View>
    );
  }

  function headerSummary() {
    return (
      <View style={styles.summaryRowStyle}>
        <View style={styles.summaryPillStyle}>
          <Text style={styles.summaryPillValue}>{`${listData.length}`}</Text>
        </View>
        <Text style={styles.summaryHintStyle}>
          {actionableCount
            ? t('notifications.summaryMany', { count: actionableCount })
            : t('notifications.summaryInfo')}
        </Text>
      </View>
    );
  }

  function emptyState() {
    return (
      <View style={styles.emptyWrap}>
        <View style={DiscoveryPrimitives.emptyState}>
          <MaterialIcons name="notifications-off" size={46} color={DiscoveryTokens.textSecondary} />
          <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>
            {normalizedRole === 'provider'
              ? t('notifications.emptyProvider')
              : t('notifications.emptyUser')}
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const destination = resolveNotificationDestination(normalizedRole, item);

    return (
      <Animated.View
        style={[
          styles.rowAnimatedWrapStyle,
          {
            opacity: rowTranslateAnimatedValues[item.id],
            transform: [
              {
                scaleY: rowTranslateAnimatedValues[item.id].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.86, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.rowContentWrapStyle}>
          <NotificationCard
            item={item}
            isNavigable={Boolean(destination)}
            onPress={() => handleNotificationPress(item)}
            openDetailsLabel={t('notifications.openDetails')}
          />
        </View>
      </Animated.View>
    );
  };

  const renderHiddenItem = (data, rowMap) => (
    <View style={styles.rowContentWrapStyle}>
      <View style={styles.hiddenRowWrapStyle}>
        <Pressable onPress={() => deleteRow(rowMap, data.item.id)} style={({ pressed }) => [styles.deleteActionStyle, pressed ? styles.deleteActionPressedStyle : null]}>
          <MaterialIcons name="delete-outline" size={22} color={Colors.whiteColor} />
          <Text style={styles.deleteActionText}>{t('deleteAccount.alertConfirm')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      {header()}
      {listData.length === 0 ? (
        emptyState()
      ) : (
        <SwipeListView
          ref={swipeListRef}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderHiddenItem={renderHiddenItem}
          rightOpenValue={-DELETE_ACTION_WIDTH}
          useNativeDriver={false}
          ListHeaderComponent={headerSummary}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          disableRightSwipe
          disableLeftSwipe={false}
        />
      )}
      <Snackbar style={styles.snackBarStyle} visible={showSnackBar} onDismiss={() => setShowSnackBar(false)}>
        <Text style={styles.snackBarText}>{snackBarMsg}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: DiscoveryTokens.overlaySoft,
    top: -70,
    right: -70,
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: DiscoveryTokens.surfaceAccent,
    left: -70,
    top: 210,
    opacity: 0.34,
  },
  headerWrapStyle: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.lg,
    paddingBottom: DiscoverySpacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DiscoverySpacing.md,
  },
  backButtonStyle: {
    ...DiscoveryPrimitives.softIconButton,
  },
  headerActionButtonStyle: {
    marginLeft: DiscoverySpacing.md,
  },
  backButtonPressedStyle: {
    opacity: 0.9,
  },
  headerTitle: {
    ...DiscoveryTypography.heroTitle,
    marginTop: 0,
  },
  listContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingBottom: DiscoverySpacing.xxl,
  },
  summaryRowStyle: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: DiscoverySpacing.lg,
  },
  summaryPillStyle: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DiscoveryRadius.pill,
    backgroundColor: DiscoveryTokens.surfaceAccent,
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryPillValue: {
    ...Fonts.blackColor14Bold,
    color: DiscoveryTokens.accentDark,
  },
  summaryHintStyle: {
    ...DiscoveryTypography.caption,
    maxWidth: '92%',
  },
  rowAnimatedWrapStyle: {
    overflow: 'visible',
  },
  rowContentWrapStyle: {
    minHeight: 130,
    marginBottom: DiscoverySpacing.lg,
  },
  notificationCardPressable: {
    borderRadius: 24,
  },
  notificationCardPressed: {
    opacity: 0.94,
  },
  notificationWrapStyle: {
    backgroundColor: DiscoveryTokens.surfaceCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DiscoveryTokens.borderSubtle,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: DiscoverySpacing.lg,
    paddingVertical: 18,
    minHeight: 130,
    shadowColor: '#141923',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  notificationIconWrapStyle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DiscoveryTokens.surfaceAccent,
    borderWidth: 1,
    borderColor: DiscoveryTokens.borderAccentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  notificationContentWrap: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  notificationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryChipStyle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: DiscoveryRadius.pill,
    backgroundColor: DiscoveryTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: DiscoveryTokens.borderSubtle,
    flexShrink: 1,
  },
  categoryChipText: {
    ...DiscoveryTypography.caption,
    color: DiscoveryTokens.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  timeWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 10,
  },
  unreadDotStyle: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: DiscoveryTokens.accent,
    marginRight: 6,
  },
  timeTextStyle: {
    ...DiscoveryTypography.caption,
    color: DiscoveryTokens.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  notificationTitle: {
    ...Fonts.blackColor18Bold,
  },
  notificationDescription: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 6,
  },
  navigationHintWrapStyle: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  navigationHintTextStyle: {
    ...DiscoveryTypography.caption,
    color: DiscoveryTokens.accentDark,
    marginRight: 6,
  },
  hiddenRowWrapStyle: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteActionStyle: {
    width: Math.min(DELETE_ACTION_WIDTH, width * 0.26),
    minHeight: 118,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.redColor,
  },
  deleteActionPressedStyle: {
    opacity: 0.92,
  },
  deleteActionText: {
    ...Fonts.whiteColor14Bold,
    marginTop: 6,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: DiscoverySpacing.xl,
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Fonts.blackColor20Bold,
    marginTop: DiscoverySpacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: DiscoverySpacing.sm,
    textAlign: 'center',
  },
  snackBarStyle: {
    backgroundColor: DiscoveryTokens.brandDark,
  },
  snackBarText: {
    ...Fonts.whiteColor14Medium,
  },
});
