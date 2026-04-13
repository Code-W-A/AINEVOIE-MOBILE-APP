import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { Sizes } from '../../../../constant/styles';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { useProviderOnboarding } from '../../../../hooks/useProviderOnboarding';
import { buildMaskedPhoneNumber, buildPhoneValueFromDigits, extractPhoneDigits, normalizePhoneToE164 } from '../../../../src/firebase/authHelpers';
import { getEmailAuthRouteForRoleIntent } from '../../../../utils/roleRoutes';
import { getRoleDisplayConfig } from '../../shared/config/roleDisplayConfig';
import { authTheme } from '../theme/authTheme';

const theme = authTheme;

export default function SharedPhoneAuthScreen({ role, intent }) {
  const router = useRouter();
  const { t } = useLocale();
  const { requestPhoneOtp, setLastRole } = useSession();
  const { saveProviderOnboarding } = useProviderOnboarding();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const normalizedIntent = intent === 'signup' ? 'signup' : 'login';
  const isSignup = normalizedIntent === 'signup';
  const roleConfig = getRoleDisplayConfig(normalizedRole, t);
  const emailAuthRoute = getEmailAuthRouteForRoleIntent(normalizedRole, normalizedIntent);
  const [state, setState] = useState({
    name: '',
    phoneNumber: '',
    legalAccepted: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageTitle = isSignup ? t('roleAuth.phoneSignupTitle') : t('roleAuth.phoneLoginTitle');
  const phoneDigits = extractPhoneDigits(state.phoneNumber);

  function updateState(data) {
    setState((currentState) => ({ ...currentState, ...data }));
    setFieldErrors((currentErrors) => {
      if (Object.keys(currentErrors).length === 0) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      Object.keys(data).forEach((key) => {
        delete nextErrors[key];
      });
      return nextErrors;
    });
  }

  function getPhoneValidationMessage(phoneValue) {
    return normalizePhoneToE164(phoneValue) ? '' : t('roleAuth.phoneInvalid');
  }

  function syncPhoneError(phoneValue, shouldValidate = false) {
    const nextMessage = shouldValidate ? getPhoneValidationMessage(phoneValue) : '';

    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (nextMessage) {
        nextErrors.phoneNumber = nextMessage;
      } else {
        delete nextErrors.phoneNumber;
      }

      return nextErrors;
    });
  }

  function handlePhoneChange(text) {
    const nextPhoneValue = buildPhoneValueFromDigits(text);
    const shouldValidate = Boolean(touchedFields.phoneNumber || fieldErrors.phoneNumber);

    updateState({ phoneNumber: nextPhoneValue });

    if (shouldValidate) {
      syncPhoneError(nextPhoneValue, true);
    }
  }

  function handlePhoneBlur() {
    setFocusedField((currentValue) => (currentValue === 'phoneNumber' ? null : currentValue));
    setTouchedFields((currentValue) => ({ ...currentValue, phoneNumber: true }));
    syncPhoneError(state.phoneNumber, true);
  }

  const prepareProviderDraft = useCallback(async () => {
    if (!(isSignup && normalizedRole === 'provider')) {
      return;
    }

    await saveProviderOnboarding((current) => ({
      ...current,
      account: {
        ...current.account,
        name: state.name.trim() || current.account.name,
        email: current.account.email || '',
        password: '',
      },
      currentStep: Math.max(current.currentStep || 0, 1),
    }));
  }, [isSignup, normalizedRole, saveProviderOnboarding, state.name]);

  function buildFieldErrors() {
    const nextErrors = {};

    if (isSignup && !state.name.trim()) {
      nextErrors.name = t('roleAuth.nameRequired');
    }

    if (getPhoneValidationMessage(state.phoneNumber)) {
      nextErrors.phoneNumber = t('roleAuth.phoneInvalid');
    }

    if (isSignup && !state.legalAccepted) {
      nextErrors.legalAccepted = t('roleAuth.legalRequired');
    }

    return nextErrors;
  }

  async function handleSubmit() {
    const nextErrors = buildFieldErrors();
    const validationError = nextErrors.name || nextErrors.phoneNumber || nextErrors.legalAccepted || null;
    setFieldErrors(nextErrors);

    if (validationError) {
      console.warn('[PhoneAuthScreen][sendOtp] blocked by validation', {
        role: normalizedRole,
        intent: normalizedIntent,
        hasName: Boolean(state.name.trim()),
        phoneNumberPreview: buildMaskedPhoneNumber(state.phoneNumber),
        legalAccepted: state.legalAccepted,
        validationError,
      });
      Alert.alert(t('passwordRecovery.invalidForm'), validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[PhoneAuthScreen][sendOtp] submit', {
        role: normalizedRole,
        intent: normalizedIntent,
        phoneNumberPreview: buildMaskedPhoneNumber(state.phoneNumber),
        hasDisplayName: Boolean(state.name.trim()),
      });
      await setLastRole(normalizedRole);
      await prepareProviderDraft();
      const result = await requestPhoneOtp({
        role: normalizedRole,
        intent: normalizedIntent,
        phoneNumber: state.phoneNumber,
        displayName: state.name.trim(),
      });

      router.push({
        pathname: '/auth/otpScreen',
        params: {
          role: normalizedRole,
          intent: normalizedIntent,
          authMethod: 'phone',
          phoneNumber: result.phoneNumber,
        },
      });
      console.log('[PhoneAuthScreen][sendOtp] navigateToOtp', {
        role: normalizedRole,
        intent: normalizedIntent,
        phoneNumberPreview: buildMaskedPhoneNumber(result.phoneNumber),
      });
    } catch (error) {
      console.error('[PhoneAuthScreen][sendOtp] failed', {
        role: normalizedRole,
        intent: normalizedIntent,
        phoneNumberPreview: buildMaskedPhoneNumber(state.phoneNumber),
        code: error?.code || null,
        name: error?.name || null,
        message: error?.message || 'Unknown phone auth screen error',
        stack: error?.stack || null,
      });
      Alert.alert(
        t('roleAuth.authFailedTitle'),
        error instanceof Error ? error.message : t('roleAuth.incompleteTitle'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderTextField({
    fieldKey,
    label,
    placeholder,
    value,
    onChangeText,
    icon,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    fixedPrefix = '',
    onBlurOverride = null,
  }) {
    const isFocused = focusedField === fieldKey;
    const hasError = !!fieldErrors[fieldKey];
    const isFilled = value.trim().length > 0;
    const iconColor = hasError ? theme.error.default : isFocused || isFilled ? theme.brand.primary : theme.text.secondary;

    return (
      <View style={styles.fieldBlockStyle}>
        <Text style={styles.fieldLabelStyle}>{label}</Text>
        <View
          style={[
            styles.textFieldWrapStyle,
            isFocused ? styles.textFieldWrapFocusedStyle : null,
            hasError ? styles.textFieldWrapErrorStyle : null,
          ]}
        >
          <View
            style={[
              styles.textFieldIconWrapStyle,
              isFocused || isFilled ? styles.textFieldIconWrapActiveStyle : null,
              hasError ? styles.textFieldIconWrapErrorStyle : null,
            ]}
          >
            <MaterialIcons name={icon} size={18} color={iconColor} />
          </View>
          {fixedPrefix ? (
            <View
              style={[
                styles.fixedPrefixWrapStyle,
                isFocused || isFilled ? styles.fixedPrefixWrapActiveStyle : null,
                hasError ? styles.fixedPrefixWrapErrorStyle : null,
              ]}
            >
              <Text style={[styles.fixedPrefixTextStyle, { color: iconColor }]}>{fixedPrefix}</Text>
            </View>
          ) : null}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            style={styles.textFieldStyle}
            placeholderTextColor={theme.text.muted}
            selectionColor={theme.brand.primary}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            numberOfLines={1}
            cursorColor={theme.brand.primary}
            onFocus={() => setFocusedField(fieldKey)}
            onBlur={() => {
              if (onBlurOverride) {
                onBlurOverride();
                return;
              }

              setFocusedField((currentValue) => (currentValue === fieldKey ? null : currentValue));
            }}
          />
        </View>
        {hasError ? <Text style={styles.fieldErrorTextStyle}>{fieldErrors[fieldKey]}</Text> : null}
      </View>
    );
  }

  function legalConsentBlock() {
    const hasError = !!fieldErrors.legalAccepted;

    return (
      <View style={styles.legalWrapStyle}>
        <Pressable
          onPress={() => updateState({ legalAccepted: !state.legalAccepted })}
          style={({ pressed }) => [
            styles.legalRowStyle,
            pressed ? styles.legalRowPressedStyle : null,
          ]}
        >
          <View
            style={[
              styles.legalCheckboxStyle,
              state.legalAccepted ? styles.legalCheckboxActiveStyle : null,
              hasError ? styles.legalCheckboxErrorStyle : null,
            ]}
          >
            {state.legalAccepted ? <MaterialIcons name="check" size={16} color={theme.button.primaryText} /> : null}
          </View>
          <View style={styles.legalTextWrapStyle}>
            <Text style={styles.legalTextStyle}>
              {t('roleAuth.legalPrefix')}
              <Text onPress={() => router.push('/auth/termsOfUseScreen')} style={styles.legalLinkTextStyle}>{t('roleAuth.terms')}</Text>
              {t('roleAuth.legalMiddle')}
              <Text onPress={() => router.push('/auth/privacyPolicyScreen')} style={styles.legalLinkTextStyle}>{t('roleAuth.privacy')}</Text>
              {t('roleAuth.legalSuffix')}
            </Text>
          </View>
        </Pressable>
        {hasError ? <Text style={styles.fieldErrorTextStyle}>{fieldErrors.legalAccepted}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={theme.auth.background} />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.container}>
        <Pressable
          onPress={() => router.replace(emailAuthRoute)}
          style={({ pressed }) => [
            styles.backArrowStyle,
            pressed ? styles.backArrowPressedStyle : null,
          ]}
        >
          <MaterialIcons name="arrow-back" size={22} color={theme.text.primary} />
        </Pressable>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentStyle}
        >
          <View style={styles.heroSectionStyle}>
            <View style={styles.brandPillStyle}>
              <View style={styles.brandDotStyle} />
              <Image source={require('../../../../assets/images/app_icon.png')} style={styles.brandPillLogoStyle} resizeMode="contain" />
              <Text style={styles.brandPillTextStyle}>AI Nevoie</Text>
            </View>
            <Text style={styles.roleLabelStyle}>{roleConfig.accountLabel}</Text>
            <Text style={styles.titleStyle}>{pageTitle}</Text>
          </View>

          <View style={styles.formFlowStyle}>
            {isSignup ? renderTextField({
              fieldKey: 'name',
              label: t('roleAuth.nameLabel'),
              placeholder: t('roleAuth.namePlaceholder'),
              value: state.name,
              onChangeText: (text) => updateState({ name: text }),
              icon: 'person-outline',
            }) : null}
            {renderTextField({
              fieldKey: 'phoneNumber',
              label: t('roleAuth.phoneLabel'),
              placeholder: t('roleAuth.phonePlaceholder'),
              value: phoneDigits,
              onChangeText: handlePhoneChange,
              icon: 'phone-iphone',
              keyboardType: 'phone-pad',
              autoCapitalize: 'none',
              fixedPrefix: '+',
              onBlurOverride: handlePhoneBlur,
            })}
            {isSignup ? legalConsentBlock() : null}
            <Pressable
              onPress={() => { void handleSubmit(); }}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.continueButtonStyle,
                {
                  backgroundColor: pressed ? theme.button.primaryBackgroundPressed : theme.button.primaryBackground,
                },
                isSubmitting ? styles.buttonDisabledStyle : null,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.button.primaryText} />
              ) : (
                <Text style={styles.continueButtonTextStyle}>{t('roleAuth.continueWithPhone')}</Text>
              )}
            </Pressable>
            <View style={styles.switchInfoWrapStyle}>
              <Text style={styles.switchInfoTextStyle}>{t('roleAuth.backToEmailPrompt')}</Text>
              <Pressable onPress={() => router.replace(emailAuthRoute)}>
                <Text style={styles.switchActionTextStyle}>{` ${t('roleAuth.backToEmail')}`}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.auth.background,
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: theme.brand.primarySoft,
    top: -84,
    right: -76,
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.58)',
    bottom: -54,
    left: -76,
  },
  container: {
    flex: 1,
  },
  backArrowStyle: {
    width: 44.0,
    height: 44.0,
    borderRadius: 22.0,
    marginTop: Sizes.fixPadding * 1.8,
    marginLeft: Sizes.fixPadding * 2.0,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.auth.surface,
    borderWidth: 1.0,
    borderColor: theme.border.subtle,
    shadowColor: '#141923',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  backArrowPressedStyle: {
    backgroundColor: theme.brand.primarySoft,
    borderColor: theme.brand.primarySoft,
  },
  scrollContentStyle: {
    flexGrow: 1,
    paddingHorizontal: Sizes.fixPadding * 2.4,
    paddingTop: Sizes.fixPadding * 0.6,
    paddingBottom: Sizes.fixPadding * 3.8,
  },
  heroSectionStyle: {
    paddingTop: Sizes.fixPadding * 2.6,
    marginBottom: Sizes.fixPadding * 1.6,
  },
  brandPillStyle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: Sizes.fixPadding + 8.0,
    paddingVertical: Sizes.fixPadding - 3.0,
    marginBottom: Sizes.fixPadding * 1.8,
    backgroundColor: theme.brand.primarySoft,
  },
  brandDotStyle: {
    width: 8.0,
    height: 8.0,
    borderRadius: 4.0,
    backgroundColor: theme.brand.primary,
    marginRight: Sizes.fixPadding - 2.0,
  },
  brandPillLogoStyle: {
    width: 20.0,
    height: 20.0,
    marginRight: Sizes.fixPadding - 2.0,
  },
  brandPillTextStyle: {
    color: theme.link.default,
    fontSize: 13,
    fontFamily: 'Montserrat_Bold',
  },
  roleLabelStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Sizes.fixPadding - 1.0,
  },
  titleStyle: {
    color: theme.text.primary,
    fontSize: 38,
    lineHeight: 46,
    fontFamily: 'Montserrat_Bold',
    maxWidth: '92%',
  },
  formFlowStyle: {
    gap: Sizes.fixPadding * 1.4,
  },
  fieldBlockStyle: {
    gap: Sizes.fixPadding - 2.0,
  },
  fieldLabelStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginLeft: 2.0,
  },
  textFieldWrapStyle: {
    backgroundColor: theme.auth.inputBackground,
    minHeight: 58.0,
    borderRadius: 22.0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Sizes.fixPadding + 6.0,
    borderColor: theme.auth.inputBorder,
    borderWidth: 1.5,
    shadowColor: '#141923',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  textFieldWrapFocusedStyle: {
    borderColor: theme.auth.inputBorderFocused,
  },
  textFieldWrapErrorStyle: {
    borderColor: theme.error.default,
  },
  textFieldIconWrapStyle: {
    width: 36.0,
    height: 36.0,
    borderRadius: 18.0,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sizes.fixPadding + 2.0,
    backgroundColor: 'transparent',
  },
  textFieldIconWrapActiveStyle: {
    backgroundColor: theme.brand.primarySoft,
  },
  textFieldIconWrapErrorStyle: {
    backgroundColor: 'rgba(216,74,74,0.10)',
  },
  fixedPrefixWrapStyle: {
    minWidth: 34.0,
    height: 36.0,
    borderRadius: 18.0,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sizes.fixPadding,
    backgroundColor: 'rgba(20, 25, 35, 0.03)',
  },
  fixedPrefixWrapActiveStyle: {
    backgroundColor: theme.brand.primarySoft,
  },
  fixedPrefixWrapErrorStyle: {
    backgroundColor: 'rgba(216,74,74,0.10)',
  },
  fixedPrefixTextStyle: {
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
  },
  textFieldStyle: {
    flex: 1,
    padding: 0,
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Medium',
  },
  fieldErrorTextStyle: {
    color: theme.error.default,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Montserrat_Medium',
    marginTop: Sizes.fixPadding - 4.0,
    marginLeft: 4.0,
  },
  continueButtonStyle: {
    minHeight: 58.0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Sizes.fixPadding,
    shadowColor: theme.brand.primary,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  continueButtonTextStyle: {
    color: theme.button.primaryText,
    fontSize: 16,
    fontFamily: 'Montserrat_Bold',
  },
  buttonDisabledStyle: {
    opacity: 0.72,
  },
  switchInfoWrapStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Sizes.fixPadding * 0.5,
    flexWrap: 'wrap',
  },
  switchInfoTextStyle: {
    color: theme.text.secondary,
    fontSize: 13,
    fontFamily: 'Montserrat_Medium',
  },
  switchActionTextStyle: {
    color: theme.link.default,
    fontSize: 13,
    fontFamily: 'Montserrat_Bold',
  },
  legalWrapStyle: {
    marginTop: Sizes.fixPadding - 2.0,
    marginBottom: Sizes.fixPadding + 2.0,
  },
  legalRowStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  legalRowPressedStyle: {
    opacity: 0.84,
  },
  legalCheckboxStyle: {
    width: 22.0,
    height: 22.0,
    borderRadius: 7.0,
    borderWidth: 1.5,
    borderColor: theme.border.subtle,
    marginTop: 2.0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.auth.surface,
  },
  legalCheckboxActiveStyle: {
    backgroundColor: theme.brand.primary,
    borderColor: theme.brand.primary,
  },
  legalCheckboxErrorStyle: {
    borderColor: theme.error.default,
  },
  legalTextWrapStyle: {
    flex: 1,
    marginLeft: Sizes.fixPadding - 2.0,
  },
  legalTextStyle: {
    color: theme.text.secondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_Medium',
  },
  legalLinkTextStyle: {
    color: theme.link.default,
    fontFamily: 'Montserrat_Bold',
  },
});
