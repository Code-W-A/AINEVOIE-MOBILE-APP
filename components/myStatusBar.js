import { SafeAreaView, StatusBar } from 'react-native';
import React from 'react';
import { Colors } from '../constant/styles';

const MyStatusBar = ({
  backgroundColor = Colors.brandSecondaryColor,
  barStyle = 'light-content',
}) => {
  const resolvedBackgroundColor = Colors.brandSecondaryColor;
  const resolvedBarStyle = 'light-content';

  return (
    <SafeAreaView style={{ backgroundColor: resolvedBackgroundColor }}>
      <StatusBar
        translucent={false}
        backgroundColor={resolvedBackgroundColor}
        barStyle={resolvedBarStyle}
      />
    </SafeAreaView>
  );
};

export default MyStatusBar;
