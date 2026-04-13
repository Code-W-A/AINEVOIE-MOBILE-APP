import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { useUserBookings } from '../../../../../hooks/useUserBookings';
import { DiscoveryPrimitives, DiscoveryRadius, DiscoverySpacing, DiscoveryTypography } from '../../../shared/styles/discoverySystem';
import { formatMoney } from '../../../shared/utils/mockFormatting';

function getStatusUi(status, t) {
  if (status === 'completed') {
    return {
      label: t('serviceHistory.completedStatus'),
      color: Colors.discoverySuccessColor,
      backgroundColor: '#EAF7F0',
    };
  }

  return {
    label: t('serviceHistory.cancelledStatus'),
    color: Colors.redColor,
    backgroundColor: '#FFF1F0',
  };
}

function getDetailRoute(booking) {
  if (booking.bookingStatus === 'completed') {
    return '/user/pastBookingDetail/pastBookingDetailScreen';
  }

  return '/user/cancelledBookingDetail/cancelledBookingDetailScreen';
}

export default function ServiceHistoryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLocale();
  const { bookings } = useUserBookings();
  const filterOptions = [
    { key: 'all', label: t('serviceHistory.filterAll') },
    { key: 'completed', label: t('serviceHistory.filterCompleted') },
    { key: 'cancelled', label: t('serviceHistory.filterCancelled') },
  ];
  const initialFilter = typeof params.filter === 'string' ? params.filter : 'all';
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);

  const historyBookings = useMemo(() => {
    const scopedBookings = bookings.filter((booking) => booking.bookingStatus !== 'upcoming');

    if (selectedFilter === 'all') {
      return scopedBookings;
    }

    return scopedBookings.filter((booking) => booking.bookingStatus === selectedFilter);
  }, [bookings, selectedFilter]);

  function renderBookingRow({ item }) {
    const statusUi = getStatusUi(item.bookingStatus, t);
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push({ pathname: getDetailRoute(item), params: { bookingId: item.id } })}
        style={styles.bookingRow}
      >
        <Image source={item.providerImage} style={styles.bookingImage} resizeMode="cover" />
        <View style={styles.bookingContentWrap}>
          <View style={styles.bookingTopRow}>
            <Text numberOfLines={1} style={styles.bookingName}>{item.providerName}</Text>
            <View style={[styles.statusChip, { backgroundColor: statusUi.backgroundColor }]}>
              <Text style={[styles.statusChipText, { color: statusUi.color }]}>{statusUi.label}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.bookingRole}>{item.serviceName}</Text>
          <Text style={styles.bookingMeta}>{`${item.dateLabel} • ${item.timeLabel}`}</Text>
          <Text numberOfLines={2} style={styles.bookingDescription}>
            {item.requestDetails?.description || t('serviceHistory.noRequestDetails')}
          </Text>
          <Text style={styles.bookingPrice}>{formatMoney(item.price?.amount ?? 0, item.price?.currency)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
      <View style={{ flex: 1 }}>
        {header()}
        <FlatList
          data={historyBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={filterBar}
          ListEmptyComponent={emptyState}
        />
      </View>
    </View>
  );

  function filterBar() {
    return (
      <View style={styles.filterWrap}>
        {filterOptions.map((item) => {
          const isSelected = item.key === selectedFilter;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.9}
              onPress={() => setSelectedFilter(item.key)}
              style={[styles.filterChip, isSelected ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextActive : null]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function emptyState() {
    return (
      <View style={styles.emptyStateWrap}>
        <Text style={styles.emptyStateTitle}>{t('serviceHistory.emptyTitle')}</Text>
        <Text style={styles.emptyStateText}>{t('serviceHistory.emptyBody')}</Text>
      </View>
    );
  }

  function header() {
    return (
      <View style={styles.headerWrap}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
        </TouchableOpacity>
        <Text style={DiscoveryTypography.heroEyebrow}>{t('serviceHistory.headerEyebrow')}</Text>
        <Text style={styles.headerTitle}>{t('serviceHistory.headerTitle')}</Text>
        <Text style={styles.headerSubtitle}>{t('serviceHistory.headerSubtitle')}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  headerWrap: {
    ...DiscoveryPrimitives.headerSurface,
  },
  headerTitle: {
    ...DiscoveryTypography.heroTitle,
    marginTop: DiscoverySpacing.xs,
  },
  headerSubtitle: {
    ...DiscoveryTypography.heroBody,
    marginTop: DiscoverySpacing.sm,
  },
  listContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingVertical: DiscoverySpacing.lg,
    paddingBottom: DiscoverySpacing.xxl,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: DiscoverySpacing.md,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: DiscoveryRadius.pill,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.whiteColor,
    paddingHorizontal: DiscoverySpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DiscoverySpacing.sm,
    marginBottom: DiscoverySpacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.discoveryChipBackgroundColor,
    borderColor: Colors.discoveryAccentColor,
  },
  filterChipText: {
    ...Fonts.grayColor14Medium,
  },
  filterChipTextActive: {
    ...Fonts.primaryColor14Medium,
    color: Colors.discoveryAccentColor,
  },
  bookingRow: {
    ...DiscoveryPrimitives.contentSurface,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: DiscoverySpacing.md,
    marginBottom: DiscoverySpacing.md,
  },
  bookingImage: {
    width: 68,
    height: 68,
    borderRadius: DiscoveryRadius.md,
  },
  bookingContentWrap: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingName: {
    ...Fonts.blackColor16Bold,
    flex: 1,
    marginRight: DiscoverySpacing.sm,
  },
  statusChip: {
    borderRadius: DiscoveryRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: {
    ...DiscoveryTypography.caption,
    fontWeight: '700',
  },
  bookingRole: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 2,
  },
  bookingMeta: {
    ...DiscoveryTypography.caption,
    marginTop: DiscoverySpacing.sm,
  },
  bookingDescription: {
    ...DiscoveryTypography.body,
    marginTop: DiscoverySpacing.sm,
    lineHeight: 20,
  },
  bookingPrice: {
    ...Fonts.primaryColor16Medium,
    color: Colors.discoveryAccentColor,
    marginTop: DiscoverySpacing.md,
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
