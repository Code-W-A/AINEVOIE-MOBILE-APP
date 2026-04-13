import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { Colors, Fonts } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import { useProviderBookings } from '../../../../../hooks/useProviderBookings';
import { handleDemoCall } from '../../../../../utils/demoActions';
import {
  DiscoveryPrimitives,
  DiscoveryRadius,
  DiscoverySpacing,
  DiscoveryTypography,
} from '../../../shared/styles/discoverySystem';
import { getProviderBookingStatusUi, getProviderPaymentStatusUi } from '../../utils/providerBookingUi';
const BUSINESS_DAY_START_MINUTES = 7 * 60;
const BUSINESS_DAY_END_MINUTES = 21 * 60;
const ROMANIAN_MONTHS = {
  ianuarie: 0,
  februarie: 1,
  martie: 2,
  aprilie: 3,
  mai: 4,
  iunie: 5,
  iulie: 6,
  august: 7,
  septembrie: 8,
  octombrie: 9,
  noiembrie: 10,
  decembrie: 11,
};

function getStartMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return (hours * 60) + minutes;
}

function getHourBucket(startMinutes) {
  return Math.floor(startMinutes / 60) * 60;
}

function formatHourLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  return `${String(hours).padStart(2, '0')}:00`;
}

function buildHourSlots(bookings) {
  if (!bookings.length) {
    return [];
  }

  const firstBookingMinutes = Math.min(...bookings.map((item) => item.startMinutes));
  const lastBookingMinutes = Math.max(...bookings.map((item) => item.startMinutes));

  const startMinutes = Math.max(
    BUSINESS_DAY_START_MINUTES,
    getHourBucket(firstBookingMinutes) - 60
  );
  const endMinutes = Math.min(
    BUSINESS_DAY_END_MINUTES,
    getHourBucket(lastBookingMinutes) + 60
  );

  const hourSlots = [];

  for (let slotMinutes = startMinutes; slotMinutes <= endMinutes; slotMinutes += 60) {
    hourSlots.push(slotMinutes);
  }

  return hourSlots;
}

function getCalendarDayLabel(item) {
  return item?.scheduledDate || item?.dayLabel || '';
}

function getLocalizedRelativeDayLabel(label, t) {
  const normalizedLabel = normalizeRomanianDateLabel(label);

  if (normalizedLabel === 'astazi' || normalizedLabel === 'today') {
    return t('dates.today');
  }

  if (normalizedLabel === 'maine' || normalizedLabel === 'tomorrow') {
    return t('dates.tomorrow');
  }

  if (!String(label || '').trim()) {
    return t('providerAllBookings.noDate');
  }

  return label;
}

function normalizeRomanianDateLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't');
}

function getCalendarDaySortValue(label) {
  const normalizedLabel = normalizeRomanianDateLabel(label);
  const today = new Date();
  const currentYear = today.getFullYear();

  if (normalizedLabel === 'astazi' || normalizedLabel === 'today') {
    return Date.UTC(currentYear, today.getMonth(), today.getDate());
  }

  if (normalizedLabel === 'maine' || normalizedLabel === 'tomorrow') {
    return Date.UTC(currentYear, today.getMonth(), today.getDate() + 1);
  }

  const match = normalizedLabel.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, dayPart, monthPart, yearPart] = match;
  const monthIndex = ROMANIAN_MONTHS[monthPart];

  if (typeof monthIndex !== 'number') {
    return Number.MAX_SAFE_INTEGER;
  }

  return Date.UTC(Number(yearPart || currentYear), monthIndex, Number(dayPart));
}

function renderStatusLabel(status, textStyle, iconStyle) {
  const statusUi = getProviderBookingStatusUi(status);

  return (
    <View style={[iconStyle, { backgroundColor: statusUi.backgroundColor }]}>
      <MaterialIcons name={statusUi.icon} size={14} color={statusUi.color} />
      <Text style={[textStyle, { color: statusUi.color }]}>{statusUi.label}</Text>
    </View>
  );
}

function renderPaymentLabel(status, textStyle, iconStyle) {
  const paymentUi = getProviderPaymentStatusUi(status);

  return (
    <View style={[iconStyle, { backgroundColor: paymentUi.backgroundColor }]}>
      <MaterialIcons name={paymentUi.icon} size={14} color={paymentUi.color} />
      <Text style={[textStyle, { color: paymentUi.color }]}>{paymentUi.shortLabel}</Text>
    </View>
  );
}

const AllBookingsScreen = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const { locale, t } = useLocale();
  const { activeBookings } = useProviderBookings();
  const canGoBack = navigation.canGoBack();
  const defaultFilters = useMemo(() => ({
    day: t('providerAllBookings.filterAll'),
    status: t('providerAllBookings.filterAll'),
    service: t('providerAllBookings.filterAll'),
  }), [t]);
  const viewOptions = useMemo(() => ([
    { value: t('providerAllBookings.viewList'), icon: 'view-list', accessibilityLabel: t('providerAllBookings.viewListA11y') },
    { value: t('providerAllBookings.viewCalendar'), icon: 'calendar-month', accessibilityLabel: t('providerAllBookings.viewCalendarA11y') },
  ]), [t]);
  const dayOptions = useMemo(() => [
    t('providerAllBookings.filterAll'),
    t('dates.today'),
    t('dates.tomorrow'),
  ], [t]);
  const statusOptions = useMemo(() => [
    t('providerAllBookings.filterAll'),
    getProviderBookingStatusUi('confirmed').label,
    getProviderBookingStatusUi('rescheduled').label,
    getProviderBookingStatusUi('completed').label,
  ], [t]);
  const [query, setQuery] = useState('');
  const [activeView, setActiveView] = useState(t('providerAllBookings.viewList'));
  const [activeCalendarDay, setActiveCalendarDay] = useState('');
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);

  useEffect(() => {
    setActiveView(t('providerAllBookings.viewList'));
    setSelectedFilters(defaultFilters);
    setDraftFilters(defaultFilters);
  }, [defaultFilters, t]);

  const unifiedBookings = useMemo(
    () => activeBookings.map((item) => ({
      ...item,
      name: item.clientName,
      work: item.serviceLabel,
      serviceLabel: item.serviceLabel,
      time: item.scheduledTime,
      timeLabel: item.scheduledTime,
      startMinutes: getStartMinutes(item.scheduledTime),
      statusLabel: getProviderBookingStatusUi(item.status).label,
    })),
    [activeBookings]
  );

  const serviceOptions = useMemo(() => {
    const services = Array.from(new Set(unifiedBookings.map((item) => item.serviceLabel)));
    return [t('providerAllBookings.filterAll'), ...services];
  }, [t, unifiedBookings]);

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return unifiedBookings.filter((item) => {
      const matchesQuery = normalizedQuery.length === 0
        ? true
        : item.name.toLowerCase().includes(normalizedQuery)
          || item.serviceLabel.toLowerCase().includes(normalizedQuery);

      const matchesDay = selectedFilters.day === defaultFilters.day
        ? true
        : getLocalizedRelativeDayLabel(item.dayLabel, t) === selectedFilters.day;
      const matchesStatus = selectedFilters.status === defaultFilters.status ? true : item.statusLabel === selectedFilters.status;
      const matchesService = selectedFilters.service === defaultFilters.service ? true : item.serviceLabel === selectedFilters.service;

      return matchesQuery && matchesDay && matchesStatus && matchesService;
    });
  }, [defaultFilters.day, defaultFilters.service, defaultFilters.status, query, selectedFilters.day, selectedFilters.service, selectedFilters.status, t, unifiedBookings]);

  const groupedBookings = useMemo(() => {
    const groups = {
      [t('dates.today')]: [],
      [t('dates.tomorrow')]: [],
    };

    filteredBookings.forEach((item) => {
      const localizedDayLabel = getLocalizedRelativeDayLabel(item.dayLabel, t);

      if (!groups[localizedDayLabel]) {
        return;
      }

      groups[localizedDayLabel].push(item);
    });

    return dayOptions
      .filter((dayOption) => dayOption !== defaultFilters.day)
      .map((dayOption) => ({
        label: dayOption,
        items: (groups[dayOption] || []).sort((firstItem, secondItem) => firstItem.startMinutes - secondItem.startMinutes),
      }))
      .filter((group) => group.items.length > 0);
  }, [dayOptions, defaultFilters.day, filteredBookings, t]);

  const calendarDayGroups = useMemo(() => {
    const groupsMap = new Map();

    filteredBookings.forEach((item) => {
      const label = getCalendarDayLabel(item);

      if (!groupsMap.has(label)) {
        groupsMap.set(label, {
          key: label,
          label,
          items: [],
        });
      }

      groupsMap.get(label).items.push(item);
    });

    return Array.from(groupsMap.values())
      .map((group) => ({
        ...group,
        sortValue: getCalendarDaySortValue(group.label),
        count: group.items.length,
        items: group.items.sort((firstItem, secondItem) => firstItem.startMinutes - secondItem.startMinutes),
      }))
      .sort((firstGroup, secondGroup) => {
        if (firstGroup.sortValue !== secondGroup.sortValue) {
          return firstGroup.sortValue - secondGroup.sortValue;
        }

        return firstGroup.label.localeCompare(secondGroup.label, locale);
      });
  }, [filteredBookings, locale]);

  useEffect(() => {
    if (!calendarDayGroups.length) {
      return;
    }

    if (!calendarDayGroups.some((day) => day.key === activeCalendarDay)) {
      setActiveCalendarDay(calendarDayGroups[0].key);
    }
  }, [activeCalendarDay, calendarDayGroups]);

  const resolvedCalendarDayGroup = useMemo(() => {
    if (!calendarDayGroups.length) {
      return null;
    }

    return calendarDayGroups.find((day) => day.key === activeCalendarDay) || calendarDayGroups[0];
  }, [activeCalendarDay, calendarDayGroups]);

  const selectedCalendarBookings = useMemo(() => {
    if (!resolvedCalendarDayGroup) {
      return [];
    }

    return resolvedCalendarDayGroup.items;
  }, [resolvedCalendarDayGroup]);

  const hourSlots = useMemo(() => buildHourSlots(selectedCalendarBookings), [selectedCalendarBookings]);

  const calendarBookingsByHour = useMemo(() => {
    const bookingsMap = {};

    selectedCalendarBookings.forEach((item) => {
      const hourBucket = getHourBucket(item.startMinutes);

      if (!bookingsMap[hourBucket]) {
        bookingsMap[hourBucket] = [];
      }

      bookingsMap[hourBucket].push(item);
    });

    Object.keys(bookingsMap).forEach((hourBucket) => {
      bookingsMap[hourBucket].sort((firstItem, secondItem) => firstItem.startMinutes - secondItem.startMinutes);
    });

    return bookingsMap;
  }, [selectedCalendarBookings]);

  const hasActiveFilters = selectedFilters.day !== defaultFilters.day
    || selectedFilters.status !== defaultFilters.status
    || selectedFilters.service !== defaultFilters.service;

  const openMessage = (name) => {
    router.push({ pathname: '/provider/message/messageScreen', params: { name } });
  };

  function openFilterSheet() {
    setDraftFilters(selectedFilters);
    setIsFilterSheetVisible(true);
  }

  function applyFilters() {
    setSelectedFilters(draftFilters);
    setIsFilterSheetVisible(false);
  }

  function resetFilters() {
    setDraftFilters(defaultFilters);
    setSelectedFilters(defaultFilters);
  }

  function openBookingDetails(item) {
    router.push({ pathname: '/provider/upcomingBookingDetail/upcomingBookingDetailScreen', params: { bookingId: item.id } });
  }

  function renderBookingRow(item) {
    return (
      <TouchableOpacity
        key={`${item.dayLabel}-${item.id}`}
        activeOpacity={0.92}
        onPress={() => openBookingDetails(item)}
        style={styles.bookingInfoWrapStyle}
      >
        <View style={styles.bookingIdentityWrapStyle}>
          <Image source={item.image} style={styles.bookingImageStyle} resizeMode="cover" />
          <View style={styles.bookingContentWrapStyle}>
            <Text numberOfLines={1} style={styles.bookingNameText}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.bookingWorkLabelStyle}>
              {item.serviceLabel}
            </Text>
            <Text style={styles.bookingMetaText}>{`${getLocalizedRelativeDayLabel(item.dayLabel, t)} • ${item.time}`}</Text>
          </View>
        </View>
        <View style={styles.actionColumnStyle}>
          <View style={styles.badgesColumnStyle}>
            {renderStatusLabel(item.status, styles.bookingStatusText, styles.bookingStatusWrapStyle)}
            {renderPaymentLabel(item.payment?.status, styles.bookingStatusText, styles.bookingPaymentWrapStyle)}
          </View>
          <View style={styles.bookingActionsRowStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={(event) => {
                event.stopPropagation();
                openMessage(item.name);
              }}
              style={styles.bookingActionButtonStyle}
            >
              <MaterialIcons name="chat" size={17} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={(event) => {
                event.stopPropagation();
                void handleDemoCall(item.name);
              }}
              style={[styles.bookingActionButtonStyle, styles.bookingActionButtonSpacingStyle]}
            >
              <MaterialIcons name="call" size={16} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderCalendarBookingCard(item) {
    return (
      <TouchableOpacity
        key={`calendar-${item.dayLabel}-${item.id}-${item.time}`}
        activeOpacity={0.92}
        onPress={() => openBookingDetails(item)}
        style={styles.calendarCardStyle}
      >
        <View style={styles.calendarCardTopRowStyle}>
          <View style={styles.calendarCardIdentityWrapStyle}>
            <Image source={item.image} style={styles.calendarCardImageStyle} resizeMode="cover" />
            <View style={styles.calendarCardContentWrapStyle}>
              <Text numberOfLines={1} style={styles.calendarCardNameStyle}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={styles.calendarCardServiceStyle}>
                {item.serviceLabel}
              </Text>
            </View>
          </View>
          <View style={styles.calendarTimePillStyle}>
            <MaterialIcons name="schedule" size={14} color={Colors.discoveryAccentColor} />
            <Text style={styles.calendarTimePillTextStyle}>{item.timeLabel}</Text>
          </View>
        </View>

        <View style={styles.calendarCardFooterRowStyle}>
          <View style={styles.calendarBadgeColumnStyle}>
            {renderStatusLabel(item.status, styles.calendarCardStatusTextStyle, styles.calendarCardStatusWrapStyle)}
            {renderPaymentLabel(item.payment?.status, styles.calendarCardStatusTextStyle, styles.calendarCardPaymentStatusWrapStyle)}
          </View>
          <View style={styles.calendarCardActionsRowStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={(event) => {
                event.stopPropagation();
                openMessage(item.name);
              }}
              style={styles.calendarCardActionButtonStyle}
            >
              <MaterialIcons name="chat-bubble-outline" size={16} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={(event) => {
                event.stopPropagation();
                void handleDemoCall(item.name);
              }}
              style={[styles.calendarCardActionButtonStyle, styles.calendarCardActionSpacingStyle]}
            >
              <MaterialIcons name="call" size={15} color={Colors.discoveryMutedColor} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderFilterChips(title, options, selectedValue, onSelectValue) {
    return (
      <View style={styles.filterSectionStyle}>
        <Text style={styles.filterSectionTitleStyle}>{title}</Text>
        <View style={styles.filterOptionsWrapStyle}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => onSelectValue(option)}
              style={({ pressed }) => [
                styles.filterChipStyle,
                selectedValue === option ? styles.filterChipActiveStyle : null,
                pressed ? styles.filterChipPressedStyle : null,
              ]}
            >
              <Text style={[styles.filterChipTextStyle, selectedValue === option ? styles.filterChipTextActiveStyle : null]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  function renderEmptyState(iconName, title, subtitle) {
    return (
      <View style={styles.emptyStateWrapStyle}>
        <View style={styles.emptyStateIconWrapStyle}>
          <MaterialIcons name={iconName} size={22} color={Colors.discoveryMutedColor} />
        </View>
        <Text style={styles.emptyStateTitleStyle}>{title}</Text>
        <Text style={styles.emptyStateSubtitleStyle}>{subtitle}</Text>
      </View>
    );
  }

  function renderListView() {
    if (groupedBookings.length === 0) {
      return renderEmptyState('search-off', t('providerAllBookings.emptyFilteredTitle'), t('providerAllBookings.emptyFilteredBody'));
    }

    return groupedBookings.map((group) => (
      <View key={group.label} style={styles.groupWrapStyle}>
        <Text style={styles.groupLabelStyle}>{group.label}</Text>
        {group.items.map((item) => renderBookingRow(item))}
      </View>
    ));
  }

  function renderCalendarView() {
    if (!calendarDayGroups.length || !resolvedCalendarDayGroup) {
      return (
        <View style={styles.calendarSectionWrapStyle}>
          <View style={styles.calendarEmptyStateWrapStyle}>
            {renderEmptyState('event-busy', t('providerAllBookings.emptyCalendarTitle'), t('providerAllBookings.emptyCalendarBody'))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.calendarSectionWrapStyle}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarDaysScrollerContentStyle}
          style={styles.calendarDaysScrollerStyle}
        >
          {calendarDayGroups.map((day) => {
            const isActive = day.key === resolvedCalendarDayGroup.key;

            return (
              <Pressable
                key={day.key}
                onPress={() => setActiveCalendarDay(day.key)}
                style={({ pressed }) => [
                  styles.calendarDayChipStyle,
                  isActive ? styles.calendarDayChipActiveStyle : null,
                  pressed ? styles.calendarDayChipPressedStyle : null,
                ]}
              >
                <Text style={[styles.calendarDayChipLabelStyle, isActive ? styles.calendarDayChipLabelActiveStyle : null]}>
                  {getLocalizedRelativeDayLabel(day.label, t)}
                </Text>
                <View style={[styles.calendarDayChipCountStyle, isActive ? styles.calendarDayChipCountActiveStyle : null]}>
                  <Text style={[styles.calendarDayChipCountTextStyle, isActive ? styles.calendarDayChipCountTextActiveStyle : null]}>
                    {day.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.calendarTimelineHeaderStyle}>
          <Text style={styles.calendarTimelineTitleStyle}>{getLocalizedRelativeDayLabel(resolvedCalendarDayGroup.label, t)}</Text>
          <Text style={styles.calendarTimelineMetaStyle}>
            {selectedCalendarBookings.length} {selectedCalendarBookings.length === 1 ? t('providerAllBookings.bookingSingular') : t('providerAllBookings.bookingPlural')}
          </Text>
        </View>

        <ScrollView
          style={styles.calendarTimelineScrollerStyle}
          contentContainerStyle={styles.calendarTimelineScrollerContentStyle}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.timelineWrapStyle}>
            {hourSlots.map((slotMinutes) => {
              const hourBookings = calendarBookingsByHour[slotMinutes] || [];

              return (
                <View key={slotMinutes} style={styles.timelineRowStyle}>
                  <View style={styles.timelineHourColumnStyle}>
                    <Text style={styles.timelineHourLabelStyle}>{formatHourLabel(slotMinutes)}</Text>
                  </View>

                  <View style={styles.timelineContentColumnStyle}>
                    <View style={styles.timelineRailStyle} />
                    <View style={styles.timelineMarkerStyle} />

                    {hourBookings.length > 0 ? (
                      <View style={styles.timelineCardsWrapStyle}>
                        {hourBookings.map((item, index) => (
                          <View
                            key={`calendar-slot-${item.dayLabel}-${item.id}-${item.time}`}
                            style={index > 0 ? styles.timelineCardSpacingStyle : null}
                          >
                            {renderCalendarBookingCard(item)}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.timelineEmptySlotStyle}>
                        <View style={styles.timelineEmptySlotLineStyle} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header()}
      {searchAndFilterBar()}
      {activeView === t('providerAllBookings.viewCalendar') ? (
        renderCalendarView()
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listScrollContent}>
          {renderListView()}
        </ScrollView>
      )}
      {filterSheet()}
    </View>
  );

  function searchAndFilterBar() {
    return (
      <View style={styles.searchBarRowStyle}>
        <View style={styles.searchBarShellStyle}>
          <View style={styles.searchInputSegmentStyle}>
            <MaterialIcons name="search" size={20} color={Colors.discoveryMutedColor} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('providerAllBookings.searchPlaceholder')}
              placeholderTextColor={Colors.discoveryMutedColor}
              selectionColor={Colors.discoveryAccentColor}
              style={styles.searchInputStyle}
            />
          </View>

          <View style={styles.searchBarDividerStyle} />

          <View style={styles.searchControlsSegmentStyle}>
            <View style={styles.viewSwitcherCompactWrapStyle}>
              {viewOptions.map((viewOption) => {
                const isActive = activeView === viewOption.value;

                return (
                  <Pressable
                    key={viewOption.value}
                    accessibilityLabel={viewOption.accessibilityLabel}
                    accessibilityRole="button"
                    onPress={() => setActiveView(viewOption.value)}
                    style={({ pressed }) => [
                      styles.viewSwitcherCompactTabStyle,
                      isActive ? styles.viewSwitcherCompactTabActiveStyle : null,
                      pressed ? styles.viewSwitcherCompactTabPressedStyle : null,
                    ]}
                  >
                    <MaterialIcons
                      name={viewOption.icon}
                      size={20}
                      color={isActive ? Colors.whiteColor : Colors.brandSecondaryColor}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.searchControlDividerStyle} />

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={openFilterSheet}
              style={[styles.filterButtonStyle, hasActiveFilters ? styles.filterButtonActiveStyle : null]}
            >
              <MaterialIcons
                name="tune"
                size={20}
                color={hasActiveFilters ? Colors.discoveryAccentColor : Colors.brandSecondaryColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  function filterSheet() {
    return (
      <Modal
        visible={isFilterSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterSheetVisible(false)}
      >
        <View style={styles.sheetOverlayStyle}>
          <Pressable style={styles.sheetBackdropStyle} onPress={() => setIsFilterSheetVisible(false)} />
          <View style={styles.sheetCardStyle}>
            <View style={styles.sheetHandleStyle} />
            <Text style={styles.sheetTitleStyle}>{t('providerAllBookings.filterTitle')}</Text>

            {renderFilterChips(t('providerAllBookings.filterDay'), dayOptions, draftFilters.day, (value) => setDraftFilters((currentFilters) => ({ ...currentFilters, day: value })))}
            {renderFilterChips(t('providerAllBookings.filterStatus'), statusOptions, draftFilters.status, (value) => setDraftFilters((currentFilters) => ({ ...currentFilters, status: value })))}
            {renderFilterChips(t('providerAllBookings.filterService'), serviceOptions, draftFilters.service, (value) => setDraftFilters((currentFilters) => ({ ...currentFilters, service: value })))}

            <TouchableOpacity activeOpacity={0.88} style={styles.secondarySheetButtonStyle} onPress={resetFilters}>
              <Text style={styles.secondarySheetButtonLabelStyle}>{t('providerAllBookings.resetFilters')}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} style={styles.primarySheetButtonStyle} onPress={applyFilters}>
              <Text style={styles.primarySheetButtonLabelStyle}>{t('providerAllBookings.applyFilters')}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.88} style={styles.closeSheetButtonStyle} onPress={() => setIsFilterSheetVisible(false)}>
              <Text style={styles.closeSheetButtonLabelStyle}>{t('providerAllBookings.closeFilters')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function header() {
    return (
      <View style={styles.headerWrapStyle}>
        {canGoBack ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={styles.headerBackButtonStyle}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.brandSecondaryColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBackPlaceholderStyle} />
        )}
        <View style={styles.headerTextWrapStyle}>
          <Text style={styles.headerTitle}>{t('providerAllBookings.headerTitle')}</Text>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  screen: {
    ...DiscoveryPrimitives.screen,
  },
  headerWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: DiscoverySpacing.sm,
    paddingBottom: DiscoverySpacing.xs,
  },
  headerBackButtonStyle: {
    ...DiscoveryPrimitives.softIconButton,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerBackPlaceholderStyle: {
    width: 34,
    height: 34,
  },
  headerTextWrapStyle: {
    marginLeft: DiscoverySpacing.sm,
    flex: 1,
  },
  headerTitle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
  },
  searchBarRowStyle: {
    paddingHorizontal: DiscoverySpacing.xl,
    marginTop: 6,
  },
  searchBarShellStyle: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.whiteColor,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputSegmentStyle: {
    flex: 1,
    minHeight: 44,
    paddingLeft: 8,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarDividerStyle: {
    width: 1,
    height: 24,
    backgroundColor: Colors.discoveryBorderColor,
  },
  searchInputStyle: {
    flex: 1,
    marginLeft: 10,
    ...DiscoveryTypography.bodyMuted,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchControlsSegmentStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    paddingLeft: 6,
  },
  viewSwitcherCompactWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewSwitcherCompactTabStyle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSwitcherCompactTabActiveStyle: {
    backgroundColor: Colors.discoveryAccentColor,
  },
  viewSwitcherCompactTabPressedStyle: {
    opacity: 0.9,
  },
  searchControlDividerStyle: {
    width: 1,
    height: 24,
    backgroundColor: Colors.discoveryBorderColor,
    marginHorizontal: 6,
  },
  filterButtonStyle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActiveStyle: {
    backgroundColor: Colors.discoveryChipBackgroundColor,
  },
  listScrollContent: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingBottom: DiscoverySpacing.xl,
  },
  groupWrapStyle: {
    marginTop: DiscoverySpacing.lg,
  },
  groupLabelStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginBottom: DiscoverySpacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bookingInfoWrapStyle: {
    ...DiscoveryPrimitives.listItemRow,
    alignItems: 'center',
    paddingHorizontal: DiscoverySpacing.md,
    paddingVertical: DiscoverySpacing.md,
    marginBottom: DiscoverySpacing.md,
  },
  bookingIdentityWrapStyle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: DiscoverySpacing.sm,
  },
  bookingImageStyle: {
    width: 58,
    height: 58,
    borderRadius: DiscoveryRadius.md,
  },
  bookingContentWrapStyle: {
    flex: 1,
    minWidth: 0,
    marginLeft: DiscoverySpacing.md,
  },
  bookingNameText: {
    ...Fonts.blackColor16Bold,
    color: Colors.brandSecondaryColor,
  },
  bookingWorkLabelStyle: {
    ...DiscoveryTypography.bodyMuted,
    marginTop: 2,
  },
  bookingMetaText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginTop: DiscoverySpacing.sm,
  },
  actionColumnStyle: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 58,
  },
  badgesColumnStyle: {
    alignItems: 'flex-end',
    marginBottom: DiscoverySpacing.sm,
  },
  bookingStatusWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingPaymentWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.xs,
  },
  bookingStatusText: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginLeft: 4,
  },
  bookingActionsRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingActionButtonStyle: {
    ...DiscoveryPrimitives.softIconButton,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    borderColor: 'transparent',
  },
  bookingActionButtonSpacingStyle: {
    marginLeft: DiscoverySpacing.xs,
  },
  calendarSectionWrapStyle: {
    flex: 1,
    minHeight: 0,
    marginTop: DiscoverySpacing.md,
  },
  calendarDaysScrollerStyle: {
    flexGrow: 0,
    marginBottom: DiscoverySpacing.md,
  },
  calendarDaysScrollerContentStyle: {
    paddingLeft: DiscoverySpacing.xl,
    paddingRight: DiscoverySpacing.md,
  },
  calendarEmptyStateWrapStyle: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: DiscoverySpacing.xl,
  },
  calendarDayChipStyle: {
    minHeight: 48,
    borderRadius: DiscoveryRadius.pill,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.whiteColor,
    paddingLeft: 16,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: DiscoverySpacing.sm,
  },
  calendarDayChipActiveStyle: {
    backgroundColor: Colors.discoveryChipBackgroundColor,
    borderColor: Colors.discoveryAccentColor,
  },
  calendarDayChipPressedStyle: {
    opacity: 0.92,
  },
  calendarDayChipLabelStyle: {
    ...DiscoveryTypography.body,
    color: Colors.brandSecondaryColor,
  },
  calendarDayChipLabelActiveStyle: {
    color: Colors.discoveryAccentColor,
  },
  calendarDayChipCountStyle: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.discoverySoftSurfaceColor,
    marginLeft: 10,
  },
  calendarDayChipCountActiveStyle: {
    backgroundColor: Colors.whiteColor,
  },
  calendarDayChipCountTextStyle: {
    ...Fonts.blackColor12Bold,
    color: Colors.discoveryMutedColor,
  },
  calendarDayChipCountTextActiveStyle: {
    color: Colors.discoveryAccentColor,
  },
  calendarTimelineHeaderStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DiscoverySpacing.xl,
    marginBottom: DiscoverySpacing.md,
  },
  calendarTimelineTitleStyle: {
    ...DiscoveryTypography.sectionTitle,
    color: Colors.brandSecondaryColor,
  },
  calendarTimelineMetaStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
  },
  calendarTimelineScrollerStyle: {
    flex: 1,
    minHeight: 0,
  },
  calendarTimelineScrollerContentStyle: {
    paddingHorizontal: DiscoverySpacing.xl,
    paddingBottom: DiscoverySpacing.xl,
  },
  timelineWrapStyle: {
    paddingBottom: DiscoverySpacing.xs,
  },
  timelineRowStyle: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 82,
  },
  timelineHourColumnStyle: {
    width: 56,
    paddingTop: 2,
  },
  timelineHourLabelStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
  },
  timelineContentColumnStyle: {
    flex: 1,
    paddingLeft: 18,
    paddingBottom: DiscoverySpacing.md,
    position: 'relative',
  },
  timelineRailStyle: {
    position: 'absolute',
    left: 7,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.discoveryBorderColor,
  },
  timelineMarkerStyle: {
    position: 'absolute',
    left: 2,
    top: 4,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.whiteColor,
    borderWidth: 2,
    borderColor: Colors.discoveryAccentColor,
  },
  timelineCardsWrapStyle: {
    flexDirection: 'column',
  },
  timelineCardSpacingStyle: {
    marginTop: DiscoverySpacing.sm,
  },
  timelineEmptySlotStyle: {
    minHeight: 56,
    justifyContent: 'center',
  },
  timelineEmptySlotLineStyle: {
    height: 1,
    backgroundColor: Colors.discoveryBorderColor,
    opacity: 0.65,
    marginLeft: 8,
  },
  calendarCardStyle: {
    backgroundColor: Colors.whiteColor,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    borderRadius: DiscoveryRadius.lg,
    paddingHorizontal: DiscoverySpacing.md,
    paddingVertical: DiscoverySpacing.md,
    marginLeft: 8,
  },
  calendarCardTopRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarCardIdentityWrapStyle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: DiscoverySpacing.sm,
  },
  calendarCardImageStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  calendarCardContentWrapStyle: {
    flex: 1,
    minWidth: 0,
    marginLeft: DiscoverySpacing.sm,
  },
  calendarCardNameStyle: {
    ...Fonts.blackColor14Bold,
    color: Colors.brandSecondaryColor,
  },
  calendarCardServiceStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginTop: 2,
  },
  calendarTimePillStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.discoveryChipBackgroundColor,
    borderRadius: DiscoveryRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  calendarTimePillTextStyle: {
    ...DiscoveryTypography.chip,
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  calendarCardFooterRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: DiscoverySpacing.sm,
  },
  calendarBadgeColumnStyle: {
    alignItems: 'flex-start',
  },
  calendarCardStatusWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarCardPaymentStatusWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DiscoverySpacing.xs,
  },
  calendarCardStatusTextStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    marginLeft: 4,
  },
  calendarCardActionsRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarCardActionButtonStyle: {
    ...DiscoveryPrimitives.softIconButton,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    borderColor: 'transparent',
  },
  calendarCardActionSpacingStyle: {
    marginLeft: DiscoverySpacing.xs,
  },
  sheetOverlayStyle: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropStyle: {
    flex: 1,
    backgroundColor: 'rgba(20,25,35,0.24)',
  },
  sheetCardStyle: {
    backgroundColor: Colors.whiteColor,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: DiscoverySpacing.xl,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandleStyle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.discoveryBorderColor,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetTitleStyle: {
    ...DiscoveryTypography.screenTitle,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 14,
    color: Colors.brandSecondaryColor,
  },
  filterSectionStyle: {
    marginBottom: 12,
  },
  filterSectionTitleStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  filterOptionsWrapStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChipStyle: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.whiteColor,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActiveStyle: {
    backgroundColor: Colors.discoveryChipBackgroundColor,
    borderColor: Colors.discoveryAccentColor,
  },
  filterChipPressedStyle: {
    opacity: 0.9,
  },
  filterChipTextStyle: {
    ...DiscoveryTypography.bodyMuted,
  },
  filterChipTextActiveStyle: {
    ...DiscoveryTypography.chip,
  },
  secondarySheetButtonStyle: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.discoverySoftSurfaceColor,
    marginTop: 8,
    marginBottom: 10,
  },
  secondarySheetButtonLabelStyle: {
    ...DiscoveryTypography.body,
    color: Colors.brandSecondaryColor,
  },
  primarySheetButtonStyle: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.discoveryAccentColor,
  },
  primarySheetButtonLabelStyle: {
    ...DiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
  closeSheetButtonStyle: {
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  closeSheetButtonLabelStyle: {
    ...DiscoveryTypography.caption,
    color: Colors.discoveryMutedColor,
  },
  emptyStateWrapStyle: {
    ...DiscoveryPrimitives.contentSurface,
    marginTop: DiscoverySpacing.lg,
    alignItems: 'center',
    paddingHorizontal: DiscoverySpacing.lg,
    paddingVertical: DiscoverySpacing.xl,
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
  emptyStateSubtitleStyle: {
    ...DiscoveryTypography.bodyMuted,
    textAlign: 'center',
    marginTop: DiscoverySpacing.xs,
  },
});

export default AllBookingsScreen;
