import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from 'expo-router';
import ChatTopBar from './chat/ChatTopBar';
import { AinevoieDiscoveryPrimitives } from '../styles/discoverySystem';

export default function AppHeader({ title }) {
  const navigation = useNavigation();

  return (
    <View style={styles.headerWrapStyle}>
      <ChatTopBar onBackPress={() => navigation.pop()} title={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapStyle: {
    ...AinevoieDiscoveryPrimitives.headerSurface,
    paddingBottom: 12,
  },
});
