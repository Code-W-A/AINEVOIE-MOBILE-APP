import React from "react";
import { ActivityIndicator, View, FlatList, StyleSheet, Text } from "react-native";
import { Colors } from "../../../../../constant/styles";
import { useRouter } from "expo-router";
import BookingStateCard from "../../../shared/components/BookingStateCard";
import { DiscoverySpacing } from "../../../shared/styles/discoverySystem";
import { useUserBookings } from "../../../../../hooks/useUserBookings";
import { getPaymentChipProps, toBookingStateCardItem } from "../../utils/userBookingUi";

const BookingCancelledScreen = () => {
    const router = useRouter();
    const { bookings, isLoading } = useUserBookings();
    const cancelledBookings = bookings.filter((booking) => booking.bookingStatus === 'cancelled');

    const renderItem = ({ item }) => {
        const paymentChip = getPaymentChipProps(item.payment);

        return (
        <View style={styles.itemWrap}>
            <BookingStateCard
                item={toBookingStateCardItem(item)}
                statusLabel="Anulată"
                accentColor={Colors.redColor}
                accentBackgroundColor="rgba(255,0,0,0.12)"
                {...paymentChip}
                onPress={() => router.push({ pathname: '/user/cancelledBookingDetail/cancelledBookingDetailScreen', params: { bookingId: item.id } })}
            />
        </View>
        );
    };

    return (
        <View style={styles.screen}>
            <FlatList
                data={cancelledBookings}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyWrap}>
                        {isLoading ? <ActivityIndicator size="small" color={Colors.discoveryAccentColor} /> : null}
                        {!isLoading ? <Text style={styles.emptyText}>Nu ai programări anulate.</Text> : null}
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.discoveryBackgroundColor,
    },
    content: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingVertical: DiscoverySpacing.xl,
    },
    itemWrap: {
        marginBottom: DiscoverySpacing.lg,
    },
    emptyWrap: {
        alignItems: 'center',
        paddingTop: DiscoverySpacing.xxl,
    },
    emptyText: {
        marginTop: DiscoverySpacing.md,
        color: Colors.discoveryMutedColor,
    },
});

export default BookingCancelledScreen;
