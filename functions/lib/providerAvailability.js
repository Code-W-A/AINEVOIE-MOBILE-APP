"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProviderAvailabilityData = normalizeProviderAvailabilityData;
exports.hasConfiguredAvailability = hasConfiguredAvailability;
exports.formatAvailabilitySummary = formatAvailabilitySummary;
exports.getAvailabilityDayChips = getAvailabilityDayChips;
exports.saveProviderAvailabilityProfileService = saveProviderAvailabilityProfileService;
exports.fetchProviderAvailabilityProfile = fetchProviderAvailabilityProfile;
const firestore_1 = require("firebase-admin/firestore");
const audit_1 = require("./audit");
const errors_1 = require("./errors");
const shared_1 = require("./shared");
const logging_1 = require("./logging");
const PROVIDER_WEEK_DAYS = [
    { dayKey: 'monday', label: 'Luni', shortLabel: 'Lu' },
    { dayKey: 'tuesday', label: 'Marți', shortLabel: 'Ma' },
    { dayKey: 'wednesday', label: 'Miercuri', shortLabel: 'Mi' },
    { dayKey: 'thursday', label: 'Joi', shortLabel: 'Jo' },
    { dayKey: 'friday', label: 'Vineri', shortLabel: 'Vi' },
    { dayKey: 'saturday', label: 'Sâmbătă', shortLabel: 'Sâ' },
    { dayKey: 'sunday', label: 'Duminică', shortLabel: 'Du' },
];
function createDefaultWeekSchedule() {
    return PROVIDER_WEEK_DAYS.map((day) => ({
        dayKey: day.dayKey,
        label: day.label,
        shortLabel: day.shortLabel,
        isEnabled: false,
        timeRanges: [],
    }));
}
function normalizeTimeRange(range, index = 0) {
    const source = range && typeof range === 'object' ? range : {};
    return {
        id: (0, shared_1.sanitizeString)(source.id) || `range_${index}`,
        startTime: (0, shared_1.sanitizeString)(source.startTime) || '09:00',
        endTime: (0, shared_1.sanitizeString)(source.endTime) || '17:00',
    };
}
function sortRanges(timeRanges) {
    return [...timeRanges].sort((firstRange, secondRange) => firstRange.startTime.localeCompare(secondRange.startTime));
}
function normalizeBlockedDate(blockedDate, index = 0) {
    const source = blockedDate && typeof blockedDate === 'object' ? blockedDate : {};
    return {
        id: (0, shared_1.sanitizeString)(source.id) || `blocked_${index}`,
        dateKey: (0, shared_1.sanitizeString)(source.dateKey),
        createdAt: source.createdAt || null,
    };
}
function isValidTimeFormat(value) {
    return /^\d{2}:\d{2}$/.test(value);
}
function minutesFromTime(value) {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + minutes;
}
function normalizeProviderAvailabilityData(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const fallbackSchedule = createDefaultWeekSchedule();
    const payloadSchedule = Array.isArray(source.weekSchedule) ? source.weekSchedule : [];
    const payloadBlockedDates = Array.isArray(source.blockedDates) ? source.blockedDates : [];
    const blockedDateMap = new Map();
    payloadBlockedDates
        .map(normalizeBlockedDate)
        .filter((item) => item.dateKey)
        .forEach((item) => {
        blockedDateMap.set(item.dateKey, item);
    });
    return {
        weekSchedule: fallbackSchedule.map((fallbackDay) => {
            const matchingDay = payloadSchedule.find((item) => (item
                && typeof item === 'object'
                && (0, shared_1.sanitizeString)(item.dayKey) === fallbackDay.dayKey));
            return {
                dayKey: fallbackDay.dayKey,
                label: fallbackDay.label,
                shortLabel: fallbackDay.shortLabel,
                isEnabled: Boolean(matchingDay?.isEnabled),
                timeRanges: sortRanges((Array.isArray(matchingDay?.timeRanges) ? matchingDay?.timeRanges : []).map(normalizeTimeRange)),
            };
        }),
        blockedDates: Array.from(blockedDateMap.values()).sort((firstItem, secondItem) => firstItem.dateKey.localeCompare(secondItem.dateKey)),
        updatedAt: source.updatedAt || null,
    };
}
function hasConfiguredAvailability(weekSchedule) {
    return weekSchedule.some((day) => day.isEnabled && day.timeRanges.length > 0);
}
function validateWeekSchedule(weekSchedule) {
    weekSchedule.forEach((day) => {
        if (!day.isEnabled) {
            return;
        }
        if (!day.timeRanges.length) {
            throw (0, errors_1.badRequest)(`Add at least one valid time range for ${day.label}.`);
        }
        day.timeRanges.forEach((range, index) => {
            if (!isValidTimeFormat(range.startTime) || !isValidTimeFormat(range.endTime)) {
                throw (0, errors_1.badRequest)(`Use HH:MM time values for ${day.label}.`);
            }
            const startMinutes = minutesFromTime(range.startTime);
            const endMinutes = minutesFromTime(range.endTime);
            if (startMinutes >= endMinutes) {
                throw (0, errors_1.badRequest)(`The start time must be before the end time for ${day.label}.`);
            }
            if (index > 0) {
                const previousRange = day.timeRanges[index - 1];
                const previousEndMinutes = minutesFromTime(previousRange.endTime);
                if (startMinutes < previousEndMinutes) {
                    throw (0, errors_1.badRequest)(`Time ranges cannot overlap for ${day.label}.`);
                }
            }
        });
    });
}
function validateBlockedDates(payload) {
    const blockedDates = Array.isArray(payload?.blockedDates)
        ? payload.blockedDates
        : [];
    const seenDateKeys = new Set();
    blockedDates
        .map(normalizeBlockedDate)
        .forEach((blockedDate) => {
        if (!blockedDate.dateKey) {
            return;
        }
        if (seenDateKeys.has(blockedDate.dateKey)) {
            throw (0, errors_1.badRequest)(`Duplicate blocked date detected for ${blockedDate.dateKey}.`);
        }
        seenDateKeys.add(blockedDate.dateKey);
    });
}
function formatAvailabilitySummary(weekSchedule) {
    const enabledDays = weekSchedule.filter((day) => day.isEnabled && day.timeRanges.length);
    if (!enabledDays.length) {
        return '';
    }
    return enabledDays
        .map((day) => `${day.label}: ${day.timeRanges.map((range) => `${range.startTime}-${range.endTime}`).join(', ')}`)
        .join(' • ');
}
function getAvailabilityDayChips(weekSchedule) {
    return weekSchedule
        .filter((day) => day.isEnabled && day.timeRanges.length > 0)
        .map((day) => day.label);
}
async function saveProviderAvailabilityProfileService({ db }, providerId, payload) {
    const providerRef = db.collection('providers').doc(providerId);
    const providerSnap = await providerRef.get();
    if (!providerSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Provider profile is missing.');
    }
    const providerData = providerSnap.data() || {};
    const previousAvailabilitySummary = (0, shared_1.sanitizeString)(providerData.professionalProfile?.availabilitySummary);
    const previousConfigured = Boolean(previousAvailabilitySummary);
    if (providerData.role !== 'provider') {
        throw (0, errors_1.failedPrecondition)('Only provider accounts can manage availability.');
    }
    if (providerData.status === shared_1.PROVIDER_STATUSES.SUSPENDED) {
        throw (0, errors_1.failedPrecondition)('Suspended providers cannot update availability.');
    }
    validateBlockedDates(payload);
    const normalized = normalizeProviderAvailabilityData(payload);
    validateWeekSchedule(normalized.weekSchedule);
    const availabilitySummary = formatAvailabilitySummary(normalized.weekSchedule);
    const availabilityDayChips = getAvailabilityDayChips(normalized.weekSchedule);
    const configured = hasConfiguredAvailability(normalized.weekSchedule);
    const availabilityRef = providerRef.collection('availability').doc('profile');
    await availabilityRef.set({
        weekSchedule: normalized.weekSchedule,
        blockedDates: normalized.blockedDates,
        availabilitySummary,
        availabilityDayChips,
        hasConfiguredAvailability: configured,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    await providerRef.set({
        professionalProfile: {
            availabilitySummary,
        },
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'save_provider_availability',
        uid: providerId,
        role: 'provider',
        resourceType: 'provider_availability',
        resourceId: `${providerId}/profile`,
        outcome: configured ? 'saved' : 'cleared',
    }, 'Provider availability profile was saved.');
    await (0, audit_1.writeAuditEvent)({ db }, {
        action: 'provider.availability.save',
        actorUid: providerId,
        actorRole: 'provider',
        resourceType: 'provider_availability',
        resourceId: `${providerId}/profile`,
        statusFrom: previousConfigured ? 'configured' : 'empty',
        statusTo: configured ? 'configured' : 'empty',
        result: 'success',
        context: {
            blockedDateCount: normalized.blockedDates.length,
            enabledDayCount: availabilityDayChips.length,
        },
    });
    return {
        ...normalized,
        availabilitySummary,
        availabilityDayChips,
        hasConfiguredAvailability: configured,
    };
}
async function fetchProviderAvailabilityProfile({ db }, providerId) {
    const availabilitySnap = await db.collection('providers').doc(providerId).collection('availability').doc('profile').get();
    return availabilitySnap.exists ? normalizeProviderAvailabilityData(availabilitySnap.data()) : normalizeProviderAvailabilityData(null);
}
