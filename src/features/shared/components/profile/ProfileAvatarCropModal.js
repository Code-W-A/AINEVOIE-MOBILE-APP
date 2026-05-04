import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  AinevoieDiscoveryTokens,
  AinevoieDiscoveryTypography,
} from '../../styles/discoverySystem';

const OUTPUT_SIZE = 1024;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTouchDistance(touches) {
  if (!touches || touches.length < 2) {
    return 0;
  }

  const [firstTouch, secondTouch] = touches;
  const deltaX = firstTouch.pageX - secondTouch.pageX;
  const deltaY = firstTouch.pageY - secondTouch.pageY;
  return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
}

function getConstrainedTransform(nextTransform, imageSize, cropSize) {
  if (!imageSize.width || !imageSize.height || !cropSize) {
    return nextTransform;
  }

  const baseScale = cropSize / Math.min(imageSize.width, imageSize.height);
  const scale = clamp(nextTransform.scale, MIN_SCALE, MAX_SCALE);
  const displayedWidth = imageSize.width * baseScale * scale;
  const displayedHeight = imageSize.height * baseScale * scale;
  const maxTranslateX = Math.max(0, (displayedWidth - cropSize) / 2);
  const maxTranslateY = Math.max(0, (displayedHeight - cropSize) / 2);

  return {
    scale,
    translateX: clamp(nextTransform.translateX, -maxTranslateX, maxTranslateX),
    translateY: clamp(nextTransform.translateY, -maxTranslateY, maxTranslateY),
  };
}

function buildCropRect(imageSize, cropSize, transform) {
  const baseScale = cropSize / Math.min(imageSize.width, imageSize.height);
  const effectiveScale = baseScale * transform.scale;
  const displayedWidth = imageSize.width * effectiveScale;
  const displayedHeight = imageSize.height * effectiveScale;
  const imageLeft = ((cropSize - displayedWidth) / 2) + transform.translateX;
  const imageTop = ((cropSize - displayedHeight) / 2) + transform.translateY;
  const originX = clamp(Math.round((0 - imageLeft) / effectiveScale), 0, imageSize.width - 1);
  const originY = clamp(Math.round((0 - imageTop) / effectiveScale), 0, imageSize.height - 1);
  const cropWidth = clamp(Math.round(cropSize / effectiveScale), 1, imageSize.width - originX);
  const cropHeight = clamp(Math.round(cropSize / effectiveScale), 1, imageSize.height - originY);
  const squareSize = Math.min(cropWidth, cropHeight);

  return {
    originX,
    originY,
    width: squareSize,
    height: squareSize,
  };
}

export default function ProfileAvatarCropModal({
  asset,
  visible,
  isSaving,
  errorText,
  onCancel,
  onSave,
}) {
  const { width } = useWindowDimensions();
  const cropSize = Math.min(width - 40, 340);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const gestureStartRef = useRef({
    scale: 1,
    translateX: 0,
    translateY: 0,
    distance: 0,
  });

  useEffect(() => {
    if (!asset?.uri) {
      setImageSize({ width: 0, height: 0 });
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
      return;
    }

    if (asset.width && asset.height) {
      setImageSize({ width: asset.width, height: asset.height });
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
      return;
    }

    Image.getSize(
      asset.uri,
      (nextWidth, nextHeight) => {
        setImageSize({ width: nextWidth, height: nextHeight });
        setTransform({ scale: 1, translateX: 0, translateY: 0 });
      },
      () => {
        setImageSize({ width: OUTPUT_SIZE, height: OUTPUT_SIZE });
      },
    );
  }, [asset]);

  const baseImageStyle = useMemo(() => {
    if (!imageSize.width || !imageSize.height) {
      return null;
    }

    const baseScale = cropSize / Math.min(imageSize.width, imageSize.height);
    const displayWidth = imageSize.width * baseScale;
    const displayHeight = imageSize.height * baseScale;

    return {
      width: displayWidth,
      height: displayHeight,
      left: (cropSize - displayWidth) / 2,
      top: (cropSize - displayHeight) / 2,
    };
  }, [cropSize, imageSize.height, imageSize.width]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      gestureStartRef.current = {
        ...transform,
        distance: getTouchDistance(event.nativeEvent.touches),
      };
    },
    onPanResponderMove: (event, gestureState) => {
      if (isSaving) {
        return;
      }

      const touches = event.nativeEvent.touches;
      const start = gestureStartRef.current;
      const nextTransform = {
        scale: start.scale,
        translateX: start.translateX + gestureState.dx,
        translateY: start.translateY + gestureState.dy,
      };

      if (touches.length >= 2 && start.distance > 0) {
        const nextDistance = getTouchDistance(touches);
        nextTransform.scale = start.scale * (nextDistance / start.distance);
        nextTransform.translateX = start.translateX;
        nextTransform.translateY = start.translateY;
      }

      setTransform(getConstrainedTransform(nextTransform, imageSize, cropSize));
    },
  }), [cropSize, imageSize, isSaving, transform]);

  async function handleSave() {
    if (!asset?.uri || !imageSize.width || !imageSize.height) {
      return;
    }

    const crop = buildCropRect(imageSize, cropSize, transform);
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      [
        { crop },
        { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } },
      ],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    await onSave({
      uri: result.uri,
      fileName: 'provider-avatar.jpg',
      mimeType: 'image/jpeg',
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
    });
  }

  function resetCrop() {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }

  function renderPreview(label, previewStyle, imageStyle) {
    return (
      <View style={styles.previewItemStyle}>
        <View style={[styles.previewFrameStyle, previewStyle]}>
          {asset?.uri ? <Image source={{ uri: asset.uri }} style={imageStyle} resizeMode="cover" /> : null}
        </View>
        <Text style={styles.previewLabelStyle}>{label}</Text>
      </View>
    );
  }

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.screenStyle}>
        <View style={styles.headerStyle}>
          <TouchableOpacity disabled={isSaving} onPress={onCancel} style={styles.iconButtonStyle}>
            <MaterialIcons name="close" size={22} color={AinevoieDiscoveryTokens.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.titleStyle}>Incadreaza poza</Text>
          <TouchableOpacity disabled={isSaving} onPress={resetCrop} style={styles.iconButtonStyle}>
            <MaterialIcons name="refresh" size={21} color={AinevoieDiscoveryTokens.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.helperStyle}>Incadreaza zona care va aparea in aplicatie.</Text>

        <View style={styles.cropOuterStyle}>
          <View
            {...panResponder.panHandlers}
            style={[styles.cropFrameStyle, { width: cropSize, height: cropSize }]}
          >
            {asset?.uri && baseImageStyle ? (
              <Image
                source={{ uri: asset.uri }}
                style={[
                  styles.cropImageStyle,
                  baseImageStyle,
                  {
                    transform: [
                      { translateX: transform.translateX },
                      { translateY: transform.translateY },
                      { scale: transform.scale },
                    ],
                  },
                ]}
                resizeMode="cover"
              />
            ) : null}
            <View pointerEvents="none" style={styles.cropBorderStyle} />
          </View>
        </View>

        <View style={styles.previewRowStyle}>
          {renderPreview('Profil', styles.circlePreviewStyle, styles.squarePreviewImageStyle)}
          {renderPreview('Card', styles.cardPreviewStyle, styles.cardPreviewImageStyle)}
          {renderPreview('Hero', styles.heroPreviewStyle, styles.heroPreviewImageStyle)}
        </View>

        <View style={styles.tipStyle}>
          <MaterialIcons name="tips-and-updates" size={18} color={AinevoieDiscoveryTokens.accentDark} />
          <Text style={styles.tipTextStyle}>Foloseste o poza clara, cu fata sau logo-ul centrat. Imaginea finala este patrata.</Text>
        </View>

        {errorText ? <Text style={styles.errorStyle}>{errorText}</Text> : null}

        <View style={styles.actionsStyle}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={isSaving}
            onPress={onCancel}
            style={[styles.secondaryButtonStyle, isSaving && styles.disabledButtonStyle]}
          >
            <Text style={styles.secondaryButtonTextStyle}>Anuleaza</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={isSaving}
            onPress={() => { void handleSave(); }}
            style={[styles.primaryButtonStyle, isSaving && styles.disabledButtonStyle]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={AinevoieDiscoveryTokens.textOnImage} />
            ) : (
              <Text style={styles.primaryButtonTextStyle}>Salveaza poza</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenStyle: {
    flex: 1,
    backgroundColor: AinevoieDiscoveryTokens.appBackground,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  headerStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButtonStyle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  titleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  helperStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 18,
  },
  cropOuterStyle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropFrameStyle: {
    overflow: 'hidden',
    backgroundColor: '#141923',
    borderRadius: 24,
  },
  cropImageStyle: {
    position: 'absolute',
  },
  cropBorderStyle: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: AinevoieDiscoveryTokens.surfaceCard,
    borderRadius: 24,
  },
  previewRowStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 22,
  },
  previewItemStyle: {
    alignItems: 'center',
    flex: 1,
  },
  previewFrameStyle: {
    overflow: 'hidden',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  circlePreviewStyle: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cardPreviewStyle: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  heroPreviewStyle: {
    width: 92,
    height: 58,
    borderRadius: 16,
  },
  squarePreviewImageStyle: {
    width: '100%',
    height: '100%',
  },
  cardPreviewImageStyle: {
    width: '100%',
    height: '100%',
  },
  heroPreviewImageStyle: {
    width: '100%',
    height: '100%',
  },
  previewLabelStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    fontWeight: '700',
    marginTop: 8,
  },
  tipStyle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 22,
  },
  tipTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.brandDark,
    flex: 1,
    lineHeight: 18,
    marginLeft: 10,
  },
  errorStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: '#B3261E',
    textAlign: 'center',
    marginTop: 12,
  },
  actionsStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  secondaryButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    marginRight: 10,
  },
  primaryButtonStyle: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.accent,
    marginLeft: 10,
  },
  disabledButtonStyle: {
    opacity: 0.68,
  },
  secondaryButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
    fontWeight: '700',
  },
  primaryButtonTextStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textOnImage,
    fontWeight: '700',
  },
});
