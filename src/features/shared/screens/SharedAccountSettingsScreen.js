import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import ProfileActionRow from '../components/profile/ProfileActionRow';
import { getRoleDisplayConfig } from '../config/roleDisplayConfig';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

export default function SharedAccountSettingsScreen({ role }) {
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useLocale();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const roleConfig = getRoleDisplayConfig(normalizedRole, t);
  const rolePrefix = normalizedRole === 'provider' ? '/provider' : '/user';

  const settingsCards = [
    {
      key: 'notifications',
      icon: 'bell-cog-outline',
      title: t('settings.notificationsTitle'),
      description: t('settings.notificationsDescription'),
      pathname: `${rolePrefix}/notificationPreferences/notificationPreferencesScreen`,
      actionLabel: t('settings.notificationsAction'),
      actionIcon: 'chevron-right',
    },
    {
      key: 'security',
      icon: 'shield-lock-outline',
      title: t('settings.securityTitle'),
      description: t('settings.securityDescription'),
      pathname: `${rolePrefix}/security/securityScreen`,
      actionLabel: t('settings.securityAction'),
      actionIcon: 'chevron-right',
    },
    {
      key: 'language',
      icon: 'translate',
      title: t('language.settingsLabel'),
      description: t('language.settingsDescription'),
      pathname: `${rolePrefix}/settings/languageScreen`,
      actionLabel: t('language.settingsAction'),
      actionIcon: 'chevron-right',
    },
  ];

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={AinevoieDiscoveryTokens.appBackground} barStyle="dark-content" />
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('settings.title')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('settings.subtitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.heroCardStyle}>
          <View style={styles.heroBadgeStyle}>
            <Text style={styles.heroBadgeTextStyle}>{roleConfig.accountLabel}</Text>
          </View>
          <Text style={styles.heroTitleStyle}>{t('settings.heroTitle')}</Text>
          <Text style={styles.heroTextStyle}>{t('settings.heroBody')}</Text>
        </View>

        {settingsCards.map((card) => (
          <TouchableOpacity
            key={card.key}
            activeOpacity={0.9}
            onPress={() => router.push(card.pathname)}
            style={styles.sectionCardStyle}
          >
            <View style={styles.sectionIconWrapStyle}>
              <MaterialCommunityIcons name={card.icon} size={20} color={AinevoieDiscoveryTokens.accentDark} />
            </View>
            <View style={styles.sectionContentWrapStyle}>
              <Text style={styles.sectionTitleStyle}>{card.title}</Text>
              <Text style={styles.sectionDescriptionStyle}>{card.description}</Text>
              <View style={styles.sectionActionRowStyle}>
                <Text style={styles.sectionActionTextStyle}>{card.actionLabel}</Text>
                <MaterialIcons name={card.actionIcon} size={16} color={AinevoieDiscoveryTokens.accentDark} />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.sectionCardStyle}>
          <View style={styles.sectionHeaderStyle}>
            <View style={styles.sectionIconWrapStyle}>
              <MaterialCommunityIcons name="account-cog-outline" size={20} color={AinevoieDiscoveryTokens.accentDark} />
            </View>
            <View style={styles.sectionContentWrapStyle}>
              <Text style={styles.sectionTitleStyle}>{t('settings.accountTitle')}</Text>
              <Text style={styles.sectionDescriptionStyle}>{t('settings.accountDescription')}</Text>
            </View>
          </View>

          <View style={styles.innerRowsWrapStyle}>
            <ProfileActionRow
              item={{ label: t('settings.editProfile'), icon: 'account-edit-outline' }}
              onPress={() => router.push(`${rolePrefix}/editProfile/editProfileScreen`)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AinevoieDiscoveryTokens.appBackground,
  },
  headerWrapStyle: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerBackButtonStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginBottom: 16,
  },
  headerTitleStyle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  headerSubtitleStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  scrollContentStyle: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  heroCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 16,
  },
  heroBadgeStyle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  heroBadgeTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
  },
  heroTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginTop: 14,
  },
  heroTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  sectionCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
  },
  sectionHeaderStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionIconWrapStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    marginRight: 14,
  },
  sectionContentWrapStyle: {
    flex: 1,
  },
  sectionTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  sectionDescriptionStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  sectionActionRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  sectionActionTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
    marginRight: 6,
  },
  innerRowsWrapStyle: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    borderRadius: 22,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
  },
});
