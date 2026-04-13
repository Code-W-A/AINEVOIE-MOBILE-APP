import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLocale } from "../../../../../context/localeContext";
import { useUserPrimaryLocation } from "../../../../../hooks/useUserPrimaryLocation";
import { useProviderDirectoryList } from "../../../../../hooks/useProviderDirectoryList";
import {
    AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
    AinevoieDiscoverySpacing as DiscoverySpacing,
    AinevoieDiscoveryRadius as DiscoveryRadius,
    AinevoieDiscoveryTypography as DiscoveryTypography,
    AinevoieDiscoveryTokens as DiscoveryTokens,
} from "../../../shared/styles/discoverySystem";
import { formatHourlyRate } from "../../../shared/utils/mockFormatting";
import { matchesCoverageHierarchy } from "../../../shared/utils/providerCoverage";
import { getProviderDirectoryRecord } from "../../../shared/utils/providerDirectory";
import {
    getServiceCategoryCatalog,
    getServiceCategoryLabel,
    resolveServiceCategory,
} from "../../../shared/utils/providerServices";

const DEFAULT_FILTERS = {
    categoryKey: 'all',
    locationMode: 'all',
    ratingLabel: 'Toate',
};

const sortOptions = [
    { key: 'jobs', label: 'Lucrări' },
    { key: 'price_desc', label: 'Tarif ↓' },
    { key: 'price_asc', label: 'Tarif ↑' },
    { key: 'rating', label: 'Rating' },
];

const locationOptions = [
    { key: 'all', label: 'Toate locațiile' },
    { key: 'my_location', label: 'Locația mea' },
];

const ratingOptions = [
    { label: 'Toate', minValue: 0 },
    { label: '4.0+', minValue: 4 },
    { label: '4.5+', minValue: 4.5 },
    { label: '5.0', minValue: 5 },
];

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function getRatingThreshold(ratingLabel) {
    return ratingOptions.find((option) => option.label === ratingLabel)?.minValue ?? 0;
}

function matchesPrimaryLocation(provider, location) {
    if (!location?.formattedAddress) {
        return false;
    }

    if (matchesCoverageHierarchy(provider, location)) {
        return true;
    }

    const normalizedAddress = normalizeText(location.formattedAddress);
    const normalizedCity = normalizeText(provider.cityName);
    const normalizedCounty = normalizeText(provider.countyName);

    return Boolean(
        normalizedCity
        && normalizedCounty
        && normalizedAddress.includes(normalizedCity)
        && normalizedAddress.includes(normalizedCounty)
    );
}

const ServiceProviderListScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { locale } = useLocale();
    const { location, isLoading: isLocationLoading } = useUserPrimaryLocation();
    const { providers: directoryProviders, isLoading: isDirectoryLoading } = useProviderDirectoryList();
    const initialCategoryKey = typeof params.categoryKey === 'string'
        ? params.categoryKey
        : typeof params.category === 'string' && params.category !== 'Toate'
            ? resolveServiceCategory(params.category, locale).key
            : DEFAULT_FILTERS.categoryKey;
    const [query, setQuery] = useState(typeof params.query === 'string' ? params.query : '');
    const [sortKey, setSortKey] = useState('jobs');
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState({
        ...DEFAULT_FILTERS,
        categoryKey: initialCategoryKey,
    });
    const [draftFilters, setDraftFilters] = useState({
        ...DEFAULT_FILTERS,
        categoryKey: initialCategoryKey,
    });

    useEffect(() => {
        if (typeof params.query === 'string') {
            setQuery(params.query);
        }

        if (typeof params.category === 'string' || typeof params.categoryKey === 'string') {
            const nextFilters = { ...DEFAULT_FILTERS, categoryKey: initialCategoryKey };
            setSelectedFilters(nextFilters);
            setDraftFilters(nextFilters);
        }

        if (params.openFilters === 'true') {
            setIsFilterSheetOpen(true);
        }
    }, [initialCategoryKey, params.category, params.categoryKey, params.openFilters, params.query]);

    const providerItems = useMemo(
        () => directoryProviders.map((provider) => {
            const providerDisplay = getProviderDirectoryRecord({
                providerId: provider.providerId,
                providerName: provider.displayName,
            });
            const serviceSummaries = Array.isArray(provider.serviceSummaries) ? provider.serviceSummaries : [];
            const serviceCategoryKeys = Array.from(new Set(serviceSummaries.map((service) => service.categoryKey).filter(Boolean)));
            const serviceCategoryLabels = Array.from(new Set(serviceSummaries.map((service) => (
                service.categoryLabel || getServiceCategoryLabel(service.categoryKey, locale, provider.categoryPrimary)
            )).filter(Boolean)));
            const primaryService = serviceSummaries[0] || null;
            const primaryCategoryKey = primaryService?.categoryKey || resolveServiceCategory(provider.categoryPrimary, locale).key;
            const primaryCategoryLabel = primaryService?.categoryLabel
                || getServiceCategoryLabel(primaryCategoryKey, locale, provider.categoryPrimary);

            return {
                id: provider.providerId,
                providerId: provider.providerId,
                image: providerDisplay.image,
                name: provider.displayName,
                category: primaryCategoryLabel,
                categoryPrimaryKey: primaryCategoryKey,
                categoryPrimaryLabel: primaryCategoryLabel,
                countryCode: provider.countryCode,
                countryName: provider.countryName,
                countyCode: provider.countyCode,
                countyName: provider.countyName,
                cityCode: provider.cityCode,
                cityName: provider.cityName,
                coverageAreaText: provider.coverageAreaText,
                coverageTags: provider.coverageTags,
                description: provider.description,
                availabilitySummary: provider.availabilitySummary,
                availabilityDayChips: provider.availabilityDayChips,
                hasConfiguredAvailability: provider.hasConfiguredAvailability,
                ratePerHour: provider.baseRateAmount,
                rating: provider.ratingAverage,
                jobCount: provider.jobCount,
                reviewCount: provider.reviewCount,
                keywords: provider.searchKeywordsNormalized,
                serviceSummaries,
                serviceCategoryKeys,
                serviceCategoryLabels,
            };
        }),
        [directoryProviders, locale],
    );

    const categoryCatalog = useMemo(
        () => getServiceCategoryCatalog(locale),
        [locale],
    );
    const categoryOptions = useMemo(
        () => ([
            { key: 'all', label: 'Toate' },
            ...categoryCatalog.filter((category) => (
                providerItems.some((provider) => provider.serviceCategoryKeys.includes(category.key))
            )),
        ]),
        [categoryCatalog, providerItems],
    );

    const filteredProviders = useMemo(() => {
        const normalizedQuery = normalizeText(query);
        const ratingThreshold = getRatingThreshold(selectedFilters.ratingLabel);

        return providerItems.filter((provider) => {
            const searchableText = normalizeText([
                provider.name,
                provider.category,
                provider.cityName,
                provider.countyName,
                provider.coverageAreaText,
                provider.description,
                ...provider.serviceCategoryLabels,
                ...provider.serviceSummaries.flatMap((service) => [service.name, service.description]),
                ...(provider.keywords || []),
            ].join(' '));

            const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);
            const matchesCategory = selectedFilters.categoryKey === 'all'
                ? true
                : provider.serviceCategoryKeys.includes(selectedFilters.categoryKey);
            const matchesRating = provider.rating >= ratingThreshold;
            const matchesLocation = selectedFilters.locationMode === 'my_location'
                ? Boolean(location) && matchesPrimaryLocation(provider, location)
                : true;

            return matchesQuery && matchesCategory && matchesRating && matchesLocation;
        });
    }, [location, providerItems, query, selectedFilters.categoryKey, selectedFilters.locationMode, selectedFilters.ratingLabel]);

    const sortedProviders = useMemo(() => {
        const nextProviders = [...filteredProviders];

        if (sortKey === 'price_desc') {
            nextProviders.sort((firstItem, secondItem) => secondItem.ratePerHour - firstItem.ratePerHour);
            return nextProviders;
        }

        if (sortKey === 'price_asc') {
            nextProviders.sort((firstItem, secondItem) => firstItem.ratePerHour - secondItem.ratePerHour);
            return nextProviders;
        }

        if (sortKey === 'rating') {
            nextProviders.sort((firstItem, secondItem) => secondItem.rating - firstItem.rating);
            return nextProviders;
        }

        nextProviders.sort((firstItem, secondItem) => secondItem.jobCount - firstItem.jobCount);
        return nextProviders;
    }, [filteredProviders, sortKey]);

    const hasActiveFilters = selectedFilters.categoryKey !== DEFAULT_FILTERS.categoryKey
        || selectedFilters.locationMode !== DEFAULT_FILTERS.locationMode
        || selectedFilters.ratingLabel !== DEFAULT_FILTERS.ratingLabel;

    const activeFilterChips = useMemo(() => {
        const nextChips = [];

        if (selectedFilters.categoryKey !== 'all') {
            nextChips.push({
                key: 'category',
                label: getServiceCategoryLabel(selectedFilters.categoryKey, locale, params.category),
                onClear: () => setSelectedFilters((currentFilters) => ({ ...currentFilters, categoryKey: 'all' })),
            });
        }

        if (selectedFilters.locationMode === 'my_location') {
            nextChips.push({
                key: 'location',
                label: 'Locația mea',
                onClear: () => setSelectedFilters((currentFilters) => ({ ...currentFilters, locationMode: 'all' })),
            });
        }

        if (selectedFilters.ratingLabel !== 'Toate') {
            nextChips.push({
                key: 'rating',
                label: selectedFilters.ratingLabel,
                onClear: () => setSelectedFilters((currentFilters) => ({ ...currentFilters, ratingLabel: 'Toate' })),
            });
        }

        return nextChips;
    }, [locale, params.category, selectedFilters.categoryKey, selectedFilters.locationMode, selectedFilters.ratingLabel]);

    const isLocationFilterActive = selectedFilters.locationMode === 'my_location';
    const showLoadingState = isDirectoryLoading || (isLocationFilterActive && isLocationLoading);
    const showMissingLocationState = isLocationFilterActive && !isLocationLoading && !location;

    function resetFilters() {
        setDraftFilters(DEFAULT_FILTERS);
        setSelectedFilters(DEFAULT_FILTERS);
    }

    function applyFilters() {
        setSelectedFilters(draftFilters);
        setIsFilterSheetOpen(false);
    }

    function openProvider(item) {
        router.push({
            pathname: '/user/serviceProvider/serviceProviderScreen',
            params: {
                providerId: item.providerId,
                item: JSON.stringify(item),
            },
        });
    }

    function renderProviderItem({ item }) {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openProvider(item)}
                style={styles.serviceProvidersWrapStyle}
            >
                <Image source={item.image} style={styles.providerImage} resizeMode="cover" />
                <View style={styles.providerContentWrap}>
                    <View style={styles.providerTopRow}>
                        <View style={styles.providerTitleWrap}>
                            <Text style={styles.providerName}>{item.name}</Text>
                            <Text style={styles.providerRole}>{item.categoryPrimaryLabel}</Text>
                        </View>
                        <View style={styles.providerActionWrap}>
                            <MaterialIcons name="arrow-forward" size={16} color={DiscoveryTokens.accent} />
                        </View>
                    </View>

                    <View style={styles.providerMetaRow}>
                        <View style={styles.providerRatingChip}>
                            <MaterialIcons name="star" size={14} color={DiscoveryTokens.rating} />
                            <Text style={styles.providerRatingText}>{item.rating.toFixed(1)}</Text>
                        </View>
                        <Text style={styles.providerJobsText}>{`${item.jobCount} lucrări`}</Text>
                    </View>

                    <View style={styles.providerFooterRow}>
                        <View style={styles.providerPriceChip}>
                            <Text style={styles.providerPriceChipText}>{formatHourlyRate(item.ratePerHour)}</Text>
                        </View>
                        <Text style={styles.providerLocationText}>{item.coverageAreaText}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    function renderQuickSorts() {
        return (
            <FlatList
                data={sortOptions}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => {
                    const isActive = sortKey === item.key;

                    return (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setSortKey(item.key)}
                            style={[styles.quickFilterChip, isActive ? styles.quickFilterChipActive : null]}
                        >
                            <Text style={[styles.quickFilterChipText, isActive ? styles.quickFilterChipTextActive : null]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickFiltersContent}
            />
        );
    }

    function renderActiveFilterRow() {
        if (!activeFilterChips.length) {
            return null;
        }

        return (
            <View style={styles.activeFiltersWrapStyle}>
                {activeFilterChips.map((chip) => (
                    <TouchableOpacity key={chip.key} activeOpacity={0.88} onPress={chip.onClear} style={styles.activeFilterChipStyle}>
                        <Text style={styles.activeFilterChipTextStyle}>{chip.label}</Text>
                        <MaterialIcons name="close" size={14} color={DiscoveryTokens.accentDark} />
                    </TouchableOpacity>
                ))}
            </View>
        );
    }

    function renderListHeader() {
        return (
            <View style={styles.providersListHeader}>
                <View style={styles.providersMetaWrap}>
                    <View style={styles.resultsCountChip}>
                        <Text style={styles.resultsCountChipText}>{`${sortedProviders.length} prestatori`}</Text>
                    </View>
                    {isLocationFilterActive && location ? (
                        <View style={[styles.resultsCountChip, styles.locationChipSpacingStyle]}>
                            <Text numberOfLines={1} style={styles.resultsLocationChipText}>{location.formattedAddress}</Text>
                        </View>
                    ) : null}
                </View>
                {renderActiveFilterRow()}
                {renderQuickSorts()}
            </View>
        );
    }

    function renderEmptyState() {
        if (showLoadingState) {
            return (
                <View style={styles.emptyStateWrapStyle}>
                    <ActivityIndicator size="small" color={DiscoveryTokens.accent} />
                    <Text style={styles.emptyStateTitleStyle}>
                        {isDirectoryLoading ? 'Se încarcă prestatorii' : 'Se încarcă locația'}
                    </Text>
                    <Text style={styles.emptyStateTextStyle}>
                        {isDirectoryLoading ? 'Pregătim rezultatele publice disponibile acum.' : 'Pregătim rezultatele din zona ta.'}
                    </Text>
                </View>
            );
        }

        if (showMissingLocationState) {
            return (
                <View style={styles.emptyStateWrapStyle}>
                    <Text style={styles.emptyStateTitleStyle}>Lipsește locația principală</Text>
                    <Text style={styles.emptyStateTextStyle}>
                        Pentru filtrarea în funcție de zonă, adaugă mai întâi locația principală a contului tău.
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push('/user/location/locationScreen?context=profile')}
                        style={styles.emptyStateButtonStyle}
                    >
                        <Text style={styles.emptyStateButtonTextStyle}>Adaugă locația</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.emptyStateWrapStyle}>
                <Text style={styles.emptyStateTitleStyle}>Nu am găsit rezultate</Text>
                <Text style={styles.emptyStateTextStyle}>
                    Încearcă altă categorie, elimină filtrele sau caută după un termen mai larg.
                </Text>
                {hasActiveFilters ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={resetFilters} style={styles.emptyStateButtonStyle}>
                        <Text style={styles.emptyStateButtonTextStyle}>Resetează filtrele</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    }

    function renderFilterChips(title, options, selectedValue, onSelectValue) {
        return (
            <View style={styles.drawerSectionWrap}>
                <Text style={styles.drawerSectionTitle}>{title}</Text>
                <View style={styles.sheetOptionsWrapStyle}>
                    {options.map((option) => {
                        const value = typeof option === 'string' ? option : option.label;
                        const isActive = selectedValue === value || selectedValue === option.key;

                        return (
                            <TouchableOpacity
                                key={value}
                                activeOpacity={0.9}
                                onPress={() => onSelectValue(typeof option === 'string' ? option : (option.key || option.label))}
                                style={[styles.sheetChipStyle, isActive ? styles.sheetChipActiveStyle : null]}
                            >
                                <Text style={[styles.sheetChipTextStyle, isActive ? styles.sheetChipTextActiveStyle : null]}>
                                    {typeof option === 'string' ? option : option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
            <View style={styles.backgroundOrbPrimary} />
            <View style={styles.backgroundOrbSecondary} />
            {header()}
            {searchAndFilterBar()}
            <View style={styles.contentWrapStyle}>
                {!showLoadingState && !showMissingLocationState && sortedProviders.length > 0 ? (
                    <FlatList
                        data={sortedProviders}
                        keyExtractor={(item) => item.id}
                        renderItem={renderProviderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.providersContent}
                        ListHeaderComponent={renderListHeader()}
                    />
                ) : (
                    <View style={styles.emptyStateContainerStyle}>
                        {renderListHeader()}
                        {renderEmptyState()}
                    </View>
                )}
            </View>
            {filterSheet()}
        </View>
    );

    function filterSheet() {
        return (
            <Modal
                animationType="slide"
                transparent
                visible={isFilterSheetOpen}
                onRequestClose={() => setIsFilterSheetOpen(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setIsFilterSheetOpen(false)}
                    style={styles.modalBackdrop}
                >
                    <View style={styles.modalBottomWrap}>
                        <TouchableOpacity activeOpacity={1} onPress={() => { }} style={styles.filterSheetStyle}>
                            <View style={styles.dragHandle} />
                            <View style={styles.drawerHeaderWrapStyle}>
                                <Text style={styles.drawerTitle}>Filtrează rezultatele</Text>
                                <Text onPress={resetFilters} style={styles.drawerResetText}>
                                    Resetează
                                </Text>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterSheetContent}>
                                {renderFilterChips('Categorie', categoryOptions, draftFilters.categoryKey, (value) => setDraftFilters((currentFilters) => ({ ...currentFilters, categoryKey: value })))}
                                {renderFilterChips('Locație', locationOptions, draftFilters.locationMode, (value) => setDraftFilters((currentFilters) => ({ ...currentFilters, locationMode: value })))}
                                <View style={styles.locationHelperWrapStyle}>
                                    <Text style={styles.locationHelperTitleStyle}>Locația principală</Text>
                                    <Text style={styles.locationHelperTextStyle}>
                                        {location ? location.formattedAddress : 'Nu există încă o locație principală salvată pentru acest cont.'}
                                    </Text>
                                    {!location ? (
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => {
                                                setIsFilterSheetOpen(false);
                                                router.push('/user/location/locationScreen?context=profile');
                                            }}
                                            style={styles.locationHelperButtonStyle}
                                        >
                                            <Text style={styles.locationHelperButtonTextStyle}>Setează locația</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                {renderFilterChips('Evaluări furnizori', ratingOptions, draftFilters.ratingLabel, (value) => setDraftFilters((currentFilters) => ({ ...currentFilters, ratingLabel: value })))}
                            </ScrollView>
                            <View style={styles.sheetActionsRow}>
                                <TouchableOpacity activeOpacity={0.9} onPress={() => setIsFilterSheetOpen(false)} style={styles.sheetSecondaryButton}>
                                    <Text style={styles.sheetSecondaryButtonText}>Închide</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={0.95} onPress={applyFilters} style={styles.sheetPrimaryButton}>
                                    <Text style={styles.sheetPrimaryButtonText}>Aplică</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    }

    function searchAndFilterBar() {
        return (
            <View style={styles.searchRowStyle}>
                <View style={styles.searchInputWrapStyle}>
                    <MaterialIcons name="search" size={20} color={DiscoveryTokens.textSecondary} style={styles.searchIconStyle} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Caută prestator sau categorie"
                        placeholderTextColor={DiscoveryTokens.textMuted}
                        selectionColor={DiscoveryTokens.accent}
                        style={styles.searchInputStyle}
                        cursorColor={DiscoveryTokens.accent}
                    />
                </View>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                        setDraftFilters(selectedFilters);
                        setIsFilterSheetOpen(true);
                    }}
                    style={[DiscoveryPrimitives.iconButton, styles.filterButtonStyle, hasActiveFilters ? styles.filterButtonActiveStyle : null]}
                >
                    <MaterialIcons name="filter-list" size={22} color={hasActiveFilters ? DiscoveryTokens.accent : DiscoveryTokens.textPrimary} />
                </TouchableOpacity>
            </View>
        );
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
                        <MaterialIcons name="arrow-back" size={22} color={DiscoveryTokens.textPrimary} />
                    </TouchableOpacity>
                </View>
               
                <Text style={styles.headerTitle}>Servicii</Text>
               
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
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: DiscoveryTokens.accentSoft,
        top: -84,
        right: -58,
    },
    backgroundOrbSecondary: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.72)',
        top: 186,
        left: -64,
    },
    headerWrapStyle: {
        ...DiscoveryPrimitives.headerSurface,
        paddingBottom: DiscoverySpacing.sm,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerEyebrow: {
        ...DiscoveryTypography.heroEyebrow,
        marginTop: DiscoverySpacing.md,
    },
    headerTitle: {
        ...DiscoveryTypography.heroTitle,
        marginTop: DiscoverySpacing.xs,
        maxWidth: '92%',
    },
    headerSubtitle: {
        ...DiscoveryTypography.heroBody,
        marginTop: DiscoverySpacing.sm,
        maxWidth: '92%',
    },
    searchRowStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: DiscoverySpacing.xl,
        paddingBottom: DiscoverySpacing.md,
    },
    searchInputWrapStyle: {
        ...DiscoveryPrimitives.searchSurface,
        flex: 1,
    },
    searchIconStyle: {
        marginRight: DiscoverySpacing.sm,
    },
    searchInputStyle: {
        ...Fonts.blackColor16Medium,
        color: DiscoveryTokens.textPrimary,
        flex: 1,
        padding: 0,
    },
    filterButtonStyle: {
        marginLeft: DiscoverySpacing.sm,
    },
    filterButtonActiveStyle: {
        borderColor: DiscoveryTokens.accent,
        backgroundColor: DiscoveryTokens.surfaceAccent,
    },
    contentWrapStyle: {
        flex: 1,
    },
    providersListHeader: {
        paddingTop: DiscoverySpacing.md,
    },
    providersMetaWrap: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingBottom: DiscoverySpacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    resultsCountChip: {
        ...DiscoveryPrimitives.quietChip,
    },
    resultsCountChipText: {
        ...DiscoveryTypography.chip,
        color: DiscoveryTokens.accentDark,
    },
    locationChipSpacingStyle: {
        marginLeft: DiscoverySpacing.sm,
        maxWidth: '72%',
    },
    resultsLocationChipText: {
        ...DiscoveryTypography.caption,
        color: DiscoveryTokens.textSecondary,
    },
    activeFiltersWrapStyle: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.xs,
    },
    activeFilterChipStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
        marginRight: DiscoverySpacing.sm,
        marginBottom: DiscoverySpacing.sm,
    },
    activeFilterChipTextStyle: {
        ...DiscoveryTypography.chip,
        marginRight: 6,
    },
    quickFiltersContent: {
        paddingLeft: DiscoverySpacing.xl,
        paddingRight: DiscoverySpacing.sm,
        paddingTop: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.sm,
    },
    quickFilterChip: {
        ...DiscoveryPrimitives.tabPill,
        minHeight: 38,
        paddingHorizontal: DiscoverySpacing.md + 2,
        marginRight: DiscoverySpacing.sm,
    },
    quickFilterChipActive: {
        ...DiscoveryPrimitives.tabPillActive,
    },
    quickFilterChipText: {
        ...Fonts.blackColor14Medium,
        color: DiscoveryTokens.textPrimary,
    },
    quickFilterChipTextActive: {
        ...Fonts.whiteColor14Bold,
    },
    providersContent: {
        paddingBottom: DiscoverySpacing.xxl,
    },
    serviceProvidersWrapStyle: {
        ...DiscoveryPrimitives.contentSurface,
        padding: DiscoverySpacing.sm,
        flexDirection: 'row',
        marginHorizontal: DiscoverySpacing.xl,
        marginBottom: DiscoverySpacing.sm + 2,
        borderRadius: DiscoveryRadius.xl,
    },
    providerImage: {
        height: 88,
        width: 86,
        borderRadius: DiscoveryRadius.lg,
    },
    providerContentWrap: {
        flex: 1,
        marginLeft: DiscoverySpacing.md,
        justifyContent: 'space-between',
    },
    providerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    providerTitleWrap: {
        flex: 1,
        marginRight: DiscoverySpacing.sm,
    },
    providerName: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.textPrimary,
    },
    providerRole: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    providerActionWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    providerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: DiscoverySpacing.sm,
    },
    providerRatingChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
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
    providerJobsText: {
        ...DiscoveryTypography.caption,
        marginLeft: DiscoverySpacing.md,
        flex: 1,
    },
    providerFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: DiscoverySpacing.sm + 2,
    },
    providerPriceChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    providerPriceChipText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accentDark,
    },
    providerLocationText: {
        ...DiscoveryTypography.caption,
        color: DiscoveryTokens.textSecondary,
        marginLeft: DiscoverySpacing.md,
        flex: 1,
    },
    emptyStateContainerStyle: {
        flex: 1,
        paddingBottom: DiscoverySpacing.xxl,
    },
    emptyStateWrapStyle: {
        ...DiscoveryPrimitives.emptyState,
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: DiscoverySpacing.lg,
    },
    emptyStateTitleStyle: {
        ...DiscoveryTypography.sectionTitle,
        textAlign: 'center',
    },
    emptyStateTextStyle: {
        ...DiscoveryTypography.bodyMuted,
        textAlign: 'center',
        marginTop: DiscoverySpacing.sm,
    },
    emptyStateButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
        marginTop: DiscoverySpacing.lg,
        paddingHorizontal: DiscoverySpacing.xl,
        minHeight: 50,
    },
    emptyStateButtonTextStyle: {
        ...Fonts.whiteColor16Bold,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: DiscoveryTokens.sheetBackdrop,
    },
    modalBottomWrap: {
        flex: 1,
        justifyContent: "flex-end",
    },
    filterSheetStyle: {
        ...DiscoveryPrimitives.sheetSurface,
        maxHeight: '88%',
    },
    dragHandle: {
        alignSelf: 'center',
        width: 56,
        height: 5,
        borderRadius: 3,
        backgroundColor: DiscoveryTokens.handle,
        marginTop: DiscoverySpacing.md,
        marginBottom: DiscoverySpacing.lg,
    },
    drawerHeaderWrapStyle: {
        flexDirection: 'row',
        marginBottom: DiscoverySpacing.lg,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: DiscoverySpacing.xl,
    },
    drawerTitle: {
        ...Fonts.blackColor20Bold,
        color: DiscoveryTokens.textPrimary,
    },
    drawerResetText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.accent,
    },
    filterSheetContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingBottom: DiscoverySpacing.xl,
    },
    drawerSectionWrap: {
        marginBottom: DiscoverySpacing.xl,
    },
    drawerSectionTitle: {
        ...Fonts.grayColor14Bold,
        color: DiscoveryTokens.textSecondary,
        marginBottom: DiscoverySpacing.md,
    },
    sheetOptionsWrapStyle: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    sheetChipStyle: {
        ...DiscoveryPrimitives.tabPill,
        minHeight: 40,
        marginRight: DiscoverySpacing.sm,
        marginBottom: DiscoverySpacing.sm,
    },
    sheetChipActiveStyle: {
        ...DiscoveryPrimitives.tabPillActive,
    },
    sheetChipTextStyle: {
        ...Fonts.blackColor14Medium,
        color: DiscoveryTokens.textPrimary,
    },
    sheetChipTextActiveStyle: {
        ...Fonts.whiteColor14Bold,
    },
    locationHelperWrapStyle: {
        ...DiscoveryPrimitives.contentSurface,
        padding: DiscoverySpacing.md,
        marginBottom: DiscoverySpacing.xl,
    },
    locationHelperTitleStyle: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
    },
    locationHelperTextStyle: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.sm,
    },
    locationHelperButtonStyle: {
        ...DiscoveryPrimitives.secondaryButton,
        marginTop: DiscoverySpacing.md,
        minHeight: 46,
        alignSelf: 'flex-start',
    },
    locationHelperButtonTextStyle: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
    },
    sheetActionsRow: {
        flexDirection: 'row',
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.xl,
        borderTopWidth: 1,
        borderTopColor: DiscoveryTokens.borderSubtle,
    },
    sheetSecondaryButton: {
        ...DiscoveryPrimitives.secondaryButton,
        flex: 1,
        marginRight: DiscoverySpacing.sm,
    },
    sheetSecondaryButtonText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
    },
    sheetPrimaryButton: {
        ...DiscoveryPrimitives.primaryButton,
        flex: 1,
        marginLeft: DiscoverySpacing.sm,
        minHeight: 52,
    },
    sheetPrimaryButtonText: {
        ...Fonts.whiteColor16Bold,
    },
});

export default ServiceProviderListScreen;
