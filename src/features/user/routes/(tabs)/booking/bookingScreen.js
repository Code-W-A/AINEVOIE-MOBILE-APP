import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions, Text } from "react-native";
import { Colors, Fonts } from "../../../../../../constant/styles";
import { TabView, TabBar } from 'react-native-tab-view';
import MyStatusBar from "../../../../../../components/myStatusBar";
import UpcomingBookingScreen from "../../upcomingBooking/upcomingBookingScreen";
import CancelledBookingScreen from "../../cancelledBooking/cancelledBookingScreen";
import PastBookingScreen from "../../pastBooking/pastBookingScreen";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryTypography } from "../../../../shared/styles/discoverySystem";
import { useUserBookings } from "../../../../../../hooks/useUserBookings";

const BookingScreen = () => {
    const layout = useWindowDimensions();
    const [index, setIndex] = useState(0);
    const { bookings } = useUserBookings();

    const [routes] = useState([
        { key: 'first', title: 'Programate' },
        { key: 'second', title: 'Finalizate' },
        { key: 'third', title: 'Anulate' },
    ]);

    const renderScene = ({ route, jumpTo }) => {
        switch (route.key) {
            case 'first':
                return <UpcomingBookingScreen jumpTo={jumpTo} />;
            case 'second':
                return <PastBookingScreen jumpTo={jumpTo} />;
            case 'third':
                return <CancelledBookingScreen jumpTo={jumpTo} />;
            default:
                return null;
        }
    };

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.brandSecondaryColor} />
            {header()}
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
                commonOptions={{
                    label: ({ route, focused }) => (
                        <View style={styles.labelWrap}>
                            <Text style={[styles.labelText, focused ? styles.labelTextFocused : null]}>{route.title}</Text>
                            <View style={[styles.listItemCountWrapStyle, focused ? styles.listItemCountActiveWrapStyle : null]}>
                                <Text style={[styles.countText, focused ? styles.countTextFocused : null]}>{getRouteCount(route.title)}</Text>
                            </View>
                        </View>
                    ),
                }}
                renderTabBar={(props) => (
                    <TabBar
                        {...props}
                        indicatorStyle={styles.indicatorStyle}
                        tabStyle={{ width: layout.width / 3 }}
                        style={styles.tabBarStyle}
                        pressColor="transparent"
                    />
                )}
            />
        </View>
    );

    function getRouteCount(title) {
        if (title === 'Programate') {
            return bookings.filter((booking) => booking.bookingStatus === 'upcoming').length;
        }
        if (title === 'Finalizate') {
            return bookings.filter((booking) => booking.bookingStatus === 'completed').length;
        }
        return bookings.filter((booking) => booking.bookingStatus === 'cancelled').length;
    }

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <Text style={DiscoveryTypography.heroEyebrow}>Activitate</Text>
                <Text style={styles.headerTitle}>Rezervările tale</Text>
                <Text style={styles.headerSubtitle}>Urmărește rapid intervențiile programate, finalizate sau anulate.</Text>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    headerWrapStyle: {
        ...DiscoveryPrimitives.headerSurface,
    },
    headerTitle: {
        ...DiscoveryTypography.heroTitle,
        marginTop: DiscoverySpacing.xs,
    },
    headerSubtitle: {
        ...DiscoveryTypography.heroBody,
        marginTop: DiscoverySpacing.sm,
    },
    tabBarStyle: {
        backgroundColor: Colors.whiteColor,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: DiscoverySpacing.sm,
    },
    indicatorStyle: {
        backgroundColor: Colors.discoveryAccentColor,
        height: 3,
        borderRadius: 999,
    },
    labelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelText: {
        ...Fonts.blackColor14Bold,
        color: Colors.discoveryMutedColor,
        marginRight: 5,
    },
    labelTextFocused: {
        color: Colors.blackColor,
    },
    listItemCountWrapStyle: {
        minWidth: 24,
        height: 24,
        borderRadius: 12.5,
        backgroundColor: Colors.discoverySoftSurfaceColor,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    listItemCountActiveWrapStyle: {
        backgroundColor: Colors.discoveryAccentColor,
    },
    countText: {
        ...Fonts.primaryColor14Medium,
        color: Colors.discoveryAccentColor,
    },
    countTextFocused: {
        color: Colors.whiteColor,
    },
});

export default BookingScreen;
