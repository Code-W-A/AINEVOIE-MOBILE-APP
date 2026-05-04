import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { tr } from '../src/features/shared/localization';

export async function pickProfileAvatar(source, options = {}) {
  try {
    const allowsEditing = options.allowsEditing !== false;
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        tr('auth.providerOnboarding.permissionTitle'),
        source === 'camera'
          ? tr('demo.cameraPermissionBody')
          : tr('demo.galleryPermissionBody')
      );
      return null;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing,
          aspect: allowsEditing ? [1, 1] : undefined,
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing,
          aspect: allowsEditing ? [1, 1] : undefined,
          quality: 0.7,
        });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];

    return {
      uri: asset.uri,
      fileName: asset.fileName || asset.uri.split('/').pop() || 'image.jpg',
      mimeType: asset.mimeType || 'image/jpeg',
      width: asset.width || null,
      height: asset.height || null,
    };
  } catch {
    Alert.alert(
      tr('demo.imageUnavailableTitle'),
      tr('demo.imageUnavailableBody'),
    );
    return null;
  }
}
