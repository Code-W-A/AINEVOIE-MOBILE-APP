import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';
import ChatCircleButton from './ChatCircleButton';

export default function ChatTopBar({ onBackPress, title, centerContent, rightContent }) {
  return (
    <View style={styles.wrap}>
      <ChatCircleButton onPress={onBackPress}>
        <MaterialIcons name="arrow-back-ios-new" size={20} color={AinevoieDiscoveryTokens.brandDark} />
      </ChatCircleButton>

      <View style={styles.centerWrap}>
        {centerContent || <Text style={styles.title}>{title}</Text>}
      </View>

      <View style={styles.rightWrap}>
        {rightContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    marginRight: 14,
  },
  rightWrap: {
    minWidth: 46,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    ...AinevoieDiscoveryTypography.screenTitle,
    fontSize: 26,
    lineHeight: 30,
  },
});
