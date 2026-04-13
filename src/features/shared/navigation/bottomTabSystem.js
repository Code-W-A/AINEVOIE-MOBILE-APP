import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { authTheme } from '../../auth/theme/authTheme';

function normalizeHex(hex) {
  const sanitized = hex.replace('#', '').trim();

  if (sanitized.length === 3) {
    return sanitized
      .split('')
      .map((character) => `${character}${character}`)
      .join('');
  }

  return sanitized;
}

function hexToRgb(hex) {
  const normalizedHex = normalizeHex(hex);

  return {
    r: parseInt(normalizedHex.slice(0, 2), 16),
    g: parseInt(normalizedHex.slice(2, 4), 16),
    b: parseInt(normalizedHex.slice(4, 6), 16),
  };
}

function alpha(hex, opacity) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const bottomTabTokens = {
  safeAreaBackground: authTheme.auth.background,
  shellBackground: authTheme.auth.surface,
  shellBorder: authTheme.border.subtle,
  shellShadow: '#141923',
  activeIconColor: authTheme.brand.primary,
  inactiveIconColor: authTheme.text.secondary,
  activeBackground: authTheme.brand.primarySoft,
  activeBorder: alpha(authTheme.brand.primary, 0.18),
  pressedBackground: alpha(authTheme.brand.primary, 0.08),
  toastBackground: '#222631',
  badgeBackground: authTheme.brand.primary,
  badgeTextColor: authTheme.button.primaryText,
  badgeBorderColor: authTheme.auth.surface,
  inactiveScale: 1,
  activeScale: 1.14,
  activeLift: -2,
  animationStiffness: 320,
  animationDamping: 24,
  animationMass: 0.75,
};

export const bottomTabStyles = StyleSheet.create({
  shell: {
    height: 72,
    backgroundColor: bottomTabTokens.shellBackground,
    paddingTop: 7,
    paddingBottom: 11,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: bottomTabTokens.shellBorder,
    shadowColor: bottomTabTokens.shellShadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  item: {
    paddingVertical: 4,
  },
  button: {
    flex: 1,
    marginVertical: 3,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  buttonPressed: {
    backgroundColor: bottomTabTokens.pressedBackground,
  },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: bottomTabTokens.activeBackground,
    borderColor: bottomTabTokens.activeBorder,
  },
  badgeWrap: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bottomTabTokens.badgeBackground,
    borderWidth: 2,
    borderColor: bottomTabTokens.badgeBorderColor,
  },
  badgeText: {
    color: bottomTabTokens.badgeTextColor,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});

function BottomTabButton({ children, style, ...props }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        style,
        bottomTabStyles.button,
        pressed ? bottomTabStyles.buttonPressed : null,
      ]}
      android_ripple={{ color: 'transparent' }}
    >
      {children}
    </Pressable>
  );
}

function BottomTabIcon({ IconComponent, iconName, focused, iconSize = 21, badgeCount = 0 }) {
  const scale = useSharedValue(
    focused ? bottomTabTokens.activeScale : bottomTabTokens.inactiveScale
  );
  const translateY = useSharedValue(focused ? bottomTabTokens.activeLift : 0);

  useEffect(() => {
    const animationConfig = {
      stiffness: bottomTabTokens.animationStiffness,
      damping: bottomTabTokens.animationDamping,
      mass: bottomTabTokens.animationMass,
    };

    scale.value = withSpring(
      focused ? bottomTabTokens.activeScale : bottomTabTokens.inactiveScale,
      animationConfig
    );
    translateY.value = withSpring(
      focused ? bottomTabTokens.activeLift : 0,
      animationConfig
    );
  }, [focused, scale, translateY]);

  const animatedIconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        bottomTabStyles.iconWrap,
        focused ? bottomTabStyles.iconWrapActive : null,
        animatedIconWrapStyle,
      ]}
    >
      <IconComponent
        name={iconName}
        size={iconSize}
        color={focused ? bottomTabTokens.activeIconColor : bottomTabTokens.inactiveIconColor}
      />
      {badgeCount > 0 ? (
        <View style={bottomTabStyles.badgeWrap}>
          <Text style={bottomTabStyles.badgeText}>{badgeCount}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

export const sharedBottomTabScreenOptions = {
  headerShown: false,
  tabBarStyle: bottomTabStyles.shell,
  tabBarItemStyle: bottomTabStyles.item,
  tabBarHideOnKeyboard: true,
  tabBarShowLabel: false,
  tabBarButton: (props) => <BottomTabButton {...props} />,
};

export function createBottomTabScreenOptions({
  IconComponent,
  iconName,
  iconSize,
  label,
  testId,
  badgeCount,
}) {
  return {
    title: label,
    tabBarAccessibilityLabel: label,
    tabBarButtonTestID: testId,
    tabBarIcon: ({ focused }) => (
      <BottomTabIcon
        IconComponent={IconComponent}
        iconName={iconName}
        iconSize={iconSize}
        focused={focused}
        badgeCount={badgeCount}
      />
    ),
  };
}
