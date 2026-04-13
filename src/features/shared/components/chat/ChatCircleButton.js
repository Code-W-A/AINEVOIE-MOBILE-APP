import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { AinevoieDiscoveryTokens } from '../../styles/discoverySystem';

export default function ChatCircleButton({ children, onPress, style, activeOpacity = 0.88 }) {
  return (
    <TouchableOpacity activeOpacity={activeOpacity} onPress={onPress} style={[styles.button, style]}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
});
