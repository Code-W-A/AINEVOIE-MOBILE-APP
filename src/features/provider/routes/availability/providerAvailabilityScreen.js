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
import { Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import MyStatusBar from '../../../../../components/myStatusBar';
import { Colors } from '../../../../../constant/styles';
import { useLocale } from '../../../../../context/localeContext';
import {
  getProviderWeekDays,
  useProviderAvailability,
} from '../../../../../hooks/useProviderAvailability';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../../shared/styles/discoverySystem';

const DEFAULT_RANGE_START = '09:00';
const DEFAULT_RANGE_END = '17:00';
const SAVE_TIMEOUT_MS = 20000;

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

function withTimeout(promise, timeoutMs, errorMessage) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export default function ProviderAvailabilityScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { source } = useLocalSearchParams();
  const { locale, t } = useLocale();
  const {
    data,
    isLoading,
    canEditAvailability,
    hasConfiguredAvailability,
    saveProviderAvailability,
  } = useProviderAvailability();
  const [draftSchedule, setDraftSchedule] = useState(() => createEmptySchedule(locale));
  const [dayErrors, setDayErrors] = useState({});
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [pickerState, setPickerState] = useState(null);
  const [copyState, setCopyState] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftSchedule(data.weekSchedule);
  }, [data.weekSchedule]);

  const isDraftEmpty = useMemo(
    () => !draftSchedule.some((day) => day.isEnabled && day.timeRanges.length > 0),
    [draftSchedule]
  );
  const shouldReturnToProviderOnboarding = Array.isArray(source)
    ? source.includes('providerOnboarding')
    : source === 'providerOnboarding';

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

  function openCopyModal(sourceDay) {
    if (!sourceDay.isEnabled || !sourceDay.timeRanges.length) {
      return;
    }

    setCopyState({
      sourceDayKey: sourceDay.dayKey,
      selectedDayKeys: [],
    });
  }

  function closeCopyModal() {
    setCopyState(null);
  }

  function toggleCopyTarget(dayKey) {
    setCopyState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      const isSelected = currentState.selectedDayKeys.includes(dayKey);

      return {
        ...currentState,
        selectedDayKeys: isSelected
          ? currentState.selectedDayKeys.filter((selectedDayKey) => selectedDayKey !== dayKey)
          : [...currentState.selectedDayKeys, dayKey],
      };
    });
  }

  function handleCopyIntervalsRequest() {
    if (!copyState?.selectedDayKeys.length) {
      setSnackbarMessage(t('providerAvailability.copyIntervalsSelectAtLeastOne'));
      return;
    }

    Alert.alert(
      t('providerAvailability.copyIntervalsConfirmTitle'),
      t('providerAvailability.copyIntervalsConfirmBody'),
      [
        { text: t('providerAvailability.resetCancel'), style: 'cancel' },
        {
          text: t('providerAvailability.copyIntervalsConfirmAction'),
          onPress: applyCopiedIntervals,
        },
      ]
    );
  }

  function applyCopiedIntervals() {
    if (!copyState?.sourceDayKey || !copyState.selectedDayKeys.length) {
      return;
    }

    const sourceDay = draftSchedule.find((day) => day.dayKey === copyState.sourceDayKey);

    if (!sourceDay?.timeRanges?.length) {
      closeCopyModal();
      return;
    }

    const copiedRanges = sourceDay.timeRanges.map((range) => ({
      startTime: range.startTime,
      endTime: range.endTime,
    }));

    setDraftSchedule((currentSchedule) => currentSchedule.map((day) => {
      if (!copyState.selectedDayKeys.includes(day.dayKey)) {
        return day;
      }

      return {
        ...day,
        isEnabled: true,
        timeRanges: copiedRanges.map((range, index) => ({
          id: `${day.dayKey}_${Date.now()}_${index}_${range.startTime}_${range.endTime}`,
          startTime: range.startTime,
          endTime: range.endTime,
        })),
      };
    }));

    setDayErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      copyState.selectedDayKeys.forEach((dayKey) => {
        delete nextErrors[dayKey];
      });
      return nextErrors;
    });
    closeCopyModal();
    setSnackbarMessage(t('providerAvailability.copyIntervalsSuccess'));
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

  function handleExit() {
    if (shouldReturnToProviderOnboarding) {
      router.replace({
        pathname: '/auth/providerOnboardingScreen',
        params: { step: 'professional' },
      });
      return;
    }

    navigation.goBack();
  }

  async function handleSave() {
    if (isSaving) {
      console.log('[ProviderAvailabilityScreen][handleSave:ignored]', { reason: 'already_saving' });
      return;
    }

    if (isLoading) {
      console.log('[ProviderAvailabilityScreen][handleSave:ignored]', { reason: 'availability_loading' });
      setSnackbarMessage(t('providerAvailability.loading'));
      return;
    }

    const nextErrors = validateSchedule(draftSchedule, t);
    setDayErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      console.log('[ProviderAvailabilityScreen][handleSave:validation_error]', {
        errorDays: Object.keys(nextErrors),
      });
      setSnackbarMessage(t('providerAvailability.saveValidationError'));
      return;
    }

    console.log('[ProviderAvailabilityScreen][handleSave:start]', {
      source,
      canEditAvailability,
      enabledDayCount: draftSchedule.filter((day) => day.isEnabled && day.timeRanges.length > 0).length,
    });

    setIsSaving(true);

    try {
      await withTimeout(
        saveProviderAvailability((current) => ({
          ...current,
          weekSchedule: draftSchedule,
          blockedDates: [],
        })),
        SAVE_TIMEOUT_MS,
        t('providerAvailability.saveTimeout')
      );

      console.log('[ProviderAvailabilityScreen][handleSave:success]', {
        source,
        shouldReturnToProviderOnboarding,
      });

      if (shouldReturnToProviderOnboarding) {
        router.replace({
          pathname: '/auth/providerOnboardingScreen',
          params: { step: 'professional' },
        });
        return;
      }

      setSnackbarMessage(t('providerAvailability.saveSuccess'));
    } catch (error) {
      console.error('[ProviderAvailabilityScreen][handleSave:error]', {
        source,
        canEditAvailability,
        code: error?.code,
        message: error?.message,
        details: error?.details,
      });
      const message = error instanceof Error ? error.message : t('providerAvailability.saveError');
      setSnackbarMessage(message || t('providerAvailability.saveError'));
      Alert.alert(t('providerAvailability.saveErrorTitle'), message || t('providerAvailability.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
        {!hasConfiguredAvailability && isDraftEmpty ? renderEmptyState() : null}
        {isLoading ? renderLoadingState() : null}
        {!isLoading ? draftSchedule.map(renderDayCard) : null}
      </ScrollView>
      {renderFooter()}
      {renderTimePickerModal()}
      {renderCopyIntervalsModal()}
      <Snackbar visible={Boolean(snackbarMessage)} onDismiss={() => setSnackbarMessage('')} duration={2400}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );

  function renderHeader() {
    return (
      <View style={styles.headerWrapStyle}>
        <TouchableOpacity activeOpacity={0.88} onPress={handleExit} style={styles.headerBackButtonStyle}>
          <MaterialIcons name="arrow-back" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleStyle}>{t('providerAvailability.headerTitle')}</Text>
        <Text style={styles.headerSubtitleStyle}>{t('providerAvailability.headerSubtitle')}</Text>
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

            <TouchableOpacity activeOpacity={0.88} onPress={() => openCopyModal(day)} style={styles.copyIntervalsButtonStyle}>
              <MaterialCommunityIcons name="content-copy" size={18} color={AinevoieDiscoveryTokens.textPrimary} />
              <Text style={styles.copyIntervalsButtonTextStyle}>{t('providerAvailability.copyIntervals')}</Text>
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
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleResetSchedule}
          style={[styles.resetFooterButtonStyle, isSaving ? styles.footerButtonDisabledStyle : null]}
          disabled={isSaving}
        >
          <MaterialCommunityIcons name="restart" size={18} color="#D94841" />
          <Text style={styles.resetFooterButtonTextStyle}>{t('providerAvailability.reset')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { void handleSave(); }}
          style={[styles.saveButtonStyle, isSaving || isLoading ? styles.footerButtonDisabledStyle : null]}
          disabled={isSaving || isLoading}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.whiteColor} style={styles.saveButtonSpinnerStyle} />
          ) : null}
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

  function renderCopyIntervalsModal() {
    if (!copyState) {
      return null;
    }

    const sourceDay = draftSchedule.find((day) => day.dayKey === copyState.sourceDayKey);
    const sourceRanges = sourceDay?.timeRanges || [];
    const targetDays = draftSchedule.filter((day) => day.dayKey !== copyState.sourceDayKey);
    const hasSelectedTargets = copyState.selectedDayKeys.length > 0;

    return (
      <Modal animationType="slide" visible onRequestClose={closeCopyModal}>
        <View style={styles.copyModalScreenStyle}>
          <MyStatusBar />
          <View style={styles.copyModalHeaderStyle}>
            <TouchableOpacity activeOpacity={0.88} onPress={closeCopyModal} style={styles.headerBackButtonStyle}>
              <MaterialIcons name="close" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.copyModalTitleStyle}>
              {t('providerAvailability.copyIntervalsTitle', { day: sourceDay?.label || '' })}
            </Text>
            <Text style={styles.copyModalSubtitleStyle}>{t('providerAvailability.copyIntervalsSubtitle')}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.copyModalContentStyle}>
            <View style={styles.copySummaryCardStyle}>
              <Text style={styles.copySummaryTitleStyle}>{sourceDay?.label || ''}</Text>
              <View style={styles.copySummaryRangesStyle}>
                {sourceRanges.map((range) => (
                  <View key={`${range.id}-${range.startTime}-${range.endTime}`} style={styles.copyRangeChipStyle}>
                    <Text style={styles.copyRangeChipTextStyle}>{`${range.startTime} - ${range.endTime}`}</Text>
                  </View>
                ))}
              </View>
            </View>

            {targetDays.map((day) => {
              const isSelected = copyState.selectedDayKeys.includes(day.dayKey);
              const hasSchedule = day.isEnabled && day.timeRanges.length > 0;

              return (
                <TouchableOpacity
                  key={day.dayKey}
                  activeOpacity={0.88}
                  onPress={() => toggleCopyTarget(day.dayKey)}
                  style={[styles.copyTargetRowStyle, isSelected ? styles.copyTargetRowActiveStyle : null]}
                >
                  <View style={[styles.copyTargetCheckStyle, isSelected ? styles.copyTargetCheckActiveStyle : null]}>
                    {isSelected ? <MaterialIcons name="check" size={18} color={Colors.whiteColor} /> : null}
                  </View>
                  <View style={styles.copyTargetTextWrapStyle}>
                    <Text style={styles.copyTargetTitleStyle}>{day.label}</Text>
                    <Text style={styles.copyTargetSubtitleStyle}>
                      {hasSchedule
                        ? t('providerAvailability.copyIntervalsTargetHasSchedule')
                        : t('providerAvailability.copyIntervalsTargetEmpty')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.copyModalFooterStyle}>
            <TouchableOpacity activeOpacity={0.88} onPress={closeCopyModal} style={styles.copyModalSecondaryButtonStyle}>
              <Text style={styles.copyModalSecondaryButtonTextStyle}>{t('providerAvailability.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleCopyIntervalsRequest}
              disabled={!hasSelectedTargets}
              style={[styles.copyModalPrimaryButtonStyle, !hasSelectedTargets ? styles.copyModalPrimaryButtonDisabledStyle : null]}
            >
              <Text style={styles.copyModalPrimaryButtonTextStyle}>{t('providerAvailability.copyIntervals')}</Text>
            </TouchableOpacity>
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
  copyIntervalsButtonStyle: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  copyIntervalsButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
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
    alignItems: 'center',
  },
  resetFooterButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F5C8C4',
    paddingHorizontal: 14,
    marginRight: 10,
  },
  resetFooterButtonTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: '#D94841',
    fontWeight: '700',
    marginLeft: 6,
  },
  saveButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: AinevoieDiscoveryTokens.accent,
    marginLeft: 10,
  },
  saveButtonSpinnerStyle: {
    marginRight: 8,
  },
  saveButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
  footerButtonDisabledStyle: {
    opacity: 0.56,
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
  copyModalScreenStyle: {
    flex: 1,
    backgroundColor: AinevoieDiscoveryTokens.appBackground,
  },
  copyModalHeaderStyle: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
  },
  copyModalTitleStyle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
    marginTop: 6,
  },
  copyModalSubtitleStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  copyModalContentStyle: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 128,
  },
  copySummaryCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },
  copySummaryTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  copySummaryRangesStyle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  copyRangeChipStyle: {
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  copyRangeChipTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    fontWeight: '700',
  },
  copyTargetRowStyle: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyTargetRowActiveStyle: {
    borderColor: AinevoieDiscoveryTokens.accent,
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
  },
  copyTargetCheckStyle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copyTargetCheckActiveStyle: {
    borderColor: AinevoieDiscoveryTokens.accent,
    backgroundColor: AinevoieDiscoveryTokens.accent,
  },
  copyTargetTextWrapStyle: {
    flex: 1,
  },
  copyTargetTitleStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  copyTargetSubtitleStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 4,
  },
  copyModalFooterStyle: {
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
  copyModalSecondaryButtonStyle: {
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
  copyModalSecondaryButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  copyModalPrimaryButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.accent,
    marginLeft: 10,
  },
  copyModalPrimaryButtonDisabledStyle: {
    opacity: 0.48,
  },
  copyModalPrimaryButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: Colors.whiteColor,
    fontWeight: '700',
  },
});
