import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';

export default function ProfileActionRow({ item, onPress, color }) {
  const resolvedColor = color || AinevoieDiscoveryTokens.textPrimary;

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.88 : 1} onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={styles.leftWrap}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={item.icon || 'circle-outline'} size={18} color={resolvedColor} />
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: resolvedColor }]}>
          {item.label}
        </Text>
      </View>
      {item.showArrow !== false ? <MaterialIcons name="chevron-right" size={20} color={resolvedColor} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceSoft,
    marginRight: 12,
  },
  label: {
    ...AinevoieDiscoveryTypography.body,
    flex: 1,
  },
});
