import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';

export default function ProfileSummaryCard({ item, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={item.icon} size={18} color={AinevoieDiscoveryTokens.accentDark} />
      </View>
      <Text style={styles.value}>{item.value}</Text>
      <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
      <Text numberOfLines={1} style={styles.meta}>{item.meta}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    marginBottom: 14,
  },
  value: {
    ...AinevoieDiscoveryTypography.screenTitle,
    fontSize: 24,
    lineHeight: 28,
  },
  label: {
    ...AinevoieDiscoveryTypography.body,
    marginTop: 8,
    fontWeight: '700',
  },
  meta: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 4,
  },
});
