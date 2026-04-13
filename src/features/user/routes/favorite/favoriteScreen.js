import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableHighlight,
    TouchableOpacity,
    Image,
    Animated,
} from "react-native";
import { SwipeListView } from 'react-native-swipe-list-view';
import { Colors, Fonts } from "../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import MyStatusBar from "../../../../../components/myStatusBar";
import { useNavigation, useRouter } from "expo-router";
import { DiscoveryPrimitives, DiscoverySpacing, DiscoveryRadius, DiscoveryTypography, AinevoieDiscoveryTokens } from "../../../shared/styles/discoverySystem";
import { formatHourlyRate } from "../../../shared/utils/mockFormatting";

const favoriteServiceProviderList = [
    {
        key: '1',
        image: require('../../../../../assets/images/provider/provider_2.jpg'),
        name: 'Servicii la Fix',
        jobCount: 205,
        ratePerHour: 12,
        rating: 4.6,
    },
    {
        key: '2',
        image: require('../../../../../assets/images/provider/provider_4.jpg'),
        name: 'Casa Brio',
        jobCount: 297,
        ratePerHour: 17,
        rating: 4.9,
    },
    {
        key: '3',
        image: require('../../../../../assets/images/provider/provider_6.jpg'),
        name: 'Curățenie Expert',
        jobCount: 150,
        ratePerHour: 13,
        rating: 4.2,
    },
];

const rowSwipeAnimatedValues = {};

Array(favoriteServiceProviderList.length + 1)
    .fill('')
    .forEach((_, i) => {
        rowSwipeAnimatedValues[`${i}`] = new Animated.Value(0);
    });

const FavoriteScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const [showSnackBar, setShowSnackBar] = useState(false);
    const [listData, setListData] = useState(favoriteServiceProviderList);

    const closeRow = (rowMap, rowKey) => {
        if (rowMap[rowKey]) {
            rowMap[rowKey].closeRow();
        }
    };

    const deleteRow = (rowMap, rowKey) => {
        closeRow(rowMap, rowKey);
        const newData = [...listData];
        const prevIndex = listData.findIndex(item => item.key === rowKey);
        newData.splice(prevIndex, 1);
        setShowSnackBar(true);
        setListData(newData);
    };

    const onSwipeValueChange = swipeData => {
        const { key, value } = swipeData;
        rowSwipeAnimatedValues[key].setValue(Math.abs(value));
    };

    const renderItem = data => (
        <TouchableHighlight style={{ backgroundColor: Colors.discoveryBackgroundColor }} activeOpacity={0.9}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/user/serviceProvider/serviceProviderScreen', params: { item: JSON.stringify(data.item) } })}
                style={styles.serviceProvidersWrapStyle}
            >
                <View style={styles.providerTopRow}>
                    <Image source={data.item.image} style={styles.providerImage} resizeMode="cover" />
                    <View style={styles.providerContent}>
                        <Text style={styles.providerName}>{data.item.name}</Text>
                        <Text style={styles.providerRole}>Specialist curățenie</Text>
                    </View>
                </View>
                <View style={styles.metricsRow}>
                    <View style={[styles.metricCard, styles.metricCardSpacing]}>
                        <Text style={styles.metricLabel}>Lucrări</Text>
                        <Text style={styles.metricValue}>{data.item.jobCount}</Text>
                    </View>
                    <View style={[styles.metricCard, styles.metricCardSpacing]}>
                        <Text style={styles.metricLabel}>Tarif</Text>
                        <Text style={[styles.metricValue, styles.metricValueAccent]}>{formatHourlyRate(data.item.ratePerHour)}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Rating</Text>
                        <View style={styles.ratingRow}>
                            <MaterialIcons name="star" size={15} color={AinevoieDiscoveryTokens.rating} />
                            <Text style={styles.ratingText}>{data.item.rating.toFixed(1)}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </TouchableHighlight>
    );

    const renderHiddenItem = (data, rowMap) => (
        <View style={{ alignItems: 'center', flex: 1 }}>
            <TouchableOpacity activeOpacity={0.9} style={styles.backDeleteWrapStyle} onPress={() => deleteRow(rowMap, data.item.key)}>
                <Animated.View
                    style={[
                        {
                            transform: [
                                {
                                    scale: rowSwipeAnimatedValues[data.item.key].interpolate({
                                        inputRange: [45, 90],
                                        outputRange: [0, 1],
                                        extrapolate: 'clamp',
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <MaterialIcons name="delete" size={24} color={Colors.whiteColor} style={{ alignSelf: 'center' }} />
                    <Text style={styles.deleteText}>Șterge</Text>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={Colors.discoveryDarkColor} />
            {header()}
            {listData.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <View style={DiscoveryPrimitives.emptyState}>
                        <MaterialIcons name="favorite-border" size={46} color={Colors.discoveryMutedColor} />
                        <Text style={styles.emptyTitle}>Nu ai favorite salvate</Text>
                        <Text style={styles.emptySubtitle}>Adaugă prestatori în listă pentru a reveni mai ușor la ei.</Text>
                    </View>
                </View>
            ) : (
                <SwipeListView
                    data={listData}
                    renderItem={renderItem}
                    renderHiddenItem={renderHiddenItem}
                    rightOpenValue={-100}
                    onSwipeValueChange={onSwipeValueChange}
                    contentContainerStyle={styles.listContent}
                />
            )}
            <Snackbar style={styles.snackBarStyle} visible={showSnackBar} onDismiss={() => setShowSnackBar(false)} duration={1000}>
                <Text style={styles.snackBarText}>Prestator eliminat din favorite</Text>
            </Snackbar>
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
                <Text style={styles.headerSubtitle}>Glisează spre stânga pentru a elimina un prestator din listă.</Text>
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
    listContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingVertical: DiscoverySpacing.xl,
    },
    serviceProvidersWrapStyle: {
        ...DiscoveryPrimitives.contentSurface,
        padding: DiscoverySpacing.md,
        marginBottom: DiscoverySpacing.lg,
    },
    providerTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    providerImage: {
        height: 96,
        width: 92,
        borderRadius: 20,
    },
    providerContent: {
        flex: 1,
        marginLeft: DiscoverySpacing.md,
        paddingTop: 4,
    },
    providerName: {
        ...Fonts.blackColor16Bold,
        lineHeight: 22,
    },
    providerRole: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        marginTop: DiscoverySpacing.lg,
    },
    metricCard: {
        flex: 1,
        minHeight: 76,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
        borderWidth: 1,
        borderColor: AinevoieDiscoveryTokens.borderSubtle,
        justifyContent: 'space-between',
    },
    metricCardSpacing: {
        marginRight: DiscoverySpacing.sm,
    },
    metricLabel: {
        ...DiscoveryTypography.caption,
        color: AinevoieDiscoveryTokens.textSecondary,
    },
    metricValue: {
        ...Fonts.blackColor16Bold,
        lineHeight: 20,
    },
    metricValueAccent: {
        color: AinevoieDiscoveryTokens.accentDark,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        ...Fonts.blackColor16Bold,
        marginLeft: 4,
    },
    snackBarStyle: {
        position: 'absolute',
        bottom: 12,
        left: 16,
        right: 16,
        backgroundColor: '#333333',
        borderRadius: DiscoveryRadius.md,
    },
    snackBarText: {
        ...Fonts.whiteColor12Medium,
    },
    backDeleteWrapStyle: {
        alignItems: 'center',
        bottom: 18,
        justifyContent: 'center',
        position: 'absolute',
        top: -2,
        width: 100,
        right: DiscoverySpacing.xl,
        borderRadius: DiscoveryRadius.md,
        backgroundColor: Colors.redColor,
    },
    deleteText: {
        ...Fonts.whiteColor12Medium,
        marginTop: 4,
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
