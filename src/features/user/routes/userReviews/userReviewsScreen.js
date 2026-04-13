import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { useLocale } from '../../../../../context/localeContext';
import { useUserReviews } from '../../../../../hooks/useUserReviews';
import ReviewCard from '../../../shared/components/reviews/ReviewCard';
import ReviewFilterSortBar from '../../../shared/components/reviews/ReviewFilterSortBar';
import ReviewInsightsBar from '../../../shared/components/reviews/ReviewInsightsBar';
import useReviewListControls from '../../../shared/hooks/useReviewListControls';
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryTypography, AinevoieDiscoveryTokens } from '../../../shared/styles/discoverySystem';

function formatReviewDate(createdAt, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(createdAt));
  } catch {
    return createdAt;
  }
}

export default function UserReviewsScreen() {
  const navigation = useNavigation();
  const { locale, t } = useLocale();
  const { reviews } = useUserReviews();

  const mappedReviews = reviews.map((review) => ({
    id: review.id,
    image: review.providerImage,
    name: review.providerName,
    work: review.serviceName,
    date: formatReviewDate(review.createdAt, locale),
    review: review.review,
    rating: review.rating,
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
      ratingColor={AinevoieDiscoveryTokens.rating}
    />
  );

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={AinevoieDiscoveryTokens.statusBarBackground} barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {header()}
        <FlatList
          data={visibleReviews}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={(
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
                containerStyle={styles.filterWrapStyle}
              />
            </>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyStateWrap}>
              <Text style={styles.emptyStateTitle}>{t('userReviews.emptyTitle')}</Text>
              <Text style={styles.emptyStateText}>{t('userReviews.emptyBody')}</Text>
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
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>{t('userReviews.headerEyebrow')}</Text>
          <Text style={styles.headerTitle}>{t('userReviews.headerTitle')}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  headerWrapStyle: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.sm,
    paddingBottom: DiscoverySpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonPressedStyle: {
    opacity: 0.85,
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
  listContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingBottom: DiscoverySpacing.xxl,
  },
  insightsWrapStyle: {
    marginBottom: DiscoverySpacing.lg,
  },
  filterWrapStyle: {
    paddingBottom: DiscoverySpacing.lg,
  },
  reviewWrapStyle: {
    marginBottom: DiscoverySpacing.md,
  },
  emptyStateWrap: {
    ...DiscoveryPrimitives.contentSurface,
    padding: DiscoverySpacing.xl,
    alignItems: 'center',
  },
  emptyStateTitle: {
    ...DiscoveryTypography.sectionTitle,
    textAlign: 'center',
  },
  emptyStateText: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: DiscoverySpacing.sm,
    textAlign: 'center',
  },
});
