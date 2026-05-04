import React, { useMemo, useState } from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useNavigation, useRouter } from "expo-router";
import { useProviderDirectoryList } from "../../../../../hooks/useProviderDirectoryList";
import DiscoverySectionHeader from "../../../shared/components/DiscoverySectionHeader";
import {
    AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
    AinevoieDiscoverySpacing as DiscoverySpacing,
    AinevoieDiscoveryTypography as DiscoveryTypography,
    AinevoieDiscoveryTokens as DiscoveryTokens,
} from "../../../shared/styles/discoverySystem";
import { resolveServiceCategory } from "../../../shared/utils/providerServices";

const SearchScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const { providers, isLoading } = useProviderDirectoryList();
    const [search, setSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const suggestedSearches = useMemo(() => {
        const suggestionsMap = new Map();

        providers.forEach((provider) => {
            const services = provider.serviceSummaries?.length
                ? provider.serviceSummaries.filter((service) => service.isActive !== false)
                : [{ categoryKey: provider.categoryPrimary, categoryLabel: provider.categoryPrimary }];

            services.forEach((service) => {
                const category = resolveServiceCategory(service.categoryKey || service.categoryLabel || provider.categoryPrimary);
                const label = service.name || category.label;
                const key = String(label || category.key).trim().toLowerCase();

                if (!key) {
                    return;
                }

                const existingItem = suggestionsMap.get(key);
                suggestionsMap.set(key, {
                    id: key,
                    search: label,
                    count: (existingItem?.count || 0) + 1,
                });
            });
        });

        return Array.from(suggestionsMap.values())
            .sort((firstItem, secondItem) => secondItem.count - firstItem.count || firstItem.search.localeCompare(secondItem.search))
            .slice(0, 8);
    }, [providers]);

    function openSearchResults(queryValue) {
        const normalizedQuery = queryValue.trim();

        router.push({
            pathname: '/user/serviceProviderList/serviceProviderListScreen',
            params: normalizedQuery ? { query: normalizedQuery } : {},
        });
    }

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
            <View style={styles.backgroundOrbPrimary} />
            <View style={styles.backgroundOrbSecondary} />
            <View style={styles.headerWrap}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
                        <MaterialIcons
                            name="arrow-back"
                            size={22}
                            color={DiscoveryTokens.textPrimary}
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.headerTitle}>Caută servicii</Text>

                {searchTextField()}
                {search.trim().length ? (
                    <TouchableOpacity activeOpacity={0.92} onPress={() => openSearchResults(search)} style={styles.searchCtaButtonStyle}>
                        <Text style={styles.searchCtaButtonTextStyle}>Vezi rezultate</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <ScrollView
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {suggestedSearchesSection()}
                {recentSearchesEmptyState()}
            </ScrollView>
        </View>
    );

    function suggestedSearchesSection() {
        return (
            <View style={styles.sectionWrap}>
                <DiscoverySectionHeader title="Servicii disponibile" variant="ainevoie" />
                <View style={styles.rowsWrap}>
                    {isLoading ? (
                        <View style={styles.emptyStateCard}>
                            <ActivityIndicator size="small" color={DiscoveryTokens.accent} />
                            <Text style={styles.emptyStateTitle}>Se încarcă sugestiile...</Text>
                        </View>
                    ) : null}
                    {!isLoading && suggestedSearches.map((item) => (
                        <TouchableOpacity key={`${item.id}`} activeOpacity={0.9} onPress={() => openSearchResults(item.search)} style={styles.searchRow}>
                            <View style={styles.rowIconWrap}>
                                <MaterialIcons name="search" size={18} color={DiscoveryTokens.accent} />
                            </View>
                            <Text style={styles.rowText}>{item.search}</Text>
                            <Text style={styles.rowCountText}>{item.count}</Text>
                        </TouchableOpacity>
                    ))}
                    {!isLoading && !suggestedSearches.length ? (
                        <View style={styles.emptyStateCard}>
                            <MaterialIcons name="inbox" size={22} color={DiscoveryTokens.accent} />
                            <Text style={styles.emptyStateTitle}>Nu există sugestii disponibile.</Text>
                            <Text style={styles.emptyStateBody}>Sugestiile apar când există prestatori aprobați în Firebase.</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        );
    }

    function recentSearchesEmptyState() {
        return (
            <View style={styles.sectionWrap}>
                <DiscoverySectionHeader title="Căutările tale recente" variant="ainevoie" />
                <View style={styles.emptyStateCard}>
                    <MaterialIcons name="history" size={22} color={DiscoveryTokens.textSecondary} />
                    <Text style={styles.emptyStateTitle}>Istoricul căutărilor nu este activ.</Text>
                    <Text style={styles.emptyStateBody}>Nu există colecție MVP pentru căutări recente, deci nu afișăm date locale simulate.</Text>
                </View>
            </View>
        );
    }

    function searchTextField() {
        return (
            <View
                style={[
                    styles.searchTextFieldWrapStyle,
                    isSearchFocused ? styles.searchTextFieldFocusedStyle : null,
                ]}
            >
                <MaterialIcons
                    name="search"
                    size={22}
                    style={{ marginRight: DiscoverySpacing.md }}
                    color={isSearchFocused || search ? DiscoveryTokens.accent : DiscoveryTokens.textSecondary}
                />
                <TextInput
                    value={search}
                    placeholder="Caută un serviciu"
                    placeholderTextColor={DiscoveryTokens.textMuted}
                    style={styles.searchInput}
                    selectionColor={DiscoveryTokens.accent}
                    onChangeText={(value) => setSearch(value)}
                    onSubmitEditing={() => openSearchResults(search)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    numberOfLines={1}
                    returnKeyType="search"
                    cursorColor={DiscoveryTokens.accent}
                />
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    searchCtaButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
        marginTop: DiscoverySpacing.md,
    },
    searchCtaButtonTextStyle: {
        ...Fonts.whiteColor16Bold,
    },
    backgroundOrbPrimary: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: DiscoveryTokens.accentSoft,
        top: -82,
        right: -74,
    },
    backgroundOrbSecondary: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.72)',
        top: 168,
        left: -86,
    },
    headerWrap: {
        ...DiscoveryPrimitives.headerSurface,
        paddingBottom: DiscoverySpacing.lg,
    },
    headerTopRow: {
        marginBottom: DiscoverySpacing.lg,
    },
    headerEyebrow: {
        ...DiscoveryTypography.heroEyebrow,
    },
    headerTitle: {
        ...DiscoveryTypography.heroTitle,
        marginTop: DiscoverySpacing.xs,
        maxWidth: '82%',
    },
    headerSubtitle: {
        ...DiscoveryTypography.heroBody,
        marginTop: DiscoverySpacing.sm,
        maxWidth: '92%',
    },
    searchTextFieldWrapStyle: {
        ...DiscoveryPrimitives.searchSurface,
        marginTop: DiscoverySpacing.xl,
    },
    searchTextFieldFocusedStyle: {
        borderColor: DiscoveryTokens.borderFocus,
    },
    searchInput: {
        ...Fonts.blackColor16Medium,
        color: DiscoveryTokens.textPrimary,
        flex: 1,
        padding: 0,
    },
    scrollContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.lg,
        paddingBottom: DiscoverySpacing.xxl,
    },
    sectionWrap: {
        marginBottom: DiscoverySpacing.xl,
    },
    rowsWrap: {
        marginTop: DiscoverySpacing.md,
    },
    searchRow: {
        ...DiscoveryPrimitives.listItemRow,
        marginBottom: DiscoverySpacing.md,
    },
    rowIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DiscoveryTokens.surfaceSoft,
    },
    rowText: {
        ...Fonts.blackColor14Medium,
        color: DiscoveryTokens.textPrimary,
        marginLeft: DiscoverySpacing.md,
        flex: 1,
    },
    rowCountText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accent,
    },
    emptyStateCard: {
        ...DiscoveryPrimitives.featureSurface,
        alignItems: 'center',
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
});

export default SearchScreen;
