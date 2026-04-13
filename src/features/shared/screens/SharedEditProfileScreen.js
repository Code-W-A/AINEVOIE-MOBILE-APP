import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useDemoAvatar } from '../../../../hooks/useDemoAvatar';
import { useProviderAvailability } from '../../../../hooks/useProviderAvailability';
import { useProviderOnboarding } from '../../../../hooks/useProviderOnboarding';
import { useUserProfile } from '../../../../hooks/useUserProfile';
import { useUserPrimaryLocation } from '../../../../hooks/useUserPrimaryLocation';
import { pickDemoAvatar } from '../../../../utils/demoActions';
import { getRoleDisplayConfig } from '../config/roleDisplayConfig';
import { DEFAULT_MOCK_CURRENCY, digitsOnly, formatRateDisplay, normalizeRateValue } from '../utils/mockFormatting';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';
import ChatTopBar from '../components/chat/ChatTopBar';
import ChatCircleButton from '../components/chat/ChatCircleButton';
import { buildCoverageAreaPatch, normalizeCoverageAreaForm } from '../utils/providerCoverage';
import CoverageAreaEditor from '../components/profile/CoverageAreaEditor';

export default function SharedEditProfileScreen({ role }) {
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useLocale();
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const roleConfig = getRoleDisplayConfig(normalizedRole, t);
  const { avatarUri, saveAvatar } = useDemoAvatar(normalizedRole);
  const { data: providerOnboarding, saveProviderOnboarding } = useProviderOnboarding();
  const { availabilitySummary, availabilityDayChips, hasConfiguredAvailability } = useProviderAvailability();
  const { data: userProfile, saveUserProfile } = useUserProfile();
  const { location } = useUserPrimaryLocation();
  const [state, setState] = useState({
    ...roleConfig.editProfileDefaults,
    businessName: '',
    displayName: '',
    specialization: '',
    baseRate: '',
    coverageArea: '',
    coverageAreaConfig: normalizeCoverageAreaForm(null),
    shortBio: '',
    availabilitySummary: '',
    showBottomSheet: false,
  });

  const avatarSource = useMemo(
    () => (avatarUri ? { uri: avatarUri } : roleConfig.defaultAvatarSource),
    [avatarUri, roleConfig.defaultAvatarSource]
  );

  useEffect(() => {
    if (normalizedRole === 'provider') {
      setState((currentState) => ({
        ...currentState,
        name: providerOnboarding.account.name || currentState.name,
        email: providerOnboarding.account.email || currentState.email,
        businessName: providerOnboarding.professionalProfile.businessName || '',
        displayName: providerOnboarding.professionalProfile.displayName || '',
        specialization: providerOnboarding.professionalProfile.specialization || '',
        baseRate: providerOnboarding.professionalProfile.baseRate || '',
        coverageArea: providerOnboarding.professionalProfile.coverageArea || '',
        coverageAreaConfig: providerOnboarding.professionalProfile.coverageAreaConfig || normalizeCoverageAreaForm(null),
        shortBio: providerOnboarding.professionalProfile.shortBio || '',
        availabilitySummary: providerOnboarding.professionalProfile.availabilitySummary || '',
      }));
      return;
    }

    setState((currentState) => ({
      ...currentState,
      name: userProfile.name || currentState.name,
      email: userProfile.email || currentState.email,
      phoneNumber: userProfile.phoneNumber || currentState.phoneNumber,
    }));
  }, [normalizedRole, providerOnboarding, userProfile]);

  function updateState(data) {
    setState((currentState) => ({ ...currentState, ...data }));
  }

  function updateCoverageAreaConfig(nextCoverageAreaConfig) {
    setState((currentState) => {
      const nextCoveragePatch = buildCoverageAreaPatch(nextCoverageAreaConfig);

      return {
        ...currentState,
        coverageAreaConfig: nextCoverageAreaConfig,
        coverageArea: nextCoveragePatch.coverageAreaText,
      };
    });
  }

  const {
    name,
    email,
    phoneNumber,
    businessName,
    displayName,
    specialization,
    baseRate,
    coverageArea,
    coverageAreaConfig,
    shortBio,
    showBottomSheet,
  } = state;

  async function handleAvatarPick(source) {
    updateState({ showBottomSheet: false });
    const asset = await pickDemoAvatar(source);

    if (!asset?.uri) {
      return;
    }

    await saveAvatar(asset.uri, asset);
  }

  function renderHeader() {
    return (
      <View style={styles.headerWrapStyle}>
        <ChatTopBar
          onBackPress={() => navigation.goBack()}
          title={t('profile.editProfileTitle')}
          rightContent={(
            <ChatCircleButton onPress={() => updateState({ showBottomSheet: true })}>
              <MaterialIcons name="photo-camera" size={20} color={AinevoieDiscoveryTokens.brandDark} />
            </ChatCircleButton>
          )}
        />
      </View>
    );
  }

  function renderProfileCard() {
    const helperText = normalizedRole === 'provider'
      ? t('profile.providerHelper')
      : t('profile.userHelper');

    return (
      <View style={styles.heroCardStyle}>
        <View style={styles.heroTopRowStyle}>
          <View style={styles.heroBadgeStyle}>
            <Text style={styles.heroBadgeTextStyle}>{roleConfig.accountLabel}</Text>
          </View>
        </View>

        <View style={styles.identityRowStyle}>
          <Image source={avatarSource} style={styles.profilePhotoStyle} resizeMode="cover" />
          <View style={styles.identityTextWrapStyle}>
            <Text numberOfLines={1} style={styles.userNameStyle}>{normalizedRole === 'provider' ? (displayName || name) : name}</Text>
            <Text numberOfLines={1} style={styles.userEmailStyle}>{email}</Text>
            <Text style={styles.helperTextStyle}>{helperText}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => updateState({ showBottomSheet: true })}
          style={styles.changeInfoWrapStyle}
        >
          <MaterialIcons name="photo-camera" size={16} color={AinevoieDiscoveryTokens.textOnImage} />
          <Text style={styles.changeLabelStyle}>{t('profile.changePhoto')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderField(label, value, onChangeText, extraProps = {}) {
    return (
      <TextInput
        label={label}
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        style={styles.textFieldStyle}
        contentStyle={styles.textFieldContentStyle}
        outlineColor={AinevoieDiscoveryTokens.borderSubtle}
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
    );
  }

  function renderFormCard() {
    return (
      <View style={styles.formCardStyle}>
        <Text style={styles.sectionTitleStyle}>{t('profile.accountData')}</Text>
        {renderField(t('profile.name'), name, (text) => updateState({ name: text }))}
        {renderField(t('profile.email'), email, (text) => updateState({ email: text }), {
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          editable: false,
        })}
        {renderField(t('profile.phone'), phoneNumber, (text) => updateState({ phoneNumber: text }), {
          keyboardType: 'phone-pad',
        })}
      </View>
    );
  }

  function renderProviderBusinessCard() {
    if (normalizedRole !== 'provider') {
      return null;
    }

    return (
      <View style={styles.formCardStyle}>
        <Text style={styles.sectionTitleStyle}>{t('profile.profileContract')}</Text>
        {renderField(t('profile.businessName'), businessName, (text) => updateState({ businessName: text }))}
        {renderField(t('profile.displayName'), displayName, (text) => updateState({ displayName: text }))}
        {renderField(t('profile.specialization'), specialization, (text) => updateState({ specialization: text }))}
        {renderField(t('profile.startingRate'), baseRate, (text) => updateState({ baseRate: digitsOnly(text) }), {
          keyboardType: 'number-pad',
          right: <TextInput.Affix text={DEFAULT_MOCK_CURRENCY} textStyle={styles.affixTextStyle} />,
        })}
        <Text style={styles.fieldHelperTextStyle}>
          {formatRateDisplay(baseRate, t('profile.rateHelper', { currency: DEFAULT_MOCK_CURRENCY }))}
        </Text>
        <CoverageAreaEditor
          value={coverageAreaConfig}
          onChange={updateCoverageAreaConfig}
          copy={{
            countryLabel: t('profile.coverageCountry'),
            countryPlaceholder: t('profile.coverageCountryPlaceholder'),
            countyLabel: t('profile.coverageCounty'),
            countyPlaceholder: t('profile.coverageCountyPlaceholder'),
            cityLabel: t('profile.coverageCity'),
            cityPlaceholder: t('profile.coverageCityPlaceholder'),
            searchLabel: t('profile.coverageSearchLabel'),
            searchPlaceholder: t('profile.coverageSearchPlaceholder'),
            searchHint: t('profile.coverageSearchHint'),
            searchEmpty: t('profile.coverageSearchEmpty'),
            selectedLocationTitle: t('profile.coverageSelectedLocationTitle'),
            clearSelection: t('profile.coverageClearSelection'),
            previewTitle: t('profile.coveragePreviewTitle'),
            previewPlaceholder: t('profile.coveragePreviewPlaceholder'),
          }}
        />
        {renderField(t('profile.servicesDescription'), shortBio, (text) => updateState({ shortBio: text }), {
          multiline: true,
          numberOfLines: 4,
        })}
        <View style={styles.previewCardStyle}>
          <Text style={styles.previewCardTitleStyle}>{t('profile.availabilitySummary')}</Text>
          <Text style={styles.previewCardTextStyle}>
            {hasConfiguredAvailability ? availabilitySummary : t('profile.availabilityPending')}
          </Text>
          {availabilityDayChips.length ? (
            <View style={styles.previewChipsWrapStyle}>
              {availabilityDayChips.map((item) => (
                <View key={item} style={styles.previewChipStyle}>
                  <Text style={styles.previewChipTextStyle}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/provider/availability/providerAvailabilityScreen')}
            style={styles.locationActionButtonStyle}
          >
            <MaterialIcons name="schedule" size={18} color={AinevoieDiscoveryTokens.brandDark} />
            <Text style={styles.locationActionButtonTextStyle}>
              {hasConfiguredAvailability ? t('profile.editAvailability') : t('profile.setupAvailability')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderActions() {
    async function handleSave() {
      if (normalizedRole === 'provider') {
        await saveProviderOnboarding((current) => ({
          ...current,
          account: {
            ...current.account,
            name,
            email,
            password: '',
          },
          professionalProfile: {
            ...current.professionalProfile,
            businessName,
            displayName,
            specialization,
            baseRate: normalizeRateValue(baseRate),
            coverageArea,
            coverageAreaConfig,
            shortBio,
          },
        }));
      } else {
        await saveUserProfile({
          name,
          email,
          phoneNumber,
        });
      }

      navigation.goBack();
    }

    return (
      <View style={styles.actionsWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.secondaryButtonStyle}>
          <Text style={styles.secondaryButtonTextStyle}>{t('profile.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleSave(); }} style={styles.saveButtonStyle}>
          <Text style={styles.saveButtonTextStyle}>{t('profile.save')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderLocationCard() {
    if (normalizedRole !== 'user') {
      return null;
    }

    return (
      <View style={styles.locationCardStyle}>
        <Text style={styles.sectionTitleStyle}>{t('profile.locationTitle')}</Text>
        <View style={styles.locationPreviewWrapStyle}>
          <View style={styles.locationIconWrapStyle}>
            <MaterialIcons name="location-on" size={18} color={AinevoieDiscoveryTokens.accentDark} />
          </View>
          <View style={styles.locationTextWrapStyle}>
            <Text style={styles.locationValueTextStyle}>
              {location?.formattedAddress || t('profile.noPrimaryLocationSaved')}
            </Text>
            <Text style={styles.locationMetaTextStyle}>
              {location?.formattedAddress
                ? t('profile.locationDefaultHint')
                : t('profile.locationAddHint')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/user/location/locationScreen?context=profile')}
          style={styles.locationActionButtonStyle}
        >
          <MaterialIcons name="edit-location-alt" size={18} color={AinevoieDiscoveryTokens.brandDark} />
          <Text style={styles.locationActionButtonTextStyle}>{t('profile.updateLocation')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderBottomSheet() {
    return (
      <Modal
        animationType="slide"
        transparent
        visible={showBottomSheet}
        onRequestClose={() => updateState({ showBottomSheet: false })}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => updateState({ showBottomSheet: false })}
          style={styles.bottomSheetBackdropStyle}
        >
          <View style={styles.bottomSheetContainerStyle}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.bottomSheetWrapStyle}>
              <View style={styles.bottomSheetHandleStyle} />
              <Text style={styles.bottomSheetTitleStyle}>{t('profile.photoSheetTitle')}</Text>
              <Text style={styles.bottomSheetSubtitleStyle}>{t('profile.photoSheetSubtitle')}</Text>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  void handleAvatarPick('camera');
                }}
                style={styles.bottomSheetActionStyle}
              >
                <View style={styles.bottomSheetIconWrapStyle}>
                  <MaterialIcons name="photo-camera" size={20} color={AinevoieDiscoveryTokens.brandDark} />
                </View>
                <View style={styles.bottomSheetActionTextWrapStyle}>
                  <Text style={styles.bottomSheetActionLabelStyle}>{t('profile.photoCamera')}</Text>
                  <Text style={styles.bottomSheetActionHintStyle}>{t('profile.photoCameraHint')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  void handleAvatarPick('gallery');
                }}
                style={styles.bottomSheetActionStyle}
              >
                <View style={styles.bottomSheetIconWrapStyle}>
                  <MaterialIcons name="photo-library" size={20} color={AinevoieDiscoveryTokens.brandDark} />
                </View>
                <View style={styles.bottomSheetActionTextWrapStyle}>
                  <Text style={styles.bottomSheetActionLabelStyle}>{t('profile.photoGallery')}</Text>
                  <Text style={styles.bottomSheetActionHintStyle}>{t('profile.photoGalleryHint')}</Text>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      {renderHeader()}
      <ScrollView automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        <View style={styles.heroBandStyle} />
        <View style={styles.contentInsetStyle}>
          {renderProfileCard()}
          {renderFormCard()}
          {renderProviderBusinessCard()}
          {renderLocationCard()}
          {renderActions()}
        </View>
      </ScrollView>
      {renderBottomSheet()}
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
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  scrollContentStyle: {
    paddingBottom: 32,
  },
  heroBandStyle: {
    height: 150,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  contentInsetStyle: {
    marginTop: -96,
    paddingHorizontal: 24,
  },
  heroCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    shadowColor: '#141923',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroTopRowStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadgeStyle: {
    alignSelf: 'flex-start',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
  },
  identityRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  profilePhotoStyle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: AinevoieDiscoveryTokens.surfaceCard,
  },
  identityTextWrapStyle: {
    flex: 1,
    marginLeft: 16,
  },
  userNameStyle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    fontSize: 24,
    lineHeight: 28,
  },
  userEmailStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 4,
  },
  helperTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 8,
    lineHeight: 18,
  },
  changeInfoWrapStyle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AinevoieDiscoveryTokens.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 18,
  },
  changeLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textOnImage,
    fontWeight: '700',
    marginLeft: 8,
  },
  formCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 18,
  },
  locationCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 18,
  },
  sectionTitleStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginHorizontal: 4,
  },
  textFieldStyle: {
    backgroundColor: 'transparent',
    marginVertical: 6,
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
  fieldHelperTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: -2,
    marginBottom: 6,
    marginLeft: 6,
  },
  inlineFieldsRowStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inlineFieldStyle: {
    flex: 1,
  },
  inlineFieldGapStyle: {
    width: 12,
  },
  previewCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  previewCardTitleStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  previewCardTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginTop: 6,
    lineHeight: 21,
  },
  previewChipsWrapStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  previewChipStyle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    marginRight: 8,
    marginBottom: 8,
  },
  previewChipTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.brandDark,
    fontWeight: '700',
  },
  locationPreviewWrapStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  locationIconWrapStyle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  locationTextWrapStyle: {
    flex: 1,
    marginLeft: 12,
  },
  locationValueTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  locationMetaTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  locationActionButtonStyle: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
  },
  locationActionButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.brandDark,
    fontWeight: '700',
    marginLeft: 10,
  },
  actionsWrapStyle: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
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
  bottomSheetBackdropStyle: {
    flex: 1,
    backgroundColor: 'rgba(15,18,31,0.24)',
  },
  bottomSheetContainerStyle: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetWrapStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  bottomSheetHandleStyle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D7DCE8',
    marginBottom: 16,
  },
  bottomSheetTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    textAlign: 'center',
  },
  bottomSheetSubtitleStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  bottomSheetActionStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCFBF8',
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  bottomSheetIconWrapStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  bottomSheetActionTextWrapStyle: {
    flex: 1,
    marginLeft: 14,
  },
  bottomSheetActionLabelStyle: {
    ...AinevoieDiscoveryTypography.body,
    fontWeight: '700',
  },
  bottomSheetActionHintStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 4,
  },
});
