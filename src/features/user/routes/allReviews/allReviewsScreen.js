import React from "react";
import { View, StyleSheet, Text, FlatList, Pressable } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useLocale } from "../../../../../context/localeContext";
import { useProviderReviews } from "../../../../../hooks/useProviderReviews";
import ReviewCard from "../../../shared/components/reviews/ReviewCard";
import ReviewInsightsBar from "../../../shared/components/reviews/ReviewInsightsBar";
import ReviewFilterSortBar from "../../../shared/components/reviews/ReviewFilterSortBar";
import useReviewListControls from "../../../shared/hooks/useReviewListControls";
import {
    AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
    AinevoieDiscoverySpacing as DiscoverySpacing,
    AinevoieDiscoveryTypography as DiscoveryTypography,
    AinevoieDiscoveryTokens as DiscoveryTokens,
} from "../../../shared/styles/discoverySystem";

const AllReviewsScreen = () => {
    const navigation = useNavigation();
    const { t } = useLocale();
    const params = useLocalSearchParams();
    const providerId = typeof params.providerId === 'string' ? params.providerId : '';
    const providerName = typeof params.providerName === 'string' ? params.providerName : '';
    const { reviews } = useProviderReviews(providerId);
    const mappedReviews = reviews.map((review) => ({
        id: review.id,
        image: review.authorImage,
        name: review.authorName,
        rating: review.rating,
        review: review.review,
        work: review.serviceName,
        date: review.createdAt ? new Intl.DateTimeFormat('ro-RO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(review.createdAt)) : '',
    }));
    const {
        starOptions,
        sortOptions,
        selectedStars,
        setSelectedStars,
        onlyWithText,
        setOnlyWithText,
        selectedSort,
        setSelectedSort,
        expandedReviews,
        toggleReviewExpansion,
        averageRating,
        recommendationRate,
        visibleReviews,
    } = useReviewListControls(mappedReviews);

    const renderItem = ({ item }) => (
        <ReviewCard
            item={item}
            expanded={Boolean(expandedReviews[item.id])}
            onToggleExpand={toggleReviewExpansion}
            containerStyle={styles.reviewWrapStyle}
            ratingColor={DiscoveryTokens.rating}
        />
    );

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
            <View style={styles.backgroundOrbPrimary} />
            <View style={styles.backgroundOrbSecondary} />
            <View style={{ flex: 1 }}>
                {header()}
                <FlatList
                    ListHeaderComponent={
                        <>
                            <ReviewInsightsBar
                                averageRating={averageRating}
                                totalReviews={mappedReviews.length}
                                recommendationRate={recommendationRate}
                                style={styles.insightsWrapStyle}
                            />
                            <ReviewFilterSortBar
                                starOptions={starOptions}
                                selectedStars={selectedStars}
                                onSelectStars={setSelectedStars}
                                onlyWithText={onlyWithText}
                                onToggleOnlyWithText={setOnlyWithText}
                                sortOptions={sortOptions}
                                selectedSort={selectedSort}
                                onSelectSort={setSelectedSort}
                                containerStyle={styles.filterBarContentStyle}
                            />
                        </>
                    }
                    data={visibleReviews}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.reviewsContent}
                    ListEmptyComponent={(
                        <View style={styles.reviewWrapStyle}>
                            <Text style={styles.emptyTitle}>{t('providerDetail.noReviewsYet')}</Text>
                            <Text style={styles.emptyBody}>{t('userReviews.emptyBody')}</Text>
                        </View>
                    )}
                />
            </View>
        </View>
    );

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <Pressable onPress={() => navigation.pop()} style={({ pressed }) => [DiscoveryPrimitives.iconButton, pressed ? styles.backButtonPressedStyle : null]}>
                    <MaterialIcons
                        name="arrow-back"
                        size={22}
                        color={DiscoveryTokens.textPrimary}
                    />
                </Pressable>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerEyebrow}>Recenzii</Text>
                    <Text style={styles.headerTitle}>{providerName || 'Toate recenziile'}</Text>
                </View>
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
        top: -82,
        right: -60,
    },
    backgroundOrbSecondary: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        backgroundColor: DiscoveryTokens.overlaySoft,
        top: 180,
        left: -54,
    },
    headerWrapStyle: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTextWrap: {
        marginLeft: DiscoverySpacing.md,
        flex: 1,
    },
    headerEyebrow: {
        ...DiscoveryTypography.heroEyebrow,
    },
    headerTitle: {
        ...DiscoveryTypography.screenTitle,
        marginTop: 4,
    },
    reviewsContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.xxl,
    },
    insightsWrapStyle: {
        marginBottom: DiscoverySpacing.lg,
    },
    filterBarContentStyle: {
        paddingBottom: DiscoverySpacing.lg,
    },
    reviewWrapStyle: {
        ...DiscoveryPrimitives.contentSurface,
        marginBottom: DiscoverySpacing.lg,
    },
    emptyTitle: {
        ...DiscoveryTypography.sectionTitle,
        textAlign: 'center',
    },
    emptyBody: {
        ...DiscoveryTypography.bodyMuted,
        textAlign: 'center',
        marginTop: DiscoverySpacing.sm,
    },
    backButtonPressedStyle: {
        opacity: 0.9,
    },
});

export default AllReviewsScreen;
