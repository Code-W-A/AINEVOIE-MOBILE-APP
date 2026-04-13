import React from "react";
import { View, StyleSheet, Text, Image, ScrollView, TouchableOpacity } from "react-native";
import { Colors, Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLocale } from "../../../../../context/localeContext";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryRadius, DiscoveryTypography } from "../../../shared/styles/discoverySystem";
import { useUserBookings } from "../../../../../hooks/useUserBookings";
import PaymentSummaryCard from "../../components/PaymentSummaryCard";
import ServiceRequestCard from "../../components/ServiceRequestCard";
import { formatHourlyRate } from "../../../shared/utils/mockFormatting";

const PastBookingDetailScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useLocale();
    const { getBookingById } = useUserBookings();
    const bookingId = typeof params.bookingId === 'string' ? params.bookingId : null;
    const booking = bookingId ? getBookingById(bookingId) : null;
    const displayBookingId = booking?.id ? booking.id.slice(-4).toUpperCase() : '1905';
    const estimatedHours = booking?.requestDetails?.estimatedHours || booking?.price?.estimatedHours || 1;
    const timeline = [
        { title: t('pastBookingDetail.timelineRequestSentTitle'), description: t('pastBookingDetail.timelineRequestSentDescription') },
        { title: t('pastBookingDetail.timelineBookingConfirmedTitle'), description: `${booking?.dateLabel || t('dates.noDate')} • ${booking?.timeLabel || t('selectDateTime.noSlotSelected')}` },
        { title: t('pastBookingDetail.timelineStartedTitle'), description: t('pastBookingDetail.timelineStartedDescription') },
        {
            title: t('pastBookingDetail.timelineCompletedTitle'),
            description: t('pastBookingDetail.timelineCompletedDescription', {
                hours: estimatedHours === 1 ? t('serviceRequest.oneHour') : t('serviceRequest.multipleHours', { hours: estimatedHours }),
            }),
        },
    ];

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
            <View style={{ flex: 1 }}>
                {header()}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {personDetail()}
                    {bookingStatusInfo()}
                    {serviceRequestSummary()}
                    {paymentSummary()}
                </ScrollView>
            </View>
            {rateServiceProviderButton()}
        </View>
    );

    function rateServiceProviderButton() {
        return (
            <View style={styles.footerWrap}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push({ pathname: '/user/rateProvider/rateProviderScreen', params: { bookingId: booking?.id } })}
                    style={styles.rateServiceProviderButtonStyle}
                >
                    <Text style={styles.footerButtonText}>{t('pastBookingDetail.rateProvider')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    function bookingStatusInfo() {
        return (
            <View style={styles.cardWrap}>
                <Text style={styles.sectionTitle}>{t('pastBookingDetail.statusTitle')}</Text>
                <View style={{ marginTop: DiscoverySpacing.md }}>
                    {timeline.map((step, index) => (
                        <View key={step.title}>
                            {bookingStatus(step)}
                            {index !== timeline.length - 1 ? dashLine() : null}
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    function bookingStatus({ title, description }) {
        return (
            <View style={styles.bookingStatusRowStyle}>
                <View style={styles.bookingStatusTicMarkStyle}>
                    <MaterialIcons name="check" size={14} color={Colors.whiteColor} />
                </View>
                <View style={{ marginLeft: DiscoverySpacing.lg }}>
                    <Text style={styles.statusTitle}>{title}</Text>
                    <Text style={styles.statusDescription}>{description}</Text>
                </View>
            </View>
        );
    }

    function dashLine() {
        return <View style={styles.dashlineStyle} />;
    }

    function serviceRequestSummary() {
        if (!booking) {
            return null;
        }

        return (
            <View style={{ marginTop: DiscoverySpacing.xl }}>
                <ServiceRequestCard booking={booking} />
            </View>
        );
    }

    function personDetail() {
        return (
            <View style={styles.personDetailWrapStyle}>
                <Image source={booking?.providerImage || require('../../../../../assets/images/provider/provider_7.jpg')} style={styles.personImageStyle} resizeMode="cover" />
                <View style={{ marginLeft: DiscoverySpacing.md, flex: 1 }}>
                    <View style={DiscoveryPrimitives.chip}>
                        <Text style={DiscoveryTypography.chip}>{t('pastBookingDetail.completedChip')}</Text>
                    </View>
                    <Text style={styles.personName}>{booking?.providerName || 'Casa în Ordine'}</Text>
                    <Text style={styles.personRole}>{booking?.providerRole || t('serviceRequestForm.service')}</Text>
                    <Text style={styles.personRate}>{formatHourlyRate(booking?.price?.amount, booking?.price?.currency)}</Text>
                </View>
            </View>
        );
    }

    function paymentSummary() {
        if (!booking) {
            return null;
        }

        return (
            <View style={{ marginTop: DiscoverySpacing.xl }}>
                <PaymentSummaryCard
                    booking={booking}
                    onPayNow={['unpaid', 'failed'].includes(booking.payment?.status) ? () => router.push({ pathname: '/user/checkout/checkoutScreen', params: { bookingId: booking.id } }) : undefined}
                />
            </View>
        );
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.pop()} style={DiscoveryPrimitives.iconButton}>
                    <MaterialIcons name="arrow-back" size={22} color={Colors.whiteColor} />
                </TouchableOpacity>
                <Text style={DiscoveryTypography.heroEyebrow}>{t('bookingDetail.eyebrow')}</Text>
                <Text style={styles.headerTitle}>{`${t('bookingDetail.idPrefix')} ${displayBookingId}`}</Text>
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
    personImageStyle: {
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
    cardWrap: {
        ...DiscoveryPrimitives.contentSurface,
        marginTop: DiscoverySpacing.xl,
        padding: DiscoverySpacing.xl,
    },
    sectionTitle: {
        ...Fonts.blackColor18Bold,
    },
    bookingStatusRowStyle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookingStatusTicMarkStyle: {
        height: 22,
        width: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: 'center',
        backgroundColor: Colors.discoveryAccentColor,
    },
    dashlineStyle: {
        height: 38,
        width: 1,
        borderWidth: 0.7,
        borderStyle: "dashed",
        borderRadius: 10,
        marginLeft: 10,
        borderColor: Colors.discoveryAccentColor,
        marginVertical: 4,
    },
    statusTitle: {
        ...Fonts.blackColor14Bold,
    },
    statusDescription: {
        ...DiscoveryTypography.caption,
        marginTop: 2,
    },
    footerWrap: {
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.xl,
        borderTopLeftRadius: DiscoveryRadius.lg,
        borderTopRightRadius: DiscoveryRadius.lg,
    },
    rateServiceProviderButtonStyle: {
        ...DiscoveryPrimitives.primaryButton,
    },
    footerButtonText: {
        ...Fonts.whiteColor16Bold,
    },
});

export default PastBookingDetailScreen;
