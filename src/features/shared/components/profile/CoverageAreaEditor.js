import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getRomaniaCitiesByCounty,
  getRomaniaCounties,
  getRomaniaCountry,
} from '@ainevoie/firebase-shared';
import { resolveCoveragePlaceSelection, searchCoveragePlaceSuggestions } from '../../../../firebase/providerCoverageSearch';
import { buildCoverageAreaText, normalizeCoverageAreaForm } from '../../utils/providerCoverage';

const defaultCopy = {
  countryLabel: 'Țară',
  countryPlaceholder: 'Selectează țara',
  countyLabel: 'Județ',
  countyPlaceholder: 'Selectează județul',
  cityLabel: 'Oraș',
  cityPlaceholder: 'Selectează orașul',
  searchLabel: 'Caută adresa completă',
  searchPlaceholder: 'Caută o adresă sau un reper validat',
  searchHint: 'Alege întâi județul și orașul, apoi caută locația exactă.',
  searchEmpty: 'Nu am găsit sugestii pentru căutarea curentă.',
  selectedLocationTitle: 'Locație selectată',
  clearSelection: 'Șterge locația',
  previewTitle: 'Preview zonă publică',
  previewPlaceholder: 'Selectează țara, județul, orașul și o locație validată.',
};

function sanitizeText(value) {
  return String(value || '').trim();
}

function buildPickerOptions(type, value) {
  if (type === 'country') {
    const country = getRomaniaCountry();
    return [{ key: country.countryCode, label: country.countryNameLocal }];
  }

  if (type === 'county') {
    return getRomaniaCounties().map((county) => ({
      key: county.countyCode,
      label: county.countyName,
    }));
  }

  return getRomaniaCitiesByCounty(value?.countyCode).map((city) => ({
    key: city.cityCode,
    label: city.cityName,
  }));
}

function buildSelectionPatch(type, option, currentValue) {
  const country = getRomaniaCountry();

  if (type === 'country') {
    return {
      ...currentValue,
      countryCode: country.countryCode,
      countryName: country.countryNameLocal,
    };
  }

  if (type === 'county') {
    return {
      countryCode: country.countryCode,
      countryName: country.countryNameLocal,
      countyCode: option.key,
      countyName: option.label,
      cityCode: '',
      cityName: '',
      placeId: '',
      locationLabel: '',
      formattedAddress: '',
      centerLat: '',
      centerLng: '',
    };
  }

  return {
    ...currentValue,
    cityCode: option.key,
    cityName: option.label,
    placeId: '',
    locationLabel: '',
    formattedAddress: '',
    centerLat: '',
    centerLng: '',
  };
}

export default function CoverageAreaEditor({
  value,
  onChange,
  errorText,
  copy = {},
}) {
  const resolvedCopy = { ...defaultCopy, ...(copy || {}) };
  const [pickerState, setPickerState] = useState({ visible: false, type: 'county' });
  const [searchQuery, setSearchQuery] = useState(sanitizeText(value?.locationLabel || value?.formattedAddress));
  const [suggestions, setSuggestions] = useState([]);
  const [localError, setLocalError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const searchRequestIdRef = useRef(0);
  const selectedPlaceId = value?.placeId;
  const selectedLocationText = sanitizeText(value?.locationLabel || value?.formattedAddress);

  const pickerOptions = useMemo(
    () => buildPickerOptions(pickerState.type, value),
    [pickerState.type, value],
  );
  const previewText = useMemo(
    () => buildCoverageAreaText(value),
    [value],
  );
  const hasSelectedPlace = Boolean(value?.placeId && value?.formattedAddress);

  useEffect(() => {
    if (!sanitizeText(selectedPlaceId)) {
      return;
    }

    setSearchQuery(selectedLocationText);
  }, [selectedLocationText, selectedPlaceId]);

  useEffect(() => {
    const trimmedQuery = sanitizeText(searchQuery);
    const normalizedSelectedLabel = selectedLocationText;

    if (
      !value?.countyCode
      || !value?.cityCode
      || trimmedQuery.length < 2
      || (selectedPlaceId && normalizedSelectedLabel && trimmedQuery === normalizedSelectedLabel)
    ) {
      setSuggestions([]);
      setIsSearching(false);
      return undefined;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    const timerId = setTimeout(async () => {
      setIsSearching(true);
      setLocalError('');

      try {
        const response = await searchCoveragePlaceSuggestions({
          query: trimmedQuery,
          countyCode: value.countyCode,
          cityCode: value.cityCode,
        });

        if (searchRequestIdRef.current === requestId) {
          setSuggestions(Array.isArray(response?.suggestions) ? response.suggestions : []);
        }
      } catch (error) {
        if (searchRequestIdRef.current === requestId) {
          setSuggestions([]);
          setLocalError(error instanceof Error ? error.message : '');
        }
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 320);

    return () => clearTimeout(timerId);
  }, [searchQuery, selectedLocationText, selectedPlaceId, value?.cityCode, value?.countyCode]);

  function openPicker(type) {
    setPickerState({ visible: true, type });
  }

  function handleSelect(type, option) {
    setPickerState((current) => ({ ...current, visible: false }));
    const nextValue = buildSelectionPatch(type, option, value);
    onChange(nextValue);
    setSuggestions([]);
    setLocalError('');

    if (type === 'county' || type === 'city') {
      setSearchQuery('');
    }
  }

  function handleClearLocation() {
    onChange({
      ...value,
      placeId: '',
      locationLabel: '',
      formattedAddress: '',
      centerLat: '',
      centerLng: '',
    });
    setSearchQuery('');
    setSuggestions([]);
    setLocalError('');
  }

  async function handleResolveSuggestion(suggestion) {
    setIsResolving(true);
    setLocalError('');

    try {
      const response = await resolveCoveragePlaceSelection({
        placeId: suggestion.placeId,
        countyCode: value.countyCode,
        cityCode: value.cityCode,
      });
      const nextValue = normalizeCoverageAreaForm(response?.coverageArea);

      onChange(nextValue);
      setSearchQuery(sanitizeText(nextValue.locationLabel || nextValue.formattedAddress));
      setSuggestions([]);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '');
    } finally {
      setIsResolving(false);
    }
  }

  function renderSelectField({ label, placeholder, valueLabel, type, disabled = false }) {
    return (
      <View style={styles.fieldWrapStyle}>
        <Text style={styles.fieldLabelStyle}>{label}</Text>
        <Pressable
          onPress={() => {
            if (!disabled) {
              openPicker(type);
            }
          }}
          style={({ pressed }) => [
            styles.selectFieldStyle,
            disabled ? styles.selectFieldDisabledStyle : null,
            pressed && !disabled ? styles.selectFieldPressedStyle : null,
          ]}
        >
          <Text style={[styles.selectFieldTextStyle, !valueLabel ? styles.placeholderTextStyle : null]}>
            {valueLabel || placeholder}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={22} color="#667085" />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      {renderSelectField({
        label: resolvedCopy.countryLabel,
        placeholder: resolvedCopy.countryPlaceholder,
        valueLabel: value?.countryName || getRomaniaCountry().countryNameLocal,
        type: 'country',
      })}
      {renderSelectField({
        label: resolvedCopy.countyLabel,
        placeholder: resolvedCopy.countyPlaceholder,
        valueLabel: value?.countyName,
        type: 'county',
      })}
      {renderSelectField({
        label: resolvedCopy.cityLabel,
        placeholder: resolvedCopy.cityPlaceholder,
        valueLabel: value?.cityName,
        type: 'city',
        disabled: !value?.countyCode,
      })}

      <View style={styles.fieldWrapStyle}>
        <Text style={styles.fieldLabelStyle}>{resolvedCopy.searchLabel}</Text>
        <View style={[styles.searchWrapStyle, !value?.cityCode ? styles.selectFieldDisabledStyle : null]}>
          <MaterialIcons name="search" size={20} color="#667085" />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setLocalError('');
            }}
            editable={Boolean(value?.cityCode) && !isResolving}
            placeholder={resolvedCopy.searchPlaceholder}
            placeholderTextColor="#98A2B3"
            style={styles.searchInputStyle}
          />
          {isSearching || isResolving ? <ActivityIndicator size="small" color="#B7791F" /> : null}
        </View>
        <Text style={styles.helperTextStyle}>
          {value?.cityCode ? resolvedCopy.searchHint : resolvedCopy.searchHint}
        </Text>
        {suggestions.length ? (
          <View style={styles.suggestionsWrapStyle}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion.placeId}
                onPress={() => {
                  void handleResolveSuggestion(suggestion);
                }}
                style={({ pressed }) => [
                  styles.suggestionItemStyle,
                  pressed ? styles.selectFieldPressedStyle : null,
                ]}
              >
                <MaterialIcons name="place" size={18} color="#B7791F" />
                <View style={styles.suggestionTextWrapStyle}>
                  <Text style={styles.suggestionPrimaryTextStyle}>{suggestion.primaryText || suggestion.fullText}</Text>
                  {suggestion.secondaryText ? (
                    <Text style={styles.suggestionSecondaryTextStyle}>{suggestion.secondaryText}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
        {!isSearching && sanitizeText(searchQuery).length >= 2 && value?.cityCode && !suggestions.length && !localError ? (
          <Text style={styles.helperTextStyle}>{resolvedCopy.searchEmpty}</Text>
        ) : null}
        {localError ? <Text style={styles.errorTextStyle}>{localError}</Text> : null}
      </View>

      <View style={styles.previewCardStyle}>
        <Text style={styles.previewCardTitleStyle}>{resolvedCopy.previewTitle}</Text>
        <Text style={styles.previewCardTextStyle}>{previewText || resolvedCopy.previewPlaceholder}</Text>
        {hasSelectedPlace ? (
          <View style={styles.selectedLocationWrapStyle}>
            <View style={styles.selectedLocationHeaderStyle}>
              <Text style={styles.selectedLocationTitleStyle}>{resolvedCopy.selectedLocationTitle}</Text>
              <Pressable onPress={handleClearLocation} style={styles.clearActionStyle}>
                <Text style={styles.clearActionTextStyle}>{resolvedCopy.clearSelection}</Text>
              </Pressable>
            </View>
            <Text style={styles.selectedLocationValueStyle}>{value.formattedAddress}</Text>
          </View>
        ) : null}
      </View>

      {errorText ? <Text style={styles.errorTextStyle}>{errorText}</Text> : null}

      <Modal
        animationType="slide"
        transparent
        visible={pickerState.visible}
        onRequestClose={() => setPickerState((current) => ({ ...current, visible: false }))}
      >
        <View style={styles.modalRootStyle}>
          <Pressable
            onPress={() => setPickerState((current) => ({ ...current, visible: false }))}
            style={styles.modalBackdropStyle}
          />
          <View style={styles.modalSheetStyle}>
            <View style={styles.modalHandleStyle} />
            <Text style={styles.modalTitleStyle}>
              {pickerState.type === 'country'
                ? resolvedCopy.countryLabel
                : pickerState.type === 'county'
                  ? resolvedCopy.countyLabel
                  : resolvedCopy.cityLabel}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => handleSelect(pickerState.type, option)}
                  style={({ pressed }) => [
                    styles.optionRowStyle,
                    pressed ? styles.selectFieldPressedStyle : null,
                  ]}
                >
                  <Text style={styles.optionRowTextStyle}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrapStyle: {
    marginBottom: 16,
  },
  fieldLabelStyle: {
    color: '#1F2937',
    marginBottom: 8,
    fontSize: 13,
    fontFamily: 'Montserrat_SemiBold',
  },
  selectFieldStyle: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8DDE8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldDisabledStyle: {
    opacity: 0.58,
  },
  selectFieldPressedStyle: {
    backgroundColor: '#F8FAFC',
  },
  selectFieldTextStyle: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontFamily: 'Montserrat_Medium',
  },
  placeholderTextStyle: {
    color: '#98A2B3',
  },
  searchWrapStyle: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8DDE8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputStyle: {
    flex: 1,
    marginLeft: 10,
    color: '#111827',
    fontSize: 15,
    fontFamily: 'Montserrat_Medium',
  },
  helperTextStyle: {
    color: '#667085',
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Montserrat_Medium',
  },
  errorTextStyle: {
    color: '#B42318',
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Montserrat_Medium',
  },
  suggestionsWrapStyle: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  suggestionItemStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  suggestionTextWrapStyle: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionPrimaryTextStyle: {
    color: '#111827',
    fontSize: 14,
    fontFamily: 'Montserrat_SemiBold',
  },
  suggestionSecondaryTextStyle: {
    color: '#667085',
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Montserrat_Medium',
  },
  previewCardStyle: {
    marginTop: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#FCFCFD',
    padding: 14,
  },
  previewCardTitleStyle: {
    color: '#344054',
    fontSize: 12,
    fontFamily: 'Montserrat_SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  previewCardTextStyle: {
    color: '#101828',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Montserrat_Bold',
  },
  selectedLocationWrapStyle: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  selectedLocationHeaderStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLocationTitleStyle: {
    color: '#344054',
    fontSize: 12,
    fontFamily: 'Montserrat_SemiBold',
  },
  selectedLocationValueStyle: {
    color: '#475467',
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_Medium',
  },
  clearActionStyle: {
    paddingVertical: 2,
  },
  clearActionTextStyle: {
    color: '#B42318',
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
  },
  modalRootStyle: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropStyle: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  modalSheetStyle: {
    maxHeight: '70%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  modalHandleStyle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
    marginBottom: 14,
  },
  modalTitleStyle: {
    color: '#101828',
    fontSize: 16,
    fontFamily: 'Montserrat_Bold',
    marginBottom: 14,
  },
  optionRowStyle: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  optionRowTextStyle: {
    color: '#101828',
    fontSize: 15,
    fontFamily: 'Montserrat_Medium',
  },
});
