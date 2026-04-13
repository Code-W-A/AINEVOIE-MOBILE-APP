import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function AllReviewsScreenLegacyRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/user/allReviews/allReviewsScreen', params }} />;
}
