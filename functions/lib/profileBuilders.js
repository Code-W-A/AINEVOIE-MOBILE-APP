"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUserProfileDoc = buildUserProfileDoc;
exports.buildProviderProfileDoc = buildProviderProfileDoc;
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("./config");
const shared_1 = require("./shared");
function buildUserProfileDoc({ uid, createdBy, displayName, email, phoneNumber, authProviders, locale = shared_1.DEFAULT_LOCALE, }) {
    const now = firestore_1.FieldValue.serverTimestamp();
    return {
        uid,
        role: shared_1.ROLES.USER,
        accountStatus: shared_1.ACCOUNT_STATUSES.ACTIVE,
        displayName,
        email,
        phoneNumber,
        authProviders,
        photoPath: null,
        locale,
        notificationPreferences: { ...shared_1.DEFAULT_NOTIFICATION_PREFERENCES },
        primaryLocation: null,
        profileCompletion: {
            hasPrimaryLocation: false,
        },
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy,
        updatedBy: createdBy,
        schemaVersion: config_1.SCHEMA_VERSION,
    };
}
function buildProviderProfileDoc({ uid, createdBy, displayName, email, phoneNumber, authProviders, locale = shared_1.DEFAULT_LOCALE, }) {
    const now = firestore_1.FieldValue.serverTimestamp();
    return {
        uid,
        role: shared_1.ROLES.PROVIDER,
        status: shared_1.PROVIDER_STATUSES.PRE_REGISTERED,
        accountStatus: shared_1.ACCOUNT_STATUSES.ACTIVE,
        email,
        phoneNumber,
        authProviders,
        locale,
        notificationPreferences: { ...shared_1.DEFAULT_NOTIFICATION_PREFERENCES },
        professionalProfile: {
            businessName: '',
            displayName,
            specialization: '',
            baseRateAmount: null,
            baseRateCurrency: 'RON',
            coverageArea: {
                countryCode: 'RO',
                countryName: 'România',
                countyCode: '',
                countyName: '',
                cityCode: '',
                cityName: '',
                placeId: '',
                locationLabel: '',
                formattedAddress: '',
                centerLat: null,
                centerLng: null,
            },
            coverageAreaText: '',
            shortBio: '',
            availabilitySummary: '',
            avatarPath: null,
        },
        documents: {
            identity: {
                status: 'missing',
                storagePath: null,
                originalFileName: null,
                uploadedAt: null,
            },
            professional: {
                status: 'missing',
                storagePath: null,
                originalFileName: null,
                uploadedAt: null,
            },
        },
        reviewState: {
            submittedAt: null,
            lastReviewedAt: null,
        },
        adminReview: {
            reviewedBy: null,
            action: null,
            reason: null,
            reviewedAt: null,
        },
        suspension: null,
        lastPublishedAt: null,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        createdBy,
        updatedBy: createdBy,
        schemaVersion: config_1.SCHEMA_VERSION,
    };
}
