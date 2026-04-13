import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Sizes } from '../../../../../constant/styles';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';

export default function ChatConversationRow({ item, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.wrap}>
      <Image source={item.image} style={styles.avatar} resizeMode="cover" />

      <View style={styles.contentWrap}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.name, item.isReadable ? styles.nameUnread : null]}>
              {item.name}
            </Text>
            {item.isReadable ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.seen}>{item.seen}</Text>
        </View>

        <View style={styles.bottomRow}>
          <Text numberOfLines={1} style={[styles.about, item.isReadable ? styles.aboutUnread : null]}>
            {item.about}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  contentWrap: {
    flex: 1,
    marginLeft: Sizes.fixPadding + 1.0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  name: {
    ...AinevoieDiscoveryTypography.body,
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  nameUnread: {
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  seen: {
    ...AinevoieDiscoveryTypography.caption,
    marginLeft: 10,
    fontSize: 12,
  },
  about: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  aboutUnread: {
    color: AinevoieDiscoveryTokens.textSecondary,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AinevoieDiscoveryTokens.accent,
    marginLeft: 8,
  },
});
