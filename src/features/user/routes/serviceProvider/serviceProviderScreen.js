import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Text, Image, Dimensions, TouchableOpacity, Platform } from "react-native";
import { Fonts } from "../../../../../constant/styles";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import CollapsibleToolbar from 'react-native-collapsible-toolbar';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLocale } from "../../../../../context/localeContext";
import { useProviderAvailability } from "../../../../../hooks/useProviderAvailability";
import { useProviderPublicProfile } from "../../../../../hooks/useProviderPublicProfile";
import { useProviderReviews } from "../../../../../hooks/useProviderReviews";
import DiscoverySectionHeader from "../../../shared/components/DiscoverySectionHeader";
import {
    AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
    AinevoieDiscoverySpacing as DiscoverySpacing,
    AinevoieDiscoveryRadius as DiscoveryRadius,
    AinevoieDiscoveryTypography as DiscoveryTypography,
    AinevoieDiscoveryTokens as DiscoveryTokens,
} from "../../../shared/styles/discoverySystem";
import {
    DEFAULT_MOCK_CURRENCY,
    formatDurationDisplay,
    formatHourlyRate,
    formatMoney,
} from "../../../shared/utils/mockFormatting";
import { getProviderDirectoryRecord } from "../../../shared/utils/providerDirectory";
import { getServiceCategoryLabel } from "../../../shared/utils/providerServices";

const { height } = Dimensions.get('window');

function toChipList(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildServiceMeta(service) {
    const parts = [];

    if (Number(service?.baseRateAmount) > 0) {
        parts.push(formatMoney(service.baseRateAmount, service.baseRateCurrency || DEFAULT_MOCK_CURRENCY));
    }

    if (service?.estimatedDurationMinutes) {
        const hours = Math.floor(service.estimatedDurationMinutes / 60);
        const minutes = service.estimatedDurationMinutes % 60;
        parts.push(formatDurationDisplay(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`));
    }

    return parts.filter(Boolean).join(' • ');
}

const ServiceProviderScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const { item, providerId } = useLocalSearchParams();
    const { locale, t } = useLocale();
    const resolvedProviderId = typeof providerId === 'string' ? providerId : '';
    const { provider, isLoading: isProviderLoading } = useProviderPublicProfile(resolvedProviderId);
    const { reviews } = useProviderReviews(resolvedProviderId);
    const {
        availabilitySummary,
        availabilityDayChips,
        hasConfiguredAvailability,
    } = useProviderAvailability(resolvedProviderId);

    const providerItem = useMemo(() => {
        try {
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    }, [item]);
    const providerDisplay = useMemo(
        () => getProviderDirectoryRecord({
            providerId: provider?.providerId || resolvedProviderId,
            providerName: provider?.displayName || providerItem?.name,
            avatarUrl: provider?.avatarUrl,
        }),
        [provider?.avatarUrl, provider?.displayName, provider?.providerId, providerItem?.name, resolvedProviderId]
    );
    const publicServices = useMemo(
        () => {
            const sourceServices = Array.isArray(provider?.serviceSummaries) ? provider.serviceSummaries : [];

            return sourceServices
                .filter((service) => service.status === 'active')
                .map((service) => ({
                    ...service,
                    categoryLabel: getServiceCategoryLabel(service.categoryKey, locale, service.categoryLabel),
                }));
        },
        [locale, provider?.serviceSummaries]
    );

    const [selectedServiceId, setSelectedServiceId] = useState(publicServices[0]?.serviceId || null);
    const selectedService = useMemo(
        () => publicServices.find((service) => service.serviceId === selectedServiceId) || publicServices[0] || null,
        [publicServices, selectedServiceId],
    );

    useEffect(() => {
        if (!publicServices.length) {
            setSelectedServiceId(null);
            return;
        }

        if (!selectedServiceId || !publicServices.some((service) => service.serviceId === selectedServiceId)) {
            setSelectedServiceId(publicServices[0].serviceId);
        }
    }, [publicServices, selectedServiceId]);

    const providerNameLabel = provider?.displayName || providerItem?.name || t('providerDetail.notFoundTitle');
    const providerRate = selectedService?.baseRateAmount ?? provider?.baseRateAmount ?? providerItem?.ratePerHour;
    const providerRating = provider?.ratingAverage ?? providerItem?.rating ?? 0;
    const providerReviewCount = provider?.reviewCount ?? 0;
    const providerJobCount = provider?.jobCount ?? providerItem?.jobCount ?? 0;
    const serviceTypeLabel = selectedService?.categoryLabel || provider?.categoryPrimary || providerItem?.category || 'Serviciu';
    const visibleReviews = useMemo(() => reviews.slice(0, 4), [reviews]);
    const providerDetailProfile = useMemo(() => {
        const fallbackCoverageTags = toChipList(
            provider?.coverageTags
            || providerItem?.coverageTags
            || provider?.coverageAreaText
            || providerItem?.coverageAreaText
            || provider?.cityName
            || providerItem?.cityName
        );
        const fallbackAvailabilityChips = toChipList(provider?.availabilityDayChips || providerItem?.availabilityDayChips);
        const fallbackAvailabilitySummary = provider?.availabilitySummary || providerItem?.availabilitySummary || t('providerDetail.availabilityFallback');
        const coverageArea = provider?.coverageAreaText
            || providerItem?.coverageAreaText
            || provider?.cityName
            || providerItem?.cityName
            || t('providerDetail.coverageFallback');
        const description = provider?.description || providerItem?.description || t('providerDetail.descriptionFallback');

        return {
            description,
            coverageArea,
            coverageTags: fallbackCoverageTags,
            availabilitySummary: hasConfiguredAvailability ? availabilitySummary : fallbackAvailabilitySummary,
            availabilityDayChips: hasConfiguredAvailability ? availabilityDayChips : fallbackAvailabilityChips,
        };
    }, [availabilityDayChips, availabilitySummary, hasConfiguredAvailability, provider, providerItem, t]);

    if (isProviderLoading) {
        return (
            <View style={styles.screen}>
                <MyStatusBar backgroundColor={DiscoveryTokens.brandDark} barStyle="light-content" />
                <View style={styles.emptyProfileStateWrap}>
                    <ActivityIndicator size="small" color={DiscoveryTokens.accent} />
                    <Text style={styles.emptyProfileStateTitle}>Se încarcă prestatorul...</Text>
                </View>
            </View>
        );
    }

    if (!resolvedProviderId || !provider) {
        return (
            <View style={styles.screen}>
                <MyStatusBar backgroundColor={DiscoveryTokens.brandDark} barStyle="light-content" />
                <View style={styles.headerWrapStyle}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={styles.headerActionButton}>
                        <MaterialIcons name="arrow-back" size={22} color={DiscoveryTokens.textPrimary} />
                    </TouchableOpacity>
                </View>
                <View style={styles.emptyProfileStateWrap}>
                    <MaterialIcons name="person-off" size={28} color={DiscoveryTokens.accent} />
                    <Text style={styles.emptyProfileStateTitle}>{t('providerDetail.notFoundTitle')}</Text>
                    <Text style={styles.emptyProfileStateText}>{t('providerDetail.notFoundBody')}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={DiscoveryTokens.brandDark} barStyle="light-content" />
            <View style={{ flex: 1 }}>
                <CollapsibleToolbar
                    bounces={false}
                    renderContent={() => (
                        <View style={styles.toolbarContentWrap}>
                            {userInfo()}
                            {availabilityInfo()}
                            {coverageInfo()}
                            {serviceIncludeInfo()}
                            {reviewsInfo()}
                            {viewAllReviewButton()}
                        </View>
                    )}
                    renderNavBar={() => header()}
                    renderToolBar={() => heroBanner()}
                    collapsedNavBarBackgroundColor="transparent"
                    toolBarHeight={height / 2.24}
                    showsVerticalScrollIndicator={false}
                />
            </View>
            {bookNowButton()}
        </View>
    );

    function heroBanner() {
        return (
            <View style={styles.heroBannerWrap}>
                <Image source={providerDisplay.image || providerItem?.image} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.heroOverlay} />
               
            </View>
        );
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={styles.headerActionButton}>
                    <MaterialIcons name="arrow-back" size={22} color={DiscoveryTokens.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerActionsWrap}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push({ pathname: '/user/message/messageScreen', params: { name: providerNameLabel } })}
                        style={[styles.headerActionButton, { marginRight: DiscoverySpacing.sm }]}
                    >
                        <MaterialCommunityIcons name="message-outline" size={20} color={DiscoveryTokens.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    function bookNowButton() {
        return (
            <View style={styles.bookNowBar}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={!hasConfiguredAvailability || !selectedService}
                    onPress={() => router.push({
                        pathname: '/user/selectDateAndTime/selectDateAndTimeScreen',
                        params: {
                            providerId: provider.providerId,
                            providerName: providerNameLabel,
                            providerRole: serviceTypeLabel,
                            serviceId: selectedService?.serviceId || '',
                            serviceName: selectedService?.name || serviceTypeLabel,
                            ratePerHour: String(providerRate ?? 0),
                            currency: selectedService?.baseRateCurrency || provider?.baseRateCurrency || DEFAULT_MOCK_CURRENCY,
                        },
                    })}
                    style={[styles.bookNowButtonStyle, (!hasConfiguredAvailability || !selectedService) ? styles.bookNowButtonDisabledStyle : null]}
                >
                    <Text style={styles.bookNowButtonText}>
                        {hasConfiguredAvailability && selectedService ? t('providerDetail.bookNow') : t('providerDetail.bookingUnavailable')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    function viewAllReviewButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({
                    pathname: '/user/allReviews/allReviewsScreen',
                    params: {
                        providerId: provider.providerId,
                        providerName: providerNameLabel,
                    },
                })}
                style={styles.viewAllReviewsButtonStyle}
            >
                <Text style={styles.viewAllReviewsButtonText}>{t('providerDetail.allReviews')}</Text>
            </TouchableOpacity>
        );
    }

    function availabilityInfo() {
        const availabilitySummary = providerDetailProfile.availabilitySummary || t('providerDetail.availabilityFallback');
        const chips = providerDetailProfile.availabilityDayChips || [];

        return (
            <View style={styles.sectionWrap}>
                <DiscoverySectionHeader title={t('providerDetail.availability')} variant="ainevoie" />
                <View style={styles.infoCardStyle}>
                    <View style={styles.infoHeaderRowStyle}>
                        <View style={styles.infoIconWrapStyle}>
                            <MaterialIcons name="schedule" size={18} color={DiscoveryTokens.accentDark} />
                        </View>
                        <Text style={styles.infoValueTextStyle}>{availabilitySummary}</Text>
                    </View>

                    {chips.length ? (
                        <View style={styles.chipsWrapStyle}>
                            {chips.map((chip) => (
                                <View key={chip} style={styles.infoChipStyle}>
                                    <Text style={styles.infoChipTextStyle}>{chip}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyInfoTextStyle}>{t('providerDetail.availabilityFallback')}</Text>
                    )}
                </View>
            </View>
        );
    }

    function coverageInfo() {
        const coverageChips = providerDetailProfile.coverageTags || [];

        return (
            <View style={styles.sectionWrap}>
                <DiscoverySectionHeader title={t('providerDetail.coverage')} variant="ainevoie" />
                <View style={styles.infoCardStyle}>
                    <View style={styles.infoHeaderRowStyle}>
                        <View style={styles.infoIconWrapStyle}>
                            <MaterialIcons name="place" size={18} color={DiscoveryTokens.accentDark} />
                        </View>
                        <Text style={styles.infoValueTextStyle}>{providerDetailProfile.coverageArea}</Text>
                    </View>

                    {coverageChips.length ? (
                        <View style={styles.chipsWrapStyle}>
                            {coverageChips.map((chip) => (
                                <View key={chip} style={styles.infoChipStyle}>
                                    <Text style={styles.infoChipTextStyle}>{chip}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.emptyInfoTextStyle}>{t('providerDetail.coverageFallback')}</Text>
                    )}
                </View>
            </View>
        );
    }

    function reviewsInfo() {
        return (
            <View style={styles.sectionWrap}>
                <DiscoverySectionHeader title={t('providerDetail.reviewSection')} variant="ainevoie" />
                <View style={{ marginTop: DiscoverySpacing.md }}>
                    {visibleReviews.length ? visibleReviews.map((reviewItem) => (
                        <View key={reviewItem.id} style={styles.reviewWrapStyle}>
                            <Image source={reviewItem.authorImage} style={styles.reviewAvatar} />
                            <View style={{ flex: 1, marginLeft: DiscoverySpacing.md }}>
                                <View style={styles.userNameAndRatingWrapStyle}>
                                    <Text style={styles.reviewName}>{reviewItem.authorName}</Text>
                                    {showRating({ number: reviewItem.rating })}
                                </View>
                                <Text style={styles.reviewText}>{reviewItem.review}</Text>
                            </View>
                        </View>
                    )) : (
                        <View style={styles.infoCardStyle}>
                            <Text style={styles.emptyInfoTextStyle}>{t('providerDetail.noReviewsYet')}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    function showRating({ number }) {
        return (
            <View style={styles.ratingStarsWrap}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcons
                        key={`${number}-${star}`}
                        name="star"
                        size={15}
                        color={star <= Math.floor(number) ? DiscoveryTokens.rating : '#D6DDEA'}
                    />
                ))}
            </View>
        );
    }

    function serviceIncludeInfo() {
        return (
            <View style={styles.sectionWrap}>
                <DiscoverySectionHeader title={t('providerDetail.activeServices')} variant="ainevoie" />
                <View style={{ marginTop: DiscoverySpacing.md }}>
                    {publicServices.length ? publicServices.map((service) => {
                        const isSelected = selectedService?.serviceId === service.serviceId;
                        const serviceMeta = buildServiceMeta(service);

                        return (
                            <TouchableOpacity
                                key={service.serviceId}
                                activeOpacity={0.92}
                                onPress={() => setSelectedServiceId(service.serviceId)}
                                style={[styles.activeServiceCardStyle, isSelected ? styles.activeServiceCardSelectedStyle : null]}
                            >
                                <View style={styles.activeServiceTopRowStyle}>
                                    <View style={styles.activeServiceTitleWrapStyle}>
                                        <Text style={styles.activeServiceTitleStyle}>{service.name}</Text>
                                        <Text style={styles.activeServiceCategoryStyle}>{service.categoryLabel}</Text>
                                    </View>
                                    {isSelected ? (
                                        <View style={styles.activeServiceSelectedBadgeStyle}>
                                            <Text style={styles.activeServiceSelectedBadgeTextStyle}>{t('selectDateTime.slotSelected')}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={styles.activeServiceDescriptionStyle}>
                                    {service.description || providerDetailProfile.description}
                                </Text>
                                {serviceMeta ? (
                                    <Text style={styles.activeServiceMetaStyle}>{serviceMeta}</Text>
                                ) : null}
                            </TouchableOpacity>
                        );
                    }) : (
                        <View style={styles.infoCardStyle}>
                            <Text style={styles.emptyInfoTextStyle}>{t('providerDetail.servicesFallback')}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    function userInfo() {
        return (
            <View style={styles.userInfoSection}>
                <View style={styles.userInfoCard}>
                    <View style={styles.serviceMetaTopRow}>
                        <View style={styles.serviceTypeChipWrap}>
                            <View style={DiscoveryPrimitives.chip}>
                                <Text style={DiscoveryTypography.chip}>{serviceTypeLabel}</Text>
                            </View>
                        </View>
                        <View style={styles.providerRatingSummary}>
                            <View style={styles.providerRatingSummaryTopRow}>
                                <Text style={styles.providerRatingValue}>{Number(providerRating || 0).toFixed(1)}</Text>
                                <MaterialIcons name="star" size={14} color={DiscoveryTokens.rating} style={styles.providerRatingIcon} />
                            </View>
                            <Text numberOfLines={1} style={styles.providerReviewCountText}>{`${providerReviewCount} recenzii`}</Text>
                        </View>
                    </View>

                    <Text style={styles.providerName}>{providerNameLabel}</Text>
                    <Text style={styles.providerRole}>{serviceTypeLabel}</Text>

                    <View style={styles.providerMetaRow}>
                        <View style={styles.providerMetaItem}>
                            <Text numberOfLines={1} style={styles.providerMetaLabel}>Lucrări</Text>
                            <Text numberOfLines={1} style={styles.providerMetaValue}>{providerJobCount}</Text>
                        </View>
                        <View style={styles.providerMetaDivider} />
                        <View style={[styles.providerMetaItem, styles.providerMetaItemRight]}>
                            <Text numberOfLines={1} style={[styles.providerMetaLabel, styles.providerMetaLabelRight]}>Tarif</Text>
                            <Text numberOfLines={1} style={[styles.providerMetaValue, styles.providerMetaValueAccent, styles.providerMetaValueRight]}>
                                {formatHourlyRate(providerRate, selectedService?.baseRateCurrency || provider?.baseRateCurrency, 'Tarif nespecificat')}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.providerDescriptionCard}>
                    <Text style={styles.providerDescriptionTitle}>Despre serviciu</Text>
                    <Text style={styles.providerDescription}>
                        {providerDetailProfile.description}
                    </Text>
                </View>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    toolbarContentWrap: {
        paddingBottom: DiscoverySpacing.xxl * 3,
    },
    heroBannerWrap: {
        height: height / 2.24,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: DiscoveryTokens.imageOverlay,
    },
    heroContentWrap: {
        position: 'absolute',
        left: DiscoverySpacing.xl,
        right: DiscoverySpacing.xl,
        bottom: DiscoverySpacing.xxl,
    },
    heroBadgeText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.accentDark,
    },
    heroServiceLabel: {
        ...DiscoveryTypography.heroTitleOnImage,
        marginTop: DiscoverySpacing.md,
        maxWidth: '86%',
    },
    heroSupportText: {
        ...DiscoveryTypography.heroBodyOnImage,
        marginTop: DiscoverySpacing.sm,
        maxWidth: '80%',
    },
    headerWrapStyle: {
        paddingHorizontal: DiscoverySpacing.lg,
        paddingVertical: DiscoverySpacing.sm,
        paddingTop: Platform.OS === 'ios' ? DiscoverySpacing.md : DiscoverySpacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
    },
    headerActionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.94)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.56)',
        shadowColor: DiscoveryTokens.brandDark,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    headerActionsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userInfoSection: {
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: -(DiscoverySpacing.xxl + DiscoverySpacing.xs),
    },
    userInfoCard: {
        ...DiscoveryPrimitives.elevatedSurface,
        paddingHorizontal: DiscoverySpacing.lg,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.md,
    },
    providerName: {
        ...Fonts.blackColor24Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: DiscoverySpacing.sm,
        lineHeight: 30,
    },
    providerRole: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    providerDescriptionTitle: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
        marginBottom: DiscoverySpacing.xs,
        letterSpacing: 0.3,
    },
    providerDescription: {
        ...DiscoveryTypography.bodyMuted,
        lineHeight: 21,
    },
    providerDescriptionCard: {
        ...DiscoveryPrimitives.contentSurface,
        marginTop: DiscoverySpacing.sm,
        paddingHorizontal: DiscoverySpacing.lg,
        paddingVertical: DiscoverySpacing.md,
    },
    serviceMetaTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    serviceTypeChipWrap: {
        flexShrink: 1,
        marginRight: DiscoverySpacing.md,
    },
    providerRatingSummary: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minHeight: 30,
    },
    providerRatingSummaryTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    providerRatingValue: {
        ...Fonts.blackColor18Bold,
        color: DiscoveryTokens.textPrimary,
    },
    providerRatingIcon: {
        marginLeft: 4,
    },
    providerReviewCountText: {
        ...Fonts.grayColor12Medium,
        color: DiscoveryTokens.textSecondary,
        marginTop: 2,
    },
    providerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: DiscoverySpacing.md,
        paddingTop: DiscoverySpacing.md,
        borderTopWidth: 1,
        borderTopColor: DiscoveryTokens.borderSubtle,
    },
    providerMetaItem: {
        flex: 1,
        minHeight: 42,
        justifyContent: 'center',
    },
    providerMetaItemRight: {
        alignItems: 'flex-end',
    },
    providerMetaDivider: {
        width: 1,
        height: 24,
        marginHorizontal: DiscoverySpacing.md,
        backgroundColor: DiscoveryTokens.borderSubtle,
    },
    providerMetaLabel: {
        ...DiscoveryTypography.caption,
        color: DiscoveryTokens.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.35,
    },
    providerMetaLabelRight: {
        textAlign: 'right',
    },
    providerMetaValue: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: 4,
    },
    providerMetaValueRight: {
        textAlign: 'right',
    },
    providerMetaValueAccent: {
        color: DiscoveryTokens.accent,
    },
    sectionWrap: {
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: DiscoverySpacing.lg,
    },
    infoCardStyle: {
        ...DiscoveryPrimitives.contentSurface,
        marginTop: DiscoverySpacing.md,
        paddingHorizontal: DiscoverySpacing.md,
        paddingVertical: DiscoverySpacing.md,
    },
    infoHeaderRowStyle: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIconWrapStyle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DiscoveryTokens.accentSoft,
        marginRight: DiscoverySpacing.md,
    },
    infoValueTextStyle: {
        ...DiscoveryTypography.body,
        color: DiscoveryTokens.textPrimary,
        flex: 1,
        lineHeight: 22,
    },
    chipsWrapStyle: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: DiscoverySpacing.md,
    },
    infoChipStyle: {
        ...DiscoveryPrimitives.chip,
        marginRight: DiscoverySpacing.xs,
        marginBottom: DiscoverySpacing.xs,
    },
    infoChipTextStyle: {
        ...DiscoveryTypography.chip,
    },
    emptyInfoTextStyle: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.md,
    },
    activeServiceCardStyle: {
        ...DiscoveryPrimitives.contentSurface,
        paddingHorizontal: DiscoverySpacing.md,
        paddingVertical: DiscoverySpacing.md,
        marginBottom: DiscoverySpacing.md,
    },
    activeServiceCardSelectedStyle: {
        borderColor: DiscoveryTokens.borderAccentSoft,
        backgroundColor: DiscoveryTokens.surfaceMuted,
    },
    activeServiceTopRowStyle: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    activeServiceTitleWrapStyle: {
        flex: 1,
        marginRight: DiscoverySpacing.sm,
    },
    activeServiceTitleStyle: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.textPrimary,
    },
    activeServiceCategoryStyle: {
        ...DiscoveryTypography.caption,
        color: DiscoveryTokens.accentDark,
        marginTop: 4,
        fontWeight: '700',
    },
    activeServiceSelectedBadgeStyle: {
        ...DiscoveryPrimitives.chip,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    activeServiceSelectedBadgeTextStyle: {
        ...DiscoveryTypography.chip,
        color: DiscoveryTokens.accentDark,
    },
    activeServiceDescriptionStyle: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.sm,
        lineHeight: 21,
    },
    activeServiceMetaStyle: {
        ...DiscoveryTypography.caption,
        color: DiscoveryTokens.textSecondary,
        marginTop: DiscoverySpacing.sm,
    },
    serviceIncludeCard: {
        ...DiscoveryPrimitives.contentSurface,
        padding: DiscoverySpacing.md,
        marginBottom: DiscoverySpacing.md,
    },
    serviceIncludeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    serviceIncludeRowReverse: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    serviceIncludeImage: {
        height: 108,
        width: 108,
        borderRadius: DiscoveryRadius.md,
    },
    serviceIncludeContent: {
        flex: 1,
        marginHorizontal: DiscoverySpacing.md,
    },
    serviceIncludeTitle: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.textPrimary,
    },
    serviceIncludeDescription: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: 4,
    },
    reviewWrapStyle: {
        ...DiscoveryPrimitives.contentSurface,
        flexDirection: 'row',
        padding: DiscoverySpacing.md,
        marginBottom: DiscoverySpacing.md,
    },
    reviewAvatar: {
        height: 56,
        width: 56,
        borderRadius: 28,
    },
    userNameAndRatingWrapStyle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: DiscoverySpacing.xs,
    },
    reviewName: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
    },
    reviewText: {
        ...DiscoveryTypography.bodyMuted,
    },
    ratingStarsWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewAllReviewsButtonStyle: {
        ...DiscoveryPrimitives.secondaryButton,
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: DiscoverySpacing.xs,
    },
    viewAllReviewsButtonText: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.accent,
    },
    snackBarStyle: {
        backgroundColor: DiscoveryTokens.snackBackground,
        position: 'absolute',
        bottom: 94,
        left: 16,
        right: 16,
        borderRadius: DiscoveryRadius.md,
    },
    snackBarText: {
        ...Fonts.whiteColor14Medium,
    },
    bookNowBar: {
        backgroundColor: DiscoveryTokens.surfaceCard,
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.lg,
        borderTopLeftRadius: DiscoveryRadius.lg,
        borderTopRightRadius: DiscoveryRadius.lg,
        borderTopWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
        shadowColor: DiscoveryTokens.brandDark,
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
    },
    bookNowButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
        minHeight: 54,
    },
    bookNowButtonDisabledStyle: {
        opacity: 0.55,
    },
    bookNowButtonText: {
        ...Fonts.whiteColor16Bold,
        letterSpacing: 0.2,
    },
});

export default ServiceProviderScreen;
