import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../constant/styles';
import { useLocale } from '../context/localeContext';

const ROMANIA_TIMEZONE = 'Europe/Bucharest';

const dateKeyFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROMANIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function getFormatterParts(formatter, date) {
    return formatter.formatToParts(date).reduce((accumulator, part) => {
        if (part.type !== 'literal') {
            accumulator[part.type] = part.value;
        }

        return accumulator;
    }, {});
}

function capitalizeFirstLetter(value) {
    if (!value) {
        return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getRomaniaDateKey(date = new Date()) {
    const { day, month, year } = getFormatterParts(dateKeyFormatter, date);
    return `${year}-${month}-${day}`;
}

function dateKeyToDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function addDaysToDateKey(dateKey, days) {
    const nextDate = dateKeyToDate(dateKey);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return getRomaniaDateKey(nextDate);
}

function formatWeekday(dateKey, weekdayFormatter) {
    return capitalizeFirstLetter(weekdayFormatter.format(dateKeyToDate(dateKey)).replace(/\./g, ''));
}

const CalendarDate = ({ dateKey, disabledDateKeys, onSelectDate, selected, todayKey, weekdayFormatter }) => {
    const day = formatWeekday(dateKey, weekdayFormatter);
    const dayNumber = String(Number(dateKey.split('-')[2]));
    const isSelected = selected === dateKey;
    const isToday = todayKey === dateKey;
    const isDisabled = disabledDateKeys.includes(dateKey);

    return (
        <View style={styles.dateItemWrap}>
            <TouchableOpacity activeOpacity={0.92} disabled={isDisabled} onPress={() => onSelectDate(dateKey)}>
                <View
                    style={[
                        styles.dateCard,
                        isDisabled ? styles.disabledDateCard : null,
                        isToday ? styles.todayDateCard : null,
                        isSelected ? styles.activeDateCard : null,
                    ]}
                >
                    <Text style={[styles.dayText, isDisabled ? styles.disabledDateText : null, isSelected ? styles.activeDateText : null]}>{day}</Text>
                    <Text style={[styles.dayNumberText, isDisabled ? styles.disabledDateText : null, isSelected ? styles.activeDateText : null]}>{dayNumber}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const Calendar = ({ disabledDateKeys = [], onSelectDate, selected }) => {
    const { locale } = useLocale();
    const [dates, setDates] = useState([]);
    const [todayKey, setTodayKey] = useState(() => getRomaniaDateKey(new Date()));
    const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
        timeZone: ROMANIA_TIMEZONE,
        weekday: 'short',
    }), [locale]);

    useEffect(() => {
        const nextTodayKey = getRomaniaDateKey(new Date());
        const nextDates = [];

        for (let i = 0; i < 200; i += 1) {
            nextDates.push(addDaysToDateKey(nextTodayKey, i));
        }

        setTodayKey(nextTodayKey);
        setDates(nextDates);
    }, []);

    return (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarContent}>
                {dates.map((dateKey) => (
                    <CalendarDate
                        key={dateKey}
                        dateKey={dateKey}
                        disabledDateKeys={disabledDateKeys}
                        onSelectDate={onSelectDate}
                        selected={selected}
                        todayKey={todayKey}
                        weekdayFormatter={weekdayFormatter}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

export default Calendar;

const styles = StyleSheet.create({
    calendarContent: {
        paddingRight: Spacing.sm,
    },
    dateItemWrap: {
        marginRight: Spacing.sm,
    },
    dateCard: {
        width: 72,
        minHeight: 80,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.whiteColor,
        borderWidth: 1,
        borderColor: Colors.discoveryBorderColor,
    },
    todayDateCard: {
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderColor: Colors.discoveryAccentColor,
    },
    activeDateCard: {
        backgroundColor: Colors.discoveryAccentColor,
        borderColor: Colors.discoveryAccentColor,
    },
    disabledDateCard: {
        backgroundColor: Colors.discoverySoftSurfaceColor,
        borderColor: Colors.discoveryBorderColor,
        opacity: 0.52,
    },
    dayNumberText: {
        ...Fonts.blackColor18Bold,
        color: Colors.brandSecondaryColor,
        marginTop: 4,
    },
    dayText: {
        ...Fonts.grayColor12Bold,
        color: Colors.discoveryMutedColor,
        textTransform: 'capitalize',
    },
    activeDateText: {
        color: Colors.whiteColor,
    },
    disabledDateText: {
        color: Colors.discoveryMutedColor,
    },
});
