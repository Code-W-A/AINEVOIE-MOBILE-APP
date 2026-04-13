import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';
import ChatCircleButton from './ChatCircleButton';

export default function ChatSearchBar({ value, onChangeText, onToggleFilter, filterActive }) {
  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <MaterialIcons name="search" size={20} color={AinevoieDiscoveryTokens.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Caută după nume sau mesaj"
          placeholderTextColor={AinevoieDiscoveryTokens.textMuted}
          style={styles.input}
          selectionColor={AinevoieDiscoveryTokens.accent}
        />
      </View>

      <ChatCircleButton onPress={onToggleFilter} style={[styles.filterButton, filterActive ? styles.filterButtonActive : null]}>
        <MaterialIcons
          name="tune"
          size={20}
          color={filterActive ? AinevoieDiscoveryTokens.accentDark : AinevoieDiscoveryTokens.brandDark}
        />
      </ChatCircleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  inputWrap: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    ...AinevoieDiscoveryTypography.bodyMuted,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterButton: {
    marginLeft: 12,
    borderRadius: 18,
  },
  filterButtonActive: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderColor: AinevoieDiscoveryTokens.borderAccentSoft,
  },
});
