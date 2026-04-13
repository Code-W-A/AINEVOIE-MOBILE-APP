import React from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Sizes } from '../../../../../constant/styles';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';

export default function ChatComposer({
  value,
  onChangeText,
  onEmojiPress,
  onAttachPress,
  onCameraPress,
  onTrailingPress,
  trailingMode = 'mic',
  placeholder = 'Scrie un mesaj',
}) {
  const isSendMode = trailingMode === 'send';

  return (
    <View style={styles.outerWrap}>
      <View style={styles.wrap}>
        <TouchableOpacity activeOpacity={0.88} onPress={onEmojiPress} style={styles.leadingButton}>
          <Ionicons name="happy-outline" size={22} color={AinevoieDiscoveryTokens.textMuted} />
        </TouchableOpacity>

        <TextInput
          selectionColor={AinevoieDiscoveryTokens.accent}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          style={styles.input}
          placeholderTextColor={AinevoieDiscoveryTokens.textMuted}
        />

        <TouchableOpacity activeOpacity={0.88} onPress={onAttachPress} style={styles.iconButton}>
          <Ionicons name="attach-outline" size={20} color={AinevoieDiscoveryTokens.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.88} onPress={onCameraPress} style={styles.iconButton}>
          <Ionicons name="camera-outline" size={20} color={AinevoieDiscoveryTokens.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onTrailingPress}
          style={[styles.trailingButton, isSendMode ? styles.trailingButtonActive : null]}
        >
          <MaterialCommunityIcons
            name={isSendMode ? 'send' : 'microphone-outline'}
            size={20}
            color={isSendMode ? AinevoieDiscoveryTokens.textOnImage : AinevoieDiscoveryTokens.brandDark}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: Sizes.fixPadding * 1.7,
    paddingTop: Sizes.fixPadding,
    paddingBottom: Platform.OS === 'ios' ? Sizes.fixPadding * 2.0 : Sizes.fixPadding + 4.0,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  wrap: {
    minHeight: 60,
    borderRadius: 26,
    backgroundColor: '#FCFBF8',
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
  },
  leadingButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...AinevoieDiscoveryTypography.bodyMuted,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  trailingButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: '#F1ECE6',
  },
  trailingButtonActive: {
    backgroundColor: AinevoieDiscoveryTokens.accent,
  },
});
