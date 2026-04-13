import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { useNavigation } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useNotificationPreferences } from '../../../../hooks/useNotificationPreferences';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

export default function SharedNotificationPreferencesScreen({ role }) {
  const navigation = useNavigation();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const { t } = useLocale();
  const { preferences, isLoading, savePreferences } = useNotificationPreferences(normalizedRole);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const preferenceRows = [
    {
      key: 'bookings',
      title: t('notificationPreferences.bookingsTitle'),
      description: t('notificationPreferences.bookingsDescription'),
      icon: 'calendar-check-outline',
    },
    {
      key: 'messages',
      title: t('notificationPreferences.messagesTitle'),
      description: t('notificationPreferences.messagesDescription'),
      icon: 'message-text-outline',
    },
    {
      key: 'promoSystem',
      title: t('notificationPreferences.promoTitle'),
      description: t('notificationPreferences.promoDescription'),
      icon: 'bullhorn-outline',
    },
  ];

  const enabledCount = useMemo(
    () => Object.values(preferences).filter(Boolean).length,
    [preferences]
  );

  async function handleToggle(key, value) {
    await savePreferences((current) => ({
      ...current,
      [key]: value,
    }));
    setSnackbarMessage(t('notificationPreferences.saved'));
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={AinevoieDiscoveryTokens.appBackground} barStyle="dark-content" />
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('notificationPreferences.title')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('notificationPreferences.subtitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.heroCardStyle}>
          <Text style={styles.heroTitleStyle}>{t('notificationPreferences.heroTitle', { count: enabledCount })}</Text>
          <Text style={styles.heroTextStyle}>{t('notificationPreferences.heroBody')}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrapStyle}>
            <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.accent} />
            <Text style={styles.loadingTextStyle}>{t('notificationPreferences.loading')}</Text>
          </View>
        ) : (
          preferenceRows.map((item) => (
            <View key={item.key} style={styles.preferenceCardStyle}>
              <View style={styles.preferenceTopRowStyle}>
                <View style={styles.preferenceIconWrapStyle}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={AinevoieDiscoveryTokens.accentDark} />
                </View>
                <View style={styles.preferenceContentWrapStyle}>
                  <Text style={styles.preferenceTitleStyle}>{item.title}</Text>
                  <Text style={styles.preferenceDescriptionStyle}>{item.description}</Text>
                </View>
                <Switch
                  value={Boolean(preferences[item.key])}
                  onValueChange={(nextValue) => {
                    void handleToggle(item.key, nextValue);
                  }}
                  trackColor={{ false: '#D8DEE8', true: AinevoieDiscoveryTokens.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Snackbar visible={Boolean(snackbarMessage)} onDismiss={() => setSnackbarMessage('')} duration={2200}>
        {snackbarMessage}
      </Snackbar>
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
    paddingBottom: 32,
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
  heroTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  heroTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  loadingWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingVertical: 18,
  },
  loadingTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginLeft: 10,
  },
  preferenceCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 12,
  },
  preferenceTopRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceIconWrapStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    marginRight: 14,
  },
  preferenceContentWrapStyle: {
    flex: 1,
    paddingRight: 12,
  },
  preferenceTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontSize: 17,
  },
  preferenceDescriptionStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 6,
  },
});
