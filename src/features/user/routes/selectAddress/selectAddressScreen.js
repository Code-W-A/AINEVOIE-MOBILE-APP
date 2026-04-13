import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity } from "react-native";
import { Colors, Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLocale } from "../../../../../context/localeContext";
import { useUserPrimaryLocation } from "../../../../../hooks/useUserPrimaryLocation";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryRadius, DiscoveryTypography } from "../../../shared/styles/discoverySystem";

const SelectAddressScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useLocale();
    const { location } = useUserPrimaryLocation();
    const addressList = useMemo(() => (
        location ? [
            {
                id: 'primary',
                isHome: true,
                address: location.formattedAddress,
            },
        ] : []
    ), [location]);

    const [selectedAddressId, setSelectedAddressId] = useState(addressList[0]?.id || null);
    const selectedAddressItem = addressList.find((item) => item.id === selectedAddressId) ?? addressList[0] ?? null;

    useEffect(() => {
        if (!addressList.length) {
            setSelectedAddressId(null);
            return;
        }

        setSelectedAddressId(addressList[0].id);
    }, [addressList]);

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.brandSecondaryColor} />
            <View style={{ flex: 1 }}>
                {header()}
                {addresses()}
            </View>
            {continueButton()}
        </View>
    );

    function continueButton() {
        return (
            <View style={styles.footerWrap}>
                <View style={styles.footerSummaryWrap}>
                    <Text style={styles.footerSummaryLabel}>{t('selectAddress.selectedAddress')}</Text>
                    <Text style={styles.footerSummaryText}>
                        {selectedAddressItem?.address || t('selectAddress.missingPrimaryLocation')}
                    </Text>
                </View>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                        if (selectedAddressItem) {
                            router.push({
                                pathname: '/user/serviceRequest/serviceRequestScreen',
                                params: {
                                    ...params,
                                    address: selectedAddressItem.address,
                                },
                            });
                            return;
                        }

                        router.push('/user/location/locationScreen?context=booking');
                    }}
                    style={styles.continueButtonStyle}
                >
                    <Text style={styles.continueButtonText}>
                        {selectedAddressItem ? t('selectAddress.continue') : t('selectAddress.addPrimaryLocation')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    function addAddressButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => router.push('/user/location/locationScreen?context=booking')}
                style={styles.addAddressButtonWrapStyle}
            >
                <View style={styles.addAddressIconWrap}>
                    <MaterialIcons name="add-location-alt" size={18} color={Colors.discoveryMutedColor} />
                </View>
                <View style={styles.addAddressTextWrap}>
                    <Text style={styles.addAddressText}>
                        {selectedAddressItem ? t('selectAddress.updatePrimaryLocation') : t('selectAddress.addPrimaryLocation')}
                    </Text>
                    <Text style={styles.addAddressSupportText}>{t('selectAddress.singleLocationHint')}</Text>
                </View>
            </TouchableOpacity>
        );
    }

    function emptyState() {
        return (
            <View style={styles.emptyStateWrapStyle}>
                <View style={styles.emptyStateIconWrapStyle}>
                    <MaterialIcons name="location-off" size={22} color={Colors.discoveryMutedColor} />
                </View>
                <Text style={styles.emptyStateTitleStyle}>{t('selectAddress.emptyTitle')}</Text>
                <Text style={styles.emptyStateTextStyle}>{t('selectAddress.emptyBody')}</Text>
            </View>
        );
    }

    function addresses() {
        const renderItem = ({ item }) => {
            const isSelected = selectedAddressId === item.id;

            return (
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => setSelectedAddressId(item.id)}
                    style={[
                        styles.addressWrapStyle,
                        isSelected ? styles.selectedAddressWrapStyle : null,
                    ]}
                >
                    <View style={[styles.addressIconWrapStyle, isSelected ? styles.selectedAddressIconWrapStyle : null]}>
                        <MaterialIcons
                            name={item.isHome ? "home" : "work"}
                            size={20}
                            color={isSelected ? Colors.discoveryAccentColor : Colors.discoveryMutedColor}
                        />
                    </View>
                    <View style={styles.addressContentWrap}>
                        <View style={styles.addressTopRow}>
                            <View style={[styles.addressTypePill, isSelected ? styles.selectedAddressTypePill : null]}>
                                <Text style={[styles.addressTypeText, isSelected ? styles.selectedAddressTypeText : null]}>
                                    {item.isHome ? t('selectAddress.primaryBadge') : t('selectAddress.addressBadge')}
                                </Text>
                            </View>
                            {isSelected ? (
                                <View style={styles.selectedIndicatorWrap}>
                                    <MaterialIcons name="check" size={14} color={Colors.whiteColor} />
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.addressText}>{item.address}</Text>
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <FlatList
                data={addressList}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.addressesContent}
                ListHeaderComponent={addressList.length ? null : emptyState}
                ListFooterComponent={addAddressButton}
            />
        );
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
                    <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
                </TouchableOpacity>
                <Text style={styles.headerEyebrow}>{t('selectAddress.headerEyebrow')}</Text>
                <Text style={styles.headerTitle}>{t('selectAddress.headerTitle')}</Text>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    headerWrapStyle: {
        ...DiscoveryPrimitives.headerSurface,
        backgroundColor: Colors.brandSecondaryColor,
        paddingBottom: DiscoverySpacing.lg,
    },
    headerEyebrow: {
        ...DiscoveryTypography.heroEyebrow,
        marginTop: DiscoverySpacing.md,
    },
    headerTitle: {
        ...DiscoveryTypography.heroTitle,
        marginTop: DiscoverySpacing.xs,
        fontSize: 26,
        lineHeight: 32,
        maxWidth: '86%',
    },
    addressesContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.lg,
        paddingBottom: DiscoverySpacing.xl,
    },
    addressWrapStyle: {
        ...DiscoveryPrimitives.contentSurface,
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: DiscoverySpacing.md,
        marginBottom: DiscoverySpacing.md,
        borderRadius: DiscoveryRadius.lg,
    },
    selectedAddressWrapStyle: {
        borderColor: Colors.discoveryAccentColor,
        backgroundColor: Colors.discoveryChipBackgroundColor,
    },
    addressIconWrapStyle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderWidth: 1,
        borderColor: Colors.discoveryBorderColor,
        marginTop: 2,
    },
    selectedAddressIconWrapStyle: {
        backgroundColor: Colors.whiteColor,
        borderColor: Colors.discoveryAccentColor,
    },
    addressContentWrap: {
        flex: 1,
        marginLeft: DiscoverySpacing.md,
    },
    addressTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: DiscoverySpacing.sm,
    },
    addressTypePill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderWidth: 1,
        borderColor: Colors.discoveryBorderColor,
    },
    selectedAddressTypePill: {
        backgroundColor: Colors.whiteColor,
        borderColor: Colors.discoveryAccentColor,
    },
    addressTypeText: {
        ...Fonts.grayColor12Bold,
        color: Colors.discoveryMutedColor,
    },
    selectedAddressTypeText: {
        color: Colors.discoveryAccentColor,
    },
    selectedIndicatorWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.discoveryAccentColor,
    },
    addressText: {
        ...DiscoveryTypography.body,
        color: Colors.brandSecondaryColor,
        lineHeight: 22,
        maxWidth: '96%',
    },
    emptyStateWrapStyle: {
        ...DiscoveryPrimitives.contentSurface,
        alignItems: 'center',
        paddingHorizontal: DiscoverySpacing.lg,
        paddingVertical: DiscoverySpacing.xl,
        marginBottom: DiscoverySpacing.md,
    },
    emptyStateIconWrapStyle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderWidth: 1,
        borderColor: Colors.discoveryBorderColor,
    },
    emptyStateTitleStyle: {
        ...Fonts.blackColor16Bold,
        color: Colors.brandSecondaryColor,
        marginTop: DiscoverySpacing.md,
    },
    emptyStateTextStyle: {
        ...DiscoveryTypography.bodyMuted,
        textAlign: 'center',
        marginTop: DiscoverySpacing.xs,
        lineHeight: 20,
    },
    addAddressButtonWrapStyle: {
        ...DiscoveryPrimitives.secondaryButton,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: DiscoverySpacing.lg,
        paddingHorizontal: DiscoverySpacing.md,
        minHeight: 60,
        backgroundColor: Colors.whiteColor,
    },
    addAddressIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderWidth: 1,
        borderColor: Colors.discoveryBorderColor,
    },
    addAddressTextWrap: {
        flex: 1,
        marginLeft: DiscoverySpacing.md,
    },
    addAddressText: {
        ...Fonts.blackColor14Bold,
        color: Colors.brandSecondaryColor,
    },
    addAddressSupportText: {
        ...DiscoveryTypography.caption,
        marginTop: 2,
    },
    footerWrap: {
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.xl,
        borderTopLeftRadius: DiscoveryRadius.lg,
        borderTopRightRadius: DiscoveryRadius.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.discoveryBorderColor,
    },
    footerSummaryWrap: {
        marginBottom: DiscoverySpacing.md,
    },
    footerSummaryLabel: {
        ...DiscoveryTypography.caption,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    footerSummaryText: {
        ...Fonts.blackColor16Bold,
        color: Colors.brandSecondaryColor,
        marginTop: 4,
        lineHeight: 22,
    },
    continueButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
    },
    continueButtonText: {
        ...Fonts.whiteColor16Bold,
    },
});

export default SelectAddressScreen;
