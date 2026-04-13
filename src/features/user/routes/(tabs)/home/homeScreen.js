import React, { useMemo, useState } from "react";
import { View, StyleSheet, Text, Image, FlatList, TouchableOpacity, Modal, ScrollView, Dimensions } from "react-native";
import { Fonts } from "../../../../../../constant/styles";
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import MyStatusBar from "../../../../../../components/myStatusBar";
import DiscoverySectionHeader from "../../../../shared/components/DiscoverySectionHeader";
import {
    AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
    AinevoieDiscoverySpacing as DiscoverySpacing,
    AinevoieDiscoveryRadius as DiscoveryRadius,
    AinevoieDiscoveryTypography as DiscoveryTypography,
    AinevoieDiscoveryTokens as DiscoveryTokens,
} from "../../../../shared/styles/discoverySystem";
import { formatHourlyRate } from "../../../../shared/utils/mockFormatting";
import { serviceProviders } from "../../../data/serviceProviders";

const servicesList = [
    {
        id: '1',
        icon: require('../../../../../../assets/images/icon/white/001-household.png'),
        serviceType: 'Curățenie',
    },
    {
        id: '2',
        icon: require('../../../../../../assets/images/icon/white/002-plumber.png'),
        serviceType: 'Instalații',
    },
    {
        id: '3',
        icon: require('../../../../../../assets/images/icon/white/003-electrician.png'),
        serviceType: 'Electrician',
    },
    {
        id: '4',
        icon: require('../../../../../../assets/images/icon/white/004-painter.png'),
        serviceType: 'Zugrav',
    },
    {
        id: '5',
        icon: require('../../../../../../assets/images/icon/white/005-meditation.png'),
        serviceType: 'Yoga',
    },
    {
        id: '6',
        icon: require('../../../../../../assets/images/icon/white/006-makeup.png'),
        serviceType: 'Cosmetică',
    },
];

const customerReviewsList = [
    {
        id: '1',
        serviceName: 'Curățenie acasă',
        review: 'Sofia lucrează foarte atent și lasă totul impecabil. O voi rezerva din nou fără ezitare.',
        customerName: 'Natasha',
    },
    {
        id: '2',
        serviceName: 'Curățenie acasă',
        review: 'Curățenie ca la hotel, foarte bine făcută. Sper să accepte și rezervările viitoare.',
        customerName: 'Menka',
    },
    {
        id: '3',
        serviceName: 'Mentenanță',
        review: 'Michael a fost foarte amabil și a oferit un serviciu rapid și eficient. Recomand.',
        customerName: 'Justine',
    },
    {
        id: '4',
        serviceName: 'Curățenie acasă',
        review: 'A ajuns la timp și a lucrat foarte curat. John este cooperant și politicos.',
        customerName: 'Chaitali',
    },
    {
        id: '5',
        serviceName: 'Curățenie acasă',
        review: 'Carla a făcut o treabă excelentă și a fost foarte ușor de coordonat pe tot parcursul.',
        customerName: 'Claire',
    },
];

const citiesList = [
    { id: 1, name: 'București' },
    { id: 2, name: 'Cluj-Napoca' },
];

const PROVIDER_CARD_WIDTH = Math.min(Math.round(Dimensions.get('window').width * 0.58), 220);

const HomeScreen = () => {
    const router = useRouter();

    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [currentCityIndex, setCurrentCityIndex] = useState(1);

    const currentCity = useMemo(
        () => citiesList.find((item) => item.id === currentCityIndex)?.name ?? citiesList[0].name,
        [currentCityIndex]
    );

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
            <View style={styles.backgroundOrbPrimary} />
            <View style={styles.backgroundOrbSecondary} />
            <View style={styles.backgroundOrbTertiary} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {userImageAndLocationInfo()}
                {searchTextField()}
                {servicesInfo()}
                {providersInfo()}
                {title({ title: 'Recenzii clienți' })}
                {customerReviews()}
            </ScrollView>
            {chooseCity()}
        </View>
    );

    function chooseCity() {
        return (
            <Modal
                animationType="slide"
                transparent
                visible={showBottomSheet}
                onRequestClose={() => setShowBottomSheet(false)}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setShowBottomSheet(false)}
                    style={styles.modalBackdrop}
                >
                    <View style={styles.modalBottomWrap}>
                        <TouchableOpacity activeOpacity={1} onPress={() => { }} style={styles.citySheet}>
                            <View style={styles.dragHandle} />
                            <Text style={styles.citySheetTitle}>Alege orașul</Text>
                            <Text style={styles.citySheetSubtitle}>Actualizează rapid zona pentru recomandări mai bune.</Text>
                            {citiesList.map((item) => city({ city: item.name, index: item.id }))}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    }

    function city({ city, index }) {
        const isActive = currentCityIndex === index;
        return (
            <TouchableOpacity
                key={`city-${index}`}
                activeOpacity={0.9}
                onPress={() => {
                    setCurrentCityIndex(index);
                    setShowBottomSheet(false);
                }}
                style={[
                    styles.cityInfoWrapStyle,
                    isActive ? styles.cityInfoWrapStyleActive : null,
                ]}
            >
                <View style={[styles.selectCityRadioButtonStyle, isActive ? styles.activeCityRadioButton : null]}>
                    {isActive ? <View style={styles.activeCityRadioButtonDot} /> : null}
                </View>
                <Text style={styles.cityText}>{city}</Text>
                {isActive ? (
                    <View style={styles.cityActiveChip}>
                        <Text style={styles.cityActiveChipText}>Activ</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    }

    function customerReviews() {
        const renderItem = ({ item }) => (
            <View style={styles.customerReviewCard}>
                <View style={styles.reviewHeaderRow}>
                    <View style={DiscoveryPrimitives.quietChip}>
                        <Text style={DiscoveryTypography.chip}>{item.serviceName}</Text>
                    </View>
                    <View style={styles.reviewQuoteWrap}>
                        <MaterialIcons name="format-quote" size={18} color={DiscoveryTokens.accent} />
                    </View>
                </View>
                <Text numberOfLines={4} style={styles.reviewText}>
                    {item.review}
                </Text>
                <Text style={styles.customerNameText}>{item.customerName}</Text>
            </View>
        );

        return (
            <FlatList
                data={customerReviewsList}
                keyExtractor={(item) => `${item.id}`}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reviewsContent}
            />
        );
    }

    function title({ title }) {
        return (
            <DiscoverySectionHeader
                title={title}
                variant="ainevoie"
                style={{ marginHorizontal: DiscoverySpacing.xl, marginTop: DiscoverySpacing.xl, marginBottom: DiscoverySpacing.md }}
            />
        );
    }

 

    function servicesInfo() {
        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({
                    pathname: '/user/serviceProviderList/serviceProviderListScreen',
                    params: { category: item.serviceType },
                })}
                style={styles.serviceCard}
            >
                <View style={styles.serviceIconWrap}>
                    <Image source={item.icon} style={styles.serviceIcon} resizeMode="contain" />
                </View>
                <Text style={styles.serviceTitle}>{item.serviceType}</Text>
            </TouchableOpacity>
        );

        return (
            <View style={styles.servicesSection}>
                <DiscoverySectionHeader
                    title={`Servicii în ${currentCity}`}
                    actionLabel="Vezi tot"
                    onActionPress={() => router.push('/user/professionalServices/professionalServicesScreen')}
                    variant="ainevoie"
                    style={{ marginHorizontal: DiscoverySpacing.xl }}
                />
                <View style={styles.servicesInfoWrapStyle}>
                    <FlatList
                        data={servicesList}
                        keyExtractor={(item) => `${item.id}`}
                        renderItem={renderItem}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: DiscoverySpacing.xl, paddingRight: DiscoverySpacing.sm }}
                    />
                </View>
            </View>
        );
    }

    function providersInfo() {
        const featuredProviders = serviceProviders.slice(0, 6);

        const renderItem = ({ item }) => (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/user/serviceProvider/serviceProviderScreen', params: { item: JSON.stringify(item) } })}
                style={styles.providerCard}
            >
                <Image source={item.image} style={styles.providerCardImage} resizeMode="cover" />
                <View style={styles.providerCardContent}>
                    <View style={styles.providerMetaRow}>
                        <View style={styles.providerRateChip}>
                            <Text style={styles.providerRateChipText}>{formatHourlyRate(item.ratePerHour)}</Text>
                        </View>
                        <View style={styles.providerRatingWrap}>
                            <MaterialIcons name="star" size={14} color={DiscoveryTokens.rating} />
                            <Text style={styles.providerRatingText}>{item.rating.toFixed(1)}</Text>
                        </View>
                    </View>
                    <Text numberOfLines={1} style={styles.providerCardName}>{item.name}</Text>
                    <Text numberOfLines={1} style={styles.providerCardRole}>Specialist disponibil în {currentCity}</Text>
                    <View style={styles.providerCardFooter}>
                        <Text style={styles.providerCardJobsText}>{`${item.jobCount} lucrări finalizate`}</Text>
                        <View style={styles.providerCardActionIcon}>
                            <MaterialIcons name="arrow-forward" size={14} color={DiscoveryTokens.accent} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );

        return (
            <View style={styles.providersSection}>
                <DiscoverySectionHeader
                    title={`Prestatori în ${currentCity}`}
                    actionLabel="Vezi tot"
                    onActionPress={() => router.push('/user/serviceProviderList/serviceProviderListScreen')}
                    variant="ainevoie"
                    style={{ marginHorizontal: DiscoverySpacing.xl }}
                />
                <View style={styles.providersInfoWrapStyle}>
                    <FlatList
                        data={featuredProviders}
                        keyExtractor={(item) => `${item.id}`}
                        renderItem={renderItem}
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.providersContent}
                    />
                </View>
            </View>
        );
    }

    function searchTextField() {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/user/search/searchScreen')}
                style={styles.searchTextFieldWrapStyle}
            >
                <View style={styles.searchLeadingIconWrap}>
                    <MaterialIcons
                        name="search"
                        size={20}
                        color={DiscoveryTokens.accent}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.searchLabel}>Caută un serviciu</Text>
                    <Text style={styles.searchHint}>Curățenie, instalații, frumusețe și alte servicii utile</Text>
                </View>
                <View style={styles.searchArrowWrap}>
                    <MaterialIcons name="arrow-forward-ios" size={14} color={DiscoveryTokens.accent} />
                </View>
            </TouchableOpacity>
        );
    }

    function userImageAndLocationInfo() {
        return (
            <View style={styles.heroTopRow}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setShowBottomSheet(true)}
                    style={styles.locationWrap}
                >
                    <View style={styles.locationIconWrap}>
                        <MaterialIcons name="location-on" size={18} color={DiscoveryTokens.accent} />
                    </View>
                    <View style={{ marginLeft: DiscoverySpacing.md, flex: 1 }}>
                        <Text style={styles.locationLabel}>Locație</Text>
                        <Text numberOfLines={1} style={styles.locationValue}>
                            {currentCity}
                        </Text>
                    </View>
                    <View style={styles.locationChevronWrap}>
                        <MaterialIcons name="keyboard-arrow-down" size={20} color={DiscoveryTokens.textSecondary} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/user/(tabs)/profile/profileScreen')}
                    style={styles.profileButton}
                >
                    <Image source={require('../../../../../../assets/images/user/user_5.jpg')} style={styles.userImageStyle} />
                </TouchableOpacity>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    screen: {
        ...DiscoveryPrimitives.screen,
    },
    backgroundOrbPrimary: {
        position: 'absolute',
        width: 230,
        height: 230,
        borderRadius: 115,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        top: -72,
        right: -46,
    },
    backgroundOrbSecondary: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.56)',
        top: 138,
        left: -42,
    },
    backgroundOrbTertiary: {
        position: 'absolute',
        width: 124,
        height: 124,
        borderRadius: 62,
        backgroundColor: DiscoveryTokens.overlaySoft,
        bottom: 138,
        right: -18,
    },
    scrollContent: {
        paddingBottom: DiscoverySpacing.xxl * 1.4,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: DiscoverySpacing.sm,
        marginBottom: DiscoverySpacing.sm,
    },
    locationWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minHeight: 48,
        marginRight: DiscoverySpacing.md,
        paddingHorizontal: DiscoverySpacing.md,
        paddingVertical: DiscoverySpacing.xs,
        borderRadius: DiscoveryRadius.xl,
        backgroundColor: DiscoveryTokens.surfaceMuted,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    locationIconWrap: {
        ...DiscoveryPrimitives.iconBadge,
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    locationLabel: {
        ...Fonts.grayColor11Medium,
        color: DiscoveryTokens.textSecondary,
    },
    locationValue: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: 2,
    },
    locationChevronWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
    },
    profileButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
        shadowColor: '#141923',
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
    userImageStyle: {
        height: 42,
        width: 42,
        borderRadius: 21,
        borderColor: DiscoveryTokens.surfaceCard,
        borderWidth: 2.5,
    },
    heroEyebrow: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accentDark,
        letterSpacing: 0.4,
    },
    heroTitle: {
        ...Fonts.blackColor24Bold,
        color: DiscoveryTokens.textPrimary,
        maxWidth: '92%',
        marginTop: DiscoverySpacing.md,
        lineHeight: 32,
    },
    heroDescription: {
        ...DiscoveryTypography.bodyMuted,
        maxWidth: '92%',
        marginTop: DiscoverySpacing.sm,
    },
    searchTextFieldWrapStyle: {
        ...DiscoveryPrimitives.featureSurface,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: DiscoverySpacing.xl,
        marginTop: DiscoverySpacing.sm,
        paddingHorizontal: DiscoverySpacing.lg,
        paddingVertical: DiscoverySpacing.md,
    },
    searchLeadingIconWrap: {
        ...DiscoveryPrimitives.iconBadge,
        marginRight: DiscoverySpacing.md,
    },
    searchArrowWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    searchLabel: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.textPrimary,
    },
    searchHint: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    servicesSection: {
        marginTop: DiscoverySpacing.xl + DiscoverySpacing.xs,
    },
    servicesInfoWrapStyle: {
        marginTop: DiscoverySpacing.md,
    },
    serviceCard: {
        width: 94,
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginRight: DiscoverySpacing.md,
    },
    serviceIconWrap: {
        height: 72,
        width: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DiscoveryTokens.brandDark,
        shadowColor: 'rgba(18, 26, 38, 0.28)',
        shadowOpacity: 0.14,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
    serviceIcon: {
        height: 38,
        width: 38,
    },
    serviceTitle: {
        ...Fonts.grayColor12Medium,
        color: DiscoveryTokens.textSecondary,
        textAlign: 'center',
        marginTop: DiscoverySpacing.sm,
        lineHeight: 16,
        maxWidth: '100%',
    },
    providersSection: {
        marginTop: DiscoverySpacing.xl,
    },
    providersInfoWrapStyle: {
        marginTop: DiscoverySpacing.md,
    },
    providersContent: {
        paddingLeft: DiscoverySpacing.xl,
        paddingRight: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.xs,
    },
    providerCard: {
        ...DiscoveryPrimitives.featureSurface,
        width: PROVIDER_CARD_WIDTH,
        marginRight: DiscoverySpacing.md,
        overflow: 'hidden',
    },
    providerCardImage: {
        width: '100%',
        height: 132,
        borderTopLeftRadius: DiscoveryRadius.xl,
        borderTopRightRadius: DiscoveryRadius.xl,
    },
    providerCardContent: {
        padding: DiscoverySpacing.md,
    },
    providerMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    providerRateChip: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    providerRateChipText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accentDark,
    },
    providerRatingWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceSubtle,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
    },
    providerRatingText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.textPrimary,
        marginLeft: 4,
    },
    providerCardName: {
        ...Fonts.blackColor16Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: DiscoverySpacing.md,
    },
    providerCardRole: {
        ...DiscoveryTypography.caption,
        marginTop: 4,
    },
    providerCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: DiscoverySpacing.md,
    },
    providerCardJobsText: {
        ...Fonts.blackColor12Bold,
        color: DiscoveryTokens.accent,
        flex: 1,
        marginRight: DiscoverySpacing.xs,
    },
    providerCardActionIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    reviewsContent: {
        paddingLeft: DiscoverySpacing.xl,
        paddingRight: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.sm,
    },
    customerReviewCard: {
        ...DiscoveryPrimitives.featureSurface,
        justifyContent: 'space-between',
        width: 276,
        minHeight: 184,
        padding: DiscoverySpacing.lg,
        marginRight: DiscoverySpacing.md,
    },
    reviewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reviewQuoteWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    reviewText: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.md,
        flex: 1,
        lineHeight: 22,
    },
    customerNameText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.textPrimary,
        marginTop: DiscoverySpacing.md,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: DiscoveryTokens.sheetBackdrop,
    },
    modalBottomWrap: {
        justifyContent: "flex-end",
        flex: 1,
    },
    citySheet: {
        ...DiscoveryPrimitives.sheetSurface,
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.md,
        paddingBottom: DiscoverySpacing.xl,
    },
    dragHandle: {
        alignSelf: 'center',
        width: 56,
        height: 5,
        borderRadius: 3,
        backgroundColor: DiscoveryTokens.handle,
        marginBottom: DiscoverySpacing.lg,
    },
    citySheetTitle: {
        ...Fonts.blackColor20Bold,
        color: DiscoveryTokens.textPrimary,
        textAlign: 'center',
    },
    citySheetSubtitle: {
        ...DiscoveryTypography.bodyMuted,
        textAlign: 'center',
        marginTop: DiscoverySpacing.xs,
        marginBottom: DiscoverySpacing.xl,
    },
    selectCityRadioButtonStyle: {
        height: 18,
        width: 18,
        borderRadius: 9,
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderWidth: 1.5,
        borderColor: DiscoveryTokens.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeCityRadioButton: {
        borderColor: DiscoveryTokens.accent,
    },
    activeCityRadioButtonDot: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: DiscoveryTokens.accent,
    },
    cityInfoWrapStyle: {
        ...DiscoveryPrimitives.listItemRow,
        marginBottom: DiscoverySpacing.md,
    },
    cityInfoWrapStyleActive: {
        backgroundColor: DiscoveryTokens.surfaceMuted,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    cityText: {
        ...Fonts.blackColor16Medium,
        color: DiscoveryTokens.textPrimary,
        marginLeft: DiscoverySpacing.md,
        flex: 1,
    },
    cityActiveChip: {
        backgroundColor: DiscoveryTokens.surfaceAccent,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: DiscoveryRadius.pill,
    },
    cityActiveChipText: {
        ...Fonts.blackColor14Bold,
        color: DiscoveryTokens.accent,
    },
});

export default HomeScreen;
