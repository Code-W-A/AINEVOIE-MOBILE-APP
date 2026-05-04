import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { Colors, Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useNavigation } from "expo-router";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryTypography } from "../../../shared/styles/discoverySystem";
import { FEATURES } from "../../../shared/config/featureFlags";

const FavoriteScreen = () => {
    const navigation = useNavigation();
    const isUnavailable = !FEATURES.favorites;

    if (!isUnavailable) {
        return null;
    }

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
            {header()}
            <View style={styles.emptyWrap}>
                <View style={DiscoveryPrimitives.emptyState}>
                    <MaterialIcons name="favorite-border" size={46} color={Colors.discoveryMutedColor} />
                    <Text style={styles.emptyTitle}>Favorite indisponibile în MVP</Text>
                    <Text style={styles.emptySubtitle}>Nu există încă o colecție Firebase pentru favorite, deci lista rămâne goală și nu afișează date simulate.</Text>
                </View>
            </View>
        </View>
    );

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
                    <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
                </TouchableOpacity>
                <Text style={DiscoveryTypography.heroEyebrow}>Favorite</Text>
                <Text style={styles.headerTitle}>Prestatori salvați</Text>
                <Text style={styles.headerSubtitle}>Favoritele vor fi activate când există model Firebase dedicat.</Text>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.discoveryBackgroundColor,
    },
    headerWrapStyle: {
        ...DiscoveryPrimitives.headerSurface,
    },
    headerTitle: {
        ...DiscoveryTypography.heroTitle,
        marginTop: DiscoverySpacing.lg,
    },
    headerSubtitle: {
        ...DiscoveryTypography.heroBody,
        marginTop: DiscoverySpacing.sm,
    },
    emptyWrap: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: DiscoverySpacing.xl,
    },
    emptyTitle: {
        ...Fonts.blackColor18Bold,
        marginTop: DiscoverySpacing.lg,
        textAlign: 'center',
    },
    emptySubtitle: {
        ...DiscoveryTypography.bodyMuted,
        textAlign: 'center',
        marginTop: DiscoverySpacing.sm,
    },
});

export default FavoriteScreen;
