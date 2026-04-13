import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import AppHeader from '../components/AppHeader';
import { getSupportTopicConfig } from '../config/supportTopicConfig';
import { AinevoieDiscoveryPrimitives, AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

export default function SharedSupportScreen() {
  const navigation = useNavigation();
  const { topic } = useLocalSearchParams();
  const { locale, t } = useLocale();
  const [state, setState] = useState({
    name: '',
    email: '',
    message: '',
  });

  const resolvedTopic = Array.isArray(topic) ? topic[0] : topic;
  const content = useMemo(() => getSupportTopicConfig(resolvedTopic, locale), [locale, resolvedTopic]);

  function updateState(data) {
    setState((currentState) => ({ ...currentState, ...data }));
  }

  const { name, email, message } = state;

  function handleSubmit() {
    let validationError = null;

    if (!name.trim()) {
      validationError = t('support.validationName');
    } else if (!email.trim()) {
      validationError = t('support.validationEmail');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      validationError = t('support.validationEmailInvalid');
    } else if (!message.trim()) {
      validationError = t('support.validationMessage');
    }

    if (validationError) {
      Alert.alert(t('support.invalidTitle'), validationError);
      return;
    }

    setState({ name: '', email: '', message: '' });
    Alert.alert(content.successTitle, content.successMessage, [
      {
        text: t('support.successOk'),
        onPress: () => navigation.pop(),
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      <View style={styles.innerScreenStyle}>
        <AppHeader title={content.title} />
        <ScrollView
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainerStyle}
        >
          <View style={styles.heroCardStyle}>
            <Text style={styles.heroTitleStyle}>{content.title}</Text>
            <Text style={styles.heroBodyStyle}>{t('support.heroBody')}</Text>
          </View>

          <View style={styles.formCardStyle}>
            <View style={styles.fieldWrapStyle}>
              <TextInput
                label={t('support.nameLabel')}
                placeholder={t('support.namePlaceholder')}
                mode="outlined"
                value={name}
                onChangeText={(text) => updateState({ name: text })}
                style={styles.textFieldStyle}
                selectionColor={AinevoieDiscoveryTokens.accent}
                outlineStyle={styles.outlineStyle}
                theme={{ colors: { primary: AinevoieDiscoveryTokens.borderFocus, outline: AinevoieDiscoveryTokens.borderSubtle } }}
              />
            </View>
            <View style={styles.fieldWrapStyle}>
              <TextInput
                label={t('support.emailLabel')}
                placeholder={t('support.emailPlaceholder')}
                mode="outlined"
                value={email}
                onChangeText={(text) => updateState({ email: text })}
                style={styles.textFieldStyle}
                selectionColor={AinevoieDiscoveryTokens.accent}
                outlineStyle={styles.outlineStyle}
                theme={{ colors: { primary: AinevoieDiscoveryTokens.borderFocus, outline: AinevoieDiscoveryTokens.borderSubtle } }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.fieldWrapStyle}>
              <TextInput
                label={t('support.messageLabel')}
                placeholder={content.messagePlaceholder}
                multiline
                numberOfLines={6}
                mode="outlined"
                value={message}
                onChangeText={(text) => updateState({ message: text })}
                style={styles.messageFieldStyle}
                textAlignVertical="top"
                selectionColor={AinevoieDiscoveryTokens.accent}
                outlineStyle={styles.outlineStyle}
                theme={{ colors: { primary: AinevoieDiscoveryTokens.borderFocus, outline: AinevoieDiscoveryTokens.borderSubtle } }}
              />
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.9} onPress={handleSubmit} style={styles.submitButtonStyle}>
            <Text style={styles.submitButtonTextStyle}>{t('support.submit')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...AinevoieDiscoveryPrimitives.screen,
  },
  innerScreenStyle: {
    flex: 1,
  },
  contentContainerStyle: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroCardStyle: {
    ...AinevoieDiscoveryPrimitives.softHeroSurface,
    marginTop: 8,
  },
  heroTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
  },
  heroBodyStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  formCardStyle: {
    ...AinevoieDiscoveryPrimitives.contentSurface,
    marginTop: 18,
    padding: 18,
  },
  fieldWrapStyle: {
    marginBottom: 14,
  },
  textFieldStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
  },
  messageFieldStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    minHeight: 140,
  },
  outlineStyle: {
    borderRadius: 20,
  },
  submitButtonStyle: {
    ...AinevoieDiscoveryPrimitives.primaryButton,
    marginTop: 18,
  },
  submitButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
