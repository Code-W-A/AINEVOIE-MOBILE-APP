import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { Fonts, Sizes } from '../../../../constant/styles';
import useDoubleBackExit from '../../shared/hooks/useDoubleBackExit';
import { useLocale } from '../../../../context/localeContext';
import {
  bottomTabTokens,
  createBottomTabScreenOptions,
  sharedBottomTabScreenOptions,
} from '../../shared/navigation/bottomTabSystem';
import { getUserBottomTabs } from '../../shared/navigation/tabConfig';

export default function UserTabsLayout() {
  const backClickCount = useDoubleBackExit();
  const { t } = useLocale();
  const userBottomTabs = getUserBottomTabs(t);

  return (
    <View style={{ flex: 1 }}>
      <MyStatusBar backgroundColor={bottomTabTokens.safeAreaBackground} barStyle="dark-content" />
      <Tabs
        screenOptions={sharedBottomTabScreenOptions}
      >
        {userBottomTabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={createBottomTabScreenOptions(tab)}
          />
        ))}
      </Tabs>
      {backClickCount === 1 ? (
        <View style={styles.animatedView}>
          <Text style={Fonts.whiteColor14Medium}>{t('exit.userTabs')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  animatedView: {
    backgroundColor: bottomTabTokens.toastBackground,
    position: 'absolute',
    bottom: 20.0,
    alignSelf: 'center',
    borderRadius: Sizes.fixPadding + 5.0,
    paddingHorizontal: Sizes.fixPadding + 5.0,
    paddingVertical: Sizes.fixPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
