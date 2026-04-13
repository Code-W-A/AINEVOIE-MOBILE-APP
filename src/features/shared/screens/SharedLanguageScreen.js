import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { useNavigation } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { createTranslator } from '../localization';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

export default function SharedLanguageScreen() {
  const navigation = useNavigation();
  const { locale, setLocale, supportedLocales, t } = useLocale();
  const [snackbarMessage, setSnackbarMessage] = useState('');

  async function handleSelect(nextLocale) {
    if (nextLocale === locale) {
      return;
    }

    await setLocale(nextLocale);
    setSnackbarMessage(createTranslator(nextLocale)('language.saved'));
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={AinevoieDiscoveryTokens.appBackground} barStyle="dark-content" />
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('language.screenTitle')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('language.screenSubtitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.heroCardStyle}>
          <Text style={styles.heroTitleStyle}>{t('language.heroTitle')}</Text>
          <Text style={styles.heroTextStyle}>{t('language.heroBody')}</Text>
        </View>

        {supportedLocales.map((item) => {
          const isActive = item.code === locale;
          const title = item.code === 'en' ? t('language.enLabel') : t('language.roLabel');
          const description = item.code === 'en' ? t('language.enDescription') : t('language.roDescription');

          return (
            <TouchableOpacity
              key={item.code}
              activeOpacity={0.9}
              onPress={() => { void handleSelect(item.code); }}
              style={[styles.languageCardStyle, isActive ? styles.languageCardActiveStyle : null]}
            >
              <View style={styles.languageContentWrapStyle}>
                <Text style={styles.languageTitleStyle}>{title}</Text>
                <Text style={styles.languageDescriptionStyle}>{description}</Text>
              </View>
              <View style={[styles.statusPillStyle, isActive ? styles.statusPillActiveStyle : null]}>
                <Text style={[styles.statusPillTextStyle, isActive ? styles.statusPillTextActiveStyle : null]}>
                  {isActive ? t('language.active') : item.code.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
  languageCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageCardActiveStyle: {
    borderColor: AinevoieDiscoveryTokens.accent,
    backgroundColor: '#FFF8F1',
  },
  languageContentWrapStyle: {
    flex: 1,
    paddingRight: 12,
  },
  languageTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  languageDescriptionStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 6,
  },
  statusPillStyle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
  },
  statusPillActiveStyle: {
    borderColor: AinevoieDiscoveryTokens.accent,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  statusPillTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    fontWeight: '700',
  },
  statusPillTextActiveStyle: {
    color: AinevoieDiscoveryTokens.accentDark,
  },
});
