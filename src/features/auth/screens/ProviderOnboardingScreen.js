import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { submitProviderOnboarding } from '../../../../src/firebase/bootstrap';
import { uploadProviderDocumentAsset } from '../../../../src/firebase/storageUploads';
import { useProviderOnboarding } from '../../../../hooks/useProviderOnboarding';
import { useProviderAvailability } from '../../../../hooks/useProviderAvailability';
import { DEFAULT_MOCK_CURRENCY, digitsOnly, formatRateDisplay, normalizeRateValue } from '../../shared/utils/mockFormatting';
import { getHomeRoute } from '../../../../utils/roleRoutes';
import { authTheme } from '../theme/authTheme';
import { buildCoverageAreaPatch, isCoverageAreaComplete } from '../../shared/utils/providerCoverage';
import CoverageAreaEditor from '../../shared/components/profile/CoverageAreaEditor';

const theme = authTheme;

function getSteps(t) {
  return [
    { key: 'account', label: t('providerOnboarding.stepAccount'), eyebrow: t('providerOnboarding.step1Eyebrow') },
    { key: 'professional', label: t('providerOnboarding.stepProfessional'), eyebrow: t('providerOnboarding.step2Eyebrow') },
    { key: 'documents', label: t('providerOnboarding.stepDocuments'), eyebrow: t('providerOnboarding.step3Eyebrow') },
    { key: 'review', label: t('providerOnboarding.stepReview'), eyebrow: t('providerOnboarding.step4Eyebrow') },
  ];
}

function getStepIndexFromRouteParam(step, stepsLength) {
  const normalizedStep = Array.isArray(step) ? step[0] : step;
  const routeStepIndex = normalizedStep === 'professional' ? 1 : null;

  return routeStepIndex === null ? null : Math.min(routeStepIndex, stepsLength - 1);
}

export default function ProviderOnboardingScreen() {
  const router = useRouter();
  const { step } = useLocalSearchParams();
  const { t } = useLocale();
  const { refreshBootstrap, session, setLastRole } = useSession();
  const { data, isLoading: isProviderOnboardingLoading, saveProviderOnboarding } = useProviderOnboarding();
  const {
    availabilitySummary,
    availabilityDayChips,
    hasConfiguredAvailability,
  } = useProviderAvailability();
  const steps = useMemo(() => getSteps(t), [t]);
  const routeStepIndex = getStepIndexFromRouteParam(step, steps.length);
  const [stepIndex, setStepIndex] = useState(Math.min(routeStepIndex ?? data.currentStep ?? 0, steps.length - 1));
  const hasAppliedRouteStepRef = useRef(routeStepIndex !== null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDocumentKey, setUploadingDocumentKey] = useState(null);

  const currentStep = steps[stepIndex];
  const account = data.account;
  const professionalProfile = data.professionalProfile;
  const documents = data.documents;

  useEffect(() => {
    if (routeStepIndex !== null && !hasAppliedRouteStepRef.current) {
      hasAppliedRouteStepRef.current = true;
      setStepIndex(routeStepIndex);
      return;
    }

    if (routeStepIndex !== null) {
      return;
    }

    setStepIndex(Math.min(data.currentStep || 0, steps.length - 1));
  }, [data.currentStep, routeStepIndex, steps.length]);

  const providerTitle = useMemo(() => {
    if (stepIndex === 0) {
      return t('providerOnboarding.titleAccount');
    }
    if (stepIndex === 1) {
      return t('providerOnboarding.titleProfessional');
    }
    if (stepIndex === 2) {
      return t('providerOnboarding.titleDocuments');
    }
    return t('providerOnboarding.titleReview');
  }, [stepIndex, t]);


  function setStepField(section, field, value) {
    void saveProviderOnboarding((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
      currentStep: stepIndex,
    }));

    setFieldErrors((currentErrors) => {
      if (!currentErrors[`${section}.${field}`]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[`${section}.${field}`];
      return nextErrors;
    });
  }

  function setCoverageAreaConfig(nextCoverageAreaConfig) {
    void saveProviderOnboarding((current) => {
      const nextCoveragePatch = buildCoverageAreaPatch(nextCoverageAreaConfig);

      return {
        ...current,
        professionalProfile: {
          ...current.professionalProfile,
          coverageAreaConfig: nextCoverageAreaConfig,
          coverageArea: nextCoveragePatch.coverageAreaText,
        },
        currentStep: stepIndex,
      };
    });

    setFieldErrors((currentErrors) => {
      if (!currentErrors['professionalProfile.coverageArea']) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors['professionalProfile.coverageArea'];
      return nextErrors;
    });
  }

  function validateCurrentStep() {
    const nextErrors = {};

    if (stepIndex === 0) {
      if (!account.name.trim()) nextErrors['account.name'] = t('providerOnboarding.validation.accountName');
      if (!account.email.trim()) nextErrors['account.email'] = t('providerOnboarding.validation.accountEmail');
    }

    if (stepIndex === 1) {
      if (!professionalProfile.businessName.trim()) nextErrors['professionalProfile.businessName'] = t('providerOnboarding.validation.businessName');
      if (!professionalProfile.displayName.trim()) nextErrors['professionalProfile.displayName'] = t('providerOnboarding.validation.displayName');
      if (!professionalProfile.specialization.trim()) nextErrors['professionalProfile.specialization'] = t('providerOnboarding.validation.specialization');
      if (!normalizeRateValue(professionalProfile.baseRate)) nextErrors['professionalProfile.baseRate'] = t('providerOnboarding.validation.baseRate');
      if (!isCoverageAreaComplete(professionalProfile.coverageAreaConfig)) nextErrors['professionalProfile.coverageArea'] = t('providerOnboarding.validation.coverageArea');
      if (!professionalProfile.shortBio.trim()) nextErrors['professionalProfile.shortBio'] = t('providerOnboarding.validation.shortBio');
      if (!hasConfiguredAvailability) nextErrors['professionalProfile.availabilitySummary'] = t('providerOnboarding.validation.availabilitySummary');
    }

    if (stepIndex === 2) {
      if (!(documents.identity?.status === 'added' && documents.identity?.name)) nextErrors['documents.identity'] = t('providerOnboarding.validation.identity');
      if (!(documents.professional?.status === 'added' && documents.professional?.name)) nextErrors['documents.professional'] = t('providerOnboarding.validation.professional');
    }

    return nextErrors;
  }

  async function handleContinue() {
    const nextErrors = validateCurrentStep();
    setFieldErrors(nextErrors);

    const firstError = Object.values(nextErrors)[0];
    if (firstError) {
      Alert.alert(t('providerOnboarding.stepIncompleteTitle'), String(firstError));
      return;
    }

    if (stepIndex === steps.length - 1) {
      await handleFinalSubmit();
      return;
    }

    const nextStep = stepIndex + 1;
    setStepIndex(nextStep);
    await saveProviderOnboarding((current) => ({
      ...current,
      currentStep: nextStep,
    }));
  }

  async function handleFinalSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await setLastRole('provider');
      await submitProviderOnboarding({
        businessName: professionalProfile.businessName,
        displayName: professionalProfile.displayName || account.name,
        specialization: professionalProfile.specialization,
        baseRateAmount: Number(normalizeRateValue(professionalProfile.baseRate)),
        coverageArea: professionalProfile.coverageAreaConfig,
        shortBio: professionalProfile.shortBio,
      });

      await saveProviderOnboarding((current) => ({
        ...current,
        verificationStatus: 'pending',
        completedAt: new Date().toISOString(),
        currentStep: steps.length - 1,
      }));
      await refreshBootstrap();
      router.replace(getHomeRoute('provider'));
    } catch (error) {
      Alert.alert(
        t('roleAuth.authFailedTitle'),
        error instanceof Error ? error.message : t('providerOnboarding.stepIncompleteTitle'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePickDocument(documentKey) {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(t('providerOnboarding.permissionTitle'), t('providerOnboarding.permissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    if (!session.uid || !data.documents || !documentKey) {
      Alert.alert(t('roleAuth.authFailedTitle'), t('providerOnboarding.stepIncompleteTitle'));
      return;
    }

    setUploadingDocumentKey(documentKey);

    try {
      const uploadedDocument = await uploadProviderDocumentAsset(
        session.uid,
        documentKey,
        {
          uri: asset.uri,
          fileName: asset.fileName
            || asset.uri.split('/').pop()
            || `${documentKey}-document.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        },
      );

      await saveProviderOnboarding((current) => ({
        ...current,
        documents: {
          ...current.documents,
          [documentKey]: {
            uri: asset.uri,
            name: asset.fileName
              || asset.uri.split('/').pop()
              || (documentKey === 'identity'
                ? t('providerOnboarding.identityDocument')
                : t('providerOnboarding.professionalDocument')),
            status: uploadedDocument.status === 'uploaded' ? 'added' : 'missing',
          },
        },
        currentStep: stepIndex,
      }));

      setFieldErrors((currentErrors) => {
        const errorKey = `documents.${documentKey}`;
        if (!currentErrors[errorKey]) {
          return currentErrors;
        }

        const nextErrors = { ...currentErrors };
        delete nextErrors[errorKey];
        return nextErrors;
      });
    } catch (error) {
      Alert.alert(
        t('roleAuth.authFailedTitle'),
        error instanceof Error ? error.message : t('providerOnboarding.stepIncompleteTitle'),
      );
    } finally {
      setUploadingDocumentKey(null);
    }
  }

  function goBack() {
    if (stepIndex === 0) {
      router.replace('/auth/providerSignupScreen');
      return;
    }

    const previousStep = stepIndex - 1;
    setStepIndex(previousStep);
    void saveProviderOnboarding((current) => ({
      ...current,
      currentStep: previousStep,
    }));
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={theme.auth.background} />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.container}>
        <View style={styles.floatingHeaderRowStyle}>
          <Pressable onPress={goBack} style={styles.backArrowStyle}>
            <MaterialIcons name="arrow-back" size={22} color={theme.text.primary} />
          </Pressable>
          <View style={styles.brandPillStyle}>
            <View style={styles.brandDotStyle} />
            <Image source={require('../../../../assets/images/app_icon.png')} style={styles.brandPillLogoStyle} resizeMode="contain" />
            <Text style={styles.brandPillTextStyle}>AI Nevoie</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
            <View style={styles.heroSectionStyle}>
              <Text style={styles.roleLabelStyle}>{t('providerOnboarding.roleLabel')}</Text>
              <Text style={styles.titleStyle} numberOfLines={2}>
                {providerTitle}
              </Text>
           
            </View>

            {progressCard()}
            {isProviderOnboardingLoading ? loadingStepCard() : null}
            {!isProviderOnboardingLoading && stepIndex === 0 ? accountStep() : null}
            {!isProviderOnboardingLoading && stepIndex === 1 ? professionalStep() : null}
            {!isProviderOnboardingLoading && stepIndex === 2 ? documentsStep() : null}
            {!isProviderOnboardingLoading && stepIndex === 3 ? reviewStep() : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footerWrapStyle}>
          <Pressable
            onPress={() => {
              void handleContinue();
            }}
            style={({ pressed }) => [
              styles.primaryButtonStyle,
              { backgroundColor: pressed ? theme.button.primaryBackgroundPressed : theme.button.primaryBackground },
              isProviderOnboardingLoading || isSubmitting || Boolean(uploadingDocumentKey) ? styles.buttonDisabledStyle : null,
            ]}
            disabled={isProviderOnboardingLoading || isSubmitting || Boolean(uploadingDocumentKey)}
          >
            <Text style={styles.primaryButtonTextStyle}>
              {stepIndex === steps.length - 1 ? t('providerOnboarding.submitForReview') : t('providerOnboarding.continue')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  function progressCard() {
    return (
      <View style={styles.progressCardStyle}>
        <Text style={styles.progressEyebrowStyle}>{currentStep.eyebrow}</Text>
        <View style={styles.progressDotsRowStyle}>
          {steps.map((step, index) => (
            <View
              key={step.key}
              style={[
                styles.progressDotStyle,
                index === stepIndex ? styles.progressDotActiveStyle : null,
                index < stepIndex ? styles.progressDotCompletedStyle : null,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressLabelStyle}>{currentStep.label}</Text>
      </View>
    );
  }

  function loadingStepCard() {
    const skeletonRows = stepIndex === 1 ? [0, 1, 2, 3, 4, 5] : [0, 1, 2];

    return (
      <View style={styles.stepCardStyle}>
        <View style={styles.skeletonHeaderRowStyle}>
          <View style={styles.skeletonIconStyle} />
          <View style={styles.skeletonHeaderTextWrapStyle}>
            <Text style={styles.skeletonTitleStyle}>{t('providerOnboarding.loadingProfile')}</Text>
            <View style={styles.skeletonLineShortStyle} />
          </View>
        </View>

        {skeletonRows.map((item) => (
          <View key={`provider-onboarding-skeleton-${item}`} style={styles.skeletonFieldWrapStyle}>
            <View style={styles.skeletonLabelStyle} />
            <View style={styles.skeletonInputStyle} />
          </View>
        ))}
      </View>
    );
  }

  function accountStep() {
    return (
      <View style={styles.stepCardStyle}>
        {renderTextField({
          fieldKey: 'account.name',
          label: t('providerOnboarding.fullName'),
          placeholder: t('providerOnboarding.fullNamePlaceholder'),
          value: account.name,
          onChangeText: (value) => setStepField('account', 'name', value),
          icon: 'person-outline',
        })}
        {renderTextField({
          fieldKey: 'account.email',
          label: t('providerOnboarding.email'),
          placeholder: t('providerOnboarding.emailPlaceholder'),
          value: account.email,
          onChangeText: (value) => setStepField('account', 'email', value),
          icon: 'email-outline',
          keyboardType: 'email-address',
          autoCapitalize: 'none',
        })}
        {renderTextField({
          fieldKey: 'account.passwordInfo',
          label: t('providerOnboarding.password'),
          placeholder: t('providerOnboarding.passwordManagedPlaceholder'),
          value: t('providerOnboarding.passwordManagedValue'),
          onChangeText: () => {},
          icon: 'lock-outline',
          secureTextEntry: true,
          editable: false,
        })}
      </View>
    );
  }

  function professionalStep() {
    return (
      <View style={styles.stepCardStyle}>
        {renderTextField({
          fieldKey: 'professionalProfile.businessName',
          label: t('providerOnboarding.businessName'),
          placeholder: t('providerOnboarding.businessNamePlaceholder'),
          value: professionalProfile.businessName,
          onChangeText: (value) => setStepField('professionalProfile', 'businessName', value),
          icon: 'store-outline',
        })}
        {renderTextField({
          fieldKey: 'professionalProfile.displayName',
          label: t('providerOnboarding.displayName'),
          placeholder: t('providerOnboarding.displayNamePlaceholder'),
          value: professionalProfile.displayName,
          onChangeText: (value) => setStepField('professionalProfile', 'displayName', value),
          icon: 'badge-account-outline',
        })}
        {renderTextField({
          fieldKey: 'professionalProfile.specialization',
          label: t('providerOnboarding.specialization'),
          placeholder: t('providerOnboarding.specializationPlaceholder'),
          value: professionalProfile.specialization,
          onChangeText: (value) => setStepField('professionalProfile', 'specialization', value),
          icon: 'briefcase-outline',
        })}
        {renderTextField({
          fieldKey: 'professionalProfile.baseRate',
          label: t('providerOnboarding.baseRate'),
          placeholder: t('providerOnboarding.baseRatePlaceholder'),
          value: professionalProfile.baseRate,
          onChangeText: (value) => setStepField('professionalProfile', 'baseRate', digitsOnly(value)),
          icon: 'cash-multiple',
          keyboardType: 'number-pad',
          suffix: DEFAULT_MOCK_CURRENCY,
          helperText: formatRateDisplay(
            professionalProfile.baseRate,
            t('profile.rateHelper', { currency: DEFAULT_MOCK_CURRENCY })
          ),
        })}
        <CoverageAreaEditor
          value={professionalProfile.coverageAreaConfig}
          onChange={setCoverageAreaConfig}
          errorText={fieldErrors['professionalProfile.coverageArea']}
          isAuthenticated={Boolean(session?.uid)}
          copy={{
            countryLabel: t('providerOnboarding.coverageCountry'),
            countryPlaceholder: t('providerOnboarding.coverageCountryPlaceholder'),
            countyLabel: t('providerOnboarding.coverageCounty'),
            countyPlaceholder: t('providerOnboarding.coverageCountyPlaceholder'),
            cityLabel: t('providerOnboarding.coverageCity'),
            cityPlaceholder: t('providerOnboarding.coverageCityPlaceholder'),
            searchLabel: t('providerOnboarding.coverageSearchLabel'),
            searchPlaceholder: t('providerOnboarding.coverageSearchPlaceholder'),
            searchHint: t('providerOnboarding.coverageSearchHint'),
            searchEmpty: t('providerOnboarding.coverageSearchEmpty'),
            unauthenticatedSearchError: t('providerOnboarding.coverageUnauthenticatedSearchError'),
            selectedLocationTitle: t('providerOnboarding.coverageSelectedLocationTitle'),
            clearSelection: t('providerOnboarding.coverageClearSelection'),
            previewTitle: t('providerOnboarding.coveragePreviewTitle'),
            previewPlaceholder: t('providerOnboarding.coveragePreviewPlaceholder'),
          }}
        />
        {renderTextArea({
          fieldKey: 'professionalProfile.shortBio',
          label: t('providerOnboarding.shortBio'),
          placeholder: t('providerOnboarding.shortBioPlaceholder'),
          value: professionalProfile.shortBio,
          onChangeText: (value) => setStepField('professionalProfile', 'shortBio', value),
        })}
        {renderAvailabilitySummaryCard()}
      </View>
    );
  }

  function documentsStep() {
    return (
      <View style={styles.stepCardStyle}>
        {renderDocumentCard({
          keyName: 'identity',
          title: t('providerOnboarding.identityDocument'),
          subtitle: t('providerOnboarding.identitySubtitle'),
          document: documents.identity,
        })}
        {renderDocumentCard({
          keyName: 'professional',
          title: t('providerOnboarding.professionalDocument'),
          subtitle: t('providerOnboarding.professionalSubtitle'),
          document: documents.professional,
        })}
      </View>
    );
  }

  function reviewStep() {
    return (
      <View style={styles.stepCardStyle}>
        <View style={styles.reviewBadgeStyle}>
          <Text style={styles.reviewBadgeTextStyle}>{t('providerOnboarding.reviewReadyBadge')}</Text>
        </View>

        {renderReviewSection(t('providerOnboarding.stepAccount'), [
          account.name || '—',
          account.email || '—',
        ])}

        {renderReviewSection(t('providerOnboarding.stepProfessional'), [
          professionalProfile.businessName || '—',
          professionalProfile.displayName || '—',
          professionalProfile.specialization || '—',
          formatRateDisplay(professionalProfile.baseRate),
          professionalProfile.coverageArea || '—',
          availabilitySummary || t('providerOnboarding.availabilityPending'),
        ])}

        {renderReviewSection(t('providerOnboarding.stepDocuments'), [
          documents.identity?.name ? `${t('providerOnboarding.identityDocument')} ${t('providerOnboarding.documentUploadedSuffix')}` : t('providerOnboarding.validation.identity'),
          documents.professional?.name ? `${t('providerOnboarding.professionalDocument')} ${t('providerOnboarding.documentUploadedSuffix')}` : t('providerOnboarding.validation.professional'),
        ])}
      </View>
    );
  }

  function renderReviewSection(title, lines) {
    return (
      <View style={styles.reviewSectionStyle}>
        <Text style={styles.reviewSectionTitleStyle}>{title}</Text>
        {lines.map((line) => (
          <Text key={`${title}-${line}`} style={styles.reviewSectionLineStyle}>{line}</Text>
        ))}
      </View>
    );
  }

  function renderDocumentCard({ keyName, title, subtitle, document }) {
    const error = fieldErrors[`documents.${keyName}`];
    const isUploaded = document?.status === 'added' && Boolean(document?.name);
    const isUploading = uploadingDocumentKey === keyName;
    const actionTitle = isUploading
      ? t('providerOnboarding.documentUploadingTitle')
      : isUploaded
        ? t('providerOnboarding.replaceDocument')
        : t('providerOnboarding.addDocument');
    const actionSubtitle = isUploading
      ? document?.name || t('providerOnboarding.documentUploadingSubtitle')
      : document?.name || '—';

    return (
      <View style={[styles.documentCardStyle, error ? styles.documentCardErrorStyle : null]}>
        <View style={[styles.documentStatusChipStyle, isUploaded ? styles.documentStatusChipActiveStyle : null]}>
          <Text style={[styles.documentStatusChipTextStyle, isUploaded ? styles.documentStatusChipTextActiveStyle : null]}>
            {isUploaded
              ? t('providerOnboarding.documentUploadedStatus')
              : t('providerOnboarding.documentMissingStatus')}
          </Text>
        </View>

        <View style={styles.documentHeaderRowStyle}>
          <View style={styles.documentHeaderTextWrapStyle}>
            <Text style={styles.documentTitleStyle}>{title}</Text>
            <Text style={styles.documentSubtitleStyle}>{subtitle}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => { void handlePickDocument(keyName); }}
          style={styles.documentActionRowStyle}
          disabled={isUploading || isSubmitting}
        >
          <View style={styles.documentActionIconStyle}>
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.brand.primary} />
            ) : (
              <MaterialCommunityIcons
                name={isUploaded ? 'file-check-outline' : 'file-upload-outline'}
                size={20}
                color={theme.brand.primary}
              />
            )}
          </View>
          <View style={styles.documentActionTextWrapStyle}>
            <Text style={styles.documentActionTitleStyle}>
              {actionTitle}
            </Text>
            <Text style={styles.documentActionSubtitleStyle}>
              {actionSubtitle}
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={styles.errorTextStyle}>{error}</Text> : null}
      </View>
    );
  }

  function renderAvailabilitySummaryCard() {
    const error = fieldErrors['professionalProfile.availabilitySummary'];

    return (
      <View style={[styles.infoPreviewCardStyle, error ? styles.documentCardErrorStyle : null]}>
        <View style={styles.infoPreviewHeaderStyle}>
          <View style={styles.infoPreviewIconStyle}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={20} color={theme.brand.primaryDark} />
          </View>
          <View style={styles.infoPreviewContentStyle}>
            <Text style={styles.infoPreviewTitleStyle}>{t('providerOnboarding.availabilitySummary')}</Text>
            <Text style={styles.infoPreviewBodyStyle}>
              {hasConfiguredAvailability ? availabilitySummary : t('providerOnboarding.availabilityPending')}
            </Text>
          </View>
        </View>

        {availabilityDayChips.length ? (
          <View style={styles.infoPreviewChipsWrapStyle}>
            {availabilityDayChips.map((item) => (
              <View key={item} style={styles.infoPreviewChipStyle}>
                <Text style={styles.infoPreviewChipTextStyle}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push({
            pathname: '/provider/availability/providerAvailabilityScreen',
            params: { source: 'providerOnboarding' },
          })}
          style={styles.inlineActionButtonStyle}
        >
          <Text style={styles.inlineActionButtonTextStyle}>
            {hasConfiguredAvailability
              ? t('providerOnboarding.availabilityEditCta')
              : t('providerOnboarding.availabilitySetupCta')}
          </Text>
        </Pressable>

        {error ? <Text style={styles.errorTextStyle}>{error}</Text> : null}
      </View>
    );
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
    editable = true,
    suffix,
    helperText,
  }) {
    const error = fieldErrors[fieldKey];

    return (
      <View style={styles.fieldWrapStyle}>
        <Text style={styles.fieldLabelStyle}>{label}</Text>
        <View style={[styles.inputWrapStyle, error ? styles.inputWrapErrorStyle : null]}>
          <MaterialCommunityIcons name={icon} size={20} color={theme.text.secondary} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.text.muted}
            style={styles.textInputStyle}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
            selectionColor={theme.brand.primary}
            editable={editable}
          />
          {suffix ? <Text style={styles.inputSuffixStyle}>{suffix}</Text> : null}
        </View>
        {helperText ? <Text style={styles.helperTextStyle}>{helperText}</Text> : null}
        {error ? <Text style={styles.errorTextStyle}>{error}</Text> : null}
      </View>
    );
  }

  function renderTextArea({ fieldKey, label, placeholder, value, onChangeText }) {
    const error = fieldErrors[fieldKey];

    return (
      <View style={styles.fieldWrapStyle}>
        <Text style={styles.fieldLabelStyle}>{label}</Text>
        <View style={[styles.textAreaWrapStyle, error ? styles.inputWrapErrorStyle : null]}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.text.muted}
            style={styles.textAreaInputStyle}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            selectionColor={theme.brand.primary}
          />
        </View>
        {error ? <Text style={styles.errorTextStyle}>{error}</Text> : null}
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
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: theme.brand.primarySoft,
    top: -88,
    right: -64,
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.74)',
    bottom: 72,
    left: -72,
  },
  container: {
    flex: 1,
  },
  floatingHeaderRowStyle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 18 : 16,
    left: 20,
    right: 20,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrowStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  scrollContentStyle: {
    paddingHorizontal: 20,
    paddingTop: 74,
    paddingBottom: 24,
  },
  heroSectionStyle: {
    marginTop: 0,
    paddingRight: 12,
  },
  brandPillStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  brandDotStyle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.brand.primary,
    marginRight: 10,
  },
  brandPillLogoStyle: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  brandPillTextStyle: {
    color: theme.text.primary,
    fontSize: 13,
    fontFamily: 'Montserrat_Bold',
  },
  roleLabelStyle: {
    color: theme.text.secondary,
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Montserrat_SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titleStyle: {
    color: theme.text.primary,
    marginTop: 6,
    fontSize: 31,
    lineHeight: 38,
    fontFamily: 'Montserrat_Bold',
  },
  subtitleStyle: {
    color: theme.text.secondary,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Montserrat_Medium',
  },
  progressCardStyle: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 18,
  },
  progressEyebrowStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressDotsRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  progressDotStyle: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(44,62,80,0.10)',
    marginRight: 8,
  },
  progressDotActiveStyle: {
    backgroundColor: theme.brand.primary,
  },
  progressDotCompletedStyle: {
    backgroundColor: theme.brand.primaryDark,
  },
  progressLabelStyle: {
    color: theme.text.primary,
    marginTop: 14,
    fontSize: 15,
    fontFamily: 'Montserrat_Bold',
  },
  stepCardStyle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    padding: 20,
    marginTop: 18,
    shadowColor: '#141923',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  skeletonHeaderRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  skeletonIconStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.brand.primarySoft,
  },
  skeletonHeaderTextWrapStyle: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonTitleStyle: {
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
    marginBottom: 8,
  },
  skeletonLineShortStyle: {
    width: '56%',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(44,62,80,0.10)',
  },
  skeletonFieldWrapStyle: {
    marginBottom: 16,
  },
  skeletonLabelStyle: {
    width: '38%',
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(44,62,80,0.10)',
    marginBottom: 8,
  },
  skeletonInputStyle: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(44,62,80,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(44,62,80,0.06)',
  },
  fieldWrapStyle: {
    marginBottom: 16,
  },
  inlineFieldsRowStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inlineFieldItemStyle: {
    flex: 1,
  },
  inlineFieldSpacerStyle: {
    width: 12,
  },
  fieldLabelStyle: {
    color: theme.text.primary,
    marginBottom: 8,
    fontSize: 13,
    fontFamily: 'Montserrat_SemiBold',
  },
  inputWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  inputWrapErrorStyle: {
    borderColor: theme.error.default,
  },
  textInputStyle: {
    flex: 1,
    paddingVertical: 0,
    marginLeft: 10,
    color: theme.text.primary,
    fontSize: 15,
    fontFamily: 'Montserrat_Medium',
  },
  inputSuffixStyle: {
    color: theme.text.secondary,
    marginLeft: 10,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
  },
  textAreaWrapStyle: {
    minHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textAreaInputStyle: {
    minHeight: 92,
    color: theme.text.primary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Montserrat_Medium',
  },
  errorTextStyle: {
    color: theme.error.default,
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Montserrat_Medium',
  },
  helperTextStyle: {
    color: theme.text.secondary,
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Montserrat_Medium',
  },
  infoPreviewCardStyle: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: '#FCFBFF',
    padding: 16,
    marginBottom: 16,
  },
  infoPreviewHeaderStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoPreviewIconStyle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.brand.primarySoft,
  },
  infoPreviewContentStyle: {
    flex: 1,
    marginLeft: 12,
  },
  infoPreviewTitleStyle: {
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
  },
  infoPreviewBodyStyle: {
    color: theme.text.secondary,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_Medium',
  },
  infoPreviewChipsWrapStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  infoPreviewChipStyle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.brand.primarySoft,
    marginRight: 8,
    marginBottom: 8,
  },
  infoPreviewChipTextStyle: {
    color: theme.brand.primaryDark,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
  },
  inlineActionButtonStyle: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.brand.primarySoft,
  },
  inlineActionButtonTextStyle: {
    color: theme.brand.primaryDark,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
  },
  documentCardStyle: {
    position: 'relative',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: '#FCFBFF',
    padding: 16,
    marginBottom: 14,
  },
  documentCardErrorStyle: {
    borderColor: theme.error.default,
  },
  documentHeaderRowStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  documentHeaderTextWrapStyle: {
    flex: 1,
    paddingRight: 104,
  },
  documentTitleStyle: {
    color: theme.text.primary,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Montserrat_Bold',
  },
  documentSubtitleStyle: {
    color: theme.text.secondary,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_Medium',
  },
  documentStatusChipStyle: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
    maxWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F5F2EA',
  },
  documentStatusChipActiveStyle: {
    backgroundColor: theme.brand.primarySoft,
  },
  documentStatusChipTextStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    textAlign: 'center',
  },
  documentStatusChipTextActiveStyle: {
    color: theme.brand.primaryDark,
  },
  documentActionRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border.subtle,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  documentActionIconStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.brand.primarySoft,
  },
  documentActionTextWrapStyle: {
    flex: 1,
    marginLeft: 12,
  },
  documentActionTitleStyle: {
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
  },
  documentActionSubtitleStyle: {
    color: theme.text.secondary,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Montserrat_Medium',
  },
  reviewBadgeStyle: {
    alignSelf: 'flex-start',
    backgroundColor: theme.brand.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  reviewBadgeTextStyle: {
    color: theme.brand.primaryDark,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewSectionStyle: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: theme.border.subtle,
    paddingTop: 16,
  },
  reviewSectionTitleStyle: {
    color: theme.text.primary,
    fontSize: 14,
    fontFamily: 'Montserrat_Bold',
  },
  reviewSectionLineStyle: {
    color: theme.text.secondary,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_Medium',
  },
  footerWrapStyle: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
  },
  primaryButtonStyle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderRadius: 999,
    shadowColor: theme.brand.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  primaryButtonTextStyle: {
    color: theme.button.primaryText,
    fontSize: 16,
    fontFamily: 'Montserrat_Bold',
  },
  buttonDisabledStyle: {
    opacity: 0.6,
  },
});
