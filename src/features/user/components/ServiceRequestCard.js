import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../../constant/styles';
import { useLocale } from '../../../../context/localeContext';
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryTypography } from '../../shared/styles/discoverySystem';

export function formatEstimatedHoursLabel(hours, t) {
  const safeHours = Math.max(1, Number(hours) || 1);
  return safeHours === 1 ? t('serviceRequest.oneHour') : t('serviceRequest.multipleHours', { hours: safeHours });
}

function requestRow({ icon, label, value }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaIconWrap}>
        <MaterialIcons name={icon} size={18} color={Colors.discoveryMutedColor} />
      </View>
      <View style={styles.metaTextWrap}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ServiceRequestCard({ booking, title = 'Solicitare serviciu' }) {
  const { t } = useLocale();
  const requestDetails = booking?.requestDetails || {};
  const description = requestDetails.description || t('serviceRequest.noDetails');
  const estimatedHours = formatEstimatedHoursLabel(requestDetails.estimatedHours || booking?.price?.estimatedHours, t);

  return (
    <View style={styles.cardWrap}>
      <Text style={styles.title}>{title === 'Solicitare serviciu' ? t('serviceRequest.title') : title}</Text>
      <View style={styles.metaWrap}>
        {requestRow({ icon: 'schedule', label: t('serviceRequest.estimatedDuration'), value: estimatedHours })}
        {requestRow({ icon: 'description', label: t('serviceRequest.requestDescription'), value: description })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    ...DiscoveryPrimitives.contentSurface,
    padding: DiscoverySpacing.xl,
  },
  title: {
    ...Fonts.blackColor18Bold,
  },
  metaWrap: {
    marginTop: DiscoverySpacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: DiscoverySpacing.sm,
  },
  metaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.discoveryBorderColor,
    backgroundColor: Colors.discoverySoftSurfaceColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  metaTextWrap: {
    flex: 1,
    marginLeft: DiscoverySpacing.md,
  },
  metaLabel: {
    ...DiscoveryTypography.caption,
  },
  metaValue: {
    ...Fonts.blackColor14Bold,
    marginTop: 4,
    lineHeight: 20,
  },
});
