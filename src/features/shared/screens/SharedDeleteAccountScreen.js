import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

const USER_STORAGE_KEYS = [
  '@ainevoie/user-profile',
  '@urbanhome/user-profile',
  '@ainevoie/user-bookings',
  '@ainevoie/user-reviews',
  '@urbanhome/user-reviews',
  '@ainevoie/user-primary-location',
  '@urbanhome/user-primary-location',
];

const PROVIDER_STORAGE_KEYS = [
  '@ainevoie/provider-onboarding',
  '@urbanhome/provider-onboarding',
  '@ainevoie/provider-availability',
  '@urbanhome/provider-availability',
  '@ainevoie/provider-services',
  '@urbanhome/provider-services',
  '@ainevoie/provider-bookings',
  '@urbanhome/provider-bookings',
];

async function clearRoleEntryFromStoredObject(storageKey, role) {
  try {
    const storedValue = await AsyncStorage.getItem(storageKey);

    if (!storedValue) {
      return;
    }

    const parsedValue = JSON.parse(storedValue);
    const nextValue = {
      ...(parsedValue || {}),
    };
    delete nextValue[role];

    if (Object.keys(nextValue).length === 0) {
      await AsyncStorage.removeItem(storageKey);
      return;
    }

    await AsyncStorage.setItem(storageKey, JSON.stringify(nextValue));
  } catch {
    await AsyncStorage.removeItem(storageKey);
  }
}

export default function SharedDeleteAccountScreen({ role }) {
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useLocale();
  const { signOut } = useSession();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const [confirmationValue, setConfirmationValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const deletionChecklist = normalizedRole === 'provider'
    ? [
      t('deleteAccount.providerChecklist1'),
      t('deleteAccount.providerChecklist2'),
      t('deleteAccount.providerChecklist3'),
    ]
    : [
      t('deleteAccount.userChecklist1'),
      t('deleteAccount.userChecklist2'),
      t('deleteAccount.userChecklist3'),
    ];

  const canDelete = confirmationValue.trim().toUpperCase() === 'STERGE' && !isDeleting;

  async function handleDeleteConfirmed() {
    setIsDeleting(true);

    try {
      await AsyncStorage.multiRemove(normalizedRole === 'provider' ? PROVIDER_STORAGE_KEYS : USER_STORAGE_KEYS);
      await clearRoleEntryFromStoredObject('@ainevoie/demo-avatars', normalizedRole);
      await clearRoleEntryFromStoredObject('@urbanhome/demo-avatars', normalizedRole);
      await clearRoleEntryFromStoredObject('@ainevoie/notification-preferences', normalizedRole);
      await signOut(normalizedRole);

      Alert.alert(
        t('deleteAccount.successTitle'),
        t('deleteAccount.successBody'),
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/loginScreen'),
          },
        ]
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function requestDelete() {
    if (!canDelete) {
      setErrorMessage(t('deleteAccount.inputError'));
      return;
    }

    Alert.alert(
      t('deleteAccount.alertTitle'),
      t('deleteAccount.alertBody'),
      [
        { text: t('deleteAccount.alertCancel'), style: 'cancel' },
        {
          text: t('deleteAccount.alertConfirm'),
          style: 'destructive',
          onPress: () => {
            void handleDeleteConfirmed();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={AinevoieDiscoveryTokens.appBackground} barStyle="dark-content" />
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('deleteAccount.title')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('deleteAccount.subtitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.warningCardStyle}>
          <View style={styles.warningIconWrapStyle}>
            <MaterialIcons name="delete-forever" size={22} color="#D94841" />
          </View>
          <Text style={styles.warningTitleStyle}>{t('deleteAccount.warningTitle')}</Text>
          <Text style={styles.warningTextStyle}>{t('deleteAccount.warningBody')}</Text>

          <View style={styles.checklistWrapStyle}>
            {deletionChecklist.map((item) => (
              <View key={item} style={styles.checklistRowStyle}>
                <MaterialIcons name="check-circle" size={18} color="#D94841" />
                <Text style={styles.checklistTextStyle}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.confirmationCardStyle}>
          <Text style={styles.confirmationTitleStyle}>{t('deleteAccount.confirmTitle')}</Text>
          <Text style={styles.confirmationTextStyle}>{t('deleteAccount.confirmBody')}</Text>
          <TextInput
            label={t('deleteAccount.inputLabel')}
            mode="outlined"
            value={confirmationValue}
            onChangeText={(value) => {
              setConfirmationValue(value);
              if (errorMessage) {
                setErrorMessage('');
              }
            }}
            outlineColor={errorMessage ? '#D94841' : AinevoieDiscoveryTokens.borderSubtle}
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
          {errorMessage ? <Text style={styles.errorTextStyle}>{errorMessage}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!canDelete}
            onPress={requestDelete}
            style={[styles.deleteButtonStyle, !canDelete ? styles.deleteButtonDisabledStyle : null]}
          >
            <Text style={styles.deleteButtonTextStyle}>{isDeleting ? t('deleteAccount.deleting') : t('deleteAccount.deleteButton')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  warningCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F2C8C3',
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 16,
  },
  warningIconWrapStyle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3F1',
  },
  warningTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginTop: 16,
  },
  warningTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  checklistWrapStyle: {
    marginTop: 16,
  },
  checklistRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checklistTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginLeft: 10,
    flex: 1,
  },
  confirmationCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  confirmationTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  confirmationTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  textFieldStyle: {
    marginTop: 14,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
  },
  errorTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: '#D94841',
    marginTop: 6,
    marginLeft: 4,
  },
  deleteButtonStyle: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D94841',
    marginTop: 16,
  },
  deleteButtonDisabledStyle: {
    opacity: 0.42,
  },
  deleteButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
