import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Colors, Fonts, Sizes, CommonStyles } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';

const ReviewCard = ({
    item,
    expanded,
    onToggleExpand,
    containerStyle,
    ratingColor = Colors.discoveryRatingColor,
    collapsedLines = 2,
    expandThreshold = 28,
}) => {
    const hasMeta = Boolean(item.work || item.date);
    const canExpand = item.review.length > expandThreshold;

    return (
        <View style={[styles.reviewsWrapStyle, containerStyle]}>
            <View style={styles.reviewTopRow}>
                <View style={styles.reviewerWrapStyle}>
                    <Image
                        source={item.image}
                        style={styles.reviewerImageStyle}
                        resizeMode="cover"
                    />
                    <View style={styles.reviewerDetailsWrapStyle}>
                        <Text numberOfLines={1} style={styles.reviewerNameStyle}>
                            {item.name}
                        </Text>
                        <View style={styles.reviewRatingRowStyle}>
                            <MaterialIcons name="star" size={15} color={ratingColor} />
                            <Text style={styles.reviewRatingTextStyle}>{item.rating.toFixed(1)}</Text>
                        </View>
                    </View>
                </View>
                {hasMeta ? (
                    <View style={styles.reviewMetaWrapStyle}>
                        {item.work ? <Text numberOfLines={1} style={styles.reviewWorkStyle}>{item.work}</Text> : null}
                        {item.date ? <Text style={styles.reviewDateStyle}>{item.date}</Text> : null}
                    </View>
                ) : null}
            </View>
            <Text numberOfLines={expanded ? undefined : collapsedLines} style={styles.reviewTextStyle}>
                {item.review}
            </Text>
            {canExpand ? (
                <Pressable onPress={() => onToggleExpand(item.id)} style={({ pressed }) => [styles.expandButtonStyle, pressed ? styles.expandButtonPressed : null]}>
                    <Text style={styles.expandButtonTextStyle}>
                        {expanded ? 'Vezi mai puțin' : 'Vezi mai mult'}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    reviewsWrapStyle: {
        backgroundColor: Colors.whiteColor,
        borderRadius: Sizes.fixPadding * 1.2,
        borderColor: 'rgba(16,36,77,0.08)',
        borderWidth: 1.0,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        paddingVertical: Sizes.fixPadding + 4.0,
        ...CommonStyles.shadow,
    },
    reviewTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reviewerWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    reviewerImageStyle: {
        width: 40.0,
        height: 40.0,
        borderRadius: 20.0,
    },
    reviewerDetailsWrapStyle: {
        marginLeft: Sizes.fixPadding,
        flex: 1,
        paddingRight: Sizes.fixPadding - 2.0,
    },
    reviewerNameStyle: {
        ...Fonts.blackColor16Bold,
    },
    reviewRatingRowStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3.0,
    },
    reviewRatingTextStyle: {
        ...Fonts.blackColor14Bold,
        marginLeft: 4.0,
    },
    reviewMetaWrapStyle: {
        alignItems: 'flex-end',
        maxWidth: '38%',
        marginLeft: Sizes.fixPadding,
    },
    reviewWorkStyle: {
        ...Fonts.blackColor14Medium,
    },
    reviewDateStyle: {
        ...Fonts.grayColor14Regular,
        marginTop: 2.0,
    },
    reviewTextStyle: {
        ...Fonts.blackColor14Medium,
        marginTop: Sizes.fixPadding - 2.0,
        lineHeight: 20,
    },
    expandButtonStyle: {
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    expandButtonPressed: {
        opacity: 0.85,
    },
    expandButtonTextStyle: {
        ...Fonts.primaryColor14Medium,
    },
});

export default ReviewCard;
