import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts, Sizes } from '../../../../constant/styles';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { useOnboarding } from '../../../../context/onboardingContext';
import { getAuthenticatedEntryRoute, getAuthRouteForRole } from '../../../../utils/roleRoutes';
import useDoubleBackExit from '../../shared/hooks/useDoubleBackExit';
import { authTheme } from '../theme/authTheme';

const theme = authTheme;

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const { t } = useLocale();
  const { session, setLastRole } = useSession();
  const { onboarding } = useOnboarding();
  const backClickCount = useDoubleBackExit();
  const [preferredRole, setPreferredRole] = useState('user');
  const [pressedRole, setPressedRole] = useState(null);

  useEffect(() => {
    if (!session.isHydrated || !onboarding.isHydrated) {
      return;
    }

    if (session.isAuthenticated && session.activeRole) {
      router.replace(getAuthenticatedEntryRoute(session));
      return;
    }

    const requestedRole = role === 'provider' ? 'provider' : role === 'user' ? 'user' : session.lastRole;
    setPreferredRole(requestedRole === 'provider' ? 'provider' : 'user');
  }, [onboarding.isHydrated, role, router, session, session.activeRole, session.isAuthenticated, session.isHydrated, session.lastRole]);

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={theme.auth.background} />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.backgroundOrbTertiary} />
      <View style={styles.centerWrapStyle}>
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
            <Text style={styles.eyebrowStyle}>{t('loginSelector.eyebrow')}</Text>
            <Text style={styles.heroTitleStyle}>{t('loginSelector.title')}</Text>
          </View>

          <View style={styles.selectionStackStyle}>
            {roleOption({
              nextRole: 'user',
              icon: 'person-outline',
              label: t('loginSelector.userLabel'),
              description: t('loginSelector.userDescription'),
            })}
            {roleOption({
              nextRole: 'provider',
              icon: 'handyman',
              label: t('loginSelector.providerLabel'),
              description: t('loginSelector.providerDescription'),
            })}
          </View>
        </ScrollView>
      </View>
      {backClickCount === 1 ? (
        <View style={styles.animatedView}>
          <Text style={Fonts.whiteColor14Medium}>{t('exit.auth')}</Text>
        </View>
      ) : null}
    </View>
  );

  function roleOption({ nextRole, icon, label, description }) {
    const isSelected = preferredRole === nextRole;
    const isPressed = pressedRole === nextRole;

    return (
      <View
        key={nextRole}
        focusable={false}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => setPressedRole(nextRole)}
        onResponderRelease={() => {
          setPressedRole(null);
          void handleContinue(nextRole);
        }}
        onResponderTerminate={() => setPressedRole(null)}
        onResponderTerminationRequest={() => true}
        style={[
          styles.roleButtonStyle,
          isSelected ? styles.roleButtonSelectedStyle : styles.roleButtonDefaultStyle,
          isPressed ? styles.roleButtonPressedStyle : null,
        ]}
      >
        <View style={styles.roleButtonInfoWrapStyle}>
          <View
            style={[
              styles.roleIconWrapStyle,
              isSelected ? styles.roleIconWrapSelectedStyle : styles.roleIconWrapDefaultStyle,
            ]}
          >
            <MaterialIcons
              name={icon}
              size={22}
              color={isSelected ? theme.button.primaryText : theme.brand.primary}
            />
          </View>
          <View style={styles.roleTextWrapStyle}>
            <Text style={styles.roleTitleStyle}>{label}</Text>
            <Text style={styles.roleDescriptionStyle}>{description}</Text>
          </View>
        </View>
        <View style={isSelected ? styles.roleArrowWrapSelectedStyle : styles.roleArrowWrapDefaultStyle}>
          <MaterialIcons
            name="arrow-forward"
            size={18}
            color={isSelected ? theme.brand.primary : theme.text.secondary}
          />
        </View>
      </View>
    );
  }

  async function handleContinue(nextRole) {
    const normalizedRole = nextRole === 'provider' ? 'provider' : 'user';
    setPreferredRole(normalizedRole);
    await setLastRole(normalizedRole);
    router.push(getAuthRouteForRole(normalizedRole));
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.auth.background,
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: theme.brand.primarySoft,
    top: -110,
    right: -96,
    opacity: 0.62,
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.46)',
    top: 228,
    left: -108,
  },
  backgroundOrbTertiary: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(211,84,0,0.06)',
    bottom: -32,
    right: -42,
  },
  centerWrapStyle: {
    flex: 1,
  },
  scrollContentStyle: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: Sizes.fixPadding * 2.4,
    paddingTop: Sizes.fixPadding * 2.8,
    paddingBottom: Sizes.fixPadding * 3.0,
  },
  animatedView: {
    backgroundColor: '#333333',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    borderRadius: Sizes.fixPadding + 5.0,
    paddingHorizontal: Sizes.fixPadding + 5.0,
    paddingVertical: Sizes.fixPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSectionStyle: {
    marginBottom: Sizes.fixPadding * 1.3,
  },
  brandPillStyle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: Sizes.fixPadding + 5.0,
    paddingVertical: Sizes.fixPadding - 4.0,
    marginBottom: Sizes.fixPadding * 1.2,
    backgroundColor: theme.brand.primarySoft,
  },
  brandDotStyle: {
    width: 7.0,
    height: 7.0,
    borderRadius: 3.5,
    backgroundColor: theme.brand.primary,
    marginRight: Sizes.fixPadding - 3.0,
  },
  brandPillLogoStyle: {
    width: 18.0,
    height: 18.0,
    marginRight: Sizes.fixPadding - 3.0,
  },
  brandPillTextStyle: {
    color: theme.link.default,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
  },
  eyebrowStyle: {
    color: theme.text.secondary,
    fontSize: 11,
    fontFamily: 'Montserrat_Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Sizes.fixPadding - 3.0,
  },
  heroTitleStyle: {
    color: theme.text.primary,
    fontSize: 31,
    lineHeight: 38,
    fontFamily: 'Montserrat_Bold',
    maxWidth: '84%',
  },
  selectionStackStyle: {
    gap: Sizes.fixPadding + 2.0,
  },
  roleButtonStyle: {
    borderRadius: 22.0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 92.0,
    paddingHorizontal: Sizes.fixPadding + 5.0,
    paddingVertical: Sizes.fixPadding + 2.0,
    borderWidth: 1.0,
    shadowColor: '#141923',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  roleButtonDefaultStyle: {
    backgroundColor: theme.auth.surface,
    borderColor: theme.border.subtle,
  },
  roleButtonSelectedStyle: {
    backgroundColor: '#F9EEE7',
    borderColor: theme.brand.primary,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  roleButtonPressedStyle: {
    transform: [{ scale: 0.985 }],
  },
  roleButtonInfoWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Sizes.fixPadding - 2.0,
  },
  roleIconWrapStyle: {
    width: 46.0,
    height: 46.0,
    borderRadius: 18.0,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sizes.fixPadding + 2.0,
  },
  roleIconWrapDefaultStyle: {
    backgroundColor: theme.brand.primarySoft,
  },
  roleIconWrapSelectedStyle: {
    backgroundColor: theme.button.primaryBackground,
  },
  roleTextWrapStyle: {
    flex: 1,
  },
  roleTitleStyle: {
    color: theme.text.primary,
    fontSize: 16,
    fontFamily: 'Montserrat_Bold',
    marginBottom: 3.0,
  },
  roleDescriptionStyle: {
    color: theme.text.secondary,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'Montserrat_Medium',
    maxWidth: '96%',
  },
  roleArrowWrapDefaultStyle: {
    width: 34.0,
    height: 34.0,
    borderRadius: 17.0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 62, 80, 0.06)',
  },
  roleArrowWrapSelectedStyle: {
    width: 34.0,
    height: 34.0,
    borderRadius: 17.0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(211, 84, 0, 0.14)',
  },
});
