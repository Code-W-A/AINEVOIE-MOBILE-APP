import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { deriveRomaniaHierarchyFromPlacemark } from '@ainevoie/firebase-shared';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import { useSession } from '../../../../context/sessionContext';
import { useUserPrimaryLocation } from '../../../../hooks/useUserPrimaryLocation';
import { USER_HOME_ROUTE } from '../../../../utils/roleRoutes';
import { formatLocationAddress } from '../../../../utils/locationUtils';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

function getFlowCopy(t) {
  return {
    signup: {
      eyebrow: t('location.signupEyebrow'),
      title: t('location.signupTitle'),
      actionLabel: t('location.signupAction'),
    },
    profile: {
      eyebrow: t('location.profileEyebrow'),
      title: t('location.profileTitle'),
      subtitle: t('location.profileSubtitle'),
      actionLabel: t('location.profileAction'),
    },
    booking: {
      eyebrow: t('location.bookingEyebrow'),
      title: t('location.bookingTitle'),
      subtitle: t('location.bookingSubtitle'),
      actionLabel: t('location.bookingAction'),
    },
  };
}

function normalizeFlow(flow) {
  if (flow === 'signup' || flow === 'booking') {
    return flow;
  }

  return 'profile';
}

export default function SharedUserLocationScreen({ flow = 'profile' }) {
  const normalizedFlow = normalizeFlow(flow);
  const { t } = useLocale();
  const router = useRouter();
  const navigation = useNavigation();
  const { refreshBootstrap } = useSession();
  const { location, saveLocation, isLoading } = useUserPrimaryLocation();
  const [manualAddress, setManualAddress] = useState('');
  const [pendingLocation, setPendingLocation] = useState(null);
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] = useState(false);
  const [isResolvingManualLocation, setIsResolvingManualLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const copy = getFlowCopy(t)[normalizedFlow];
  const effectiveLocation = pendingLocation || location;

  useEffect(() => {
    if (!location) {
      return;
    }

    setPendingLocation((currentLocation) => currentLocation || location);
    setManualAddress((currentValue) => currentValue || location.formattedAddress);
  }, [location]);

  const helperLabel = useMemo(() => {
    if (!effectiveLocation) {
      return t('location.noLocationConfirmed');
    }

    return effectiveLocation.source === 'gps'
      ? t('location.confirmedGps')
      : t('location.confirmedManual');
  }, [effectiveLocation, t]);

  function handleBack() {
    if (normalizedFlow === 'signup') {
      router.back();
      return;
    }

    navigation.goBack();
  }

  async function handleUseCurrentLocation() {
    setIsResolvingCurrentLocation(true);

    try {
      console.log('[UserLocationScreen][current] request-start', {
        flow: normalizedFlow,
      });
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        console.warn('[UserLocationScreen][current] permission-denied', {
          flow: normalizedFlow,
          status: permission.status,
        });
        Alert.alert(t('location.permissionTitle'), t('location.permissionBody'));
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [placemark] = await Location.reverseGeocodeAsync(currentLocation.coords);
      const formattedAddress = formatLocationAddress(placemark);

      if (!formattedAddress) {
        console.warn('[UserLocationScreen][current] missing-formatted-address', {
          flow: normalizedFlow,
        });
        Alert.alert(t('location.unavailableTitle'), t('location.unavailableCurrentBody'));
        return;
      }

      const nextLocation = {
        formattedAddress,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        ...deriveRomaniaHierarchyFromPlacemark({
          countryName: placemark?.country,
          region: placemark?.region,
          subregion: placemark?.subregion,
          city: placemark?.city,
          district: placemark?.district,
          formattedAddress,
        }),
        source: 'gps',
        updatedAt: new Date().toISOString(),
      };

      setManualAddress(formattedAddress);
      setPendingLocation(nextLocation);
      console.log('[UserLocationScreen][current] resolved', {
        flow: normalizedFlow,
        source: nextLocation.source,
        hasAddress: Boolean(nextLocation.formattedAddress),
        latitude: Number(nextLocation.latitude.toFixed(4)),
        longitude: Number(nextLocation.longitude.toFixed(4)),
      });
    } catch (error) {
      console.error('[UserLocationScreen][current] failed', {
        flow: normalizedFlow,
        code: error?.code || null,
        name: error?.name || null,
        message: error?.message || 'Unknown current location error',
      });
      Alert.alert(t('location.unavailableTitle'), t('location.unavailableDeviceBody'));
    } finally {
      setIsResolvingCurrentLocation(false);
    }
  }

  async function handleResolveManualAddress() {
    if (!manualAddress.trim()) {
      Alert.alert(t('location.addressRequiredTitle'), t('location.addressRequiredBody'));
      return;
    }

    setIsResolvingManualLocation(true);

    try {
      console.log('[UserLocationScreen][manual] resolve-start', {
        flow: normalizedFlow,
        addressLength: manualAddress.trim().length,
      });
      const geocodedResults = await Location.geocodeAsync(manualAddress.trim());
      const resolvedCandidate = geocodedResults[0];

      if (!resolvedCandidate) {
        console.warn('[UserLocationScreen][manual] no-geocode-result', {
          flow: normalizedFlow,
          addressLength: manualAddress.trim().length,
        });
        Alert.alert(t('location.addressInvalidTitle'), t('location.addressInvalidBody'));
        return;
      }

      const [placemark] = await Location.reverseGeocodeAsync({
        latitude: resolvedCandidate.latitude,
        longitude: resolvedCandidate.longitude,
      });

      const formattedAddress = formatLocationAddress(placemark) || manualAddress.trim();

      setPendingLocation({
        formattedAddress,
        latitude: resolvedCandidate.latitude,
        longitude: resolvedCandidate.longitude,
        ...deriveRomaniaHierarchyFromPlacemark({
          countryName: placemark?.country,
          region: placemark?.region,
          subregion: placemark?.subregion,
          city: placemark?.city,
          district: placemark?.district,
          formattedAddress,
        }),
        source: 'manual',
        updatedAt: new Date().toISOString(),
      });
      setManualAddress(formattedAddress);
      console.log('[UserLocationScreen][manual] resolved', {
        flow: normalizedFlow,
        hasAddress: Boolean(formattedAddress),
        latitude: Number(resolvedCandidate.latitude.toFixed(4)),
        longitude: Number(resolvedCandidate.longitude.toFixed(4)),
      });
    } catch (error) {
      console.error('[UserLocationScreen][manual] failed', {
        flow: normalizedFlow,
        code: error?.code || null,
        name: error?.name || null,
        message: error?.message || 'Unknown manual geocode error',
      });
      Alert.alert(t('location.addressUnavailableTitle'), t('location.addressUnavailableBody'));
    } finally {
      setIsResolvingManualLocation(false);
    }
  }

  async function handleSaveLocation() {
    if (!effectiveLocation) {
      Alert.alert(t('location.locationRequiredTitle'), t('location.locationRequiredBody'));
      return;
    }

    setIsSaving(true);

    try {
      console.log('[UserLocationScreen][save] start', {
        flow: normalizedFlow,
        source: effectiveLocation.source,
        hasAddress: Boolean(effectiveLocation.formattedAddress),
        latitude: Number(Number(effectiveLocation.latitude).toFixed(4)),
        longitude: Number(Number(effectiveLocation.longitude).toFixed(4)),
      });
      await saveLocation(effectiveLocation);

      if (normalizedFlow === 'signup') {
        console.log('[UserLocationScreen][save] refresh-bootstrap', {
          flow: normalizedFlow,
        });
        await refreshBootstrap();
        router.replace(USER_HOME_ROUTE);
        return;
      }

      if (normalizedFlow === 'booking') {
        router.replace('/user/selectAddress/selectAddressScreen');
        return;
      }

      navigation.goBack();
    } catch (error) {
      console.error('[UserLocationScreen][save] failed', {
        flow: normalizedFlow,
        source: effectiveLocation.source,
        hasAddress: Boolean(effectiveLocation.formattedAddress),
        code: error?.code || null,
        name: error?.name || null,
        message: error?.message || 'Unknown save location error',
      });
      Alert.alert(t('location.unavailableTitle'), t('location.saveFailedBody'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={AinevoieDiscoveryTokens.appBackground} barStyle="dark-content" />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.headerWrapStyle}>
        <Pressable onPress={handleBack} style={({ pressed }) => [styles.backButtonStyle, pressed ? styles.backButtonPressedStyle : null]}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.brandDark} />
        </Pressable>
        <View style={styles.headerTextWrapStyle}>
          <Text style={styles.headerEyebrowStyle}>{copy.eyebrow}</Text>
          <Text style={styles.headerTitleStyle}>{copy.title}</Text>
          <Text style={styles.headerSubtitleStyle}>{copy.subtitle}</Text>
        </View>
      </View>

      <ScrollView
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentStyle}
      >
        <View style={styles.contentInsetStyle}>
          <View style={styles.currentLocationCardStyle}>
            <Text style={styles.sectionTitleStyle}>{t('location.primaryTitle')}</Text>
            {isLoading ? (
              <View style={styles.loadingWrapStyle}>
                <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.accent} />
              </View>
            ) : (
              <>
                <View style={styles.locationPreviewSurfaceStyle}>
                  <View style={styles.locationPreviewIconStyle}>
                    <MaterialIcons name="location-on" size={20} color={AinevoieDiscoveryTokens.accentDark} />
                  </View>
                  <View style={styles.locationPreviewTextWrapStyle}>
                    <Text style={styles.locationPreviewValueStyle}>
                      {effectiveLocation?.formattedAddress || t('location.currentLocationMissing')}
                    </Text>
                    <Text style={styles.locationPreviewMetaStyle}>{helperLabel}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    void handleUseCurrentLocation();
                  }}
                  style={styles.primaryLocationActionStyle}
                >
                  {isResolvingCurrentLocation ? (
                    <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.textOnImage} />
                  ) : (
                    <MaterialIcons name="my-location" size={18} color={AinevoieDiscoveryTokens.textOnImage} />
                  )}
                  <Text style={styles.primaryLocationActionTextStyle}>{t('location.useCurrentLocation')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.manualCardStyle}>
            <Text style={styles.sectionTitleStyle}>{t('location.manualTitle')}</Text>
            <Text style={styles.sectionSupportStyle}>{t('location.manualSubtitle')}</Text>
            <TextInput
              label={t('location.addressLabel')}
              mode="outlined"
              value={manualAddress}
              onChangeText={setManualAddress}
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
              multiline
            />

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                void handleResolveManualAddress();
              }}
              style={styles.secondaryActionStyle}
            >
              {isResolvingManualLocation ? (
                <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.brandDark} />
              ) : (
                <MaterialIcons name="search" size={18} color={AinevoieDiscoveryTokens.brandDark} />
              )}
              <Text style={styles.secondaryActionTextStyle}>{t('location.verifyAddress')}</Text>
            </TouchableOpacity>
          </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                void handleSaveLocation();
              }}
              disabled={isSaving}
              style={styles.saveButtonStyle}
            >
            {isSaving ? (
              <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.textOnImage} />
            ) : (
              <Text style={styles.saveButtonTextStyle}>{copy.actionLabel}</Text>
            )}
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
  backgroundOrbPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    top: -70,
    right: -64,
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: AinevoieDiscoveryTokens.surfaceSoft,
    left: -50,
    top: 220,
  },
  headerWrapStyle: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButtonStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  backButtonPressedStyle: {
    opacity: 0.9,
  },
  headerTextWrapStyle: {
    flex: 1,
    marginLeft: 14,
  },
  headerEyebrowStyle: {
    ...AinevoieDiscoveryTypography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  headerTitleStyle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    marginTop: 4,
  },
  headerSubtitleStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
    lineHeight: 21,
    maxWidth: '94%',
  },
  scrollContentStyle: {
    paddingBottom: 32,
  },
  contentInsetStyle: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  currentLocationCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#141923',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
  },
  sectionSupportStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 6,
  },
  loadingWrapStyle: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPreviewSurfaceStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  locationPreviewIconStyle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  locationPreviewTextWrapStyle: {
    flex: 1,
    marginLeft: 12,
  },
  locationPreviewValueStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  locationPreviewMetaStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 4,
    lineHeight: 18,
  },
  primaryLocationActionStyle: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 18,
  },
  primaryLocationActionTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textOnImage,
    fontWeight: '700',
    marginLeft: 10,
  },
  manualCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 18,
  },
  textFieldStyle: {
    marginTop: 16,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
  },
  textFieldContentStyle: {
    paddingVertical: 12,
  },
  secondaryActionStyle: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 14,
    paddingHorizontal: 18,
  },
  secondaryActionTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.brandDark,
    fontWeight: '700',
    marginLeft: 10,
  },
  saveButtonStyle: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 8,
    shadowColor: AinevoieDiscoveryTokens.accentShadow,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  saveButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textOnImage,
    fontWeight: '700',
  },
});
