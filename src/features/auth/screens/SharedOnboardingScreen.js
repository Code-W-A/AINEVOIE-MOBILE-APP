import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { Sizes } from '../../../../constant/styles';
import { useOnboarding } from '../../../../context/onboardingContext';
import { authTheme } from '../theme/authTheme';

const theme = authTheme;

const slides = [
  {
    key: 'intro',
    eyebrow: 'Bine ai venit',
    title: 'Servicii pentru casă, fără haos.',
    body: 'AInevoie aduce într-un singur loc căutarea, rezervările și organizarea de zi cu zi.',
    image: require('../../../../assets/images/onboarding/1.png'),
  },
  {
    key: 'user',
    title: 'Pentru utilizator',
    body: 'Găsești rapid servicii și urmărești ușor fiecare programare.',
    image: require('../../../../assets/images/onboarding/2.png'),
  },
  {
    key: 'provider',
    title: 'Pentru prestator',
    body: 'Vezi cereri, programări și mesaje într-un spațiu clar și ordonat.',
    image: require('../../../../assets/images/onboarding/3.png'),
  },
];

export default function SharedOnboardingScreen() {
  const router = useRouter();
  const pagerRef = useRef(null);
  const { completeIntro } = useOnboarding();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLastSlide = activeSlideIndex === slides.length - 1;
  const primaryActionLabel = isLastSlide ? 'Începe' : 'Next';

  async function finishOnboarding() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    await completeIntro();
    router.replace('/auth/loginScreen');
  }

  async function handleContinue() {
    if (isLastSlide) {
      await finishOnboarding();
      return;
    }

    pagerRef.current?.setPage(activeSlideIndex + 1);
  }

  async function handleSkip() {
    await finishOnboarding();
  }

  function handlePageSelected(event) {
    setActiveSlideIndex(event.nativeEvent.position);
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar backgroundColor={theme.auth.background} />
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <View style={styles.backgroundOrbTertiary} />
      <View style={styles.container}>
        <View style={styles.logoWrapStyle}>
          <Image source={require('../../../../assets/images/app_icon.png')} style={styles.logoStyle} resizeMode="contain" />
        </View>
        <Pressable onPress={() => { void handleSkip(); }} style={styles.skipButtonStyle}>
          <Text style={styles.skipButtonTextStyle}>Sari peste</Text>
        </Pressable>

        <PagerView
          ref={pagerRef}
          style={styles.pagerStyle}
          initialPage={0}
          onPageSelected={handlePageSelected}
        >
          {slides.map((slide) => (
            <View key={slide.key} style={styles.pageStyle}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentStyle}>
                <View style={styles.heroSectionStyle}>
                  <View style={styles.visualStageStyle}>
                    <Image source={slide.image} style={styles.visualImageStyle} resizeMode="contain" />
                  </View>

                  {slide.eyebrow ? <Text style={styles.eyebrowStyle}>{slide.eyebrow}</Text> : null}
                  <Text style={styles.titleStyle}>{slide.title}</Text>
                  <Text style={styles.bodyStyle}>{slide.body}</Text>
                </View>
              </ScrollView>
            </View>
          ))}
        </PagerView>

        <View style={styles.actionsWrapStyle}>
          <View style={styles.progressWrapStyle}>
            <View style={styles.progressDotsRowStyle}>
              {slides.map((slide, index) => (
                <View
                  key={slide.key}
                  style={[
                    styles.progressDotStyle,
                    index === activeSlideIndex ? styles.progressDotActiveStyle : null,
                  ]}
                />
              ))}
            </View>
          </View>
          <Pressable
            onPress={() => { void handleContinue(); }}
            style={({ pressed }) => [
              styles.primaryButtonStyle,
              { backgroundColor: pressed ? theme.button.primaryBackgroundPressed : theme.button.primaryBackground },
              isSubmitting ? styles.buttonDisabledStyle : null,
            ]}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonTextStyle}>{primaryActionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.auth.background,
  },
  backgroundOrbPrimary: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.brand.primarySoft,
    top: -88,
    right: -72,
  },
  backgroundOrbSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.74)',
    top: 210,
    left: -78,
  },
  backgroundOrbTertiary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.brand.primarySoft,
    bottom: -24,
    right: 12,
    opacity: 0.56,
  },
  container: {
    flex: 1,
  },
  logoWrapStyle: {
    position: 'absolute',
    top: Sizes.fixPadding * 2.2,
    left: Sizes.fixPadding * 2.0,
    zIndex: 2,
  },
  logoStyle: {
    width: 42.0,
    height: 42.0,
  },
  skipButtonStyle: {
    alignSelf: 'flex-end',
    marginTop: Sizes.fixPadding * 2.3,
    marginRight: Sizes.fixPadding * 2.0,
    paddingHorizontal: Sizes.fixPadding + 4.0,
    paddingVertical: Sizes.fixPadding - 2.0,
  },
  skipButtonTextStyle: {
    color: theme.text.secondary,
    fontSize: 13,
    fontFamily: 'Montserrat_Bold',
  },
  progressWrapStyle: {
    marginBottom: Sizes.fixPadding * 1.6,
    alignItems: 'center',
  },
  progressDotsRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Sizes.fixPadding,
  },
  progressDotStyle: {
    width: 10.0,
    height: 10.0,
    borderRadius: 5.0,
    backgroundColor: 'rgba(44, 62, 80, 0.08)',
    borderWidth: 1.0,
    borderColor: 'rgba(44, 62, 80, 0.14)',
  },
  progressDotActiveStyle: {
    backgroundColor: theme.brand.primary,
    borderColor: theme.brand.primary,
  },
  pagerStyle: {
    flex: 1,
  },
  pageStyle: {
    flex: 1,
  },
  scrollContentStyle: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Sizes.fixPadding * 2.6,
    paddingBottom: Sizes.fixPadding * 2.4,
  },
  heroSectionStyle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  visualStageStyle: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Sizes.fixPadding * 3.4,
  },
  visualImageStyle: {
    width: 288.0,
    height: 288.0,
  },
  eyebrowStyle: {
    color: theme.text.secondary,
    fontSize: 12,
    fontFamily: 'Montserrat_Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Sizes.fixPadding,
    textAlign: 'center',
  },
  titleStyle: {
    color: theme.text.primary,
    fontSize: 36,
    lineHeight: 44,
    fontFamily: 'Montserrat_Bold',
    marginBottom: Sizes.fixPadding + 3.0,
    maxWidth: '94%',
    textAlign: 'center',
  },
  bodyStyle: {
    color: theme.text.secondary,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Montserrat_Medium',
    maxWidth: '92%',
    textAlign: 'center',
  },
  actionsWrapStyle: {
    paddingHorizontal: Sizes.fixPadding * 2.4,
    paddingBottom: Sizes.fixPadding * 2.4,
    paddingTop: Sizes.fixPadding * 1.2,
  },
  primaryButtonStyle: {
    minHeight: 58.0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Sizes.fixPadding,
    shadowColor: theme.brand.primary,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  buttonDisabledStyle: {
    opacity: 0.72,
  },
  primaryButtonTextStyle: {
    color: theme.button.primaryText,
    fontSize: 15,
    fontFamily: 'Montserrat_Bold',
  },
});
