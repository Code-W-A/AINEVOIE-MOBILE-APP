import React from "react";
import { Pressable, Text, View } from "react-native";
import {
    DiscoveryPrimitives,
    DiscoveryTypography,
    AinevoieDiscoveryPrimitives,
    AinevoieDiscoveryTypography,
} from "../styles/discoverySystem";

const DiscoverySectionHeader = ({ title, actionLabel, onActionPress, style, variant = 'legacy' }) => {
    const primitives = variant === 'ainevoie' ? AinevoieDiscoveryPrimitives : DiscoveryPrimitives;
    const typography = variant === 'ainevoie' ? AinevoieDiscoveryTypography : DiscoveryTypography;

    return (
        <View style={[primitives.sectionHeaderRow, style]}>
            <Text style={typography.sectionTitle}>{title}</Text>
            {actionLabel ? (
                <Pressable onPress={onActionPress}>
                    <Text style={typography.sectionAction}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
};

export default DiscoverySectionHeader;
