import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { useDemoAvatar } from '../../../../hooks/useDemoAvatar';
import { useProviderAvailability } from '../../../../hooks/useProviderAvailability';
import { useProviderBookings } from '../../../../hooks/useProviderBookings';
import { useProviderOnboarding } from '../../../../hooks/useProviderOnboarding';
import { useProviderReviews } from '../../../../hooks/useProviderReviews';
import { useProviderServices } from '../../../../hooks/useProviderServices';
import { useUserBookings } from '../../../../hooks/useUserBookings';
import { useUserProfile } from '../../../../hooks/useUserProfile';
import { useUserReviews } from '../../../../hooks/useUserReviews';
import LogoutDialog from '../components/LogoutDialog';
import ProfileActionRow from '../components/profile/ProfileActionRow';
import ProfileSummaryCard from '../components/profile/ProfileSummaryCard';
import {
  getProfileHeroStats,
  getProfileSections,
  getProfileSummaryCards,
  getSwitchAccountChoices,
} from '../config/profileMenuConfig';
import { getProviderProfileFallback, getRoleDisplayConfig } from '../config/roleDisplayConfig';
import { formatRateDisplay } from '../utils/mockFormatting';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';
import { getProviderVerificationUi } from '../utils/providerVerificationUi';
import { tr } from '../localization';

function toChipList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/[,/]| si |;/i)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function formatAverageRating(reviews) {
  if (!reviews.length) {
    return '—';
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / reviews.length).toFixed(1);
}

function getBookingStatusLabel(status) {
  if (status === 'completed') {
    return tr('serviceHistory.completedStatus');
  }

  if (status === 'cancelled') {
    return tr('serviceHistory.cancelledStatus');
  }

  return tr('profile.scheduled');
}

export default function SharedRoleProfileScreen({ role }) {
  const router = useRouter();
  const { t } = useLocale();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const roleConfig = getRoleDisplayConfig(normalizedRole, t);
  const { data: providerOnboarding } = useProviderOnboarding();
  const { availabilitySummary, availabilityDayChips, hasConfiguredAvailability } = useProviderAvailability();
  const { activeServices } = useProviderServices();
  const { activeBookings, requestBookings } = useProviderBookings();
  const { bookings } = useUserBookings();
  const { data: userProfile } = useUserProfile();
  const { reviews } = useUserReviews();
  const { reviews: providerReviews } = useProviderReviews();
  const { avatarUri } = useDemoAvatar(normalizedRole);
  const { signOut } = useSession();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const providerProfileFallback = useMemo(
    () => (normalizedRole === 'provider' ? getProviderProfileFallback(providerOnboarding, t) : null),
    [normalizedRole, providerOnboarding, t]
  );
  const providerProfile = providerOnboarding.professionalProfile;
  const verificationUi = normalizedRole === 'provider'
    ? getProviderVerificationUi(providerOnboarding.verificationStatus)
    : null;

  const avatarSource = useMemo(
    () => (avatarUri ? { uri: avatarUri } : roleConfig.defaultAvatarSource),
    [avatarUri, roleConfig.defaultAvatarSource]
  );

  const profileName = normalizedRole === 'provider'
    ? (providerProfileFallback?.profileDisplayName || roleConfig.profileDisplayName)
    : (userProfile.name || roleConfig.profileDisplayName);
  const profileEmail = normalizedRole === 'provider'
    ? (providerProfileFallback?.profileEmail || roleConfig.profileEmail)
    : (userProfile.email || roleConfig.profileEmail);

  const userMetrics = useMemo(() => {
    const upcomingCount = bookings.filter((booking) => booking.bookingStatus === 'upcoming').length;
    const completedCount = bookings.filter((booking) => booking.bookingStatus === 'completed').length;
    const cancelledCount = bookings.filter((booking) => booking.bookingStatus === 'cancelled').length;

    return {
      upcomingCount,
      completedCount,
      cancelledCount,
      historyCount: completedCount + cancelledCount,
      reviewCount: reviews.length,
    };
  }, [bookings, reviews.length]);

  const providerMetrics = useMemo(() => ({
    activeBookingCount: activeBookings.filter((booking) => booking.status !== 'completed').length,
    requestCount: requestBookings.length,
    reviewCount: providerReviews.length,
    serviceCount: activeServices.length,
  }), [activeBookings, activeServices.length, providerReviews.length, requestBookings.length]);

  const metrics = normalizedRole === 'provider' ? providerMetrics : userMetrics;
  const sections = useMemo(() => getProfileSections(normalizedRole, t), [normalizedRole, t]);
  const summaryCards = useMemo(() => getProfileSummaryCards(normalizedRole, metrics, t), [metrics, normalizedRole, t]);
  const heroStats = useMemo(() => getProfileHeroStats(normalizedRole, metrics, t), [metrics, normalizedRole, t]);

  const profileSubtitle = useMemo(() => {
    if (normalizedRole === 'provider') {
      return verificationUi?.description || roleConfig.profileSubtitle;
    }

    if (userMetrics.upcomingCount) {
      return t('profile.userUpcomingSummary', {
        upcoming: userMetrics.upcomingCount,
        reviews: userMetrics.reviewCount,
      });
    }

    return t('profile.userHistorySummary', {
      history: userMetrics.historyCount,
      reviews: userMetrics.reviewCount,
    });
  }, [normalizedRole, roleConfig.profileSubtitle, t, userMetrics.historyCount, userMetrics.reviewCount, userMetrics.upcomingCount, verificationUi?.description]);

  const fallbackServiceChips = useMemo(
    () => toChipList(providerProfile.specialization || providerProfile.shortBio),
    [providerProfile.shortBio, providerProfile.specialization]
  );
  const fallbackAvailabilityChips = useMemo(
    () => toChipList(providerProfile.availabilitySummary),
    [providerProfile.availabilitySummary]
  );
  const serviceNames = useMemo(
    () => activeServices.map((service) => service.name).filter(Boolean).slice(0, 4),
    [activeServices]
  );
  const hasManagedServices = normalizedRole === 'provider' && activeServices.length > 0;
  const contractualServiceChips = hasManagedServices ? serviceNames : fallbackServiceChips;
  const contractualRate = hasManagedServices
    ? activeServices.find((service) => service.baseRate)?.baseRate || providerProfile.baseRate || ''
    : providerProfile.baseRate || '';
  const contractualBio = useMemo(() => {
    if (!hasManagedServices) {
      return providerProfile.shortBio || t('profile.providerBioFallback');
    }

    const serviceDescriptions = activeServices
      .map((service) => service.description?.trim())
      .filter(Boolean);

    if (serviceDescriptions.length) {
      return serviceDescriptions[0];
    }

    return t('profile.providerServicesFallback', { services: serviceNames.join(', ') });
  }, [activeServices, hasManagedServices, providerProfile.shortBio, serviceNames, t]);
  const contractualAvailabilitySummary = hasConfiguredAvailability
    ? availabilitySummary
    : providerProfile.availabilitySummary || t('profile.providerAvailabilityFallback');
  const contractualAvailabilityChips = hasConfiguredAvailability ? availabilityDayChips : fallbackAvailabilityChips;

  function handleMenuItemPress(item) {
    if (item.action === 'switch-account') {
      handleSwitchAccount();
      return;
    }

    if (!item.pathname) {
      return;
    }

    router.push(item.params ? { pathname: item.pathname, params: item.params } : item.pathname);
  }

  function handleSwitchAccount() {
    const buttons = getSwitchAccountChoices(t).map((item) => ({
      text: item.label,
      onPress: () => {
        if (item.role === normalizedRole) {
          return;
        }

        void switchToRole(item.role);
      },
    }));

    Alert.alert(t('profile.switchAccountTitle'), t('profile.switchAccountBody'), [
      ...buttons,
      {
        text: t('profile.cancel'),
        style: 'cancel',
      },
    ]);
  }

  async function switchToRole(nextRole) {
    await signOut(nextRole);
    router.replace({
      pathname: '/auth/loginScreen',
      params: { role: nextRole },
    });
  }

  async function handleLogout() {
    setShowLogoutDialog(false);
    await signOut();
    router.replace('/auth/loginScreen');
  }

  function openEditProfile() {
    if (normalizedRole === 'provider') {
      if (providerOnboarding.verificationStatus === 'pending' || providerOnboarding.verificationStatus === 'suspended') {
        Alert.alert(verificationUi.label, verificationUi.description);
        return;
      }

      if (providerOnboarding.verificationStatus === 'draft' || providerOnboarding.verificationStatus === 'rejected') {
        router.push('/auth/providerOnboardingScreen');
        return;
      }
    }

    router.push(`${normalizedRole === 'provider' ? '/provider' : '/user'}/editProfile/editProfileScreen`);
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.heroBandStyle} />
        <View style={styles.contentInsetStyle}>
          <View style={styles.heroCardStyle}>
            <View style={styles.heroTopRowStyle}>
              <View style={styles.heroBadgeStyle}>
                <Text style={styles.heroBadgeTextStyle}>{roleConfig.accountLabel}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.88} onPress={openEditProfile} style={styles.heroActionButtonStyle}>
                <MaterialIcons name="edit" size={20} color={AinevoieDiscoveryTokens.brandDark} />
              </TouchableOpacity>
            </View>

            {normalizedRole === 'provider' ? (
              <View style={[styles.pendingBannerStyle, { backgroundColor: verificationUi.backgroundColor }]}>
                <MaterialCommunityIcons
                  name={
                    providerOnboarding.verificationStatus === 'draft'
                      ? 'file-document-edit-outline'
                      : providerOnboarding.verificationStatus === 'rejected' || providerOnboarding.verificationStatus === 'suspended'
                        ? 'alert-circle-outline'
                        : 'shield-check-outline'
                  }
                  size={16}
                  color={verificationUi.color}
                />
                <Text style={[styles.pendingBannerTextStyle, { color: verificationUi.color }]}>{verificationUi.label}</Text>
              </View>
            ) : null}

            <View style={styles.identityRowStyle}>
              <Image source={avatarSource} style={styles.avatarStyle} resizeMode="cover" />
              <View style={styles.identityTextWrapStyle}>
                <Text numberOfLines={1} style={styles.userNameStyle}>
                  {profileName}
                </Text>
                <Text numberOfLines={1} style={styles.userEmailStyle}>
                  {profileEmail}
                </Text>
                <Text style={styles.userSubtitleStyle}>{profileSubtitle}</Text>
              </View>
            </View>

            <View style={styles.heroStatsRowStyle}>
              {heroStats.map((item) => (
                <View key={item.label} style={styles.heroStatItemStyle}>
                  <Text style={styles.heroStatValueStyle}>{item.value}</Text>
                  <Text style={styles.heroStatLabelStyle}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.summaryGridStyle}>
            {summaryCards.map((item, index) => (
              <View key={item.label} style={[styles.summaryGridItemStyle, index % 2 === 0 ? styles.summaryGridItemSpacingStyle : null]}>
                <ProfileSummaryCard item={item} onPress={() => handleMenuItemPress(item)} />
              </View>
            ))}
          </View>

          {normalizedRole === 'provider' ? contractualProfileCard() : userActivityCard()}
          {normalizedRole === 'provider' ? providerCredibilityCard() : null}

          {sections.map((section) => (
            <View key={section.title} style={styles.sectionCardStyle}>
              <Text style={styles.sectionTitleStyle}>{section.title}</Text>
              {section.items.map((item, index) => (
                <View key={item.label}>
                  <ProfileActionRow
                    item={item}
                    onPress={item.showArrow === false ? undefined : () => handleMenuItemPress(item)}
                  />
                  {index !== section.items.length - 1 ? <View style={styles.sectionDividerStyle} /> : null}
                </View>
              ))}
            </View>
          ))}

          <TouchableOpacity activeOpacity={0.88} onPress={() => setShowLogoutDialog(true)} style={styles.logoutButtonStyle}>
            <MaterialCommunityIcons name="logout" size={18} color="#D94841" />
            <Text style={styles.logoutButtonTextStyle}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LogoutDialog
        visible={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={() => {
          void handleLogout();
        }}
        title={t('profile.logoutDialogTitle')}
        message={t('profile.logoutDialogBody')}
        confirmLabel={t('profile.logoutConfirm')}
        cancelLabel={t('profile.cancel')}
        compact
      />
    </View>
  );

  function userActivityCard() {
    const recentBookings = bookings.filter((booking) => booking.bookingStatus !== 'upcoming').slice(0, 3);
    const recentReviews = reviews.slice(0, 2);

    return (
      <View style={styles.contractCardStyle}>
        <Text style={styles.sectionTitleStyle}>{t('profile.recentActivityTitle')}</Text>

        <View style={styles.contractBlockStyle}>
          <Text style={styles.contractHeadingStyle}>{t('profile.serviceHistoryTitle')}</Text>
          {recentBookings.length ? (
            recentBookings.map((booking) => (
              <View key={booking.id} style={styles.activityRowStyle}>
                <View style={styles.activityRowTextWrapStyle}>
                  <Text style={styles.activityPrimaryTextStyle}>{booking.providerName}</Text>
                  <Text style={styles.activitySecondaryTextStyle}>{`${booking.dateLabel} • ${booking.serviceName}`}</Text>
                </View>
                <View style={styles.activityChipStyle}>
                  <Text style={styles.activityChipTextStyle}>{getBookingStatusLabel(booking.bookingStatus)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.contractBodyStyle}>{t('profile.noHistoryYet')}</Text>
          )}
        </View>

        <View style={styles.contractBlockStyle}>
          <Text style={styles.contractHeadingStyle}>{t('profile.reviewsGivenTitle')}</Text>
          <Text style={styles.contractBodyStyle}>
            {reviews.length
              ? t('profile.reviewsSavedSummary', { count: reviews.length })
              : t('profile.noReviewsYet')}
          </Text>
          {recentReviews.length ? (
            recentReviews.map((review) => (
              <View key={review.id} style={styles.activityRowStyle}>
                <View style={styles.activityRowTextWrapStyle}>
                  <Text style={styles.activityPrimaryTextStyle}>{review.providerName}</Text>
                  <Text style={styles.activitySecondaryTextStyle}>{review.review}</Text>
                </View>
                <View style={styles.activityChipStyle}>
                  <Text style={styles.activityChipTextStyle}>{`${review.rating.toFixed(1)}★`}</Text>
                </View>
              </View>
            ))
          ) : null}
        </View>
      </View>
    );
  }

  function providerCredibilityCard() {
    const readinessItems = [
      {
        label: t('profile.activeServicesTitle'),
        value: String(activeServices.length),
        meta: activeServices.length ? t('profile.activeServicesReady') : t('profile.activeServicesMissing'),
      },
      {
        label: t('profile.availability'),
        value: hasConfiguredAvailability ? String(availabilityDayChips.length) : '0',
        meta: hasConfiguredAvailability ? t('profile.daysConfigured') : t('profile.unconfigured'),
      },
      {
        label: t('profile.averageScoreTitle'),
        value: formatAverageRating(providerReviews),
        meta: providerReviews.length ? t('profile.averageScoreMeta') : t('profile.noRatingsYet'),
      },
      {
        label: t('profile.activeRequestsTitle'),
        value: String(requestBookings.length),
        meta: t('profile.waitingMeta'),
      },
    ];

    return (
      <View style={styles.contractCardStyle}>
        <Text style={styles.sectionTitleStyle}>{t('profile.credibilityTitle')}</Text>

        <View style={styles.verificationSurfaceStyle}>
          <View style={[styles.verificationPillStyle, { backgroundColor: verificationUi.backgroundColor }]}>
            <MaterialIcons name={verificationUi.icon} size={15} color={verificationUi.color} />
            <Text style={[styles.verificationPillTextStyle, { color: verificationUi.color }]}>{verificationUi.label}</Text>
          </View>
          <Text style={styles.contractBodyStyle}>{verificationUi.description}</Text>
        </View>

        <View style={styles.metaGridStyle}>
          <View style={[styles.metaCardStyle, styles.metaCardSpacingStyle]}>
            <Text style={styles.metaLabelStyle}>{t('profile.receivedReviewsTitle')}</Text>
            <Text style={styles.metaValueStyle}>{providerReviews.length}</Text>
          </View>
          <View style={styles.metaCardStyle}>
            <Text style={styles.metaLabelStyle}>{t('profile.activeBookingsTitle')}</Text>
            <Text style={styles.metaValueStyle}>{providerMetrics.activeBookingCount}</Text>
          </View>
        </View>

        <View style={styles.readinessGridStyle}>
          {readinessItems.map((item, index) => (
            <View key={item.label} style={[styles.readinessCardStyle, index % 2 === 0 ? styles.readinessCardSpacingStyle : null]}>
              <Text style={styles.readinessValueStyle}>{item.value}</Text>
              <Text style={styles.readinessLabelStyle}>{item.label}</Text>
              <Text style={styles.readinessMetaStyle}>{item.meta}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function contractualProfileCard() {
    return (
      <View style={styles.contractCardStyle}>
        <Text style={styles.sectionTitleStyle}>{t('profile.contractProfileTitle')}</Text>

        <View style={styles.contractBlockStyle}>
          <Text style={styles.contractHeadingStyle}>{t('profile.offeredServicesTitle')}</Text>
          <Text style={styles.contractBodyStyle}>{contractualBio}</Text>
        </View>

        <View style={styles.contractBlockStyle}>
          <Text style={styles.contractHeadingStyle}>{t('profile.keyServicesTitle')}</Text>
          <View style={styles.chipsWrapStyle}>
            {(contractualServiceChips.length ? contractualServiceChips : [t('profile.unspecified')]).map((chip) => (
              <View key={chip} style={styles.chipStyle}>
                <Text style={styles.chipTextStyle}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.metaGridStyle}>
          <View style={[styles.metaCardStyle, styles.metaCardSpacingStyle]}>
            <Text style={styles.metaLabelStyle}>{t('profile.startingRateTitle')}</Text>
            <Text style={styles.metaValueStyle}>{formatRateDisplay(contractualRate)}</Text>
          </View>
          <View style={styles.metaCardStyle}>
            <Text style={styles.metaLabelStyle}>{t('profile.coverageAreaTitle')}</Text>
            <Text style={styles.metaValueStyle}>{providerProfile.coverageArea || t('profile.unspecified')}</Text>
          </View>
        </View>

        <View style={styles.contractBlockStyle}>
          <Text style={styles.contractHeadingStyle}>{t('profile.availability')}</Text>
          <Text style={styles.contractBodyStyle}>{contractualAvailabilitySummary}</Text>
          {contractualAvailabilityChips.length ? (
            <View style={styles.chipsWrapStyle}>
              {contractualAvailabilityChips.map((chip) => (
                <View key={chip} style={styles.chipStyle}>
                  <Text style={styles.chipTextStyle}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AinevoieDiscoveryTokens.appBackground,
  },
  scrollContentStyle: {
    paddingBottom: 32,
  },
  heroBandStyle: {
    height: 180,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  contentInsetStyle: {
    marginTop: -120,
    paddingHorizontal: 24,
  },
  heroCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: '#141923',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroTopRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadgeStyle: {
    alignSelf: 'flex-start',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
  },
  heroActionButtonStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFBF8',
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  pendingBannerStyle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pendingBannerTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginLeft: 8,
    fontWeight: '700',
  },
  identityRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  avatarStyle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: AinevoieDiscoveryTokens.surfaceCard,
  },
  identityTextWrapStyle: {
    flex: 1,
    marginLeft: 16,
  },
  userNameStyle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    fontSize: 24,
    lineHeight: 28,
  },
  userEmailStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 4,
  },
  userSubtitleStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 8,
    lineHeight: 18,
  },
  heroStatsRowStyle: {
    flexDirection: 'row',
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  heroStatItemStyle: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValueStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    fontSize: 20,
    lineHeight: 24,
  },
  heroStatLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 4,
  },
  summaryGridStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  summaryGridItemStyle: {
    width: '50%',
    marginBottom: 12,
  },
  summaryGridItemSpacingStyle: {
    paddingRight: 6,
  },
  contractCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#141923',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  contractBlockStyle: {
    marginTop: 10,
  },
  contractHeadingStyle: {
    ...AinevoieDiscoveryTypography.body,
    fontWeight: '700',
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  contractBodyStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 8,
    lineHeight: 19,
  },
  chipsWrapStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  chipStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  chipTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
  },
  metaGridStyle: {
    flexDirection: 'row',
    marginTop: 16,
  },
  metaCardStyle: {
    flex: 1,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metaCardSpacingStyle: {
    marginRight: 10,
  },
  metaLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
  },
  metaValueStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
    marginTop: 8,
  },
  sectionCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginTop: 18,
    paddingVertical: 12,
    shadowColor: '#141923',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionTitleStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginHorizontal: 18,
    marginBottom: 6,
  },
  sectionDividerStyle: {
    height: 1,
    backgroundColor: AinevoieDiscoveryTokens.borderSubtle,
    marginHorizontal: 16,
  },
  activityRowStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  activityRowTextWrapStyle: {
    flex: 1,
    marginRight: 12,
  },
  activityPrimaryTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  activitySecondaryTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  activityChipStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activityChipTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
  },
  verificationSurfaceStyle: {
    marginTop: 10,
  },
  verificationPillStyle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  verificationPillTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginLeft: 6,
    fontWeight: '700',
  },
  readinessGridStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  readinessCardStyle: {
    width: '50%',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  readinessCardSpacingStyle: {
    paddingRight: 6,
  },
  readinessValueStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  readinessLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 6,
  },
  readinessMetaStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 6,
  },
  logoutButtonStyle: {
    minHeight: 56,
    borderRadius: 22,
    marginTop: 20,
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F5C8C4',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: '#D94841',
    marginLeft: 10,
    fontWeight: '700',
  },
});
