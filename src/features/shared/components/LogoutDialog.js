import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AinevoieDiscoveryTokens, AinevoieDiscoveryTypography } from '../styles/discoverySystem';
import { tr } from '../localization';

export default function LogoutDialog({
  visible,
  onClose,
  onConfirm,
  compact = false,
  title = tr('profile.logoutDialogTitle'),
  message = tr('profile.logoutDialogBody'),
  confirmLabel = tr('profile.logoutConfirm'),
  cancelLabel = tr('profile.cancel'),
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdropStyle}>
        <Pressable onPress={() => {}} style={[styles.dialogWrapStyle, compact ? styles.compactDialogWrapStyle : null]}>
          <View style={styles.iconWrapStyle}>
            <MaterialCommunityIcons name="logout-variant" size={22} color="#D94841" />
          </View>

          <Text style={styles.dialogTitleStyle}>{title}</Text>
          <Text style={styles.dialogMessageStyle}>{message}</Text>

          <View style={styles.buttonRowStyle}>
            <TouchableOpacity activeOpacity={0.88} onPress={onClose} style={styles.cancelButtonStyle}>
              <Text style={styles.cancelButtonTextStyle}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.88} onPress={onConfirm} style={styles.logOutButtonStyle}>
              <Text style={styles.logOutButtonTextStyle}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdropStyle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: AinevoieDiscoveryTokens.sheetBackdrop,
  },
  dialogWrapStyle: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    shadowColor: '#141923',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  compactDialogWrapStyle: {
    maxWidth: 360,
  },
  iconWrapStyle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F4',
    borderWidth: 1,
    borderColor: '#F5C8C4',
    alignSelf: 'center',
  },
  dialogTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    textAlign: 'center',
    marginTop: 16,
  },
  dialogMessageStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  buttonRowStyle: {
    flexDirection: 'row',
    marginTop: 22,
  },
  cancelButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    fontWeight: '700',
  },
  logOutButtonStyle: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#D94841',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#D94841',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  logOutButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
