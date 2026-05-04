import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, Image, FlatList, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Fonts } from '../../../../../constant/styles';
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from '../../../../../components/myStatusBar';
import { useNavigation, useRouter } from 'expo-router';
import { useLocale } from '../../../../../context/localeContext';
import { useProviderDirectoryList } from '../../../../../hooks/useProviderDirectoryList';
import { resolveServiceCategory } from '../../../shared/utils/providerServices';
import {
  AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
  AinevoieDiscoverySpacing as DiscoverySpacing,
  AinevoieDiscoveryRadius as DiscoveryRadius,
  AinevoieDiscoveryTypography as DiscoveryTypography,
  AinevoieDiscoveryTokens as DiscoveryTokens,
} from '../../../shared/styles/discoverySystem';

const SERVICE_ROW_HEIGHT = 104;
const SERVICE_ROW_LAYOUT = SERVICE_ROW_HEIGHT + DiscoverySpacing.md;

const ProfessionalServicesScreen = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const servicesListRef = useRef(null);
  const { locale } = useLocale();
  const { providers, isLoading } = useProviderDirectoryList();
  const [activeServiceId, setActiveServiceId] = useState(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const serviceCategories = useMemo(() => {
    const categoryMap = new Map();

    providers.forEach((provider) => {
      const hasSummaries = Array.isArray(provider.serviceSummaries) && provider.serviceSummaries.length > 0;
      const hasCategoryPrimary = Boolean(provider.categoryPrimary);

      if (!hasSummaries && !hasCategoryPrimary) {
        return;
      }

      const services = hasSummaries
        ? provider.serviceSummaries.filter((service) => service.isActive !== false)
        : [{ categoryKey: provider.categoryPrimary, categoryLabel: provider.categoryPrimary }];
      const providerCategoryMap = new Map();

      services
        .map((service) => resolveServiceCategory(service.categoryKey || service.categoryLabel || provider.categoryPrimary, locale))
        .filter((category) => category?.key)
        .forEach((category) => {
          providerCategoryMap.set(category.key, category);
        });

      Array.from(providerCategoryMap.values()).forEach((category) => {
        const existingCategory = categoryMap.get(category.key);

        categoryMap.set(category.key, {
          id: category.key,
          key: category.key,
          serviceName: category.label,
          categoryLabel: category.label,
          image: category.image,
          providerCount: (existingCategory?.providerCount || 0) + 1,
        });
      });
    });

    return Array.from(categoryMap.values()).sort((firstItem, secondItem) => (
      secondItem.providerCount - firstItem.providerCount || firstItem.serviceName.localeCompare(secondItem.serviceName)
    ));
  }, [locale, providers]);

  const defaultServiceId = serviceCategories[0]?.id ?? null;

  useEffect(() => {
    if (!defaultServiceId) {
      setActiveServiceId(null);
      return;
    }

    if (!activeServiceId || !serviceCategories.some((category) => category.id === activeServiceId)) {
      setActiveServiceId(defaultServiceId);
    }
  }, [activeServiceId, defaultServiceId, serviceCategories]);

  function getServiceIndex(serviceId) {
    return serviceCategories.findIndex((item) => item.id === serviceId);
  }

  function scrollToService(serviceId, animated = true) {
    const index = getServiceIndex(serviceId);

    if (index < 0) {
      return;
    }

    servicesListRef.current?.scrollToIndex({
      index,
      animated,
      viewPosition: 0.1,
    });
  }

  function resetShortcutSelection() {
    if (!defaultServiceId) {
      return;
    }

    setActiveServiceId(defaultServiceId);
    servicesListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function applyShortcutSelection() {
    setIsFilterSheetOpen(false);

    if (activeServiceId) {
      scrollToService(activeServiceId);
    }
  }

  function openCategory(item) {
    router.push({
      pathname: '/user/serviceProviderList/serviceProviderListScreen',
      params: {
        categoryKey: item.key,
        category: item.categoryLabel,
      },
    });
  }

  function quickShortcuts() {
    const renderItem = ({ item }) => {
      const isActive = activeServiceId === item.id;

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setActiveServiceId(item.id);
            scrollToService(item.id);
          }}
          style={[styles.quickFilterChip, isActive ? styles.quickFilterChipActive : null]}
        >
          <Text style={[styles.quickFilterChipText, isActive ? styles.quickFilterChipTextActive : null]}>
            {item.serviceName}
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <FlatList
        data={serviceCategories}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickFiltersContent}
      />
    );
  }

  function listHeader() {
    return (
      <View style={styles.listHeaderWrap}>
        {quickShortcuts()}
      </View>
    );
  }

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
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.filterSheetStyle}>
              <View style={styles.dragHandle} />
              <Text style={styles.sheetTitle}>Alege categoria</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.filterSheetContent}
              >
                <Text style={styles.sheetSectionLabel}>Categorie</Text>
                <View style={styles.sheetShortcutGrid}>
                  {serviceCategories.map((item) => {
                    const isActive = activeServiceId === item.id;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.9}
                        onPress={() => setActiveServiceId(item.id)}
                        style={[styles.sheetShortcutChip, isActive ? styles.sheetShortcutChipActive : null]}
                      >
                        <Text style={[styles.sheetShortcutChipText, isActive ? styles.sheetShortcutChipTextActive : null]}>
                          {item.serviceName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={styles.sheetActionsRow}>
                <TouchableOpacity activeOpacity={0.9} onPress={resetShortcutSelection} style={styles.sheetSecondaryButton}>
                  <Text style={styles.sheetSecondaryButtonText}>Resetează</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.95} onPress={applyShortcutSelection} style={styles.sheetPrimaryButton}>
                  <Text style={styles.sheetPrimaryButtonText}>Aplică</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  function renderEmptyState() {
    if (isLoading) {
      return (
        <View style={styles.emptyStateWrapStyle}>
          <ActivityIndicator size="small" color={DiscoveryTokens.accent} />
          <Text style={styles.emptyStateTextStyle}>Se încarcă serviciile publice...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyStateWrapStyle}>
        <Text style={styles.emptyStateTitleStyle}>Nu există încă servicii publicate</Text>
        <Text style={styles.emptyStateTextStyle}>
          Categoriile vor apărea aici imediat ce prestatorii publică servicii active în profilurile lor.
        </Text>
      </View>
    );
  }

  function services() {
    const renderItem = ({ item }) => (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openCategory(item)}
        style={[
          styles.servicesWrapStyle,
          activeServiceId === item.id ? styles.servicesWrapStyleActive : null,
        ]}
      >
        <Image
          source={item.image}
          style={[
            styles.serviceImage,
            activeServiceId === item.id ? styles.serviceImageActive : null,
          ]}
          resizeMode="cover"
        />
        <View style={styles.serviceContent}>
          <Text numberOfLines={2} style={styles.serviceTitle}>
            {item.serviceName}
          </Text>
          <Text style={styles.serviceMetaText}>
            {item.providerCount > 0
              ? `${item.providerCount} prestatori activi`
              : 'Fără prestatori publicați încă'}
          </Text>
        </View>
        <View style={[styles.serviceArrowWrap, activeServiceId === item.id ? styles.serviceArrowWrapActive : null]}>
          <MaterialIcons name="arrow-forward-ios" size={16} color={DiscoveryTokens.accent} />
        </View>
      </TouchableOpacity>
    );

    if (!serviceCategories.length) {
      return renderEmptyState();
    }

    return (
      <FlatList
        ref={servicesListRef}
        data={serviceCategories}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        getItemLayout={(_, index) => ({
          length: SERVICE_ROW_LAYOUT,
          offset: SERVICE_ROW_LAYOUT * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          servicesListRef.current?.scrollToOffset({
            offset: index * SERVICE_ROW_LAYOUT,
            animated: true,
          });
        }}
      />
    );
  }

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
            <MaterialIcons name="arrow-back" size={22} color={DiscoveryTokens.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsFilterSheetOpen(true)}
            style={[
              DiscoveryPrimitives.iconButton,
              isFilterSheetOpen ? styles.headerFilterButtonActive : null,
            ]}
          >
            <MaterialIcons
              name="filter-list"
              size={22}
              color={isFilterSheetOpen ? DiscoveryTokens.accent : DiscoveryTokens.textPrimary}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerEyebrow}>Servicii</Text>

        <View style={styles.resultsChip}>
          <Text style={styles.resultsChipText}>{`${serviceCategories.length} categorii`}</Text>
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
      {services()}
      {filterSheet()}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    width: 204,
    height: 204,
    borderRadius: 102,
    backgroundColor: DiscoveryTokens.accentSoft,
    top: -72,
    right: -38,
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: DiscoveryTokens.overlaySoft,
    top: 220,
    left: -24,
  },
  headerWrapStyle: {
    ...DiscoveryPrimitives.headerSurface,
    paddingBottom: DiscoverySpacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerEyebrow: {
    ...DiscoveryTypography.heroEyebrow,
    marginTop: DiscoverySpacing.sm,
  },
  headerFilterButtonActive: {
    backgroundColor: DiscoveryTokens.surfaceAccent,
    borderColor: DiscoveryTokens.borderAccentSoft,
  },
  resultsChip: {
    ...DiscoveryPrimitives.quietChip,
    marginTop: DiscoverySpacing.md,
  },
  resultsChipText: {
    ...DiscoveryTypography.chip,
    color: DiscoveryTokens.textPrimary,
  },
  listContent: {
    paddingBottom: DiscoverySpacing.xxl * 2,
  },
  listHeaderWrap: {
    paddingTop: 2,
    paddingBottom: DiscoverySpacing.sm,
  },
  quickFiltersContent: {
    paddingLeft: DiscoverySpacing.xl,
    paddingRight: DiscoverySpacing.sm,
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
  servicesWrapStyle: {
    ...DiscoveryPrimitives.contentSurface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: DiscoverySpacing.md,
    minHeight: SERVICE_ROW_HEIGHT,
    marginHorizontal: DiscoverySpacing.xl,
    marginBottom: DiscoverySpacing.md,
    borderRadius: DiscoveryRadius.xl,
  },
  servicesWrapStyleActive: {
    backgroundColor: DiscoveryTokens.surfaceMuted,
    borderColor: DiscoveryTokens.borderAccentSoft,
  },
  serviceImage: {
    width: 76,
    height: 76,
    borderRadius: DiscoveryRadius.lg,
    borderWidth: 1,
    borderColor: DiscoveryTokens.borderSubtle,
    backgroundColor: DiscoveryTokens.surfaceSubtle,
  },
  serviceImageActive: {
    borderColor: DiscoveryTokens.borderAccentSoft,
  },
  serviceContent: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
    marginRight: DiscoverySpacing.sm,
  },
  serviceTitle: {
    ...Fonts.blackColor16Bold,
    color: DiscoveryTokens.textPrimary,
    lineHeight: 22,
    maxWidth: '96%',
  },
  serviceMetaText: {
    ...DiscoveryTypography.caption,
    marginTop: 6,
  },
  serviceArrowWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscoveryTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: DiscoveryTokens.borderSubtle,
  },
  serviceArrowWrapActive: {
    backgroundColor: DiscoveryTokens.surfaceAccent,
    borderColor: DiscoveryTokens.borderAccentSoft,
  },
  emptyStateWrapStyle: {
    ...DiscoveryPrimitives.contentSurface,
    marginHorizontal: DiscoverySpacing.xl,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingVertical: DiscoverySpacing.xl,
    alignItems: 'center',
  },
  emptyStateTitleStyle: {
    ...Fonts.blackColor18Bold,
    color: DiscoveryTokens.textPrimary,
    textAlign: 'center',
  },
  emptyStateTextStyle: {
    ...DiscoveryTypography.caption,
    marginTop: DiscoverySpacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: DiscoveryTokens.sheetBackdrop,
  },
  modalBottomWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterSheetStyle: {
    ...DiscoveryPrimitives.sheetSurface,
    maxHeight: '84%',
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
  sheetTitle: {
    ...Fonts.blackColor20Bold,
    color: DiscoveryTokens.textPrimary,
    paddingHorizontal: DiscoverySpacing.xl,
  },
  filterSheetContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.lg,
    paddingBottom: DiscoverySpacing.lg,
  },
  sheetSectionLabel: {
    ...Fonts.grayColor14Bold,
    color: DiscoveryTokens.textSecondary,
    marginBottom: DiscoverySpacing.md,
  },
  sheetShortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -DiscoverySpacing.sm,
  },
  sheetShortcutChip: {
    ...DiscoveryPrimitives.tabPill,
    minHeight: 40,
    paddingHorizontal: DiscoverySpacing.md + 2,
    marginRight: DiscoverySpacing.sm,
    marginBottom: DiscoverySpacing.sm,
  },
  sheetShortcutChipActive: {
    ...DiscoveryPrimitives.tabPillActive,
  },
  sheetShortcutChipText: {
    ...Fonts.blackColor14Medium,
    color: DiscoveryTokens.textPrimary,
  },
  sheetShortcutChipTextActive: {
    ...Fonts.whiteColor14Bold,
  },
  sheetActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.md,
  },
  sheetSecondaryButton: {
    ...DiscoveryPrimitives.secondaryButton,
    flex: 1,
    marginRight: DiscoverySpacing.md,
  },
  sheetSecondaryButtonText: {
    ...Fonts.blackColor14Bold,
    color: DiscoveryTokens.textPrimary,
  },
  sheetPrimaryButton: {
    ...DiscoveryPrimitives.primaryButton,
    flex: 1.15,
    minHeight: 52,
  },
  sheetPrimaryButtonText: {
    ...Fonts.whiteColor16Bold,
  },
});

export default ProfessionalServicesScreen;
