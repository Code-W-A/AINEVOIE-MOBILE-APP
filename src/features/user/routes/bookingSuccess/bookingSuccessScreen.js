import React, { useCallback } from "react";
import { View, StyleSheet, BackHandler, Text, Image, Dimensions, TouchableOpacity } from "react-native";
import { Colors, Fonts } from "../../../../../constant/styles";
import { useFocusEffect } from "@react-navigation/native";
import MyStatusBar from "../../../../../components/myStatusBar";
import { useRouter } from "expo-router";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryRadius, DiscoveryTypography } from "../../../shared/styles/discoverySystem";

const { width, height } = Dimensions.get('screen');

const BookingScccessScreen = () => {
    const router = useRouter();

    const backAction = useCallback(() => {
        router.replace('/user/(tabs)/home/homeScreen');
        return true;
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => {
                backHandler.remove();
            };
        }, [backAction])
    );

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
            <View style={styles.brandBackdrop} />
            <View style={styles.contentWrap}>
                <View style={styles.successCard}>
                    <View style={DiscoveryPrimitives.badge}>
                        <Text style={styles.badgeText}>Trimisă</Text>
                    </View>
                    {bookingSuccessImage()}
                    {bookingSuccessText()}
                </View>
                {okayButton()}
            </View>
        </View>
    );

    function okayButton() {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.replace('/user/(tabs)/home/homeScreen')}
                style={styles.okayButtonStyle}
            >
                <Text style={styles.okayButtonText}>Înapoi acasă</Text>
            </TouchableOpacity>
        );
    }

    function bookingSuccessText() {
        return (
            <View>
                <Text style={styles.successTitle}>Cererea a fost trimisă</Text>
                <Text style={styles.successSubtitle}>
                    Prestatorul o va confirma sau va propune o modificare. Plata devine disponibilă după confirmare.
                </Text>
            </View>
        );
    }

    function bookingSuccessImage() {
        return (
            <Image
                source={require('../../../../../assets/images/booking-success.png')}
                resizeMode="contain"
                style={styles.successImage}
            />
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    brandBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.36,
        backgroundColor: Colors.discoveryDarkColor,
        borderBottomLeftRadius: DiscoveryRadius.xl,
        borderBottomRightRadius: DiscoveryRadius.xl,
    },
    contentWrap: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: DiscoverySpacing.xl,
    },
    successCard: {
        ...DiscoveryPrimitives.elevatedSurface,
        padding: DiscoverySpacing.xl,
        alignItems: 'center',
    },
    badgeText: {
        ...Fonts.blackColor14Bold,
        color: Colors.discoveryDarkColor,
    },
    successImage: {
        width: width - 90,
        alignSelf: 'center',
        height: height / 3.2,
        marginTop: DiscoverySpacing.lg,
    },
    successTitle: {
        ...Fonts.blackColor24Bold,
        textAlign: 'center',
        marginTop: DiscoverySpacing.md,
    },
    successSubtitle: {
        ...DiscoveryTypography.bodyMuted,
        textAlign: 'center',
        marginTop: DiscoverySpacing.md,
    },
    okayButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
        marginTop: DiscoverySpacing.xl,
    },
    okayButtonText: {
        ...Fonts.whiteColor16Bold,
    },
});

export default BookingScccessScreen;
