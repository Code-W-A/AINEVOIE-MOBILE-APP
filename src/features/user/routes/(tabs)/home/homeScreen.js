import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, Text, Image, FlatList, TouchableOpacity, Modal, ScrollView, Dimensions, ActivityIndicator } from "react-native";
import { Fonts } from "../../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import MyStatusBar from "../../../../../../components/myStatusBar";
import { useProviderDirectoryList } from "../../../../../../hooks/useProviderDirectoryList";
import { useUserPrimaryLocation } from "../../../../../../hooks/useUserPrimaryLocation";
import { fetchLatestPublicReviews } from "../../../../../firebase/reviews";
import DiscoverySectionHeader from "../../../../shared/components/DiscoverySectionHeader";
import {
    AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
    AinevoieDiscoverySpacing as DiscoverySpacing,
    AinevoieDiscoveryRadius as DiscoveryRadius,
    AinevoieDiscoveryTypography as DiscoveryTypography,
    AinevoieDiscoveryTokens as DiscoveryTokens,
} from "../../../../shared/styles/discoverySystem";
import { formatHourlyRate } from "../../../../shared/utils/mockFormatting";
import { getServiceCategoryCatalog, resolveServiceCategory } from "../../../../shared/utils/providerServices";

const SERVICE_CATEGORY_ICON_MAP = {
    cleaning: require('../../../../../../assets/images/icon/white/001-household.png'),
    plumbing: require('../../../../../../assets/images/icon/white/002-plumber.png'),
    electrical: require('../../../../../../assets/images/icon/white/003-electrician.png'),
    painting: require('../../../../../../assets/images/icon/white/004-painter.png'),
    yoga: require('../../../../../../assets/images/icon/white/005-meditation.png'),
    beauty: require('../../../../../../assets/images/icon/white/006-makeup.png'),
};

const PROVIDER_IMAGE_FALLBACK = require('../../../../../../assets/images/provider-role/provider_7.jpg');
const USER_IMAGE_FALLBACK = require('../../../../../../assets/images/user/user_5.jpg');
const PROVIDER_CARD_WIDTH = Math.min(Math.round(Dimensions.get('window').width * 0.58), 220);

function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

function buildProviderRouteItem(provider) {
    const primaryService = provider.serviceSummaries?.[0] || null;

    return {
        id: provider.providerId,
        providerId: provider.providerId,
        name: provider.displayName,
        rating: provider.ratingAverage,
        jobCount: provider.jobCount,
        ratePerHour: provider.baseRateAmount,
        baseRateAmount: provider.baseRateAmount,
        baseRateCurrency: provider.baseRateCurrency,
        serviceType: primaryService?.categoryLabel || provider.categoryPrimary,
        description: provider.description,
        cityName: provider.cityName,
        coverageAreaText: provider.coverageAreaText,
        image: provider.avatarUrl ? { uri: provider.avatarUrl } : PROVIDER_IMAGE_FALLBACK,
    };
}

const HomeScreen = () => {
    const router = useRouter();
    const { providers, isLoading: isProvidersLoading } = useProviderDirectoryList();
    const { location, isLoading: isLocationLoading } = useUserPrimaryLocation();

    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [publicReviews, setPublicReviews] = useState([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(true);

    const currentCity = useMemo(() => (
        location?.cityName || location?.countyName || location?.countryName || 'România'
    ), [location]);

    const visibleProviders = useMemo(() => {
        const cityName = normalizeText(location?.cityName);

        if (!cityName) {
            return providers;
        }

        return providers.filter((provider) => normalizeText(provider.cityName) === cityName);
    }, [location?.cityName, providers]);

    const serviceCategories = useMemo(() => {
        const catalogByKey = new Map(getServiceCategoryCatalog().map((item) => [item.key, item]));
        const categoryMap = new Map();

        visibleProviders.forEach((provider) => {
            const services = provider.serviceSummaries?.length
                ? provider.serviceSummaries.filter((service) => service.isActive !== false)
                : [{ categoryKey: provider.categoryPrimary, categoryLabel: provider.categoryPrimary }];

            services.forEach((service) => {
                const category = resolveServiceCategory(service.categoryKey || service.categoryLabel || provider.categoryPrimary);
                const existingCategory = categoryMap.get(category.key);
                const catalogCategory = catalogByKey.get(category.key);

                categoryMap.set(category.key, {
                    id: category.key,
                    key: category.key,
                    serviceType: category.label,
                    icon: SERVICE_CATEGORY_ICON_MAP[category.key] || catalogCategory?.image || SERVICE_CATEGORY_ICON_MAP.cleaning,
                    providerCount: (existingCategory?.providerCount || 0) + 1,
                });
            });
        });

        return Array.from(categoryMap.values()).sort((firstItem, secondItem) => (
            secondItem.providerCount - firstItem.providerCount || firstItem.serviceType.localeCompare(secondItem.serviceType)
        ));
    }, [visibleProviders]);

    const featuredProviders = useMemo(() => (
        visibleProviders
            .slice()
            .sort((firstItem, secondItem) => (
                Number(secondItem.ratingAverage || 0) - Number(firstItem.ratingAverage || 0)
                || Number(secondItem.reviewCount || 0) - Number(firstItem.reviewCount || 0)
            ))
            .slice(0, 6)
    ), [visibleProviders]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            async function loadReviews() {
                setIsReviewsLoading(true);

                try {
                    const nextReviews = await fetchLatestPublicReviews(8);

                    if (isActive) {
                        setPublicReviews(nextReviews);
                    }
                } catch {
                    if (isActive) {
                        setPublicReviews([]);
                    }
                } finally {
                    if (isActive) {
                        setIsReviewsLoading(false);
                    }
                }
            }

            void loadReviews();

            return () => {
                isActive = false;
            };
        }, []),
    );

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
            <View style={styles.backgroundOrbPrimary} />
            <View style={styles.backgroundOrbSecondary} />
            <View style={styles.backgroundOrbTertiary} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {userImageAndLocationInfo()}
                {searchTextField()}
                {servicesInfo()}
                {providersInfo()}
                {title({ title: 'Recenzii clienți' })}
                {customerReviews()}
            </ScrollView>
            {chooseCity()}
        </View>
    );

    function chooseCity() {
        return (
            <Modal
                animationType="slide"
                transparent
                visible={showBottomSheet}
                onRequestClose={() => setShowBottomSheet(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setShowBottomSheet(false)}
                    style={styles.modalBackdrop}
                >
                    <View style={styles.modalBottomWrap}>
                        <TouchableOpacity activeOpacity={1} onPress={() => { }} style={styles.citySheet}>
                            <View style={styles.dragHandle} />
                            <Text style={styles.citySheetTitle}>Locația ta</Text>
                            <Text style={styles.citySheetSubtitle}>Recomandările folosesc locația salvată în profilul tău.</Text>
                            <View style={styles.cityInfoWrapStyle}>
                                <View style={styles.locationIconWrap}>
                                    <MaterialIcons name="location-on" size={18} color={DiscoveryTokens.accent} />
                                </View>
                                <Text numberOfLines={2} style={styles.cityText}>{location?.formattedAddress || currentCity}</Text>
                            </View>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => {
                                    setShowBottomSheet(false);
                                    router.push('/user/location/locationScreen');
                                }}
                                style={styles.locationManageButton}
                            >
                                <Text style={styles.locationManageButtonText}>Actualizează locația</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    }

    function customerReviews() {
        const renderItem = ({ item }) => (
            <View style={styles.customerReviewCard}>
                <View style={styles.reviewHeaderRow}>
                    <View style={DiscoveryPrimitives.quietChip}>
                        <Text style={DiscoveryTypography.chip}>{item.serviceName || item.providerRole || 'Serviciu'}</Text>
                    </View>
                    <View style={styles.reviewQuoteWrap}>
                        <MaterialIcons name="format-quote" size={18} color={DiscoveryTokens.accent} />
                    </View>
                </View>
                <Text numberOfLines={4} style={styles.reviewText}>
                    {item.review}
                </Text>
                <Text style={styles.customerNameText}>{item.authorName}</Text>
            </View>
        );

        if (isReviewsLoading) {
            return loadingState('Se încarcă recenziile...');
        }

        if (!publicReviews.length) {
            return emptyState('Nu există încă recenzii publice.', 'Recenziile vor apărea aici după finalizarea rezervărilor reale.');
        }

        return (
            <FlatList
                data={publicReviews}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewsContent}
            />
        );
    }

    function title({ title }) {
        return (
            <DiscoverySectionHeader
                title={title}
                variant="ainevoie"
                style={{ marginHorizontal: DiscoverySpacing.xl, marginTop: DiscoverySpacing.xl, marginBottom: DiscoverySpacing.md }}
            />
        );
    }

    function loadingState(label) {
        return (
            <View style={styles.emptyStateCard}>
                <ActivityIndicator size="small" color={DiscoveryTokens.accent} />
                <Text style={styles.emptyStateTitle}>{label}</Text>
            </View>
        );
    }

    function emptyState(titleText, bodyText) {
        return (
            <View style={styles.emptyStateCard}>
                <MaterialIcons name="inbox" size={22} color={DiscoveryTokens.accent} />
                <Text style={styles.emptyStateTitle}>{titleText}</Text>
                <Text style={styles.emptyStateBody}>{bodyText}</Text>
            </View>
        );
    }

    function servicesInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({
                    pathname: '/user/serviceProviderList/serviceProviderListScreen',
                    params: { category: item.serviceType, categoryKey: item.key },
                })}
                style={styles.serviceCard}
            >
                <View style={styles.serviceIconWrap}>
                    <Image source={item.icon} style={styles.serviceIcon} resizeMode="contain" />
                </View>
                <Text style={styles.serviceTitle}>{item.serviceType}</Text>
            </TouchableOpacity>
        );

        return (
            <View style={styles.servicesSection}>
                <DiscoverySectionHeader
                    title={`Servicii în ${currentCity}`}
                    actionLabel="Vezi tot"
                    onActionPress={() => router.push('/user/professionalServices/professionalServicesScreen')}
                    variant="ainevoie"
                    style={{ marginHorizontal: DiscoverySpacing.xl }}
                />
                <View style={styles.servicesInfoWrapStyle}>
                    {isProvidersLoading ? loadingState('Se încarcă serviciile...') : null}
                    {!isProvidersLoading && serviceCategories.length ? (
                        <FlatList
                            data={serviceCategories}
                            keyExtractor={(item) => `${item.id}`}
                            renderItem={renderItem}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingLeft: DiscoverySpacing.xl, paddingRight: DiscoverySpacing.sm }}
                        />
                    ) : null}
                    {!isProvidersLoading && !serviceCategories.length
                        ? emptyState('Nu există servicii disponibile.', 'Serviciile vor apărea aici după aprobarea prestatorilor în Firebase.')
                        : null}
                </View>
            </View>
        );
    }

    function providersInfo() {
        const renderItem = ({ item }) => {
            const routeItem = buildProviderRouteItem(item);

            return (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push({
                        pathname: '/user/serviceProvider/serviceProviderScreen',
                        params: { providerId: item.providerId, item: JSON.stringify(routeItem) },
                    })}
                    style={styles.providerCard}
                >
                    <Image source={routeItem.image} style={styles.providerCardImage} resizeMode="cover" />
                    <View style={styles.providerCardContent}>
                        <View style={styles.providerMetaRow}>
                            <View style={styles.providerRateChip}>
                                <Text style={styles.providerRateChipText}>{formatHourlyRate(item.baseRateAmount, item.baseRateCurrency, 'Tarif nespecificat')}</Text>
                            </View>
                            <View style={styles.providerRatingWrap}>
                                <MaterialIcons name="star" size={14} color={DiscoveryTokens.rating} />
                                <Text style={styles.providerRatingText}>{Number(item.ratingAverage || 0).toFixed(1)}</Text>
                            </View>
                        </View>
                        <Text numberOfLines={1} style={styles.providerCardName}>{item.displayName}</Text>
                        <Text numberOfLines={1} style={styles.providerCardRole}>{item.categoryPrimary || 'Serviciu'} în {item.cityName || currentCity}</Text>
                        <View style={styles.providerCardFooter}>
                            <Text style={styles.providerCardJobsText}>{`${Number(item.jobCount || 0)} lucrări finalizate`}</Text>
                            <View style={styles.providerCardActionIcon}>
                                <MaterialIcons name="arrow-forward" size={14} color={DiscoveryTokens.accent} />
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <View style={styles.providersSection}>
                <DiscoverySectionHeader
                    title={`Prestatori în ${currentCity}`}
                    actionLabel="Vezi tot"
                    onActionPress={() => router.push('/user/serviceProviderList/serviceProviderListScreen')}
                    variant="ainevoie"
                    style={{ marginHorizontal: DiscoverySpacing.xl }}
                />
                <View style={styles.providersInfoWrapStyle}>
                    {isProvidersLoading ? loadingState('Se încarcă prestatorii...') : null}
                    {!isProvidersLoading && featuredProviders.length ? (
                        <FlatList
                            data={featuredProviders}
                            keyExtractor={(item) => `${item.providerId}`}
                            renderItem={renderItem}
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.providersContent}
                        />
                    ) : null}
                    {!isProvidersLoading && !featuredProviders.length
                        ? emptyState('Nu există prestatori disponibili.', 'Prestatorii aprobați din Firebase vor apărea automat aici.')
                        : null}
                </View>
            </View>
        );
    }

    function searchTextField() {
        const hint = serviceCategories.length
            ? serviceCategories.slice(0, 3).map((item) => item.serviceType).join(', ')
            : 'Caută în serviciile disponibile';

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/user/search/searchScreen')}
                style={styles.searchTextFieldWrapStyle}
            >
                <View style={styles.searchLeadingIconWrap}>
                    <MaterialIcons
                        name="search"
                        size={20}
                        color={DiscoveryTokens.accent}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.searchLabel}>Caută un serviciu</Text>
                    <Text style={styles.searchHint}>{hint}</Text>
                </View>
                <View style={styles.searchArrowWrap}>
                    <MaterialIcons name="arrow-forward-ios" size={14} color={DiscoveryTokens.accent} />
                </View>
            </TouchableOpacity>
        );
    }

    function userImageAndLocationInfo() {
        return (
            <View style={styles.heroTopRow}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setShowBottomSheet(true)}
                    style={styles.locationWrap}
                >
                    <View style={styles.locationIconWrap}>
                        <MaterialIcons name="location-on" size={18} color={DiscoveryTokens.accent} />
                    </View>
                    <View style={{ marginLeft: DiscoverySpacing.md, flex: 1 }}>
                        <Text style={styles.locationLabel}>Locație</Text>
                        <Text numberOfLines={1} style={styles.locationValue}>
                            {isLocationLoading ? 'Se încarcă...' : currentCity}
                        </Text>
                    </View>
                    <View style={styles.locationChevronWrap}>
                        <MaterialIcons name="keyboard-arrow-down" size={20} color={DiscoveryTokens.textSecondary} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/user/(tabs)/profile/profileScreen')}
                    style={styles.profileButton}
                >
                    <Image source={USER_IMAGE_FALLBACK} style={styles.userImageStyle} />
                </TouchableOpacity>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    backgroundOrbPrimary: {
        position: 'absolute',
        width: 230,
        height: 230,
        borderRadius: 115,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        top: -72,
        right: -46,
    },
    backgroundOrbSecondary: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.56)',
        top: 138,
        left: -42,
    },
    backgroundOrbTertiary: {
        position: 'absolute',
        width: 124,
        height: 124,
        borderRadius: 62,
        backgroundColor: DiscoveryTokens.overlaySoft,
        bottom: 138,
        right: -18,
    },
    scrollContent: {
        paddingBottom: DiscoverySpacing.xxl * 1.4,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: DiscoverySpacing.sm,
        marginBottom: DiscoverySpacing.sm,
    },
    locationWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minHeight: 48,
        marginRight: DiscoverySpacing.md,
        paddingHorizontal: DiscoverySpacing.md,
        paddingVertical: DiscoverySpacing.xs,
        borderRadius: DiscoveryRadius.xl,
        backgroundColor: DiscoveryTokens.surfaceMuted,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    locationIconWrap: {
        ...DiscoveryPrimitives.iconBadge,
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    locationLabel: {
        ...Fonts.grayColor11Medium,
        color: DiscoveryTokens.textSecondary,
    },
    locationValue: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: 2,
    },
    locationChevronWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
    },
    profileButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
        shadowColor: '#141923',
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
    userImageStyle: {
        height: 42,
        width: 42,
        borderRadius: 21,
        borderColor: DiscoveryTokens.surfaceCard,
        borderWidth: 2.5,
    },
    heroEyebrow: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accentDark,
        letterSpacing: 0.4,
    },
    heroTitle: {
        ...Fonts.blackColor24Bold,
        color: DiscoveryTokens.textPrimary,
        maxWidth: '92%',
        marginTop: DiscoverySpacing.md,
        lineHeight: 32,
    },
    heroDescription: {
        ...DiscoveryTypography.bodyMuted,
        maxWidth: '92%',
        marginTop: DiscoverySpacing.sm,
    },
    searchTextFieldWrapStyle: {
        ...DiscoveryPrimitives.featureSurface,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: DiscoverySpacing.sm,
        paddingHorizontal: DiscoverySpacing.lg,
        paddingVertical: DiscoverySpacing.md,
    },
    searchLeadingIconWrap: {
        ...DiscoveryPrimitives.iconBadge,
        marginRight: DiscoverySpacing.md,
    },
    searchArrowWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    searchLabel: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.textPrimary,
    },
    searchHint: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    servicesSection: {
        marginTop: DiscoverySpacing.xl + DiscoverySpacing.xs,
    },
    servicesInfoWrapStyle: {
        marginTop: DiscoverySpacing.md,
    },
    serviceCard: {
        width: 94,
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginRight: DiscoverySpacing.md,
    },
    serviceIconWrap: {
        height: 72,
        width: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DiscoveryTokens.brandDark,
        shadowColor: 'rgba(18, 26, 38, 0.28)',
        shadowOpacity: 0.14,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
    serviceIcon: {
        height: 38,
        width: 38,
    },
    serviceTitle: {
        ...Fonts.grayColor12Medium,
        color: DiscoveryTokens.textSecondary,
        textAlign: 'center',
        marginTop: DiscoverySpacing.sm,
        lineHeight: 16,
        maxWidth: '100%',
    },
    providersSection: {
        marginTop: DiscoverySpacing.xl,
    },
    providersInfoWrapStyle: {
        marginTop: DiscoverySpacing.md,
    },
    providersContent: {
        paddingLeft: DiscoverySpacing.xl,
        paddingRight: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.xs,
    },
    providerCard: {
        ...DiscoveryPrimitives.featureSurface,
        width: PROVIDER_CARD_WIDTH,
        marginRight: DiscoverySpacing.md,
        overflow: 'hidden',
    },
    providerCardImage: {
        width: '100%',
        height: 132,
        borderTopLeftRadius: DiscoveryRadius.xl,
        borderTopRightRadius: DiscoveryRadius.xl,
    },
    providerCardContent: {
        padding: DiscoverySpacing.md,
    },
    providerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    providerRateChip: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    providerRateChipText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accentDark,
    },
    providerRatingWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceSubtle,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
    },
    providerRatingText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.textPrimary,
        marginLeft: 4,
    },
    providerCardName: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: DiscoverySpacing.md,
    },
    providerCardRole: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    providerCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: DiscoverySpacing.md,
    },
    providerCardJobsText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accent,
        flex: 1,
        marginRight: DiscoverySpacing.xs,
    },
    providerCardActionIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    reviewsContent: {
        paddingLeft: DiscoverySpacing.xl,
        paddingRight: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.sm,
    },
    customerReviewCard: {
        ...DiscoveryPrimitives.featureSurface,
        justifyContent: 'space-between',
        width: 276,
        minHeight: 184,
        padding: DiscoverySpacing.lg,
        marginRight: DiscoverySpacing.md,
    },
    reviewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reviewQuoteWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    reviewText: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.md,
        flex: 1,
        lineHeight: 22,
    },
    customerNameText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: DiscoverySpacing.md,
    },
    emptyStateCard: {
        ...DiscoveryPrimitives.featureSurface,
        alignItems: 'center',
        marginHorizontal: DiscoverySpacing.xl,
        padding: DiscoverySpacing.lg,
    },
    emptyStateTitle: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
        textAlign: 'center',
        marginTop: DiscoverySpacing.sm,
    },
    emptyStateBody: {
        ...DiscoveryTypography.caption,
        textAlign: 'center',
        marginTop: DiscoverySpacing.xs,
        lineHeight: 18,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: DiscoveryTokens.sheetBackdrop,
    },
    modalBottomWrap: {
        justifyContent: "flex-end",
        flex: 1,
    },
    citySheet: {
        ...DiscoveryPrimitives.sheetSurface,
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.xl,
    },
    dragHandle: {
        alignSelf: 'center',
        width: 56,
        height: 5,
        borderRadius: 3,
        backgroundColor: DiscoveryTokens.handle,
        marginBottom: DiscoverySpacing.lg,
    },
    citySheetTitle: {
        ...Fonts.blackColor20Bold,
        color: DiscoveryTokens.textPrimary,
        textAlign: 'center',
    },
    citySheetSubtitle: {
        ...DiscoveryTypography.bodyMuted,
        textAlign: 'center',
        marginTop: DiscoverySpacing.xs,
        marginBottom: DiscoverySpacing.xl,
    },
    selectCityRadioButtonStyle: {
        height: 18,
        width: 18,
        borderRadius: 9,
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderWidth: 1.5,
        borderColor: DiscoveryTokens.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeCityRadioButton: {
        borderColor: DiscoveryTokens.accent,
    },
    activeCityRadioButtonDot: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: DiscoveryTokens.accent,
    },
    cityInfoWrapStyle: {
        ...DiscoveryPrimitives.listItemRow,
        marginBottom: DiscoverySpacing.md,
    },
    cityInfoWrapStyleActive: {
        backgroundColor: DiscoveryTokens.surfaceMuted,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    cityText: {
        ...Fonts.blackColor16Medium,
        color: DiscoveryTokens.textPrimary,
        marginLeft: DiscoverySpacing.md,
        flex: 1,
    },
    cityActiveChip: {
        backgroundColor: DiscoveryTokens.surfaceAccent,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
    },
    cityActiveChipText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.accent,
    },
    locationManageButton: {
        minHeight: 50,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: DiscoverySpacing.lg,
    },
    locationManageButtonText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textOnImage,
    },
});

export default HomeScreen;
