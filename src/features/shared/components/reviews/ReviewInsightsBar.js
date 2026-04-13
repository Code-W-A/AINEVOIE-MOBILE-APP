import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Fonts, Sizes, CommonStyles } from "../../../../../constant/styles";

const ReviewInsightsBar = ({ averageRating, totalReviews, recommendationRate, style }) => (
    <View style={[styles.insightsWrapStyle, style]}>
        <View style={styles.insightItemStyle}>
            <Text style={styles.insightValueStyle}>{averageRating.toFixed(1)}</Text>
            <Text style={styles.insightLabelStyle}>Scor mediu</Text>
        </View>
        <View style={styles.insightDividerStyle} />
        <View style={styles.insightItemStyle}>
            <Text style={styles.insightValueStyle}>{totalReviews}</Text>
            <Text style={styles.insightLabelStyle}>Recenzii</Text>
        </View>
        <View style={styles.insightDividerStyle} />
        <View style={styles.insightItemStyle}>
            <Text style={styles.insightValueStyle}>{recommendationRate}%</Text>
            <Text style={styles.insightLabelStyle}>Recomandă</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    insightsWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.whiteColor,
        borderRadius: Sizes.fixPadding * 1.2,
        borderColor: 'rgba(16,36,77,0.08)',
        borderWidth: 1.0,
        paddingVertical: Sizes.fixPadding + 3.0,
        ...CommonStyles.shadow,
    },
    insightItemStyle: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightValueStyle: {
        ...Fonts.blackColor16Bold,
    },
    insightLabelStyle: {
        ...Fonts.grayColor14Regular,
        marginTop: 2.0,
    },
    insightDividerStyle: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(16,36,77,0.08)',
    },
});

export default ReviewInsightsBar;
