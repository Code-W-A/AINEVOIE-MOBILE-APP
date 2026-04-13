import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';

export default function ChatContactIdentity({ image, name, status, compact = false }) {
  return (
    <View style={styles.wrap}>
      <Image source={image} style={compact ? styles.avatarCompact : styles.avatar} resizeMode="cover" />
      <View style={styles.textWrap}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text style={styles.status}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  avatarCompact: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  textWrap: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.brandDark,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  status: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    marginTop: 3,
  },
});
