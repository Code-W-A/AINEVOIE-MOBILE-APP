import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, FlatList } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Fonts, Sizes, CommonStyles } from "../../../../../../constant/styles";
import { useDemoAvatar } from "../../../../../../hooks/useDemoAvatar";
import { useProviderOnboarding } from "../../../../../../hooks/useProviderOnboarding";
import { useProviderReviews } from "../../../../../../hooks/useProviderReviews";
import ReviewCard from "../../../../shared/components/reviews/ReviewCard";
import ReviewInsightsBar from "../../../../shared/components/reviews/ReviewInsightsBar";
import ReviewFilterSortBar from "../../../../shared/components/reviews/ReviewFilterSortBar";
import useReviewListControls from "../../../../shared/hooks/useReviewListControls";
import { getProviderProfileFallback, getRoleDisplayConfig } from "../../../../shared/config/roleDisplayConfig";

function formatReviewDate(createdAt) {
    try {
        return new Intl.DateTimeFormat('ro-RO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(createdAt));
    } catch {
        return createdAt;
    }
}

const ReviewScreen = () => {
    const { data: providerOnboarding } = useProviderOnboarding();
    const { avatarUri } = useDemoAvatar('provider');
    const { reviews } = useProviderReviews();
    const roleConfig = getRoleDisplayConfig('provider');
    const providerFallback = getProviderProfileFallback(providerOnboarding);

    const mappedReviews = useMemo(() => reviews.map((review) => ({
        id: review.id,
        image: review.authorImage,
        name: review.authorName,
        work: review.serviceName,
        date: formatReviewDate(review.createdAt),
        review: review.review,
        rating: review.rating,
    })), [reviews]);

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
    } = useReviewListControls(mappedReviews, {
        getSortKey: (item) => Number(String(item.id).replace(/\D/g, '')) || 0,
    });

    const renderItem = ({ item }) => (
        <ReviewCard
            item={item}
            expanded={Boolean(expandedReviews[item.id])}
            onToggleExpand={toggleReviewExpansion}
            containerStyle={styles.reviewCardStyle}
        />
    );

    const avatarSource = avatarUri ? { uri: avatarUri } : roleConfig.defaultAvatarSource;

    return (
        <View style={styles.screen}>
            <View style={styles.contentWrapStyle}>
                {header()}
                <FlatList
                    ListHeaderComponent={
                        <>
                            {providerDetail()}
                            <ReviewInsightsBar
                                averageRating={averageRating}
                                totalReviews={mappedReviews.length}
                                recommendationRate={recommendationRate}
                                style={styles.insightsStyle}
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
                            {mappedReviews.length ? recentReviewsTitle() : null}
                        </>
                    }
                    data={visibleReviews}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContentStyle}
                    ListEmptyComponent={(
                        <View style={styles.emptyStateWrapStyle}>
                            <Text style={styles.emptyStateTitleStyle}>Nu există feedback salvat încă</Text>
                            <Text style={styles.emptyStateTextStyle}>Review-urile lăsate de user după finalizarea rezervărilor vor apărea aici automat.</Text>
                        </View>
                    )}
                />
            </View>
        </View>
    );

    function recentReviewsTitle() {
        return (
            <Text style={styles.recentReviewsTitleStyle}>
                Recenzii recente
            </Text>
        );
    }

    function providerDetail() {
        return (
            <View style={styles.providerDetailWrapStyle}>
                <View style={styles.providerImageShadowStyle}>
                    <Image
                        source={avatarSource}
                        style={styles.providerImageStyle}
                        resizeMode="cover"
                    />
                </View>

                <View style={styles.providerMetaWrapStyle}>
                    <Text style={{ ...Fonts.blackColor16Bold }}>
                        {providerFallback.profileDisplayName}
                    </Text>

                    <Text style={{ ...Fonts.grayColor14Medium }}>
                        {providerOnboarding.professionalProfile.specialization || 'Profil profesional'}
                    </Text>

                    <View style={styles.providerStatRowStyle}>
                        <View style={styles.ratingAndJobIconWrapStyle}>
                            <MaterialIcons name="star-rate" size={20} color={Colors.orangeColor} />
                        </View>
                        <View style={styles.providerStatTextWrapStyle}>
                            <Text style={{ ...Fonts.grayColor14Medium }}>
                                Evaluare
                            </Text>
                            <Text style={{ ...Fonts.blackColor14Bold }}>
                                {mappedReviews.length ? `${averageRating.toFixed(1)} din 5` : 'Fără scor'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.providerStatRowStyle}>
                        <View style={styles.ratingAndJobIconWrapStyle}>
                            <MaterialIcons name="rate-review" size={20} color={Colors.primaryColor} />
                        </View>
                        <View style={styles.providerStatTextWrapStyle}>
                            <Text style={{ ...Fonts.grayColor14Medium }}>
                                Feedback primit
                            </Text>
                            <Text style={{ ...Fonts.blackColor14Bold }}>
                                {mappedReviews.length}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <Text style={{ ...Fonts.blackColor18Bold }}>
                    Recenzii
                </Text>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bodyBackColor,
    },
    contentWrapStyle: {
        flex: 1,
    },
    headerWrapStyle: {
        backgroundColor: Colors.whiteColor,
        height: 56.0,
        borderBottomWidth: 1.0,
        borderBottomColor: 'rgba(16,36,77,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContentStyle: {
        paddingBottom: Sizes.fixPadding * 2.0,
    },
    providerDetailWrapStyle: {
        flexDirection: 'row',
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginTop: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 1.6,
    },
    providerMetaWrapStyle: {
        flex: 1,
        justifyContent: 'space-between',
        marginLeft: Sizes.fixPadding,
        marginBottom: Sizes.fixPadding - 5.0,
    },
    providerImageShadowStyle: {
        borderRadius: Sizes.fixPadding * 1.5,
        ...CommonStyles.shadow,
    },
    providerImageStyle: {
        width: 92,
        height: 92,
        borderRadius: Sizes.fixPadding * 1.5,
    },
    providerStatRowStyle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    providerStatTextWrapStyle: {
        marginLeft: Sizes.fixPadding - 5.0,
    },
    ratingAndJobIconWrapStyle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.whiteColor,
        ...CommonStyles.shadow,
    },
    insightsStyle: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 1.2,
    },
    filterBarContentStyle: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 1.2,
    },
    recentReviewsTitleStyle: {
        ...Fonts.blackColor16Bold,
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding * 1.2,
    },
    reviewCardStyle: {
        marginHorizontal: Sizes.fixPadding * 2.0,
        marginBottom: Sizes.fixPadding,
    },
    emptyStateWrapStyle: {
        backgroundColor: Colors.whiteColor,
        borderRadius: Sizes.fixPadding * 1.2,
        borderWidth: 1.0,
        borderColor: 'rgba(16,36,77,0.08)',
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingVertical: Sizes.fixPadding * 2.0,
        alignItems: 'center',
        marginHorizontal: Sizes.fixPadding * 2.0,
        ...CommonStyles.shadow,
    },
    emptyStateTitleStyle: {
        ...Fonts.blackColor16Bold,
        textAlign: 'center',
    },
    emptyStateTextStyle: {
        ...Fonts.grayColor14Regular,
        textAlign: 'center',
        marginTop: Sizes.fixPadding - 2.0,
    },
});

export default ReviewScreen;
