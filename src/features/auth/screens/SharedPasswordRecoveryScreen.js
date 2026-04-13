import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { Sizes } from '../../../../constant/styles';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import {
  getAuthRouteForRole,
  getForgotPasswordRouteForRole,
} from '../../../../utils/roleRoutes';
import { getRoleDisplayConfig } from '../../shared/config/roleDisplayConfig';
import { authTheme } from '../theme/authTheme';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const theme = authTheme;

export default function SharedPasswordRecoveryScreen({ mode, role }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { requestPasswordReset } = useSession();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const roleConfig = getRoleDisplayConfig(normalizedRole, t);
  const isReset = mode === 'reset';
  const recoveryEmail = useMemo(() => {
    if (Array.isArray(params.email)) {
      return params.email[0] ?? '';
    }

    return typeof params.email === 'string' ? params.email : '';
  }, [params.email]);
  const [state, setState] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [visibility, setVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    if (isReset && !recoveryEmail.trim()) {
      router.replace(getForgotPasswordRouteForRole(normalizedRole));
      return;
    }

    setFieldErrors({});
    setFocusedField(null);
    setVisibility({
      password: false,
      confirmPassword: false,
    });
  }, [isReset, normalizedRole, recoveryEmail, router]);

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

  function toggleVisibility(fieldKey) {
    setVisibility((currentVisibility) => ({
      ...currentVisibility,
      [fieldKey]: !currentVisibility[fieldKey],
    }));
  }

  function buildFieldErrors() {
    const nextErrors = {};

    if (!isReset) {
      if (!state.email.trim()) {
        nextErrors.email = t('roleAuth.emailRequired');
      } else if (!emailPattern.test(state.email.trim())) {
        nextErrors.email = t('roleAuth.emailInvalid');
      }
    }

    if (isReset && !state.password.trim()) {
      nextErrors.password = t('passwordRecovery.newPasswordRequired');
    }

    if (isReset && !state.confirmPassword.trim()) {
      nextErrors.confirmPassword = t('passwordRecovery.confirmPasswordRequired');
    } else if (isReset && state.password !== state.confirmPassword) {
      nextErrors.confirmPassword = t('roleAuth.passwordsMismatch');
    }

    return nextErrors;
  }

  function validateForm(nextErrors = buildFieldErrors()) {
    return nextErrors.email || nextErrors.password || nextErrors.confirmPassword || null;
  }

  async function handleSubmit() {
    const nextErrors = buildFieldErrors();
    const validationError = validateForm(nextErrors);

    setFieldErrors(nextErrors);

    if (validationError) {
      Alert.alert(t('passwordRecovery.invalidForm'), validationError);
      return;
    }

    if (!isReset) {
      try {
        await requestPasswordReset(state.email.trim());
        Alert.alert(
          t('passwordRecovery.recoverySentTitle'),
          t('passwordRecovery.recoverySentBody'),
          [{ text: t('bookingDetail.ok'), onPress: () => router.replace(getAuthRouteForRole(normalizedRole)) }],
        );
      } catch (error) {
        Alert.alert(
          t('passwordRecovery.requestFailedTitle'),
          error instanceof Error ? error.message : t('passwordRecovery.invalidForm'),
        );
      }
      return;
    }

    Alert.alert(
      t('passwordRecovery.passwordUpdatedTitle'),
      t('passwordRecovery.passwordUpdatedBody'),
      [{ text: t('bookingDetail.ok'), onPress: () => router.replace(getAuthRouteForRole(normalizedRole)) }],
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={theme.auth.background} />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.container}>
        {backArrow()}
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
            <Text style={styles.titleStyle}>{isReset ? t('passwordRecovery.resetTitle') : t('passwordRecovery.recoverTitle')}</Text>
            <Text style={styles.subtitleStyle}>{isReset ? t('passwordRecovery.resetSubtitle') : t('passwordRecovery.recoverSubtitle')}</Text>
          </View>

          <View style={styles.formFlowStyle}>
            {!isReset ? emailTextField() : null}
            {isReset ? recoveryEmailInfo() : null}
            {isReset ? passwordTextField() : null}
            {isReset ? confirmPasswordTextField() : null}
            {continueButton()}
            {authSwitchInfo()}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  function backArrow() {
    const previousPath = isReset ? getForgotPasswordRouteForRole(normalizedRole) : getAuthRouteForRole(normalizedRole);

    return (
      <Pressable
        onPress={() => router.replace(previousPath)}
        style={({ pressed }) => [
          styles.backArrowStyle,
          pressed ? styles.backArrowPressedStyle : null,
        ]}
      >
        <MaterialIcons name="arrow-back" size={22} color={theme.text.primary} />
      </Pressable>
    );
  }

  function authSwitchInfo() {
    return (
      <View style={styles.switchInfoWrapStyle}>
        <Text style={styles.switchInfoTextStyle}>{t('passwordRecovery.changedMind')}</Text>
        <Pressable onPress={() => router.replace(getAuthRouteForRole(normalizedRole))}>
          <Text style={styles.switchActionTextStyle}>{` ${t('passwordRecovery.backToAuth')}`}</Text>
        </Pressable>
      </View>
    );
  }

  function continueButton() {
    const buttonLabel = isReset ? t('passwordRecovery.savePassword') : t('passwordRecovery.continue');

    return (
      <Pressable
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [
          styles.continueButtonStyle,
          {
            backgroundColor: pressed ? theme.button.primaryBackgroundPressed : theme.button.primaryBackground,
          },
        ]}
      >
        <Text style={styles.continueButtonTextStyle}>{buttonLabel}</Text>
      </Pressable>
    );
  }

  function recoveryEmailInfo() {
    return (
      <View style={styles.recoveryEmailRowStyle}>
        <View style={styles.recoveryEmailIconWrapStyle}>
          <MaterialIcons name="mail-outline" size={18} color={theme.brand.primary} />
        </View>
        <View style={styles.recoveryEmailTextWrapStyle}>
          <Text style={styles.recoveryEmailLabelStyle}>{t('passwordRecovery.resetFor')}</Text>
          <Text style={styles.recoveryEmailValueStyle}>{recoveryEmail}</Text>
        </View>
      </View>
    );
  }

  function emailTextField() {
    return renderTextField({
      fieldKey: 'email',
      label: t('passwordRecovery.emailLabel'),
      placeholder: t('passwordRecovery.emailPlaceholder'),
      value: state.email,
      onChangeText: (text) => updateState({ email: text }),
      icon: 'email',
      keyboardType: 'email-address',
      autoCapitalize: 'none',
    });
  }

  function passwordTextField() {
    return renderTextField({
      fieldKey: 'password',
      label: t('passwordRecovery.newPasswordLabel'),
      placeholder: t('passwordRecovery.newPasswordPlaceholder'),
      value: state.password,
      onChangeText: (text) => updateState({ password: text }),
      icon: 'lock-outline',
      secureTextEntry: !visibility.password,
      trailingIcon: visibility.password ? 'visibility' : 'visibility-off',
      onTrailingPress: () => toggleVisibility('password'),
    });
  }

  function confirmPasswordTextField() {
    return renderTextField({
      fieldKey: 'confirmPassword',
      label: t('passwordRecovery.confirmPasswordLabel'),
      placeholder: t('passwordRecovery.confirmPasswordPlaceholder'),
      value: state.confirmPassword,
      onChangeText: (text) => updateState({ confirmPassword: text }),
      icon: 'verified-user',
      secureTextEntry: !visibility.confirmPassword,
      trailingIcon: visibility.confirmPassword ? 'visibility' : 'visibility-off',
      onTrailingPress: () => toggleVisibility('confirmPassword'),
    });
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
        {hasError ? (
          <Text style={styles.fieldErrorTextStyle}>{fieldErrors[fieldKey]}</Text>
        ) : null}
      </View>
    );
  }
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
    paddingTop: Sizes.fixPadding * 3.1,
    marginBottom: Sizes.fixPadding * 2.4,
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
    marginBottom: Sizes.fixPadding + 2.0,
    maxWidth: '92%',
  },
  subtitleStyle: {
    color: theme.text.secondary,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Montserrat_Medium',
    maxWidth: '94%',
  },
  formFlowStyle: {
    paddingTop: Sizes.fixPadding - 2.0,
  },
  recoveryEmailRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Sizes.fixPadding - 2.0,
    paddingRight: Sizes.fixPadding + 2.0,
    paddingVertical: Sizes.fixPadding + 1.0,
    marginBottom: Sizes.fixPadding + 8.0,
    borderLeftWidth: 3.0,
    borderLeftColor: theme.brand.primary,
  },
  recoveryEmailIconWrapStyle: {
    width: 38.0,
    height: 38.0,
    borderRadius: 19.0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.68)',
    marginRight: Sizes.fixPadding,
  },
  recoveryEmailTextWrapStyle: {
    flex: 1,
  },
  recoveryEmailLabelStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    marginBottom: 4.0,
  },
  recoveryEmailValueStyle: {
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
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
  switchInfoWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Sizes.fixPadding * 1.8,
  },
  switchInfoTextStyle: {
    color: theme.text.secondary,
    fontSize: 14,
    fontFamily: 'Montserrat_Medium',
  },
  switchActionTextStyle: {
    color: theme.link.default,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
  },
});
