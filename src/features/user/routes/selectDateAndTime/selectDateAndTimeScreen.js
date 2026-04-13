import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { Colors, Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Calendar from "../../../../../components/calendar";
import { useLocale } from "../../../../../context/localeContext";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryRadius, DiscoveryTypography } from "../../../shared/styles/discoverySystem";
import { useProviderAvailability } from "../../../../../hooks/useProviderAvailability";
import {
    buildSlotsForDate,
    isDateSelectable,
} from "../../../shared/utils/providerAvailability";

const ROMANIA_TIMEZONE = 'Europe/Bucharest';

const dateKeyFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROMANIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const dateTimePartsFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROMANIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

function getFormatterParts(formatter, date) {
    return formatter.formatToParts(date).reduce((accumulator, part) => {
        if (part.type !== 'literal') {
            accumulator[part.type] = part.value;
        }

        return accumulator;
    }, {});
}

function capitalizeFirstLetter(value) {
    if (!value) {
        return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function dateKeyToDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function getRomaniaDateKey(date = new Date()) {
    const { day, month, year } = getFormatterParts(dateKeyFormatter, date);
    return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey, days) {
    const nextDate = dateKeyToDate(dateKey);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return getRomaniaDateKey(nextDate);
}

function findNextSelectableDateKey(startDateKey, weekSchedule = [], blockedDateKeys = []) {
    for (let offset = 0; offset < 200; offset += 1) {
        const nextDateKey = addDaysToDateKey(startDateKey, offset);

        if (isDateSelectable(nextDateKey, weekSchedule, blockedDateKeys)) {
            return nextDateKey;
        }
    }

    return startDateKey;
}

function getRomaniaNowParts(date = new Date()) {
    const { day, month, year, hour, minute } = getFormatterParts(dateTimePartsFormatter, date);

    return {
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: Number(hour),
        minute: Number(minute),
    };
}

function findSlotByKey(slots, slotKey) {
    return slots.find((slot) => slot.key === slotKey) ?? null;
}

function isSlotExpired(dateKey, slot, referenceDate = new Date()) {
    if (!slot || dateKey !== getRomaniaDateKey(referenceDate)) {
        return false;
    }

    const { hour, minute } = getRomaniaNowParts(referenceDate);
    const [slotHour, slotMinute] = String(slot.startTime || slot.key || '').split(':').map(Number);
    return hour > slotHour || (hour === slotHour && minute > slotMinute);
}

function getFirstAvailableSlotKey(dateKey, slots, referenceDate = new Date()) {
    return slots.find((slot) => !isSlotExpired(dateKey, slot, referenceDate))?.key ?? null;
}

const SelectDateAndTimeScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { locale, t } = useLocale();
    const resolvedProviderId = typeof params.providerId === 'string' ? params.providerId : null;
    const {
        data: availabilityData,
        blockedDateKeys,
        hasConfiguredAvailability,
    } = useProviderAvailability(resolvedProviderId);
    const fullDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
        timeZone: ROMANIA_TIMEZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }), [locale]);
    const compactDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
        timeZone: ROMANIA_TIMEZONE,
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    }), [locale]);

    const [currentTimeMarker, setCurrentTimeMarker] = useState(Date.now());
    const initialDateKey = useMemo(
        () => findNextSelectableDateKey(getRomaniaDateKey(new Date()), availabilityData.weekSchedule, blockedDateKeys),
        [availabilityData.weekSchedule, blockedDateKeys]
    );
    const [selectedDate, setSelectedDate] = useState(initialDateKey);
    const slots = useMemo(
        () => buildSlotsForDate(selectedDate, availabilityData.weekSchedule, blockedDateKeys),
        [availabilityData.weekSchedule, blockedDateKeys, selectedDate]
    );
    const [selectedSlot, setSelectedSlot] = useState(null);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTimeMarker(Date.now());
        }, 60000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const referenceDate = new Date(currentTimeMarker);
        const selectedSlotDetails = findSlotByKey(slots, selectedSlot);

        if (selectedSlotDetails && !isSlotExpired(selectedDate, selectedSlotDetails, referenceDate)) {
            return;
        }

        setSelectedSlot(getFirstAvailableSlotKey(selectedDate, slots, referenceDate));
    }, [currentTimeMarker, selectedDate, selectedSlot, slots]);

    useEffect(() => {
        if (isDateSelectable(selectedDate, availabilityData.weekSchedule, blockedDateKeys)) {
            return;
        }

        const nextDateKey = findNextSelectableDateKey(
            getRomaniaDateKey(new Date()),
            availabilityData.weekSchedule,
            blockedDateKeys,
        );
        setSelectedDate(nextDateKey);
        setSelectedSlot(getFirstAvailableSlotKey(nextDateKey, buildSlotsForDate(nextDateKey, availabilityData.weekSchedule, blockedDateKeys), new Date(currentTimeMarker)));
    }, [availabilityData.weekSchedule, blockedDateKeys, currentTimeMarker, selectedDate]);

    function formatDisplayDate(dateKey) {
        return capitalizeFirstLetter(fullDateFormatter.format(dateKeyToDate(dateKey)));
    }

    function formatCompactDisplayDate(dateKey) {
        return capitalizeFirstLetter(compactDateFormatter.format(dateKeyToDate(dateKey)).replace(/\./g, ''));
    }

    const referenceDate = new Date(currentTimeMarker);
    const calendarDisabledDateKeys = useMemo(() => {
        const startDateKey = getRomaniaDateKey(new Date(currentTimeMarker));
        const nextDisabledDateKeys = [];

        for (let offset = 0; offset < 90; offset += 1) {
            const nextDateKey = addDaysToDateKey(startDateKey, offset);

            if (!isDateSelectable(nextDateKey, availabilityData.weekSchedule, blockedDateKeys)) {
                nextDisabledDateKeys.push(nextDateKey);
            }
        }

        return nextDisabledDateKeys;
    }, [availabilityData.weekSchedule, blockedDateKeys, currentTimeMarker]);
    const selectedSlotDetails = findSlotByKey(slots, selectedSlot);
    const selectedSlotLabel = selectedSlotDetails?.label ?? t('selectDateTime.noSlotSelected');
    const availableSlotCount = slots.filter((slot) => !isSlotExpired(selectedDate, slot, referenceDate)).length;
    const hasValidSelection = Boolean(selectedSlotDetails) && !isSlotExpired(selectedDate, selectedSlotDetails, referenceDate);
    const bookingSummary = hasValidSelection
        ? `${formatCompactDisplayDate(selectedDate)} • ${selectedSlotLabel}`
        : (hasConfiguredAvailability ? t('selectDateTime.slotUnavailablePrompt') : t('selectDateTime.noProviderAvailability'));

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.brandSecondaryColor} />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {calendarInfo()}
                    {slotInfo()}
                </ScrollView>
            </View>
            {continueButton()}
        </View>
    );

    function continueButton() {
        return (
            <View style={styles.footerWrap}>
                <View style={styles.footerSummaryWrap}>
                    <Text style={styles.footerSummaryText}>{bookingSummary}</Text>
                </View>
            
                <TouchableOpacity
                    activeOpacity={0.99}
                    disabled={!hasValidSelection}
                    onPress={() => router.push({
                        pathname: '/user/selectAddress/selectAddressScreen',
                        params: {
                            ...params,
                            scheduledDateKey: selectedDate,
                            scheduledStartTime: selectedSlotDetails?.startTime || selectedSlot,
                            timezone: ROMANIA_TIMEZONE,
                            dateLabel: formatCompactDisplayDate(selectedDate),
                            timeLabel: selectedSlotLabel,
                        },
                    })}
                    style={[
                        styles.continueButtonStyle,
                        !hasValidSelection ? styles.disabledContinueButtonStyle : null,
                    ]}
                >
                    <Text style={styles.continueButtonText}>{t('selectDateTime.continueToAddress')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    function calendarInfo() {
        return (
            <View style={styles.calendarCard}>
                <View style={DiscoveryPrimitives.chip}>
                    <Text style={DiscoveryTypography.chip}>{t('selectDateTime.selectedDateChip')}</Text>
                </View>
                <Text style={styles.selectedDateText}>{formatDisplayDate(selectedDate)}</Text>
                {!hasConfiguredAvailability ? (
                    <Text style={styles.calendarHintText}>{t('selectDateTime.noProviderAvailability')}</Text>
                ) : calendarDisabledDateKeys.length ? (
                    <Text style={styles.calendarHintText}>
                        {t('selectDateTime.unavailableDaysHint', { count: calendarDisabledDateKeys.length })}
                    </Text>
                ) : null}
               
                <View style={styles.calendarWrap}>
                    <Calendar
                        disabledDateKeys={calendarDisabledDateKeys}
                        onSelectDate={setSelectedDate}
                        selected={selectedDate}
                    />
                </View>
            </View>
        );
    }

    function slotInfo() {
        const renderItem = ({ item }) => {
            const isSelected = selectedSlot === item.key;
            const isExpired = isSlotExpired(selectedDate, item, referenceDate);

            return (
                <TouchableOpacity
                    activeOpacity={0.96}
                    disabled={isExpired}
                    style={styles.slotItemOuter}
                    onPress={() => setSelectedSlot(item.key)}
                >
                    <View
                        style={[
                            styles.slotWrapStyle,
                            isSelected ? styles.selectedSlotWrapStyle : null,
                            isExpired ? styles.expiredSlotWrapStyle : null,
                        ]}
                    >
                        <Text
                            style={[
                                styles.slotText,
                                isSelected ? styles.selectedSlotText : null,
                                isExpired ? styles.expiredSlotText : null,
                            ]}
                        >
                            {item.label}
                        </Text>
                        <Text
                            style={[
                                styles.slotStateText,
                                isSelected ? styles.selectedSlotStateText : null,
                                isExpired ? styles.expiredSlotStateText : null,
                            ]}
                        >
                            {isExpired
                                ? t('selectDateTime.slotExpired')
                                : isSelected
                                    ? t('selectDateTime.slotSelected')
                                    : t('selectDateTime.slotAvailable')}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <View style={styles.slotCard}>
                <View style={styles.slotTitleRow}>
                    <View style={styles.slotTitleWrap}>
                        <Text style={styles.slotTitle}>{t('selectDateTime.slotTitle')}</Text>
                        <Text style={styles.cardSupportText}>
                            {!hasConfiguredAvailability
                                ? t('selectDateTime.noProviderAvailability')
                                : availableSlotCount > 0
                                ? t('selectDateTime.slotCount', { count: availableSlotCount })
                                : t('selectDateTime.noSlots')}
                        </Text>
                    </View>
                    <View style={[styles.slotSelectionBadge, !hasValidSelection ? styles.slotSelectionBadgeMuted : null]}>
                        <Text style={[styles.slotSelectionBadgeText, !hasValidSelection ? styles.slotSelectionBadgeTextMuted : null]}>
                            {selectedSlotLabel}
                        </Text>
                    </View>
                </View>
                <FlatList
                    data={slots}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={styles.slotRow}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.slotListContent}
                    scrollEnabled={false}
                />
            </View>
        );
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
                    <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
                </TouchableOpacity>
                <Text style={styles.headerEyebrow}>Rezervare</Text>
                <Text style={styles.headerTitle}>Selectează data și ora</Text>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    headerWrapStyle: {
        ...DiscoveryPrimitives.headerSurface,
        backgroundColor: Colors.brandSecondaryColor,
        paddingBottom: DiscoverySpacing.lg,
    },
    headerEyebrow: {
        ...DiscoveryTypography.heroEyebrow,
        marginTop: DiscoverySpacing.md,
    },
    headerTitle: {
        ...DiscoveryTypography.heroTitle,
        marginTop: DiscoverySpacing.xs,
        fontSize: 26,
        lineHeight: 32,
        maxWidth: '88%',
    },
    headerSubtitle: {
        ...DiscoveryTypography.heroBody,
        marginTop: DiscoverySpacing.xs,
        maxWidth: '84%',
    },
    scrollContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.lg,
        paddingBottom: DiscoverySpacing.xxl,
    },
    calendarCard: {
        ...DiscoveryPrimitives.elevatedSurface,
        padding: DiscoverySpacing.lg,
    },
    selectedDateText: {
        ...Fonts.blackColor20Bold,
        color: Colors.brandSecondaryColor,
        marginTop: DiscoverySpacing.md,
        lineHeight: 28,
    },
    calendarHintText: {
        ...DiscoveryTypography.caption,
        marginTop: DiscoverySpacing.sm,
    },
    cardSupportText: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.xs,
    },
    timezoneNoteWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: DiscoverySpacing.md,
        paddingHorizontal: DiscoverySpacing.md,
        paddingVertical: DiscoverySpacing.sm,
        borderRadius: DiscoveryRadius.md,
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderWidth: 1,
        borderColor: Colors.discoveryBorderColor,
    },
    timezoneNoteText: {
        ...DiscoveryTypography.caption,
        flex: 1,
        color: Colors.discoveryMutedColor,
        marginLeft: DiscoverySpacing.sm,
    },
    calendarWrap: {
        marginTop: DiscoverySpacing.lg,
    },
    slotCard: {
        ...DiscoveryPrimitives.contentSurface,
        padding: DiscoverySpacing.lg,
        marginTop: DiscoverySpacing.lg,
    },
    slotTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    slotTitleWrap: {
        flex: 1,
        paddingRight: DiscoverySpacing.md,
    },
    slotTitle: {
        ...Fonts.blackColor20Bold,
        color: Colors.brandSecondaryColor,
    },
    slotSelectionBadge: {
        maxWidth: '42%',
        paddingHorizontal: DiscoverySpacing.md,
        paddingVertical: DiscoverySpacing.sm,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: Colors.discoveryChipBackgroundColor,
        borderWidth: 1,
        borderColor: Colors.discoveryBorderColor,
    },
    slotSelectionBadgeMuted: {
        backgroundColor: Colors.discoverySoftSurfaceColor,
    },
    slotSelectionBadgeText: {
        ...Fonts.primaryColor14Medium,
        color: Colors.discoveryAccentColor,
        textAlign: 'center',
    },
    slotSelectionBadgeTextMuted: {
        color: Colors.discoveryMutedColor,
    },
    slotListContent: {
        paddingTop: DiscoverySpacing.lg,
    },
    slotRow: {
        justifyContent: 'space-between',
        marginBottom: DiscoverySpacing.md,
    },
    slotItemOuter: {
        width: '48.5%',
    },
    slotWrapStyle: {
        minHeight: 82,
        borderRadius: DiscoveryRadius.lg,
        justifyContent: 'center',
        borderWidth: 1,
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderColor: Colors.discoveryBorderColor,
        paddingHorizontal: DiscoverySpacing.md,
        paddingVertical: DiscoverySpacing.md,
    },
    selectedSlotWrapStyle: {
        backgroundColor: Colors.discoveryAccentColor,
        borderColor: Colors.discoveryAccentColor,
    },
    expiredSlotWrapStyle: {
        backgroundColor: Colors.discoveryChipBackgroundColor,
        borderColor: Colors.discoveryBorderColor,
        opacity: 0.9,
    },
    slotText: {
        ...Fonts.blackColor16Bold,
        color: Colors.brandSecondaryColor,
    },
    selectedSlotText: {
        color: Colors.whiteColor,
    },
    expiredSlotText: {
        color: Colors.discoverySubtleTextColor,
    },
    slotStateText: {
        ...DiscoveryTypography.caption,
        marginTop: DiscoverySpacing.xs,
        color: Colors.discoveryMutedColor,
    },
    selectedSlotStateText: {
        color: 'rgba(255,255,255,0.82)',
    },
    expiredSlotStateText: {
        color: Colors.discoverySubtleTextColor,
    },
    footerWrap: {
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.xl,
        borderTopLeftRadius: DiscoveryRadius.lg,
        borderTopRightRadius: DiscoveryRadius.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.discoveryBorderColor,
    },
    footerSummaryWrap: {
        marginBottom: DiscoverySpacing.md,
    },
    footerSummaryLabel: {
        ...DiscoveryTypography.caption,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    footerSummaryText: {
        ...Fonts.blackColor16Bold,
        color: Colors.brandSecondaryColor,
        marginTop: 4,
    },
    footerHelperText: {
        ...DiscoveryTypography.caption,
        marginBottom: DiscoverySpacing.md,
    },
    continueButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
    },
    disabledContinueButtonStyle: {
        backgroundColor: Colors.discoveryMutedColor,
        shadowOpacity: 0,
        elevation: 0,
    },
    continueButtonText: {
        ...Fonts.whiteColor16Bold,
    },
});

export default SelectDateAndTimeScreen;
