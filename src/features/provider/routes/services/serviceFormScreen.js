import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Snackbar, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { useLocale } from '../../../../../context/localeContext';
import { useProviderServices } from '../../../../../hooks/useProviderServices';
import {
  DEFAULT_MOCK_CURRENCY,
  digitsOnly,
  formatDurationDisplay,
  formatDurationInput,
  isCanonicalDurationValue,
  normalizeDurationValue,
  normalizeRateValue,
} from '../../../shared/utils/mockFormatting';
import {
  getServiceCategoryCatalog,
  PROVIDER_SERVICE_STATUSES,
} from '../../../shared/utils/providerServices';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../../shared/styles/discoverySystem';

export default function ServiceFormScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { locale, t } = useLocale();
  const { getServiceById, saveService } = useProviderServices();
  const serviceId = typeof params.serviceId === 'string' ? params.serviceId : null;
  const existingService = serviceId ? getServiceById(serviceId) : null;
  const categoryOptions = useMemo(() => getServiceCategoryCatalog(locale), [locale]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [state, setState] = useState({
    categoryKey: existingService?.categoryKey || categoryOptions[0]?.key || '',
    name: existingService?.name || '',
    description: existingService?.description || '',
    baseRate: existingService?.baseRate || '',
    duration: existingService?.duration || '',
  });

  const isEdit = useMemo(() => Boolean(serviceId), [serviceId]);

  useEffect(() => {
    if (!existingService) {
      return;
    }

    setState({
      categoryKey: existingService.categoryKey || categoryOptions[0]?.key || '',
      name: existingService.name || '',
      description: existingService.description || '',
      baseRate: existingService.baseRate || '',
      duration: existingService.duration || '',
    });
  }, [categoryOptions, existingService]);

  function updateState(data) {
    setState((currentState) => ({ ...currentState, ...data }));
  }

  function validateForm() {
    const nextErrors = {};
    const normalizedRate = normalizeRateValue(state.baseRate);
    const normalizedDuration = normalizeDurationValue(state.duration);

    if (!state.categoryKey) nextErrors.categoryKey = t('providerServiceForm.validationCategory');
    if (!state.name.trim()) nextErrors.name = t('providerServiceForm.validationName');
    if (!state.description.trim()) nextErrors.description = t('providerServiceForm.validationDescription');
    if (!normalizedRate) nextErrors.baseRate = t('providerServiceForm.validationRate');
    if (!normalizedDuration || !isCanonicalDurationValue(state.duration)) nextErrors.duration = t('providerServiceForm.validationDuration');

    return nextErrors;
  }

  async function handleSave() {
    const nextErrors = validateForm();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setSnackbarMessage(t('providerServiceForm.invalidForm'));
      return;
    }

    await saveService({
      id: existingService?.id,
      serviceId: existingService?.serviceId,
      categoryKey: state.categoryKey,
      name: state.name.trim(),
      description: state.description.trim(),
      baseRate: normalizeRateValue(state.baseRate),
      duration: normalizeDurationValue(state.duration),
      status: existingService?.status || PROVIDER_SERVICE_STATUSES.ACTIVE,
    });

    router.replace({
      pathname: '/provider/services/providerServicesScreen',
      params: { status: isEdit ? 'updated' : 'created' },
    });
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      {header()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.formCardStyle}>
          {renderCategorySelector()}
          {renderField(t('providerServiceForm.name'), 'name')}
          {renderField(t('providerServiceForm.description'), 'description', { multiline: true, numberOfLines: 4 })}
          {renderField(t('providerServiceForm.rate'), 'baseRate', {
            keyboardType: 'number-pad',
            right: <TextInput.Affix text={DEFAULT_MOCK_CURRENCY} textStyle={styles.affixTextStyle} />,
          })}
          {renderField(t('providerServiceForm.duration'), 'duration', {
            keyboardType: 'number-pad',
            placeholder: t('providerServiceForm.durationPlaceholder'),
          })}
        </View>
      </ScrollView>
      {footer()}
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
        <Text style={styles.headerTitleStyle}>{isEdit ? t('providerServiceForm.editTitle') : t('providerServiceForm.addTitle')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('providerServiceForm.subtitle')}</Text>
      </View>
    );
  }

  function renderField(label, key, extraProps = {}) {
    const error = fieldErrors[key];
    const value = state[key];

    function handleChange(text) {
      if (key === 'baseRate') {
        updateState({ baseRate: digitsOnly(text) });
        return;
      }

      if (key === 'duration') {
        updateState({ duration: formatDurationInput(text) });
        return;
      }

      updateState({ [key]: text });
    }

    return (
      <View style={styles.fieldWrapStyle}>
        <TextInput
          label={label}
          mode="outlined"
          value={value}
          onChangeText={handleChange}
          style={styles.textFieldStyle}
          contentStyle={styles.textFieldContentStyle}
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
          {...extraProps}
        />
        {key === 'duration' ? (
          <Text style={styles.helperTextStyle}>
            {formatDurationDisplay(value, t('providerServiceForm.durationHelper'))}
          </Text>
        ) : null}
        {error ? <Text style={styles.errorTextStyle}>{error}</Text> : null}
      </View>
    );
  }

  function renderCategorySelector() {
    const error = fieldErrors.categoryKey;

    return (
      <View style={styles.fieldWrapStyle}>
        <Text style={styles.categoryLabelStyle}>{t('providerServiceForm.category')}</Text>
        <View style={styles.categoryOptionsWrapStyle}>
          {categoryOptions.map((category) => {
            const isActive = state.categoryKey === category.key;

            return (
              <TouchableOpacity
                key={category.key}
                activeOpacity={0.9}
                onPress={() => updateState({ categoryKey: category.key })}
                style={[styles.categoryChipStyle, isActive ? styles.categoryChipActiveStyle : null]}
              >
                <Text style={[styles.categoryChipTextStyle, isActive ? styles.categoryChipTextActiveStyle : null]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {error ? <Text style={styles.errorTextStyle}>{error}</Text> : null}
      </View>
    );
  }

  function footer() {
    return (
      <View style={styles.footerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.secondaryButtonStyle}>
          <Text style={styles.secondaryButtonTextStyle}>{t('providerServiceForm.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleSave(); }} style={styles.saveButtonStyle}>
          <Text style={styles.saveButtonTextStyle}>{isEdit ? t('providerServiceForm.save') : t('providerServiceForm.add')}</Text>
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
  formCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  fieldWrapStyle: {
    marginBottom: 10,
  },
  categoryLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: '700',
  },
  categoryOptionsWrapStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -8,
  },
  categoryChipStyle: {
    minHeight: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipActiveStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderColor: AinevoieDiscoveryTokens.borderAccentSoft,
  },
  categoryChipTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  categoryChipTextActiveStyle: {
    color: AinevoieDiscoveryTokens.accentDark,
  },
  textFieldStyle: {
    backgroundColor: 'transparent',
  },
  textFieldContentStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    minHeight: 56,
  },
  affixTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    fontWeight: '700',
  },
  helperTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  errorTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: '#D94841',
    marginTop: 4,
    marginLeft: 4,
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
    flexDirection: 'row',
  },
  secondaryButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginRight: 10,
  },
  secondaryButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  saveButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.accent,
    marginLeft: 10,
  },
  saveButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textOnImage,
    fontWeight: '700',
  },
});
