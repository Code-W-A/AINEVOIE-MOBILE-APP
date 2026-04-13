import { tr } from '../localization';

export function getProfileSections(role, t = tr) {
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const rolePrefix = normalizedRole === 'provider' ? '/provider' : '/user';

  const aboutSection = normalizedRole === 'provider'
    ? [
        { label: t('profile.feedbackReceived'), pathname: `${rolePrefix}/(tabs)/review/reviewScreen`, icon: 'star-outline' },
        { label: t('profile.requestsReceived'), pathname: `${rolePrefix}/bookingRequest/bookingRequestScreen`, icon: 'clipboard-text-outline' },
        { label: t('profile.availability'), pathname: `${rolePrefix}/availability/providerAvailabilityScreen`, icon: 'calendar-clock-outline' },
        { label: t('profile.myServices'), pathname: `${rolePrefix}/services/providerServicesScreen`, icon: 'briefcase-outline' },
        { label: t('profile.privacy'), pathname: `${rolePrefix}/privacyPolicy/privacyPolicyScreen`, icon: 'shield-lock-outline' },
        { label: t('profile.terms'), pathname: `${rolePrefix}/termsOfUse/termsOfUseScreen`, icon: 'file-document-outline' },
      ]
    : [
        { label: t('profile.history'), pathname: `${rolePrefix}/serviceHistory/serviceHistoryScreen`, icon: 'history' },
        { label: t('profile.myReviews'), pathname: `${rolePrefix}/userReviews/userReviewsScreen`, icon: 'star-outline' },
        { label: t('profile.favorites'), pathname: `${rolePrefix}/favorite/favoriteScreen`, icon: 'heart-outline' },
        { label: t('profile.notifications'), pathname: `${rolePrefix}/notifications/notificationsScreen`, icon: 'bell-outline' },
        { label: t('profile.privacy'), pathname: `${rolePrefix}/privacyPolicy/privacyPolicyScreen`, icon: 'shield-lock-outline' },
        { label: t('profile.terms'), pathname: `${rolePrefix}/termsOfUse/termsOfUseScreen`, icon: 'file-document-outline' },
      ];

  const appSection = [
    { label: t('profile.accountSettings'), pathname: `${rolePrefix}/settings/accountSettingsScreen`, icon: 'cog-outline' },
    { label: t('profile.support'), pathname: `${rolePrefix}/support/supportScreen`, icon: 'lifebuoy' },
    { label: t('profile.reportBug'), pathname: `${rolePrefix}/support/supportScreen`, params: { topic: 'bug' }, icon: 'bug-outline' },
    { label: t('profile.switchAccount'), action: 'switch-account', icon: 'swap-horizontal' },
    { label: t('profile.appVersion'), showArrow: false, icon: 'information-outline' },
  ];

  return [
    { title: t('profile.aboutTitle'), items: aboutSection },
    { title: t('profile.appTitle'), items: appSection },
  ];
}

export function getSwitchAccountChoices(t = tr) {
  return [
    { role: 'user', label: t('profile.switchToUser') },
    { role: 'provider', label: t('profile.switchToProvider') },
  ];
}

export function getProfileSummaryCards(role, metrics = {}, t = tr) {
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const rolePrefix = normalizedRole === 'provider' ? '/provider' : '/user';

  if (normalizedRole === 'provider') {
    return [
      { label: t('profile.bookings'), value: String(metrics.activeBookingCount ?? 0), meta: t('profile.inProgress'), icon: 'calendar-check-outline', pathname: `${rolePrefix}/(tabs)/booking/bookingScreen` },
      { label: t('profile.requests'), value: String(metrics.requestCount ?? 0), meta: t('profile.toConfirm'), icon: 'clipboard-text-outline', pathname: `${rolePrefix}/bookingRequest/bookingRequestScreen` },
      { label: t('profile.reviews'), value: String(metrics.reviewCount ?? 0), meta: t('profile.feedbackMeta'), icon: 'star-outline', pathname: `${rolePrefix}/(tabs)/review/reviewScreen` },
      { label: t('profile.services'), value: String(metrics.serviceCount ?? 0), meta: t('profile.activeInProfile'), icon: 'briefcase-outline', pathname: `${rolePrefix}/services/providerServicesScreen` },
    ];
  }

  return [
    { label: t('profile.history'), value: String(metrics.historyCount ?? 0), meta: t('profile.historyMeta'), icon: 'history', pathname: `${rolePrefix}/serviceHistory/serviceHistoryScreen` },
    { label: t('profile.reviews'), value: String(metrics.reviewCount ?? 0), meta: t('profile.reviewsMeta'), icon: 'star-outline', pathname: `${rolePrefix}/userReviews/userReviewsScreen` },
    { label: t('profile.bookings'), value: String(metrics.upcomingCount ?? 0), meta: t('profile.activeMeta'), icon: 'calendar-check-outline', pathname: `${rolePrefix}/(tabs)/booking/bookingScreen` },
    { label: t('profile.completed'), value: String(metrics.completedCount ?? 0), meta: t('profile.completedMeta'), icon: 'check-circle-outline', pathname: `${rolePrefix}/serviceHistory/serviceHistoryScreen`, params: { filter: 'completed' } },
  ];
}

export function getProfileHeroStats(role, metrics = {}, t = tr) {
  if (role === 'provider') {
    return [
      { label: t('profile.bookings'), value: String(metrics.activeBookingCount ?? 0) },
      { label: t('profile.requests'), value: String(metrics.requestCount ?? 0) },
      { label: t('profile.reviews'), value: String(metrics.reviewCount ?? 0) },
    ];
  }

  return [
    { label: t('profile.history'), value: String(metrics.historyCount ?? 0) },
    { label: t('profile.reviews'), value: String(metrics.reviewCount ?? 0) },
    { label: t('profile.bookings'), value: String(metrics.upcomingCount ?? 0) },
  ];
}
