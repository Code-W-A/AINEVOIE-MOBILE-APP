import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { OtpInput } from 'react-native-otp-entry';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { buildMaskedPhoneNumber } from '../../../../src/firebase/authHelpers';
import { getPostBootstrapRoute } from '../../../../utils/roleRoutes';
import { authTheme } from '../../auth/theme/authTheme';

const theme = authTheme;

export default function SharedOtpScreen({ role }) {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { session, confirmPhoneOtp, resendPhoneOtp, setLastRole } = useSession();
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const resolvedRole = role === 'provider'
    ? 'provider'
    : params.role === 'provider'
      ? 'provider'
      : session.authFlow.role === 'provider'
        ? 'provider'
        : 'user';
  const authFlow = useMemo(() => ({
    role: resolvedRole,
    authMethod: params.authMethod || session.authFlow.authMethod || 'phone',
    intent: params.intent === 'signup' || session.authFlow.intent === 'signup' ? 'signup' : 'login',
    phoneNumber: params.phoneNumber || session.authFlow.phoneNumber || '',
    email: session.authFlow.email || '',
    name: session.authFlow.name || '',
  }), [params.authMethod, params.intent, params.phoneNumber, resolvedRole, session.authFlow.authMethod, session.authFlow.email, session.authFlow.intent, session.authFlow.name, session.authFlow.phoneNumber]);

  const isSignup = authFlow.intent === 'signup';
  const pageTitle = isSignup ? t('otp.signupTitle') : t('otp.loginTitle');

  async function finishOtpFlow() {
    if (otpCode.length !== 4 || isSubmitting) {
      if (otpCode.length !== 4) {
        Alert.alert(t('otp.incompleteTitle'), t('otp.incompleteBody'));
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const bootstrap = await confirmPhoneOtp({ code: otpCode });
      await setLastRole(resolvedRole);
      router.replace(getPostBootstrapRoute(bootstrap));
    } catch (error) {
      Alert.alert(
        t('roleAuth.authFailedTitle'),
        error instanceof Error ? error.message : t('otp.invalidCodeBody'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (isResending) {
      return;
    }

    setIsResending(true);

    try {
      const response = await resendPhoneOtp();
      Alert.alert(
        t('otp.resendTitle'),
        t('otp.resendBody', { phone: buildMaskedPhoneNumber(response.phoneNumber || authFlow.phoneNumber) }),
      );
    } catch (error) {
      Alert.alert(
        t('roleAuth.authFailedTitle'),
        error instanceof Error ? error.message : t('otp.resendFailedBody'),
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={theme.auth.background} />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.container}>
        <Pressable onPress={() => navigation.pop()} style={({ pressed }) => [styles.backButtonStyle, pressed ? styles.backButtonPressedStyle : null]}>
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
            <Text style={styles.roleLabelStyle}>{t('otp.roleLabel')}</Text>
            <Text style={styles.titleStyle}>{pageTitle}</Text>
          </View>

          <View style={styles.cardStyle}>
            <Text style={styles.cardTitleStyle}>{t('otp.cardTitle')}</Text>
            <Text style={styles.cardSubtitleStyle}>{t('otp.cardSubtitle')}</Text>

            <View style={styles.otpWrapStyle}>
              <OtpInput
                numberOfDigits={4}
                focusColor={theme.brand.primary}
                onTextChange={(text) => {
                  setOtpCode(text);

                  if (text.length === 4) {
                    Keyboard.dismiss();
                  }
                }}
                theme={{
                  containerStyle: styles.otpContainerStyle,
                  pinCodeContainerStyle: styles.pinCodeContainerStyle,
                  pinCodeTextStyle: styles.pinCodeTextStyle,
                  focusedPinCodeContainerStyle: styles.focusedPinCodeContainerStyle,
                }}
              />
            </View>

            <View style={styles.resendRowStyle}>
              <Text style={styles.resendSupportTextStyle}>{t('otp.resendQuestion')}</Text>
              <Pressable onPress={() => { void handleResend(); }} disabled={isResending}>
                <Text style={styles.resendActionTextStyle}>{isResending ? t('otp.resendLoading') : t('otp.resendAction')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footerWrapStyle}>
          <Pressable
            onPress={() => {
              void finishOtpFlow();
            }}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.primaryButtonStyle,
              { backgroundColor: pressed ? theme.button.primaryBackgroundPressed : theme.button.primaryBackground },
              isSubmitting ? styles.buttonDisabledStyle : null,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.button.primaryText} />
            ) : (
              <Text style={styles.primaryButtonTextStyle}>{t('otp.continue')}</Text>
            )}
          </Pressable>
        </View>
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
  backButtonStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: 30,
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.auth.surface,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  backButtonPressedStyle: {
    backgroundColor: theme.brand.primarySoft,
    borderColor: theme.brand.primarySoft,
  },
  scrollContentStyle: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  heroSectionStyle: {
    paddingTop: 42,
  },
  brandPillStyle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 18,
    backgroundColor: theme.brand.primarySoft,
  },
  brandDotStyle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.brand.primary,
    marginRight: 6,
  },
  brandPillLogoStyle: {
    width: 20,
    height: 20,
    marginRight: 6,
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
    marginBottom: 8,
  },
  titleStyle: {
    color: theme.text.primary,
    fontSize: 34,
    lineHeight: 42,
    fontFamily: 'Montserrat_Bold',
    maxWidth: '92%',
  },
  cardStyle: {
    marginTop: 22,
    backgroundColor: theme.auth.surface,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: theme.border.subtle,
  },
  cardTitleStyle: {
    color: theme.text.primary,
    fontSize: 18,
    fontFamily: 'Montserrat_Bold',
  },
  cardSubtitleStyle: {
    color: theme.text.secondary,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Montserrat_Medium',
    marginTop: 8,
  },
  otpWrapStyle: {
    marginTop: 24,
  },
  otpContainerStyle: {
    width: '100%',
  },
  pinCodeContainerStyle: {
    width: Platform.OS === 'ios' ? 62 : 58,
    height: Platform.OS === 'ios' ? 62 : 58,
    borderRadius: 22,
    backgroundColor: theme.auth.inputBackground,
    borderWidth: 1.5,
    borderColor: theme.auth.inputBorder,
  },
  focusedPinCodeContainerStyle: {
    borderColor: theme.brand.primary,
  },
  pinCodeTextStyle: {
    color: theme.text.primary,
    fontSize: 20,
    fontFamily: 'Montserrat_Bold',
  },
  resendRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  resendSupportTextStyle: {
    color: theme.text.secondary,
    fontSize: 14,
    fontFamily: 'Montserrat_Medium',
  },
  resendActionTextStyle: {
    color: theme.link.default,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
    marginLeft: 6,
  },
  footerWrapStyle: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
  },
  primaryButtonStyle: {
    minHeight: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.brand.primary,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  buttonDisabledStyle: {
    opacity: 0.75,
  },
  primaryButtonTextStyle: {
    color: theme.button.primaryText,
    fontSize: 16,
    fontFamily: 'Montserrat_Bold',
  },
});
