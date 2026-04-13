import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { useProviderServices } from '../../../../../hooks/useProviderServices';
import { formatDurationDisplay, formatRateDisplay } from '../../../shared/utils/mockFormatting';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../../shared/styles/discoverySystem';

export default function ProviderServicesScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { services, isLoading, archiveService, toggleServiceActive } = useProviderServices();
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const activeServicesCount = useMemo(() => services.filter((service) => service.isActive).length, [services]);
  const inactiveServicesCount = Math.max(services.length - activeServicesCount, 0);

  useEffect(() => {
    if (params.status === 'created') {
      setSnackbarMessage(t('providerServicesList.created'));
      navigation.setParams({ status: undefined });
      return;
    }

    if (params.status === 'updated') {
      setSnackbarMessage(t('providerServicesList.updated'));
      navigation.setParams({ status: undefined });
    }
  }, [navigation, params.status, t]);

  async function handleDelete(service) {
    Alert.alert(
      t('providerServicesList.archiveTitle'),
      t('providerServicesList.archiveBody', { name: service.name }),
      [
        { text: t('providerServicesList.archiveCancel'), style: 'cancel' },
        {
          text: t('providerServicesList.archiveConfirm'),
          style: 'destructive',
          onPress: () => {
            void archiveService(service.id).then(() => {
              setSnackbarMessage(t('providerServicesList.archived'));
            });
          },
        },
      ]
    );
  }

  async function handleToggle(service) {
    await toggleServiceActive(service.id);
    setSnackbarMessage(service.isActive ? t('providerServicesList.deactivated') : t('providerServicesList.activated'));
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      {header()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        {summaryCard()}
        {services.length ? serviceList() : emptyState()}
      </ScrollView>
      {footerCta()}
      <Snackbar visible={Boolean(snackbarMessage)} onDismiss={() => setSnackbarMessage('')} duration={2200}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('providerServicesList.headerTitle')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('providerServicesList.headerSubtitle')}</Text>
      </View>
    );
  }

  function emptyState() {
    if (isLoading) {
      return (
        <View style={styles.emptyStateWrapStyle}>
          <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.accent} />
          <Text style={styles.emptyStateTextStyle}>{t('providerServicesList.loading')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyStateWrapStyle}>
        <View style={styles.emptyStateIconWrapStyle}>
          <MaterialCommunityIcons name="briefcase-outline" size={22} color={AinevoieDiscoveryTokens.accentDark} />
        </View>
        <Text style={styles.emptyStateTitleStyle}>{t('providerServicesList.emptyTitle')}</Text>
        <Text style={styles.emptyStateTextStyle}>{t('providerServicesList.emptyBody')}</Text>
      </View>
    );
  }

  function summaryCard() {
    if (!services.length) {
      return null;
    }

    return (
      <View style={styles.summaryCardStyle}>
        <View style={styles.summaryPillStyle}>
          <Text style={styles.summaryPillLabelStyle}>{t('providerServicesList.activeCount')}</Text>
          <Text style={styles.summaryPillValueStyle}>{activeServicesCount}</Text>
        </View>
        <View style={styles.summaryPillStyle}>
          <Text style={styles.summaryPillLabelStyle}>{t('providerServicesList.inactiveCount')}</Text>
          <Text style={styles.summaryPillValueStyle}>{inactiveServicesCount}</Text>
        </View>
      </View>
    );
  }

  function serviceList() {
    return (
      <View>
        {services.map((service) => (
          <View key={service.id} style={styles.serviceCardStyle}>
            <View style={styles.serviceTopRowStyle}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.serviceHeaderRowStyle}>
                  <View style={[styles.serviceStatusChipStyle, service.isActive ? styles.serviceStatusChipActiveStyle : styles.serviceStatusChipInactiveStyle]}>
                    <Text style={[styles.serviceStatusChipTextStyle, service.isActive ? styles.serviceStatusChipTextActiveStyle : styles.serviceStatusChipTextInactiveStyle]}>
                      {service.isActive ? t('providerServicesList.active') : t('providerServicesList.inactive')}
                    </Text>
                  </View>
                  <Switch
                    value={service.isActive}
                    onValueChange={() => {
                      void handleToggle(service);
                    }}
                    trackColor={{ false: '#D8DEE8', true: AinevoieDiscoveryTokens.accent }}
                    thumbColor={Colors.whiteColor}
                  />
                </View>
                <Text style={styles.serviceNameStyle}>{service.name}</Text>
                <Text style={styles.serviceCategoryStyle}>{service.categoryLabel}</Text>
                <Text style={styles.serviceDescriptionStyle} numberOfLines={3}>{service.description}</Text>
              </View>
              <View style={styles.serviceMetaWrapStyle}>
                <Text style={styles.serviceMetaLabelStyle}>{t('providerServicesList.rate')}</Text>
                <Text style={styles.serviceMetaValueStyle}>{formatRateDisplay(service.baseRate)}</Text>
                <Text style={[styles.serviceMetaLabelStyle, { marginTop: 10 }]}>{t('providerServicesList.duration')}</Text>
                <Text style={styles.serviceMetaValueStyle}>{formatDurationDisplay(service.duration)}</Text>
              </View>
            </View>

            <View style={styles.serviceActionsRowStyle}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/provider/services/serviceFormScreen', params: { serviceId: service.id } })}
                style={styles.secondaryActionButtonStyle}
              >
                <MaterialIcons name="edit" size={16} color={AinevoieDiscoveryTokens.textPrimary} />
                <Text style={styles.secondaryActionTextStyle}>{t('providerServicesList.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  void handleDelete(service);
                }}
                style={styles.deleteActionButtonStyle}
              >
                <MaterialIcons name="delete-outline" size={16} color="#D94841" />
                <Text style={styles.deleteActionTextStyle}>{t('providerServicesList.archive')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  }

  function footerCta() {
    return (
      <View style={styles.footerWrapStyle}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/provider/services/serviceFormScreen')}
          style={styles.addButtonStyle}
        >
          <MaterialIcons name="add" size={20} color={Colors.whiteColor} />
          <Text style={styles.addButtonTextStyle}>{t('providerServicesList.addService')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
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
    paddingBottom: 120,
  },
  emptyStateWrapStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: 'center',
  },
  emptyStateIconWrapStyle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  emptyStateTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 19,
  },
  serviceCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
  },
  serviceTopRowStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceHeaderRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  serviceNameStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  serviceCategoryStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    marginTop: 6,
    fontWeight: '700',
  },
  serviceDescriptionStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 8,
    lineHeight: 19,
  },
  serviceMetaWrapStyle: {
    minWidth: 92,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryCardStyle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryPillStyle: {
    flex: 1,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryPillLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
  },
  summaryPillValueStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginTop: 6,
  },
  serviceStatusChipStyle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  serviceStatusChipActiveStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  serviceStatusChipInactiveStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
  },
  serviceStatusChipTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    fontWeight: '700',
  },
  serviceStatusChipTextActiveStyle: {
    color: AinevoieDiscoveryTokens.accentDark,
  },
  serviceStatusChipTextInactiveStyle: {
    color: AinevoieDiscoveryTokens.textSecondary,
  },
  serviceMetaLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
  },
  serviceMetaValueStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
    marginTop: 4,
  },
  serviceActionsRowStyle: {
    flexDirection: 'row',
    marginTop: 16,
  },
  secondaryActionButtonStyle: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginRight: 8,
  },
  secondaryActionTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
    marginLeft: 8,
  },
  deleteActionButtonStyle: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F5C8C4',
    marginLeft: 8,
  },
  deleteActionTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: '#D94841',
    fontWeight: '700',
    marginLeft: 8,
  },
  footerWrapStyle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  addButtonStyle: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: AinevoieDiscoveryTokens.accent,
  },
  addButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
    marginLeft: 8,
  },
});
