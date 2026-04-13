import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';

export default function SettingsRow({
  label,
  subtitle,
  onPress,
  showArrow = true,
  color = AinevoieDiscoveryTokens.textPrimary,
  icon = 'circle-outline',
  inset = false,
  trailingLabel,
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.88 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.wrapStyle, inset ? styles.wrapInsetStyle : null]}
    >
      <View style={styles.rowStyle}>
        <View style={styles.leftWrapStyle}>
          <View style={styles.iconWrapStyle}>
            <MaterialCommunityIcons name={icon} size={18} color={color} />
          </View>
          <View style={styles.textWrapStyle}>
            <Text numberOfLines={1} style={[styles.labelStyle, { color }]}>
              {label}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={styles.subtitleStyle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightWrapStyle}>
          {trailingLabel ? <Text style={styles.trailingLabelStyle}>{trailingLabel}</Text> : null}
          {showArrow ? <MaterialIcons name="chevron-right" size={20} color={color} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapStyle: {
    minHeight: 60,
    borderRadius: 22,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wrapInsetStyle: {
    marginHorizontal: 24,
  },
  rowStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftWrapStyle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapStyle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderAccentSoft,
    marginRight: 12,
  },
  textWrapStyle: {
    flex: 1,
  },
  labelStyle: {
    ...AinevoieDiscoveryTypography.body,
  },
  subtitleStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 2,
  },
  rightWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trailingLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.accentDark,
    marginRight: 6,
    fontWeight: '700',
  },
});
