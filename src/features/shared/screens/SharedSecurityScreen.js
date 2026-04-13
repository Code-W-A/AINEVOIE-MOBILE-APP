import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { useProviderOnboarding } from '../../../../hooks/useProviderOnboarding';
import { useUserProfile } from '../../../../hooks/useUserProfile';
import ProfileActionRow from '../components/profile/ProfileActionRow';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

function getAuthMethodUi(authMethod, t) {
  switch (authMethod) {
    case 'phone':
      return {
        label: t('security.phoneLabel'),
        description: t('security.phoneDescription'),
        icon: 'cellphone-key',
      };
    case 'google':
      return {
        label: 'Google',
        description: t('security.googleDescription'),
        icon: 'google',
      };
    case 'apple':
      return {
        label: 'Apple',
        description: t('security.appleDescription'),
        icon: 'apple',
      };
    default:
      return {
        label: t('security.emailLabel'),
        description: t('security.emailDescription'),
        icon: 'email-lock-outline',
      };
  }
}

export default function SharedSecurityScreen({ role }) {
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useLocale();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const rolePrefix = normalizedRole === 'provider' ? '/provider' : '/user';
  const { session, changePassword } = useSession();
  const { data: userProfile } = useUserProfile();
  const { data: providerOnboarding } = useProviderOnboarding();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const authContext = session.authContext || {};
  const authMethod = authContext.authMethod || 'email';
  const authMethodUi = getAuthMethodUi(authMethod, t);
  const currentEmail = authContext.email
    || (normalizedRole === 'provider' ? providerOnboarding.account.email : userProfile.email)
    || t('security.unavailableFlow');
  const currentPhone = authContext.phoneNumber
    || (normalizedRole === 'user' ? userProfile.phoneNumber : '')
    || t('security.unavailableFlow');
  const supportsPasswordChange = authMethod === 'email';

  const infoPills = useMemo(() => ([
    { label: t('security.method'), value: authMethodUi.label },
    { label: t('security.email'), value: currentEmail || '—' },
    { label: t('security.phone'), value: currentPhone || '—' },
  ]), [authMethodUi.label, currentEmail, currentPhone, t]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const nextErrors = {};

    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = t('security.currentPasswordRequired');
    }

    if (!form.newPassword.trim()) {
      nextErrors.newPassword = t('security.newPasswordRequired');
    } else if (form.newPassword.trim().length < 6) {
      nextErrors.newPassword = t('security.newPasswordShort');
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = t('security.confirmPasswordRequired');
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = t('security.confirmPasswordMismatch');
    }

    return nextErrors;
  }

  async function handlePasswordSave() {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    try {
      await changePassword({
        currentPassword: form.currentPassword.trim(),
        newPassword: form.newPassword.trim(),
      });
    } catch {
      setErrors({
        currentPassword: t('security.currentPasswordInvalid'),
      });
      return;
    }

    setForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setSnackbarMessage(t('security.passwordSaved'));
  }

  function field({ key, label, value, error, secureTextEntry = true }) {
    return (
      <View style={styles.fieldWrapStyle}>
        <TextInput
          label={label}
          mode="outlined"
          value={value}
          onChangeText={(nextValue) => setField(key, nextValue)}
          secureTextEntry={secureTextEntry}
          outlineColor={error ? '#D94841' : AinevoieDiscoveryTokens.borderSubtle}
          activeOutlineColor={AinevoieDiscoveryTokens.accent}
          textColor={AinevoieDiscoveryTokens.textPrimary}
          selectionColor={AinevoieDiscoveryTokens.accent}
          theme={{
            colors: {
              background: AinevoieDiscoveryTokens.surfaceCard,
              onSurfaceVariant: AinevoieDiscoveryTokens.textSecondary,
              primary: AinevoieDiscoveryTokens.accent,
            },
            roundness: 20,
          }}
          style={styles.textFieldStyle}
        />
        {error ? <Text style={styles.errorTextStyle}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={AinevoieDiscoveryTokens.appBackground} barStyle="dark-content" />
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('security.title')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('security.subtitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.infoCardStyle}>
          <View style={styles.infoIconWrapStyle}>
            <MaterialCommunityIcons name={authMethodUi.icon} size={22} color={AinevoieDiscoveryTokens.accentDark} />
          </View>
          <Text style={styles.infoTitleStyle}>{authMethodUi.label}</Text>
          <Text style={styles.infoTextStyle}>{authMethodUi.description}</Text>

          <View style={styles.infoPillsWrapStyle}>
            {infoPills.map((item) => (
              <View key={item.label} style={styles.infoPillStyle}>
                <Text style={styles.infoPillLabelStyle}>{item.label}</Text>
                <Text numberOfLines={2} style={styles.infoPillValueStyle}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {supportsPasswordChange ? (
          <View style={styles.formCardStyle}>
            <Text style={styles.cardTitleStyle}>{t('security.changePasswordTitle')}</Text>
            <Text style={styles.cardSubtitleStyle}>{t('security.changePasswordSubtitle')}</Text>

            {field({
              key: 'currentPassword',
              label: t('security.currentPasswordLabel'),
              value: form.currentPassword,
              error: errors.currentPassword,
            })}
            {field({
              key: 'newPassword',
              label: t('security.newPasswordLabel'),
              value: form.newPassword,
              error: errors.newPassword,
            })}
            {field({
              key: 'confirmPassword',
              label: t('security.confirmPasswordLabel'),
              value: form.confirmPassword,
              error: errors.confirmPassword,
            })}

            <TouchableOpacity activeOpacity={0.9} onPress={() => { void handlePasswordSave(); }} style={styles.primaryButtonStyle}>
              <Text style={styles.primaryButtonTextStyle}>{t('security.savePassword')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCardStyle}>
            <Text style={styles.cardTitleStyle}>{t('security.passwordUnavailableTitle')}</Text>
            <Text style={styles.cardSubtitleStyle}>{t('security.passwordUnavailableSubtitle')}</Text>
          </View>
        )}

        <View style={styles.formCardStyle}>
          <Text style={styles.cardTitleStyle}>{t('security.accountActionsTitle')}</Text>
          <Text style={styles.cardSubtitleStyle}>{t('security.accountActionsSubtitle')}</Text>
          <View style={styles.rowsWrapStyle}>
            <ProfileActionRow
              item={{ label: t('security.deleteAccount'), icon: 'delete-outline' }}
              onPress={() => router.push(`${rolePrefix}/deleteAccount/deleteAccountScreen`)}
              color="#D94841"
            />
          </View>
        </View>
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
  infoCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 16,
  },
  infoIconWrapStyle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  infoTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginTop: 16,
  },
  infoTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  infoPillsWrapStyle: {
    marginTop: 16,
  },
  infoPillStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  infoPillLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
  },
  infoPillValueStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginTop: 4,
    fontWeight: '700',
  },
  formCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
  },
  cardTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  cardSubtitleStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  fieldWrapStyle: {
    marginTop: 14,
  },
  textFieldStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
  },
  errorTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: '#D94841',
    marginTop: 6,
    marginLeft: 4,
  },
  primaryButtonStyle: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.accent,
    marginTop: 16,
  },
  primaryButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowsWrapStyle: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    borderRadius: 22,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
  },
});
