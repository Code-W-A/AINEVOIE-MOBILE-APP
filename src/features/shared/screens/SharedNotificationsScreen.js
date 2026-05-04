import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { Fonts } from '../../../../constant/styles';
import { useLocale } from '../../../../context/localeContext';
import {
  AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
  AinevoieDiscoverySpacing as DiscoverySpacing,
  AinevoieDiscoveryTypography as DiscoveryTypography,
  AinevoieDiscoveryTokens as DiscoveryTokens,
} from '../styles/discoverySystem';
import { FEATURES } from '../config/featureFlags';

export default function SharedNotificationsScreen({ role }) {
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useLocale();
  const isUnavailable = !FEATURES.notifications;

  if (!isUnavailable) {
    return null;
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

  function emptyState() {
    return (
      <View style={styles.emptyWrap}>
        <View style={DiscoveryPrimitives.emptyState}>
          <MaterialIcons name="notifications-off" size={46} color={DiscoveryTokens.textSecondary} />
          <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>
            Nu există colecție MVP pentru notificări persistente. Feed-ul rămâne gol până când notificările reale sunt modelate în Firebase.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      {header()}
      {emptyState()}
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
});
