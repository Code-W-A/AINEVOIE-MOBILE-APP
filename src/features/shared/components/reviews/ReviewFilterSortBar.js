import React, { useMemo, useState } from "react";
import { View, Pressable, Text, StyleSheet, Modal } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Fonts, Sizes } from "../../../../../constant/styles";

const ReviewFilterSortBar = ({
    starOptions,
    selectedStars,
    onSelectStars,
    onlyWithText,
    onToggleOnlyWithText,
    sortOptions,
    selectedSort,
    onSelectSort,
    containerStyle,
}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);

    const filterSummary = useMemo(() => {
        const starsLabel = selectedStars ? `${selectedStars}★+` : 'Toate';
        const textLabel = onlyWithText ? ' + cu text' : '';
        return `${starsLabel}${textLabel}`;
    }, [onlyWithText, selectedStars]);

    const resetFilters = () => {
        onSelectStars(null);
        onToggleOnlyWithText(false);
        onSelectSort(sortOptions[0]);
    };

    return (
        <>
            <View style={[styles.toolbarWrapStyle, containerStyle]}>
                <Pressable
                    onPress={() => setIsModalVisible(true)}
                    style={({ pressed }) => [styles.filterButtonStyle, pressed ? styles.filterButtonPressedStyle : null]}
                >
                    <MaterialIcons name="tune" size={18} color={Colors.primaryColor} />
                    <Text style={styles.filterButtonTextStyle}>Filtre</Text>
                </Pressable>

                <Text numberOfLines={1} style={styles.filterSummaryStyle}>
                    {`Active: ${filterSummary} • ${selectedSort}`}
                </Text>
            </View>

            <Modal
                transparent
                animationType="slide"
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlayStyle}>
                    <Pressable style={styles.modalBackdropStyle} onPress={() => setIsModalVisible(false)} />
                    <View style={styles.modalCardStyle}>
                        <Text style={styles.modalTitleStyle}>Filtre recenzii</Text>

                        <Text style={styles.sectionTitleStyle}>Rating minim</Text>
                        <View style={styles.chipWrapStyle}>
                            <Pressable
                                onPress={() => onSelectStars(null)}
                                style={({ pressed }) => [
                                    styles.chipStyle,
                                    selectedStars === null ? styles.chipActiveStyle : null,
                                    pressed ? styles.chipPressedStyle : null,
                                ]}
                            >
                                <Text style={[styles.chipTextStyle, selectedStars === null ? styles.chipTextActiveStyle : null]}>Toate</Text>
                            </Pressable>
                            {starOptions.map((stars) => (
                                <Pressable
                                    key={stars}
                                    onPress={() => onSelectStars(stars)}
                                    style={({ pressed }) => [
                                        styles.chipStyle,
                                        selectedStars === stars ? styles.chipActiveStyle : null,
                                        pressed ? styles.chipPressedStyle : null,
                                    ]}
                                >
                                    <Text style={[styles.chipTextStyle, selectedStars === stars ? styles.chipTextActiveStyle : null]}>{`${stars}★+`}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.sectionTitleStyle}>Conținut</Text>
                        <Pressable
                            onPress={() => onToggleOnlyWithText(!onlyWithText)}
                            style={({ pressed }) => [
                                styles.toggleRowStyle,
                                onlyWithText ? styles.toggleRowActiveStyle : null,
                                pressed ? styles.chipPressedStyle : null,
                            ]}
                        >
                            <Text style={[styles.toggleTextStyle, onlyWithText ? styles.chipTextActiveStyle : null]}>
                                Doar recenzii cu text mai lung
                            </Text>
                            <MaterialIcons name={onlyWithText ? "check-circle" : "radio-button-unchecked"} size={20} color={onlyWithText ? Colors.primaryColor : Colors.grayColor} />
                        </Pressable>

                        <Text style={styles.sectionTitleStyle}>Sortare</Text>
                        <View style={styles.chipWrapStyle}>
                            {sortOptions.map((sortOption) => (
                                <Pressable
                                    key={sortOption}
                                    onPress={() => onSelectSort(sortOption)}
                                    style={({ pressed }) => [
                                        styles.chipStyle,
                                        selectedSort === sortOption ? styles.chipActiveStyle : null,
                                        pressed ? styles.chipPressedStyle : null,
                                    ]}
                                >
                                    <Text style={[styles.chipTextStyle, selectedSort === sortOption ? styles.chipTextActiveStyle : null]}>
                                        {sortOption}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={styles.actionRowStyle}>
                            <Pressable onPress={resetFilters} style={({ pressed }) => [styles.secondaryActionStyle, pressed ? styles.chipPressedStyle : null]}>
                                <Text style={styles.secondaryActionTextStyle}>Resetează</Text>
                            </Pressable>
                            <Pressable onPress={() => setIsModalVisible(false)} style={({ pressed }) => [styles.primaryActionStyle, pressed ? styles.chipPressedStyle : null]}>
                                <Text style={styles.primaryActionTextStyle}>Aplică</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    toolbarWrapStyle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButtonStyle: {
        minHeight: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(16,36,77,0.14)',
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: Sizes.fixPadding + 3.0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButtonPressedStyle: {
        opacity: 0.9,
    },
    filterButtonTextStyle: {
        ...Fonts.primaryColor14Medium,
        marginLeft: 6,
    },
    filterSummaryStyle: {
        ...Fonts.grayColor14Regular,
        marginLeft: Sizes.fixPadding,
        flex: 1,
    },
    modalOverlayStyle: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.24)',
    },
    modalBackdropStyle: {
        flex: 1,
    },
    modalCardStyle: {
        backgroundColor: Colors.whiteColor,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: Sizes.fixPadding * 2.0,
        paddingTop: Sizes.fixPadding * 2.0,
        paddingBottom: Sizes.fixPadding * 2.2,
    },
    modalTitleStyle: {
        ...Fonts.blackColor16Bold,
        marginBottom: Sizes.fixPadding * 1.6,
    },
    sectionTitleStyle: {
        ...Fonts.blackColor14Bold,
        marginBottom: Sizes.fixPadding - 3.0,
        marginTop: Sizes.fixPadding,
    },
    chipWrapStyle: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 2,
    },
    chipStyle: {
        minHeight: 34,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(16,36,77,0.12)',
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: Sizes.fixPadding + 2.0,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Sizes.fixPadding - 2.0,
        marginBottom: Sizes.fixPadding - 2.0,
    },
    chipActiveStyle: {
        backgroundColor: Colors.discoveryChipBackgroundColor,
        borderColor: 'rgba(211,84,0,0.20)',
    },
    chipPressedStyle: {
        opacity: 0.9,
    },
    chipTextStyle: {
        ...Fonts.grayColor14Medium,
    },
    chipTextActiveStyle: {
        ...Fonts.primaryColor14Medium,
    },
    toggleRowStyle: {
        minHeight: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16,36,77,0.12)',
        backgroundColor: Colors.whiteColor,
        paddingHorizontal: Sizes.fixPadding,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleRowActiveStyle: {
        borderColor: 'rgba(211,84,0,0.20)',
        backgroundColor: Colors.discoveryChipBackgroundColor,
    },
    toggleTextStyle: {
        ...Fonts.grayColor14Medium,
        marginRight: Sizes.fixPadding,
        flex: 1,
    },
    actionRowStyle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Sizes.fixPadding * 1.8,
    },
    secondaryActionStyle: {
        flex: 1,
        minHeight: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16,36,77,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Sizes.fixPadding - 2.0,
    },
    secondaryActionTextStyle: {
        ...Fonts.grayColor14Medium,
    },
    primaryActionStyle: {
        flex: 1,
        minHeight: 42,
        borderRadius: 12,
        backgroundColor: Colors.primaryColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Sizes.fixPadding - 2.0,
    },
    primaryActionTextStyle: {
        ...Fonts.whiteColor14Medium,
    },
});

export default ReviewFilterSortBar;
