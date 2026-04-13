import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sizes } from '../../../../../constant/styles';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';

export default function ChatMessageBubble({ item, seenIconColor }) {
  const isSender = item.isSender;

  return (
    <View style={styles.row(isSender)}>
      <View style={styles.bubble(isSender)}>
        <Text style={styles.messageText(isSender)}>{item.message}</Text>
      </View>

      <View style={styles.meta(isSender)}>
        <Text style={styles.metaText}>{item.time}</Text>
        {isSender ? (
          <Ionicons
            name={item.isSeen ? 'checkmark-done-sharp' : 'checkmark-sharp'}
            size={15}
            color={seenIconColor}
            style={styles.seenIcon}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: (isSender) => ({
    alignItems: isSender ? 'flex-end' : 'flex-start',
    marginVertical: 7,
  }),
  bubble: (isSender) => ({
    maxWidth: '82%',
    paddingHorizontal: Sizes.fixPadding + 4.0,
    paddingVertical: Sizes.fixPadding + 2.0,
    borderRadius: 18,
    backgroundColor: isSender ? AinevoieDiscoveryTokens.surfaceAccent : AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: isSender ? AinevoieDiscoveryTokens.borderAccentSoft : AinevoieDiscoveryTokens.borderSubtle,
    borderBottomRightRadius: isSender ? 8 : 18,
    borderBottomLeftRadius: isSender ? 18 : 8,
  }),
  messageText: (isSender) => ({
    ...AinevoieDiscoveryTypography.body,
    color: isSender ? AinevoieDiscoveryTokens.brandDark : AinevoieDiscoveryTokens.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  }),
  meta: (isSender) => ({
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: isSender ? 'flex-end' : 'flex-start',
  }),
  metaText: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textMuted,
  },
  seenIcon: {
    marginLeft: 6,
  },
});
