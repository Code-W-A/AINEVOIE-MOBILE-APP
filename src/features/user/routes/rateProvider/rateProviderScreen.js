import React, { useEffect, useState } from "react";
import { Alert, View, StyleSheet, Text, ScrollView, Image, TouchableOpacity, TextInput } from "react-native";
import { Colors, Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryRadius, DiscoveryTypography } from "../../../shared/styles/discoverySystem";
import { formatHourlyRate } from "../../../shared/utils/mockFormatting";
import { useUserBookings } from "../../../../../hooks/useUserBookings";
import { useUserReviews } from "../../../../../hooks/useUserReviews";

const RateProviderScreen = () => {
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const { getBookingById } = useUserBookings();
    const { getReviewByBookingId, saveReview } = useUserReviews();
    const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;
    const booking = bookingId ? getBookingById(bookingId) : null;
    const existingReview = bookingId ? getReviewByBookingId(bookingId) : null;

    const [state, setState] = useState({
        rating: 0,
        review: '',
        isReviewFocus: false,
        isSubmitting: false,
    });

    const updateState = (data) => setState((prevState) => ({ ...prevState, ...data }));
    const { rating, review, isReviewFocus, isSubmitting } = state;

    useEffect(() => {
        if (!existingReview) {
            return;
        }

        updateState({
            rating: existingReview.rating,
            review: existingReview.review,
        });
    }, [existingReview]);

    async function handleSubmit() {
        if (!bookingId || !booking) {
            navigation.pop();
            return;
        }

        if (!rating) {
            Alert.alert('Evaluare incompletă', 'Alege un scor pentru a salva feedback-ul.');
            return;
        }

        updateState({ isSubmitting: true });

        try {
            await saveReview({
                id: existingReview?.id,
                bookingId,
                providerId: booking.providerId,
                providerName: booking.providerName,
                providerRole: booking.providerRole,
                providerImage: booking.providerImage,
                serviceName: booking.serviceName,
                rating,
                review,
                createdAt: existingReview?.createdAt || new Date().toISOString(),
            });
            navigation.goBack();
        } catch (error) {
            Alert.alert(
                'Evaluarea nu a putut fi salvată',
                error instanceof Error ? error.message : 'Încearcă din nou.',
            );
        } finally {
            updateState({ isSubmitting: false });
        }
    }

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {personDetail()}
                    {ratingSection()}
                    {reviewField()}
                </ScrollView>
                {submitButton()}
            </View>
        </View>
    );

    function reviewField() {
        return (
            <View style={styles.reviewCard}>
                <Text style={styles.sectionTitle}>Lasă un mesaj</Text>
                <TextInput
                    placeholder="Scrie aici experiența ta"
                    placeholderTextColor={Colors.discoveryMutedColor}
                    value={review}
                    onChangeText={(value) => updateState({ review: value })}
                    style={[
                        styles.textFieldWrapStyle,
                        isReviewFocus ? styles.activeReviewInput : null,
                    ]}
                    multiline
                    numberOfLines={7}
                    selectionColor={Colors.discoveryAccentColor}
                    onFocus={() => updateState({ isReviewFocus: true })}
                    onBlur={() => updateState({ isReviewFocus: false })}
                    textAlignVertical="top"
                />
            </View>
        );
    }

    function ratingSection() {
        return (
            <View style={styles.ratingCard}>
                <Text style={styles.sectionTitle}>Cum a fost experiența?</Text>
                <Text style={styles.sectionSubtitle}>Alege rapid un scor pentru serviciul primit.</Text>
                <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((item) => (
                        <MaterialIcons
                            key={item}
                            name={item <= rating ? "star" : "star-border"}
                            size={33}
                            color={Colors.discoveryRatingColor}
                            onPress={() => updateState({ rating: item })}
                        />
                    ))}
                </View>
            </View>
        );
    }

    function submitButton() {
        return (
            <View style={styles.footerWrap}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => { void handleSubmit(); }} style={styles.submitButtonStyle}>
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Se salvează...' : existingReview ? 'Actualizează evaluarea' : 'Trimite evaluarea'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    function personDetail() {
        return (
            <View style={styles.personDetailWrapStyle}>
                <Image source={booking?.providerImage || require('../../../../../assets/images/provider/provider_7.jpg')} style={styles.personImage} resizeMode="cover" />
                <View style={{ marginLeft: DiscoverySpacing.md, flex: 1 }}>
                    <View style={DiscoveryPrimitives.chip}>
                        <Text style={DiscoveryTypography.chip}>Serviciu finalizat</Text>
                    </View>
                    <Text style={styles.personName}>{booking?.providerName || 'Casa în Ordine'}</Text>
                    <Text style={styles.personRole}>{booking?.providerRole || 'Specialist curățenie'}</Text>
                    <Text style={styles.personRate}>{formatHourlyRate(booking?.price?.amount, booking?.price?.currency)}</Text>
                </View>
            </View>
        );
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
                    <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
                </TouchableOpacity>
                <Text style={DiscoveryTypography.heroEyebrow}>Feedback</Text>
                <Text style={styles.headerTitle}>Evaluează prestatorul</Text>
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
    scrollContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingVertical: DiscoverySpacing.xl,
        paddingBottom: DiscoverySpacing.xxl,
    },
    personDetailWrapStyle: {
        ...DiscoveryPrimitives.elevatedSurface,
        padding: DiscoverySpacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    personImage: {
        height: 96,
        width: 96,
        borderRadius: DiscoveryRadius.md,
    },
    personName: {
        ...Fonts.blackColor20Bold,
        marginTop: DiscoverySpacing.md,
    },
    personRole: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    personRate: {
        ...Fonts.primaryColor16Medium,
        color: Colors.discoveryAccentColor,
        marginTop: DiscoverySpacing.lg,
    },
    ratingCard: {
        ...DiscoveryPrimitives.contentSurface,
        marginTop: DiscoverySpacing.xl,
        padding: DiscoverySpacing.xl,
    },
    sectionTitle: {
        ...Fonts.blackColor18Bold,
    },
    sectionSubtitle: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.xs,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: DiscoverySpacing.xl,
    },
    reviewCard: {
        ...DiscoveryPrimitives.contentSurface,
        marginTop: DiscoverySpacing.xl,
        padding: DiscoverySpacing.xl,
    },
    textFieldWrapStyle: {
        ...Fonts.blackColor14Medium,
        backgroundColor: Colors.discoverySoftSurfaceColor,
        marginTop: DiscoverySpacing.lg,
        borderRadius: DiscoveryRadius.md,
        borderWidth: 1,
        padding: DiscoverySpacing.md,
        minHeight: 140,
        borderColor: Colors.discoveryBorderColor,
    },
    activeReviewInput: {
        borderColor: Colors.discoveryAccentColor,
        backgroundColor: Colors.whiteColor,
    },
    footerWrap: {
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.xl,
        borderTopLeftRadius: DiscoveryRadius.lg,
        borderTopRightRadius: DiscoveryRadius.lg,
    },
    submitButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
    },
    submitButtonText: {
        ...Fonts.whiteColor16Bold,
    },
});

export default RateProviderScreen;
