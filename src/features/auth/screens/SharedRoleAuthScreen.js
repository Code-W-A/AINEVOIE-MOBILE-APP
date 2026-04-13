import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { Sizes } from '../../../../constant/styles';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { useProviderOnboarding } from '../../../../hooks/useProviderOnboarding';
import { getGoogleAuthConfig, getGoogleAuthConfigError, isGoogleAuthConfigured } from '../../../../src/firebase/authHelpers';
import {
  getAuthRouteForRole,
  getEmailAuthRouteForRoleIntent,
  getForgotPasswordRouteForRole,
  getPhoneAuthRouteForRoleIntent,
  getPostBootstrapRoute,
} from '../../../../utils/roleRoutes';
import { getRoleDisplayConfig } from '../../shared/config/roleDisplayConfig';
import { authTheme } from '../theme/authTheme';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const theme = authTheme;

WebBrowser.maybeCompleteAuthSession();

export default function SharedRoleAuthScreen({ mode, role }) {
  const router = useRouter();
  const { t } = useLocale();
  const {
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    setLastRole,
  } = useSession();
  const { saveProviderOnboarding } = useProviderOnboarding();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const isSignup = mode === 'signup';
  const roleConfig = getRoleDisplayConfig(normalizedRole, t);
  const pageTitle = isSignup
    ? t('roleAuth.createAccount')
    : normalizedRole === 'provider'
      ? t('roleAuth.providerLoginTitle')
      : t('roleAuth.userLoginTitle');
  const authIntent = isSignup ? 'signup' : 'login';
  const phoneAuthRoute = getPhoneAuthRouteForRoleIntent(normalizedRole, authIntent);
  const oppositeAuthRoute = getEmailAuthRouteForRoleIntent(normalizedRole, isSignup ? 'login' : 'signup');
  const [state, setState] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    legalAccepted: false,
  });
  const [focusedField, setFocusedField] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [visibility, setVisibility] = useState({
    password: false,
    confirmPassword: false,
  });
  const [isPrimarySubmitting, setIsPrimarySubmitting] = useState(false);
  const [activeAlternativeMethod, setActiveAlternativeMethod] = useState(null);
  const handledGoogleResponseRef = useRef(null);
  const googleAuthConfig = useMemo(() => {
    const config = getGoogleAuthConfig();

    return {
      webClientId: config.webClientId || 'missing-google-client-id',
      iosClientId: config.iosClientId || 'missing-google-client-id',
      androidClientId: config.androidClientId || 'missing-google-client-id',
    };
  }, []);
  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useIdTokenAuthRequest({
    webClientId: googleAuthConfig.webClientId,
    iosClientId: googleAuthConfig.iosClientId,
    androidClientId: googleAuthConfig.androidClientId,
    selectAccount: true,
  });

  useEffect(() => {
    void setLastRole(normalizedRole);
  }, [normalizedRole, setLastRole]);

  useEffect(() => {
    setFocusedField(null);
    setFieldErrors({});
    setActiveAlternativeMethod(null);
    setVisibility({
      password: false,
      confirmPassword: false,
    });
  }, [isSignup, normalizedRole]);

  const { name, email, password, confirmPassword, legalAccepted } = state;

  function updateState(data) {
    setState((currentState) => ({ ...currentState, ...data }));
    setFieldErrors((currentErrors) => {
      if (Object.keys(currentErrors).length === 0) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      const updatedKeys = new Set(Object.keys(data));

      if (updatedKeys.has('password')) {
        updatedKeys.add('confirmPassword');
      }

      updatedKeys.forEach((key) => {
        delete nextErrors[key];
      });

      return nextErrors;
    });
  }

  const prepareProviderOnboardingDraft = useCallback(async (accountPayload = {}) => {
    await saveProviderOnboarding((current) => ({
      ...current,
      account: {
        ...current.account,
        name: accountPayload.name || current.account.name,
        email: accountPayload.email || current.account.email,
        password: '',
      },
      currentStep: Math.max(current.currentStep || 0, 1),
    }));
  }, [saveProviderOnboarding]);

  const navigateAfterBootstrap = useCallback(async (bootstrap, accountPayload = {}) => {
    const nextRoute = getPostBootstrapRoute(bootstrap);

    if (nextRoute === '/auth/providerOnboardingScreen') {
      await prepareProviderOnboardingDraft(accountPayload);
    }

    router.replace(nextRoute);
  }, [prepareProviderOnboardingDraft, router]);

  function buildFieldErrors() {
    const nextErrors = {};

    if (isSignup && !name.trim()) {
      nextErrors.name = t('roleAuth.nameRequired');
    }

    if (!email.trim()) {
      nextErrors.email = t('roleAuth.emailRequired');
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = t('roleAuth.emailInvalid');
    }

    if (!password.trim()) {
      nextErrors.password = t('roleAuth.passwordRequired');
    }

    if (isSignup && !confirmPassword.trim()) {
      nextErrors.confirmPassword = t('roleAuth.confirmPasswordRequired');
    } else if (isSignup && password !== confirmPassword) {
      nextErrors.confirmPassword = t('roleAuth.passwordsMismatch');
    }

    if (isSignup && !legalAccepted) {
      nextErrors.legalAccepted = t('roleAuth.legalRequired');
    }

    return nextErrors;
  }

  function buildGoogleFieldErrors() {
    const nextErrors = {};

    if (isSignup && !name.trim()) {
      nextErrors.name = t('roleAuth.nameRequired');
    }

    if (isSignup && !legalAccepted) {
      nextErrors.legalAccepted = t('roleAuth.legalRequired');
    }

    return nextErrors;
  }

  const getReadableAuthErrorMessage = useCallback((error) => {
    const errorCode = error?.code || '';

    if (errorCode === 'auth/operation-not-allowed') {
      return t('roleAuth.authMethodDisabled');
    }

    if (errorCode === 'auth/account-exists-with-different-credential') {
      return t('roleAuth.googleAccountExists');
    }

    return error instanceof Error ? error.message : t('roleAuth.incompleteTitle');
  }, [t]);

  const handleGoogleResponse = useCallback(async (response) => {
    const responseKey = response?.params?.state || response?.authentication?.accessToken || response?.params?.id_token || 'success';

    if (handledGoogleResponseRef.current === responseKey) {
      return;
    }

    handledGoogleResponseRef.current = responseKey;
    setActiveAlternativeMethod('google');

    try {
      const idToken = response?.params?.id_token || response?.authentication?.idToken || '';
      const accessToken = response?.params?.access_token || response?.authentication?.accessToken || '';
      const bootstrap = await signInWithGoogle({
        role: normalizedRole,
        intent: authIntent,
        idToken,
        accessToken,
        displayName: name.trim(),
      });

      await navigateAfterBootstrap(bootstrap, {
        name: name.trim() || bootstrap.uid,
        email: email.trim(),
      });
    } catch (error) {
      Alert.alert(t('roleAuth.authFailedTitle'), getReadableAuthErrorMessage(error));
    } finally {
      setActiveAlternativeMethod(null);
    }
  }, [authIntent, email, getReadableAuthErrorMessage, name, navigateAfterBootstrap, normalizedRole, signInWithGoogle, t]);

  useEffect(() => {
    if (!googleResponse) {
      return;
    }

    if (googleResponse.type === 'success') {
      void handleGoogleResponse(googleResponse);
      return;
    }

    if (googleResponse.type === 'error') {
      setActiveAlternativeMethod(null);
      Alert.alert(t('roleAuth.authFailedTitle'), googleResponse.error?.message || t('roleAuth.googleCancelled'));
      return;
    }

    if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      setActiveAlternativeMethod(null);
    }
  }, [googleResponse, handleGoogleResponse, t]);

  async function handleGoogleAuthPress() {
    const nextErrors = buildGoogleFieldErrors();
    const validationError = nextErrors.name || nextErrors.legalAccepted || null;
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      ...nextErrors,
    }));

    if (validationError) {
      Alert.alert(t('passwordRecovery.invalidForm'), validationError);
      return;
    }

    if (!isGoogleAuthConfigured()) {
      Alert.alert(t('roleAuth.googleConfigMissingTitle'), getGoogleAuthConfigError() || t('roleAuth.googleConfigMissingBody'));
      return;
    }

    if (!googleRequest) {
      Alert.alert(t('roleAuth.googleConfigMissingTitle'), t('roleAuth.googleUnavailableBody'));
      return;
    }

    handledGoogleResponseRef.current = null;
    setActiveAlternativeMethod('google');

    try {
      await promptGoogleAuth();
    } catch (error) {
      setActiveAlternativeMethod(null);
      Alert.alert(t('roleAuth.authFailedTitle'), getReadableAuthErrorMessage(error));
    }
  }

  async function handleSubmit() {
    if (isPrimarySubmitting || activeAlternativeMethod !== null) {
      return;
    }

    const nextErrors = buildFieldErrors();
    const validationError = nextErrors.name || nextErrors.email || nextErrors.password || nextErrors.confirmPassword || nextErrors.legalAccepted || null;
    setFieldErrors(nextErrors);

    if (validationError) {
      Alert.alert(t('passwordRecovery.invalidForm'), validationError);
      return;
    }

    try {
      setIsPrimarySubmitting(true);
      console.log('[EmailAuthScreen][submit] start', {
        role: normalizedRole,
        intent: authIntent,
        emailPreview: email.trim(),
        hasName: Boolean(name.trim()),
      });
      await setLastRole(normalizedRole);

      if (isSignup) {
        const bootstrap = await signUpWithEmail({
          role: normalizedRole,
          name: name.trim(),
          email: email.trim(),
          password,
        });
        await navigateAfterBootstrap(bootstrap, {
          name: name.trim(),
          email: email.trim(),
        });
        console.log('[EmailAuthScreen][submit] success', {
          role: normalizedRole,
          intent: authIntent,
          nextRoute: getPostBootstrapRoute(bootstrap),
        });
        return;
      }

      const bootstrap = await signInWithEmail({
        email: email.trim(),
        password,
        roleHint: normalizedRole,
      });
      await navigateAfterBootstrap(bootstrap, {
        name: name.trim(),
        email: email.trim(),
      });
      console.log('[EmailAuthScreen][submit] success', {
        role: normalizedRole,
        intent: authIntent,
        nextRoute: getPostBootstrapRoute(bootstrap),
      });
    } catch (error) {
      console.error('[EmailAuthScreen][submit] failed', {
        role: normalizedRole,
        intent: authIntent,
        code: error?.code || null,
        name: error?.name || null,
        message: error?.message || 'Unknown email auth error',
      });
      Alert.alert(t('roleAuth.authFailedTitle'), getReadableAuthErrorMessage(error));
    } finally {
      setIsPrimarySubmitting(false);
    }
  }

  function toggleVisibility(fieldKey) {
    setVisibility((currentVisibility) => ({
      ...currentVisibility,
      [fieldKey]: !currentVisibility[fieldKey],
    }));
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
    secureTextEntry = false,
    trailingIcon = null,
    onTrailingPress = null,
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
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            style={styles.textFieldStyle}
            placeholderTextColor={theme.text.muted}
            selectionColor={theme.brand.primary}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
            numberOfLines={1}
            cursorColor={theme.brand.primary}
            onFocus={() => setFocusedField(fieldKey)}
            onBlur={() => setFocusedField((currentValue) => (currentValue === fieldKey ? null : currentValue))}
          />
          {trailingIcon ? (
            <Pressable
              onPress={onTrailingPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.trailingIconButtonStyle,
                pressed ? styles.trailingIconButtonPressedStyle : null,
              ]}
            >
              <MaterialIcons name={trailingIcon} size={20} color={iconColor} />
            </Pressable>
          ) : null}
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
          onPress={() => updateState({ legalAccepted: !legalAccepted })}
          style={({ pressed }) => [
            styles.legalRowStyle,
            pressed ? styles.legalRowPressedStyle : null,
          ]}
        >
          <View style={[styles.legalCheckboxStyle, legalAccepted ? styles.legalCheckboxActiveStyle : null, hasError ? styles.legalCheckboxErrorStyle : null]}>
            {legalAccepted ? <MaterialIcons name="check" size={16} color={theme.button.primaryText} /> : null}
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

  function authSwitchInfo() {
    return (
      <View style={styles.switchInfoWrapStyle}>
        <Text style={styles.switchInfoTextStyle}>
          {isSignup ? t('roleAuth.haveAccount') : t('roleAuth.noAccount')}
        </Text>
        <Pressable onPress={() => router.replace(oppositeAuthRoute)}>
          <Text style={styles.switchActionTextStyle}>
            {isSignup ? ` ${t('roleAuth.signIn')}` : ` ${t('roleAuth.signUp')}`}
          </Text>
        </Pressable>
      </View>
    );
  }

  function alternativeMethodButton({ label, icon, onPress, isTrailing = false, isLoading = false }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={activeAlternativeMethod !== null}
        style={({ pressed }) => [
          styles.alternativeMethodButtonStyle,
          isTrailing ? styles.alternativeMethodButtonTrailingStyle : null,
          pressed ? styles.alternativeMethodButtonPressedStyle : null,
          activeAlternativeMethod !== null ? styles.alternativeMethodButtonDisabledStyle : null,
        ]}
      >
        {isLoading ? <ActivityIndicator size="small" color={theme.text.primary} /> : icon}
        <Text style={styles.alternativeMethodButtonTextStyle}>{label}</Text>
      </Pressable>
    );
  }

  function alternativeAuthBlock() {
    return (
      <View style={styles.alternativeAuthWrapStyle}>
        <View style={styles.dividerRowStyle}>
          <View style={styles.dividerLineStyle} />
          <Text style={styles.dividerTextStyle}>{t('roleAuth.alternativeDivider')}</Text>
          <View style={styles.dividerLineStyle} />
        </View>
        <View style={styles.alternativeButtonsRowStyle}>
          {alternativeMethodButton({
            label: t('roleAuth.phoneOptionLabel'),
            icon: <MaterialIcons name="phone-iphone" size={18} color={theme.text.primary} />,
            onPress: () => router.push(phoneAuthRoute),
          })}
          {alternativeMethodButton({
            label: t('roleAuth.googleOptionLabel'),
            icon: <MaterialCommunityIcons name="google" size={18} color={theme.text.primary} />,
            onPress: () => { void handleGoogleAuthPress(); },
            isTrailing: true,
            isLoading: activeAlternativeMethod === 'google',
          })}
        </View>
        <Text style={styles.alternativeHintTextStyle}>{t('roleAuth.alternativeMethodsHint')}</Text>
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
          onPress={() => router.replace(isSignup ? getAuthRouteForRole(normalizedRole) : '/auth/loginScreen')}
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
              value: name,
              onChangeText: (text) => updateState({ name: text }),
              icon: 'person-outline',
            }) : null}
            {renderTextField({
              fieldKey: 'email',
              label: t('roleAuth.emailLabel'),
              placeholder: t('roleAuth.emailPlaceholder'),
              value: email,
              onChangeText: (text) => updateState({ email: text }),
              icon: 'email',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}
            {renderTextField({
              fieldKey: 'password',
              label: t('roleAuth.passwordLabel'),
              placeholder: t('roleAuth.passwordPlaceholder'),
              value: password,
              onChangeText: (text) => updateState({ password: text }),
              icon: 'lock-outline',
              secureTextEntry: !visibility.password,
              trailingIcon: visibility.password ? 'visibility' : 'visibility-off',
              onTrailingPress: () => toggleVisibility('password'),
            })}
            {isSignup ? renderTextField({
              fieldKey: 'confirmPassword',
              label: t('roleAuth.confirmPasswordLabel'),
              placeholder: t('roleAuth.confirmPasswordPlaceholder'),
              value: confirmPassword,
              onChangeText: (text) => updateState({ confirmPassword: text }),
              icon: 'verified-user',
              secureTextEntry: !visibility.confirmPassword,
              trailingIcon: visibility.confirmPassword ? 'visibility' : 'visibility-off',
              onTrailingPress: () => toggleVisibility('confirmPassword'),
            }) : null}
            {isSignup ? legalConsentBlock() : null}
            {!isSignup ? (
              <Pressable onPress={() => router.push(getForgotPasswordRouteForRole(normalizedRole))} style={styles.forgotLinkWrapStyle}>
                <Text style={styles.forgotLinkTextStyle}>{t('roleAuth.forgotPassword')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => { void handleSubmit(); }}
              disabled={isPrimarySubmitting || activeAlternativeMethod !== null}
              style={({ pressed }) => [
                styles.continueButtonStyle,
                { backgroundColor: pressed ? theme.button.primaryBackgroundPressed : theme.button.primaryBackground },
                isPrimarySubmitting || activeAlternativeMethod !== null ? styles.primaryButtonDisabledStyle : null,
              ]}
            >
              {isPrimarySubmitting ? (
                <ActivityIndicator size="small" color={theme.button.primaryText} />
              ) : (
                <Text style={styles.continueButtonTextStyle}>{isSignup ? t('roleAuth.signUp') : t('roleAuth.signIn')}</Text>
              )}
            </Pressable>
            {authSwitchInfo()}
            {alternativeAuthBlock()}
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
    paddingTop: Sizes.fixPadding - 2.0,
  },
  fieldBlockStyle: {
    marginBottom: Sizes.fixPadding + 7.0,
  },
  fieldLabelStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    marginBottom: Sizes.fixPadding - 2.0,
  },
  textFieldWrapStyle: {
    backgroundColor: theme.auth.inputBackground,
    borderRadius: 24.0,
    minHeight: 64.0,
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
  textFieldStyle: {
    flex: 1,
    padding: 0,
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Medium',
  },
  trailingIconButtonStyle: {
    width: 36.0,
    height: 36.0,
    borderRadius: 18.0,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Sizes.fixPadding - 4.0,
  },
  trailingIconButtonPressedStyle: {
    backgroundColor: theme.brand.primarySoft,
  },
  fieldErrorTextStyle: {
    color: theme.error.default,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Montserrat_Medium',
    marginTop: Sizes.fixPadding - 4.0,
    marginLeft: 4.0,
  },
  forgotLinkWrapStyle: {
    alignSelf: 'flex-end',
    marginTop: -(Sizes.fixPadding + 1.0),
    marginBottom: Sizes.fixPadding + 10.0,
  },
  forgotLinkTextStyle: {
    color: theme.link.default,
    fontSize: 13,
    fontFamily: 'Montserrat_Bold',
  },
  continueButtonStyle: {
    minHeight: 60.0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Sizes.fixPadding + 2.0,
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
  primaryButtonDisabledStyle: {
    opacity: 0.72,
  },
  switchInfoWrapStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: Sizes.fixPadding * 1.2,
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
  alternativeAuthWrapStyle: {
    marginTop: Sizes.fixPadding * 1.6,
  },
  dividerRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Sizes.fixPadding * 1.7,
  },
  dividerLineStyle: {
    flex: 1,
    height: 1.0,
    backgroundColor: theme.border.subtle,
  },
  dividerTextStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginHorizontal: Sizes.fixPadding + 2.0,
  },
  alternativeButtonsRowStyle: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  alternativeMethodButtonStyle: {
    flex: 1,
    minHeight: 56.0,
    borderRadius: 22.0,
    borderWidth: 1.2,
    borderColor: theme.border.subtle,
    backgroundColor: theme.auth.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Sizes.fixPadding + 8.0,
    shadowColor: '#141923',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  alternativeMethodButtonTrailingStyle: {
    marginLeft: Sizes.fixPadding,
  },
  alternativeMethodButtonPressedStyle: {
    backgroundColor: theme.brand.primarySoft,
    borderColor: theme.brand.primarySoft,
  },
  alternativeMethodButtonDisabledStyle: {
    opacity: 0.72,
  },
  alternativeMethodButtonTextStyle: {
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
    marginLeft: Sizes.fixPadding - 1.0,
  },
  alternativeHintTextStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: 'Montserrat_Medium',
    textAlign: 'center',
    marginTop: Sizes.fixPadding + 8.0,
    paddingHorizontal: Sizes.fixPadding,
  },
  legalWrapStyle: {
    marginTop: Sizes.fixPadding - 1.0,
    marginBottom: Sizes.fixPadding + 4.0,
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
