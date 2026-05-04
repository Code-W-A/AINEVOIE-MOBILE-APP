import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { tr } from '../localization';

export function getUserBottomTabs(t = tr) {
  return [
    {
      name: 'home/homeScreen',
      label: t('tabs.user.home'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'home',
      testId: 'tab-home',
    },
    {
      name: 'booking/bookingScreen',
      label: t('tabs.user.bookings'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'calendar-range',
      testId: 'tab-booking',
    },
    {
      name: 'chat/chatScreen',
      label: t('tabs.user.chat'),
      IconComponent: MaterialIcons,
      iconName: 'chat',
      testId: 'tab-chat',
    },
    {
      name: 'wallet/walletScreen',
      label: t('tabs.user.wallet'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'wallet',
      testId: 'tab-wallet',
    },
    {
      name: 'profile/profileScreen',
      label: t('tabs.user.profile'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'account',
      testId: 'tab-profile',
    },
  ];
}

export function getProviderBottomTabs(t = tr, counts = {}) {
  const requestCount = Number(counts.requestCount) || 0;
  const unreadChatCount = Number(counts.unreadChatCount) || 0;

  return [
    {
      name: 'booking/bookingScreen',
      label: t('tabs.provider.bookings'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'home',
      testId: 'provider-tab-booking',
    },
    {
      name: 'allBookingsTab/allBookingsTabScreen',
      label: t('tabs.provider.allBookings'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'calendar-clock-outline',
      testId: 'provider-tab-all-bookings',
    },
    {
      name: 'requests/requestsScreen',
      label: t('tabs.provider.requests'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'clipboard-text-outline',
      testId: 'provider-tab-requests',
      badgeCount: requestCount,
    },
    {
      name: 'chat/chatScreen',
      label: t('tabs.provider.chat'),
      IconComponent: MaterialIcons,
      iconName: 'chat',
      testId: 'provider-tab-chat',
      badgeCount: unreadChatCount,
    },
    {
      name: 'review/reviewScreen',
      label: t('tabs.provider.reviews'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'thumbs-up-down',
      testId: 'provider-tab-review',
    },
    {
      name: 'profile/profileScreen',
      label: t('tabs.provider.profile'),
      IconComponent: MaterialCommunityIcons,
      iconName: 'account',
      testId: 'provider-tab-profile',
    },
  ];
}
