import React from "react";
import { Text, View } from "react-native";
import { Colors } from "../../../../constant/styles";
import {
    DiscoveryPrimitives,
    DiscoveryTypography,
    AinevoieDiscoveryPrimitives,
    AinevoieDiscoveryTypography,
    AinevoieDiscoveryTokens,
} from "../styles/discoverySystem";

const DiscoveryStatPill = ({ label, value, accent = false, align = 'center', style, variant = 'legacy' }) => {
    const primitives = variant === 'ainevoie' ? AinevoieDiscoveryPrimitives : DiscoveryPrimitives;
    const typography = variant === 'ainevoie' ? AinevoieDiscoveryTypography : DiscoveryTypography;
    const accentColor = variant === 'ainevoie' ? AinevoieDiscoveryTokens.accent : Colors.discoveryAccentColor;

    return (
        <View style={[primitives.statPill, { alignItems: align }, style]}>
            <Text style={typography.caption}>{label}</Text>
            <Text
                style={[
                    typography.body,
                    accent ? { color: accentColor } : null,
                    { marginTop: 4 },
                ]}
            >
                {value}
            </Text>
        </View>
    );
};

export default DiscoveryStatPill;
