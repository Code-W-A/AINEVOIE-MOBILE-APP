import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MyStatusBar from '../../../../components/myStatusBar';
import { useLocale } from '../../../../context/localeContext';
import AppHeader from '../components/AppHeader';
import { getLegalDocumentConfig } from '../config/legalDocumentConfig';
import {
  AinevoieDiscoveryPrimitives,
  AinevoieDiscoverySpacing,
  AinevoieDiscoveryTokens,
  AinevoieDiscoveryTypography,
} from '../styles/discoverySystem';

export default function SharedLegalScreen({ documentType }) {
  const { locale } = useLocale();
  const content = getLegalDocumentConfig(documentType, locale);

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      <View style={styles.innerScreenStyle}>
        <AppHeader title={content.title} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainerStyle}>
          <View style={styles.heroCardStyle}>
            <Text style={styles.heroTitleStyle}>{content.title}</Text>
            <Text style={styles.heroMetaStyle}>{content.updatedAtLabel}</Text>
            <Text style={styles.heroBodyStyle}>{content.intro}</Text>
          </View>

          {content.sections.map((section) => (
            <View key={section.heading} style={styles.documentCardStyle}>
              <Text style={styles.sectionTitleStyle}>{section.heading}</Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.legalParagraphStyle}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...AinevoieDiscoveryPrimitives.screen,
  },
  innerScreenStyle: {
    flex: 1,
  },
  contentContainerStyle: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  heroCardStyle: {
    ...AinevoieDiscoveryPrimitives.softHeroSurface,
    marginTop: 8,
  },
  heroTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
  },
  heroMetaStyle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: AinevoieDiscoverySpacing.xs,
    color: AinevoieDiscoveryTokens.accent,
  },
  heroBodyStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    marginTop: 8,
  },
  documentCardStyle: {
    ...AinevoieDiscoveryPrimitives.contentSurface,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  sectionTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    marginBottom: AinevoieDiscoverySpacing.sm,
  },
  legalParagraphStyle: {
    ...AinevoieDiscoveryTypography.body,
    marginBottom: 14,
    color: AinevoieDiscoveryTokens.textSecondary,
    lineHeight: 22,
  },
});
