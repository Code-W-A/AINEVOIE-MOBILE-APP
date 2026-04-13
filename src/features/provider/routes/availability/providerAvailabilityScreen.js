import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Snackbar, TextInput } from 'react-native-paper';
import { useNavigation } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import Calendar from '../../../../../components/calendar';
import { Colors } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import {
  getProviderWeekDays,
  useProviderAvailability,
} from '../../../../../hooks/useProviderAvailability';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../../shared/styles/discoverySystem';

const DEFAULT_RANGE_START = '09:00';
const DEFAULT_RANGE_END = '17:00';
const ROMANIA_TIMEZONE = 'Europe/Bucharest';

const dateKeyFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ROMANIA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function buildTimeOptions() {
  const options = [];

  for (let hour = 6; hour <= 22; hour += 1) {
    ['00', '30'].forEach((minutes) => {
      options.push(`${String(hour).padStart(2, '0')}:${minutes}`);
    });
  }

  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function createEmptySchedule(locale = 'ro') {
  return getProviderWeekDays(locale).map((day) => ({
    dayKey: day.dayKey,
    label: day.label,
    shortLabel: day.shortLabel,
    isEnabled: false,
    timeRanges: [],
  }));
}

function getFormatterParts(formatter, date) {
  return formatter.formatToParts(date).reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
}

function getRomaniaDateKey(date = new Date()) {
  const { day, month, year } = getFormatterParts(dateKeyFormatter, date);
  return `${year}-${month}-${day}`;
}

function dateKeyToDate(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function capitalizeFirstLetter(value) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function minutesFromTime(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return (hours * 60) + minutes;
}

function sortRanges(timeRanges) {
  return [...timeRanges].sort((firstRange, secondRange) => (
    minutesFromTime(firstRange.startTime) - minutesFromTime(secondRange.startTime)
  ));
}

function validateSchedule(schedule, t) {
  const errors = {};

  schedule.forEach((day) => {
    if (!day.isEnabled) {
      return;
    }

    if (!day.timeRanges.length) {
      errors[day.dayKey] = t('providerAvailability.validationMissingRange');
      return;
    }

    const sortedRanges = sortRanges(day.timeRanges);

    for (let index = 0; index < sortedRanges.length; index += 1) {
      const currentRange = sortedRanges[index];
      const startMinutes = minutesFromTime(currentRange.startTime);
      const endMinutes = minutesFromTime(currentRange.endTime);

      if (startMinutes >= endMinutes) {
        errors[day.dayKey] = t('providerAvailability.validationOrder');
        return;
      }

      if (index > 0) {
        const previousRange = sortedRanges[index - 1];
        const previousEndMinutes = minutesFromTime(previousRange.endTime);

        if (startMinutes < previousEndMinutes) {
          errors[day.dayKey] = t('providerAvailability.validationOverlap');
          return;
        }
      }
    }
  });

  return errors;
}

function getNextDefaultRange(timeRanges) {
  if (!timeRanges.length) {
    return {
      id: `range_${Date.now()}`,
      startTime: DEFAULT_RANGE_START,
      endTime: DEFAULT_RANGE_END,
    };
  }

  const lastRange = sortRanges(timeRanges)[timeRanges.length - 1];
  const proposedStartIndex = Math.max(TIME_OPTIONS.indexOf(lastRange.endTime), 0);
  const proposedEndIndex = Math.min(proposedStartIndex + 2, TIME_OPTIONS.length - 1);

  return {
    id: `range_${Date.now()}`,
    startTime: TIME_OPTIONS[proposedStartIndex] || DEFAULT_RANGE_START,
    endTime: TIME_OPTIONS[proposedEndIndex] || DEFAULT_RANGE_END,
  };
}

export default function ProviderAvailabilityScreen() {
  const navigation = useNavigation();
  const { locale, t } = useLocale();
  const {
    data,
    isLoading,
    hasConfiguredAvailability,
    blockedDateKeys,
    saveProviderAvailability,
  } = useProviderAvailability();
  const [draftSchedule, setDraftSchedule] = useState(() => createEmptySchedule(locale));
  const [dayErrors, setDayErrors] = useState({});
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [pickerState, setPickerState] = useState(null);
  const [selectedBlockedDate, setSelectedBlockedDate] = useState(() => getRomaniaDateKey(new Date()));
  const [blockedDateNote, setBlockedDateNote] = useState('');
  const [blockedDateError, setBlockedDateError] = useState('');
  const fullDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
    timeZone: ROMANIA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }), [locale]);

  useEffect(() => {
    setDraftSchedule(data.weekSchedule);
  }, [data.weekSchedule]);

  const isDraftEmpty = useMemo(
    () => !draftSchedule.some((day) => day.isEnabled && day.timeRanges.length > 0),
    [draftSchedule]
  );

  function formatBlockedDateLabel(dateKey) {
    return capitalizeFirstLetter(fullDateFormatter.format(dateKeyToDate(dateKey)));
  }

  function updateDay(dayKey, updater) {
    setDraftSchedule((currentSchedule) => currentSchedule.map((day) => (
      day.dayKey === dayKey ? updater(day) : day
    )));
  }

  function handleToggleDay(dayKey, nextValue) {
    updateDay(dayKey, (day) => ({
      ...day,
      isEnabled: nextValue,
      timeRanges: nextValue ? (day.timeRanges.length ? day.timeRanges : [getNextDefaultRange([])]) : [],
    }));
    setDayErrors((currentErrors) => ({ ...currentErrors, [dayKey]: undefined }));
  }

  function handleAddRange(dayKey) {
    updateDay(dayKey, (day) => ({
      ...day,
      isEnabled: true,
      timeRanges: [...day.timeRanges, getNextDefaultRange(day.timeRanges)],
    }));
    setDayErrors((currentErrors) => ({ ...currentErrors, [dayKey]: undefined }));
  }

  function handleDeleteRange(dayKey, rangeId) {
    updateDay(dayKey, (day) => ({
      ...day,
      timeRanges: day.timeRanges.filter((range) => range.id !== rangeId),
    }));
  }

  function handleTimeSelect(time) {
    if (!pickerState) {
      return;
    }

    updateDay(pickerState.dayKey, (day) => ({
      ...day,
      timeRanges: day.timeRanges.map((range) => (
        range.id === pickerState.rangeId
          ? { ...range, [pickerState.field]: time }
          : range
      )),
    }));
    setPickerState(null);
    setDayErrors((currentErrors) => ({ ...currentErrors, [pickerState.dayKey]: undefined }));
  }

  function handleCopyToWeekdays() {
    const sourceDay = draftSchedule.find((day) => day.isEnabled && day.timeRanges.length > 0);

    if (!sourceDay) {
      setSnackbarMessage(t('providerAvailability.copiedMissing'));
      return;
    }

    const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    setDraftSchedule((currentSchedule) => currentSchedule.map((day) => {
      if (!weekdayKeys.includes(day.dayKey)) {
        return day;
      }

      return {
        ...day,
        isEnabled: true,
        timeRanges: sourceDay.timeRanges.map((range, index) => ({
          ...range,
          id: `${day.dayKey}_${index}_${range.startTime}_${range.endTime}`,
        })),
      };
    }));
    setSnackbarMessage(t('providerAvailability.copiedSuccess'));
  }

  function handleResetSchedule() {
    Alert.alert(
      t('providerAvailability.resetTitle'),
      t('providerAvailability.resetBody'),
      [
        { text: t('providerAvailability.resetCancel'), style: 'cancel' },
        {
          text: t('providerAvailability.resetConfirm'),
          style: 'destructive',
          onPress: () => {
            setDraftSchedule(createEmptySchedule(locale));
            setDayErrors({});
            setSnackbarMessage(t('providerAvailability.resetSuccess'));
          },
        },
      ]
    );
  }

  async function handleSave() {
    const nextErrors = validateSchedule(draftSchedule, t);
    setDayErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSnackbarMessage(t('providerAvailability.saveValidationError'));
      return;
    }

    await saveProviderAvailability((current) => ({
      ...current,
      weekSchedule: draftSchedule,
    }));
    setSnackbarMessage(t('providerAvailability.saveSuccess'));
  }

  async function handleAddBlockedDate() {
    if (!selectedBlockedDate) {
      setBlockedDateError(t('providerAvailability.selectDateError'));
      return;
    }

    await saveProviderAvailability((current) => {
      const existingDates = Array.isArray(current.blockedDates) ? current.blockedDates : [];
      const existingIndex = existingDates.findIndex((item) => item.dateKey === selectedBlockedDate);
      const nextBlockedDate = {
        id: existingIndex >= 0 ? existingDates[existingIndex].id : `blocked_${Date.now()}`,
        dateKey: selectedBlockedDate,
        note: blockedDateNote.trim(),
        createdAt: existingIndex >= 0 ? existingDates[existingIndex].createdAt : new Date().toISOString(),
      };
      const nextBlockedDates = [...existingDates];

      if (existingIndex >= 0) {
        nextBlockedDates[existingIndex] = nextBlockedDate;
      } else {
        nextBlockedDates.push(nextBlockedDate);
      }

      return {
        ...current,
        blockedDates: nextBlockedDates,
      };
    });

    setBlockedDateNote('');
    setBlockedDateError('');
    setSnackbarMessage(
      blockedDateKeys.includes(selectedBlockedDate)
        ? t('providerAvailability.blockedUpdated')
        : t('providerAvailability.blockedAdded')
    );
  }

  async function handleRemoveBlockedDate(blockedDateId) {
    await saveProviderAvailability((current) => ({
      ...current,
      blockedDates: (current.blockedDates || []).filter((item) => item.id !== blockedDateId),
    }));
    setSnackbarMessage(t('providerAvailability.blockedRemoved'));
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        {renderTopActions()}
        {renderBlockedDatesSection()}
        {!hasConfiguredAvailability && isDraftEmpty ? renderEmptyState() : null}
        {isLoading ? renderLoadingState() : null}
        {!isLoading ? draftSchedule.map(renderDayCard) : null}
      </ScrollView>
      {renderFooter()}
      {renderTimePickerModal()}
      <Snackbar visible={Boolean(snackbarMessage)} onDismiss={() => setSnackbarMessage('')} duration={2400}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );

  function renderHeader() {
    return (
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('providerAvailability.headerTitle')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('providerAvailability.headerSubtitle')}</Text>
      </View>
    );
  }

  function renderTopActions() {
    return (
      <View style={styles.topActionsRowStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={handleCopyToWeekdays} style={styles.secondaryActionButtonStyle}>
          <MaterialCommunityIcons name="content-copy" size={18} color={AinevoieDiscoveryTokens.textPrimary} />
          <Text style={styles.secondaryActionTextStyle}>{t('providerAvailability.copyWeekdays')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} onPress={handleResetSchedule} style={styles.resetActionButtonStyle}>
          <MaterialCommunityIcons name="restart" size={18} color="#D94841" />
          <Text style={styles.resetActionTextStyle}>{t('providerAvailability.reset')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderEmptyState() {
    return (
      <View style={styles.emptyStateWrapStyle}>
        <View style={styles.emptyStateIconWrapStyle}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={22} color={AinevoieDiscoveryTokens.accentDark} />
        </View>
        <Text style={styles.emptyStateTitleStyle}>{t('providerAvailability.emptyTitle')}</Text>
        <Text style={styles.emptyStateTextStyle}>{t('providerAvailability.emptyBody')}</Text>
      </View>
    );
  }

  function renderLoadingState() {
    return (
      <View style={styles.loadingWrapStyle}>
        <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.accent} />
        <Text style={styles.loadingTextStyle}>{t('providerAvailability.loading')}</Text>
      </View>
    );
  }

  function renderBlockedDatesSection() {
    return (
      <View style={styles.blockedDatesCardStyle}>
        <Text style={styles.blockedDatesTitleStyle}>{t('providerAvailability.blockedDatesTitle')}</Text>
        <Text style={styles.blockedDatesSubtitleStyle}>{t('providerAvailability.blockedDatesSubtitle')}</Text>

        <View style={styles.calendarWrapStyle}>
          <Calendar
            disabledDateKeys={blockedDateKeys}
            onSelectDate={(dateKey) => {
              setSelectedBlockedDate(dateKey);
              if (blockedDateError) {
                setBlockedDateError('');
              }
            }}
            selected={selectedBlockedDate}
          />
        </View>

        <TextInput
          label={t('providerAvailability.noteLabel')}
          mode="outlined"
          value={blockedDateNote}
          onChangeText={setBlockedDateNote}
          placeholder={t('providerAvailability.notePlaceholder')}
          outlineColor={blockedDateError ? '#D94841' : AinevoieDiscoveryTokens.borderSubtle}
          activeOutlineColor={AinevoieDiscoveryTokens.accent}
          textColor={AinevoieDiscoveryTokens.textPrimary}
          selectionColor={AinevoieDiscoveryTokens.accent}
          theme={{
            colors: {
              background: AinevoieDiscoveryTokens.surfaceCard,
              onSurfaceVariant: AinevoieDiscoveryTokens.textSecondary,
              primary: AinevoieDiscoveryTokens.accent,
            },
            roundness: 20,
          }}
          style={styles.blockedDateInputStyle}
        />
        {blockedDateError ? <Text style={styles.errorTextStyle}>{blockedDateError}</Text> : null}

        <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleAddBlockedDate(); }} style={styles.blockedDateButtonStyle}>
          <MaterialIcons name="block" size={18} color={Colors.whiteColor} />
          <Text style={styles.blockedDateButtonTextStyle}>{t('providerAvailability.blockSelectedDate')}</Text>
        </TouchableOpacity>

        {(data.blockedDates || []).length ? (
          <View style={styles.blockedDatesListWrapStyle}>
            {(data.blockedDates || []).map((item) => (
              <View key={item.id} style={styles.blockedDateRowStyle}>
                <View style={styles.blockedDateTextWrapStyle}>
                  <Text style={styles.blockedDateLabelStyle}>{formatBlockedDateLabel(item.dateKey)}</Text>
                  <Text style={styles.blockedDateMetaStyle}>{item.note || t('providerAvailability.noExtraNote')}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.88} onPress={() => { void handleRemoveBlockedDate(item.id); }} style={styles.blockedDateDeleteButtonStyle}>
                  <MaterialIcons name="close" size={18} color="#D94841" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.blockedDateEmptyTextStyle}>{t('providerAvailability.blockedEmpty')}</Text>
        )}
      </View>
    );
  }

  function renderDayCard(day) {
    return (
      <View key={day.dayKey} style={styles.dayCardStyle}>
        <View style={styles.dayHeaderRowStyle}>
          <View>
            <Text style={styles.dayLabelStyle}>{day.label}</Text>
            <Text style={styles.dayMetaTextStyle}>
              {day.isEnabled
                ? t('providerAvailability.intervalsConfigured', { count: day.timeRanges.length })
                : t('providerAvailability.unavailableDay')}
            </Text>
          </View>
          <Switch
            value={day.isEnabled}
            onValueChange={(nextValue) => handleToggleDay(day.dayKey, nextValue)}
            trackColor={{
              false: '#D8DEE8',
              true: AinevoieDiscoveryTokens.accent,
            }}
            thumbColor={Colors.whiteColor}
          />
        </View>

        {day.isEnabled ? (
          <>
            {day.timeRanges.map((range, index) => (
              <View key={range.id} style={styles.rangeRowStyle}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setPickerState({ dayKey: day.dayKey, rangeId: range.id, field: 'startTime', title: `${day.label} · ${t('providerAvailability.from')}` })}
                  style={styles.timeFieldStyle}
                >
                  <Text style={styles.timeFieldLabelStyle}>{t('providerAvailability.from')}</Text>
                  <Text style={styles.timeFieldValueStyle}>{range.startTime}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setPickerState({ dayKey: day.dayKey, rangeId: range.id, field: 'endTime', title: `${day.label} · ${t('providerAvailability.until')}` })}
                  style={styles.timeFieldStyle}
                >
                  <Text style={styles.timeFieldLabelStyle}>{t('providerAvailability.until')}</Text>
                  <Text style={styles.timeFieldValueStyle}>{range.endTime}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => handleDeleteRange(day.dayKey, range.id)}
                  style={[styles.iconOnlyButtonStyle, index === 0 && day.timeRanges.length === 1 ? styles.iconOnlyButtonMutedStyle : null]}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#D94841" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity activeOpacity={0.88} onPress={() => handleAddRange(day.dayKey)} style={styles.addRangeButtonStyle}>
              <MaterialIcons name="add" size={18} color={AinevoieDiscoveryTokens.accentDark} />
              <Text style={styles.addRangeButtonTextStyle}>{t('providerAvailability.addRange')}</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {dayErrors[day.dayKey] ? <Text style={styles.errorTextStyle}>{dayErrors[day.dayKey]}</Text> : null}
      </View>
    );
  }

  function renderFooter() {
    return (
      <View style={styles.footerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.goBack()} style={styles.secondaryFooterButtonStyle}>
          <Text style={styles.secondaryFooterButtonTextStyle}>{t('providerAvailability.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleSave(); }} style={styles.saveButtonStyle}>
          <Text style={styles.saveButtonTextStyle}>{t('providerAvailability.saveSchedule')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderTimePickerModal() {
    if (!pickerState) {
      return null;
    }

    return (
      <Modal transparent animationType="slide" visible onRequestClose={() => setPickerState(null)}>
        <View style={styles.modalOverlayStyle}>
          <Pressable style={styles.modalBackdropStyle} onPress={() => setPickerState(null)} />
          <View style={styles.modalSheetStyle}>
            <View style={styles.modalHandleStyle} />
            <Text style={styles.modalTitleStyle}>{pickerState.title}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalOptionsWrapStyle}>
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={`${pickerState.field}-${time}`}
                  activeOpacity={0.88}
                  onPress={() => handleTimeSelect(time)}
                  style={[
                    styles.timeOptionStyle,
                    time === draftSchedule
                      .find((day) => day.dayKey === pickerState.dayKey)
                      ?.timeRanges.find((range) => range.id === pickerState.rangeId)?.[pickerState.field]
                      ? styles.timeOptionActiveStyle
                      : null,
                  ]}
                >
                  <Text style={[
                    styles.timeOptionTextStyle,
                    time === draftSchedule
                      .find((day) => day.dayKey === pickerState.dayKey)
                      ?.timeRanges.find((range) => range.id === pickerState.rangeId)?.[pickerState.field]
                      ? styles.timeOptionTextActiveStyle
                      : null,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AinevoieDiscoveryTokens.appBackground,
  },
  headerWrapStyle: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerBackButtonStyle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginBottom: 16,
  },
  headerTitleStyle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  headerSubtitleStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  scrollContentStyle: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 128,
  },
  topActionsRowStyle: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  secondaryActionButtonStyle: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 8,
    paddingHorizontal: 14,
  },
  secondaryActionTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginLeft: 8,
    textAlign: 'center',
  },
  resetActionButtonStyle: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F5C8C4',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  resetActionTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: '#D94841',
    marginLeft: 8,
  },
  emptyStateWrapStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  blockedDatesCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },
  blockedDatesTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  blockedDatesSubtitleStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  calendarWrapStyle: {
    marginTop: 16,
  },
  blockedDateInputStyle: {
    marginTop: 16,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
  },
  blockedDateButtonStyle: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: AinevoieDiscoveryTokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 14,
  },
  blockedDateButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
    marginLeft: 8,
  },
  blockedDatesListWrapStyle: {
    marginTop: 16,
  },
  blockedDateRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  blockedDateTextWrapStyle: {
    flex: 1,
    marginRight: 10,
  },
  blockedDateLabelStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  blockedDateMetaStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 4,
  },
  blockedDateDeleteButtonStyle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F5C8C4',
  },
  blockedDateEmptyTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 14,
  },
  emptyStateIconWrapStyle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  emptyStateTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 19,
  },
  loadingWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingVertical: 16,
    marginBottom: 16,
  },
  loadingTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginLeft: 10,
  },
  dayCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
  },
  dayHeaderRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabelStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  dayMetaTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 4,
  },
  rangeRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  timeFieldStyle: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  timeFieldLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
  },
  timeFieldValueStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
    marginTop: 6,
  },
  iconOnlyButtonStyle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5C8C4',
    backgroundColor: '#FFF5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnlyButtonMutedStyle: {
    opacity: 1,
  },
  addRangeButtonStyle: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 14,
  },
  addRangeButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.accentDark,
    marginLeft: 8,
    fontWeight: '700',
  },
  errorTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: '#D94841',
    marginTop: 12,
  },
  footerWrapStyle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: AinevoieDiscoveryTokens.borderSubtle,
    flexDirection: 'row',
  },
  secondaryFooterButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginRight: 10,
  },
  secondaryFooterButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  saveButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.accent,
    marginLeft: 10,
  },
  saveButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
  modalOverlayStyle: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropStyle: {
    flex: 1,
    backgroundColor: 'rgba(9, 17, 28, 0.32)',
  },
  modalSheetStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
    maxHeight: '65%',
  },
  modalHandleStyle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: '#D8DEE8',
    marginBottom: 18,
  },
  modalTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginBottom: 16,
  },
  modalOptionsWrapStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 10,
  },
  timeOptionStyle: {
    minWidth: '30%',
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '3.333%',
    marginBottom: 10,
  },
  timeOptionActiveStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderColor: AinevoieDiscoveryTokens.accent,
  },
  timeOptionTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  timeOptionTextActiveStyle: {
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
  },
});
