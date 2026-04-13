import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../../styles/discoverySystem';

export default function ChatOverflowMenu({ visible, items }) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.menu}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.label}
          activeOpacity={0.88}
          onPress={item.onPress}
          style={[styles.button, index === items.length - 1 ? styles.buttonLast : null]}
        >
          <Text style={styles.text}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    top: 54,
    right: 0,
    minWidth: 206,
    borderRadius: 18,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    shadowColor: '#141923',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    zIndex: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  buttonLast: {
    borderBottomWidth: 0,
  },
  text: {
    ...AinevoieDiscoveryTypography.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
