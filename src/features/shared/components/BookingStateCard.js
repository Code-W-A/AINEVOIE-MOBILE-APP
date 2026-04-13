import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryTypography } from "../styles/discoverySystem";
import { Colors, Fonts } from "../../../../constant/styles";

const BookingStateCard = ({
    item,
    onPress,
    statusLabel,
    accentColor,
    accentBackgroundColor,
    paymentLabel,
    paymentColor,
    paymentBackgroundColor,
}) => {
    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
            <View style={[styles.dateBadge, { backgroundColor: accentBackgroundColor, borderColor: accentColor }]}>
                <Text style={[styles.dateText, { color: accentColor }]}>{item.date}</Text>
            </View>
            <View style={styles.contentWrap}>
                <View style={styles.topRow}>
                    <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <View style={styles.chipsWrap}>
                        <View style={[DiscoveryPrimitives.chip, styles.chipSpacing, { backgroundColor: accentBackgroundColor }]}>
                            <Text style={[DiscoveryTypography.chip, { color: accentColor }]}>{statusLabel}</Text>
                        </View>
                        {paymentLabel ? (
                            <View style={[DiscoveryPrimitives.chip, styles.chipSpacing, { backgroundColor: paymentBackgroundColor || Colors.discoverySoftSurfaceColor }]}>
                                <Text style={[DiscoveryTypography.chip, { color: paymentColor || Colors.discoveryMutedColor }]}>
                                    {paymentLabel}
                                </Text>
                            </View>
                        ) : null}
                </View>
                <Text style={styles.personText}>{item.person}</Text>
                <Text style={styles.professionText}>{item.profession}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = {
    card: {
        ...DiscoveryPrimitives.contentSurface,
        flexDirection: 'row',
        alignItems: 'center',
        padding: DiscoverySpacing.md,
    },
    dateBadge: {
        width: 86,
        minHeight: 86,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    dateText: {
        ...Fonts.blackColor14Bold,
        textAlign: 'center',
        lineHeight: 20,
    },
    contentWrap: {
        flex: 1,
        marginLeft: DiscoverySpacing.md,
    },
    topRow: {
        alignItems: 'flex-start',
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        marginTop: DiscoverySpacing.xs,
    },
    timeText: {
        ...Fonts.blackColor16Bold,
        flexShrink: 1,
    },
    chipSpacing: {
        marginRight: DiscoverySpacing.xs,
        marginBottom: DiscoverySpacing.xs,
    },
    personText: {
        ...Fonts.blackColor14Bold,
        marginTop: DiscoverySpacing.sm,
    },
    professionText: {
        ...Fonts.grayColor14Medium,
        color: Colors.discoveryMutedColor,
        marginTop: 4,
    },
};

export default BookingStateCard;
