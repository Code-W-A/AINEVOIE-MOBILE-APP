import React from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MyStatusBar from "../../../../../../components/myStatusBar";
import {
    AinevoieDiscoveryPrimitives as DiscoveryPrimitives,
    AinevoieDiscoverySpacing as DiscoverySpacing,
    AinevoieDiscoveryRadius as DiscoveryRadius,
    AinevoieDiscoveryTokens as DiscoveryTokens,
    AinevoieDiscoveryTypography as DiscoveryTypography,
} from "../../../../shared/styles/discoverySystem";
import { FEATURES } from "../../../../shared/config/featureFlags";

const WalletScreen = () => {
    const isUnavailable = !FEATURES.wallet;

    if (!isUnavailable) {
        return null;
    }

    return (
        <View style={styles.screen}>
            <MyStatusBar backgroundColor={DiscoveryTokens.statusBarBackground} barStyle="dark-content" />
            <View style={styles.backgroundOrbPrimary} />
            <View style={styles.backgroundOrbSecondary} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {header()}
                {creditCard()}
                {shareCodeInfo()}
                {referralCodeInfo()}
            </ScrollView>
        </View>
    );

    function header() {
        return (
            <View style={styles.headerWrapStyle}>
                <View style={styles.eyebrowPillStyle}>
                    <Text style={styles.eyebrowPillText}>Portofel</Text>
                </View>
                <Text style={styles.headerTitle}>Credit AI Nevoie</Text>
                <Text style={styles.headerSubtitle}>Portofelul și recomandările nu au încă model Firebase în MVP.</Text>
            </View>
        );
    }

    function creditCard() {
        return (
            <View style={styles.heroCard}>
                <View style={styles.heroCardTopRow}>
                    <View>
                        <Text style={styles.heroLabel}>Credit disponibil</Text>
                        <Text style={styles.cashValue}>0 RON</Text>
                    </View>
                    <View style={styles.heroIconWrapStyle}>
                        <MaterialCommunityIcons name="wallet-outline" size={26} color={DiscoveryTokens.accentDark} />
                    </View>
                </View>
                <Text style={styles.cashSupport}>Nu afișăm valori locale simulate. Creditul va fi conectat când există colecția reală pentru wallet.</Text>
                <View style={styles.heroMetaRow}>
                    <View style={styles.heroMetaChipStyle}>
                        <MaterialIcons name="lock-outline" size={16} color={DiscoveryTokens.accentDark} />
                        <Text style={styles.heroMetaChipText}>Indisponibil în MVP</Text>
                    </View>
                    <Text style={styles.heroMetaQuietText}>0 activ</Text>
                </View>
            </View>
        );
    }

    function shareCodeInfo() {
        return (
            <View style={styles.contentCard}>
                <Text style={styles.sectionTitle}>Programul de recomandări este dezactivat</Text>
                <Text style={styles.sectionBody}>
                    Nu există colecție reală pentru referral în batch-ul MVP, deci nu afișăm beneficii, procente sau coduri generate local.
                </Text>
            </View>
        );
    }

    function referralCodeInfo() {
        return (
            <View style={styles.contentCard}>
                <Text style={styles.sectionTitle}>Codul tău de recomandare</Text>
                <Text style={styles.sectionBody}>Codul va fi disponibil după implementarea modelului Firebase pentru referral.</Text>

                <View style={styles.referralCodeWrapStyle}>
                    <View>
                        <Text style={styles.referralCodeLabel}>Cod activ</Text>
                        <Text style={styles.referralCodeText}>Indisponibil</Text>
                    </View>
                    <TouchableOpacity activeOpacity={1} disabled style={[styles.copyButtonStyle, styles.disabledActionStyle]}>
                        <MaterialIcons name="content-copy" size={20} color={DiscoveryTokens.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.shareOptionsWrapStyle}>
                    <TouchableOpacity activeOpacity={1} disabled style={[styles.primaryActionButtonStyle, styles.disabledActionStyle]}>
                        <Text style={styles.primaryActionText}>WhatsApp</Text>
                        <MaterialCommunityIcons name="whatsapp" size={22} color={DiscoveryTokens.textOnImage} />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={1} disabled style={[styles.secondaryActionButtonStyle, styles.disabledActionStyle]}>
                        <Text style={styles.secondaryActionText}>Mai multe opțiuni</Text>
                        <MaterialIcons name="share" size={20} color={DiscoveryTokens.brandDark} />
                    </TouchableOpacity>
                </View>
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
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: DiscoveryTokens.overlaySoft,
        top: -90,
        right: -70,
    },
    backgroundOrbSecondary: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        bottom: 110,
        left: -80,
        opacity: 0.46,
    },
    scrollContent: {
        paddingHorizontal: DiscoverySpacing.xl,
        paddingTop: DiscoverySpacing.lg,
        paddingBottom: DiscoverySpacing.xxl,
    },
    headerWrapStyle: {
        paddingTop: DiscoverySpacing.sm,
        paddingBottom: DiscoverySpacing.lg,
    },
    eyebrowPillStyle: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceAccent,
        marginBottom: DiscoverySpacing.md,
    },
    eyebrowPillText: {
        ...DiscoveryTypography.chip,
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    headerTitle: {
        ...DiscoveryTypography.heroTitle,
        maxWidth: '88%',
    },
    headerSubtitle: {
        ...DiscoveryTypography.heroBody,
        marginTop: DiscoverySpacing.sm,
        maxWidth: '86%',
    },
    heroCard: {
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderRadius: 28,
        padding: DiscoverySpacing.xl,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
        shadowColor: '#141923',
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
    },
    heroCardTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    heroLabel: {
        ...DiscoveryTypography.heroEyebrow,
        color: DiscoveryTokens.textSecondary,
    },
    heroIconWrapStyle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    cashValue: {
        ...DiscoveryTypography.heroTitle,
        marginTop: DiscoverySpacing.sm,
        fontSize: 42,
        lineHeight: 48,
    },
    cashSupport: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.md,
        maxWidth: '86%',
    },
    heroMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: DiscoverySpacing.xl,
    },
    heroMetaChipStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: DiscoveryRadius.pill,
        backgroundColor: DiscoveryTokens.surfaceSoft,
    },
    heroMetaChipText: {
        ...DiscoveryTypography.caption,
        color: DiscoveryTokens.accentDark,
        marginLeft: 6,
    },
    heroMetaQuietText: {
        ...DiscoveryTypography.caption,
    },
    contentCard: {
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderRadius: 24,
        padding: DiscoverySpacing.xl,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
        marginTop: DiscoverySpacing.xl,
    },
    sectionTitle: {
        ...DiscoveryTypography.sectionTitle,
        maxWidth: '92%',
    },
    sectionBody: {
        ...DiscoveryTypography.bodyMuted,
        marginTop: DiscoverySpacing.sm,
    },
    referralCodeWrapStyle: {
        marginTop: DiscoverySpacing.xl,
        minHeight: 82,
        borderRadius: 20,
        backgroundColor: DiscoveryTokens.surfaceInput,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
        paddingHorizontal: DiscoverySpacing.lg,
        paddingVertical: DiscoverySpacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    referralCodeLabel: {
        ...DiscoveryTypography.caption,
        color: DiscoveryTokens.textSecondary,
        marginBottom: 4,
    },
    referralCodeText: {
        ...DiscoveryTypography.sectionTitle,
        color: DiscoveryTokens.accentDark,
    },
    copyButtonStyle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DiscoveryTokens.surfaceAccent,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderAccentSoft,
    },
    shareOptionsWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: DiscoverySpacing.lg,
    },
    primaryActionButtonStyle: {
        flex: 0.48,
        minHeight: 54,
        borderRadius: DiscoveryRadius.pill,
        paddingHorizontal: DiscoverySpacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: DiscoveryTokens.accent,
    },
    primaryActionText: {
        ...DiscoveryTypography.body,
        color: DiscoveryTokens.textOnImage,
    },
    secondaryActionButtonStyle: {
        flex: 0.48,
        minHeight: 54,
        borderRadius: DiscoveryRadius.pill,
        paddingHorizontal: DiscoverySpacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: DiscoveryTokens.surfaceCard,
        borderWidth: 1,
        borderColor: DiscoveryTokens.borderSubtle,
    },
    secondaryActionText: {
        ...DiscoveryTypography.body,
        color: DiscoveryTokens.brandDark,
    },
    disabledActionStyle: {
        opacity: 0.45,
    },
});

export default WalletScreen;
