import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sizes } from '../../../../../constant/styles';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';
import { tr } from '../../localization';

export default function ChatDateSeparator({ label = tr('dates.today') }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: Sizes.fixPadding * 1.5,
    paddingBottom: Sizes.fixPadding - 2.0,
  },
  text: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textMuted,
  },
});
