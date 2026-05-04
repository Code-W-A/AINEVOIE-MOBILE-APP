"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProviderDirectoryDoc = buildProviderDirectoryDoc;
exports.shouldPublishProviderDirectory = shouldPublishProviderDirectory;
exports.syncProviderDirectorySnapshot = syncProviderDirectorySnapshot;
exports.syncProviderDirectoryFromProviderRef = syncProviderDirectoryFromProviderRef;
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("./shared");
const logging_1 = require("./logging");
const providerCoverage_1 = require("./providerCoverage");
const providerAvailability_1 = require("./providerAvailability");
const providerServices_1 = require("./providerServices");
const reviews_1 = require("./reviews");
function normalizeKeywordToken(value) {
    return (0, shared_1.sanitizeString)(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
function toKeywordList(values) {
    return Array.from(new Set(values
        .flatMap((value) => normalizeKeywordToken(String(value || '')).split(/\s+/))
        .filter(Boolean))).slice(0, 40);
}
function buildProviderDirectoryDoc(providerId, providerData, availabilityData = null, servicesData = [], reviewAggregate = null) {
    const professionalProfile = providerData.professionalProfile || {};
    const displayName = (0, shared_1.sanitizeString)(professionalProfile.businessName)
        || (0, shared_1.sanitizeString)(professionalProfile.displayName)
        || 'Provider AI Nevoie';
    const normalizedServicesData = servicesData.map((service, index) => (0, providerServices_1.normalizeProviderServiceData)((0, shared_1.sanitizeString)(service?.serviceId) || `service_${index}`, service));
    const serviceSummaries = (0, providerServices_1.buildProviderServiceSummaries)(normalizedServicesData);
    const categoryPrimary = (0, providerServices_1.derivePrimaryCategory)(normalizedServicesData, professionalProfile.specialization);
    const coverageArea = (0, providerCoverage_1.normalizeCoverageArea)(professionalProfile.coverageArea);
    const profileCoverageAreaText = (0, shared_1.sanitizeString)(professionalProfile.coverageAreaText);
    const hasCoverageAreaDetails = Boolean(coverageArea.countyCode
        || coverageArea.countyName
        || coverageArea.cityCode
        || coverageArea.cityName
        || coverageArea.locationLabel
        || coverageArea.formattedAddress);
    const coverageAreaText = profileCoverageAreaText
        || (hasCoverageAreaDetails ? (0, providerCoverage_1.buildCoverageAreaText)(coverageArea) : '')
        || 'Acoperire nespecificată';
    const normalizedAvailability = availabilityData || null;
    const derivedAvailabilitySummary = normalizedAvailability && (0, providerAvailability_1.hasConfiguredAvailability)(normalizedAvailability.weekSchedule)
        ? (0, providerAvailability_1.formatAvailabilitySummary)(normalizedAvailability.weekSchedule)
        : '';
    const providerHasConfiguredAvailability = Boolean(normalizedAvailability && (0, providerAvailability_1.hasConfiguredAvailability)(normalizedAvailability.weekSchedule));
    const availabilitySummary = derivedAvailabilitySummary
        || (0, shared_1.sanitizeString)(professionalProfile.availabilitySummary)
        || 'Disponibilitatea va fi publicată curând';
    const baseRateAmount = Number(professionalProfile.baseRateAmount);
    const validBaseRateAmount = Number.isFinite(baseRateAmount) && baseRateAmount > 0 ? baseRateAmount : 0;
    const ratingAverage = Number(reviewAggregate?.ratingAverage) || 0;
    const reviewCount = Number(reviewAggregate?.reviewCount) || 0;
    const ratingSum = Number(reviewAggregate?.ratingSum) || 0;
    return {
        providerId,
        status: shared_1.PROVIDER_STATUSES.APPROVED,
        displayName,
        categoryPrimary,
        countryCode: coverageArea.countryCode,
        countryName: coverageArea.countryName,
        countyCode: coverageArea.countyCode,
        countyName: coverageArea.countyName,
        cityCode: coverageArea.cityCode,
        cityName: coverageArea.cityName,
        coverageAreaText,
        coverageTags: (0, providerCoverage_1.deriveCoverageTags)(coverageArea, coverageAreaText),
        hasConfiguredAvailability: providerHasConfiguredAvailability,
        availabilitySummary,
        availabilityDayChips: normalizedAvailability && (0, providerAvailability_1.hasConfiguredAvailability)(normalizedAvailability.weekSchedule)
            ? (0, providerAvailability_1.getAvailabilityDayChips)(normalizedAvailability.weekSchedule)
            : [],
        description: (0, shared_1.sanitizeString)(professionalProfile.shortBio) || 'Profil profesional în curs de configurare.',
        baseRateAmount: validBaseRateAmount,
        baseRateCurrency: (0, shared_1.sanitizeString)(professionalProfile.baseRateCurrency) || 'RON',
        ratingAverage,
        reviewCount,
        ratingSum,
        jobCount: 0,
        avatarPath: (0, shared_1.sanitizeString)(professionalProfile.avatarPath) || null,
        serviceSummaries,
        searchKeywordsNormalized: toKeywordList([
            displayName,
            professionalProfile.businessName,
            professionalProfile.displayName,
            categoryPrimary,
            professionalProfile.coverageArea?.countryName,
            professionalProfile.coverageArea?.countyName,
            professionalProfile.coverageArea?.cityName,
            professionalProfile.coverageAreaText,
            professionalProfile.shortBio,
            ...(0, providerServices_1.deriveServiceKeywords)(normalizedServicesData),
        ]),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
}
function shouldPublishProviderDirectory(providerData) {
    return providerData?.status === shared_1.PROVIDER_STATUSES.APPROVED;
}
async function syncProviderDirectorySnapshot({ db }, providerId, providerData) {
    const directoryRef = db.collection('providerDirectory').doc(providerId);
    if (!shouldPublishProviderDirectory(providerData)) {
        await directoryRef.delete().catch(() => undefined);
        return { action: 'unpublished' };
    }
    const availabilityData = await (0, providerAvailability_1.fetchProviderAvailabilityProfile)({ db }, providerId);
    const servicesData = await (0, providerServices_1.fetchProviderServices)({ db }, providerId);
    const directorySnap = await directoryRef.get();
    let reviewAggregate;
    if (directorySnap.exists) {
        const existing = directorySnap.data() || {};
        reviewAggregate = {
            ratingAverage: Number(existing.ratingAverage) || 0,
            reviewCount: Number(existing.reviewCount) || 0,
            ratingSum: Number(existing.ratingSum) || 0,
        };
    }
    else {
        reviewAggregate = await (0, reviews_1.fetchProviderReviewAggregate)({ db }, providerId);
    }
    await directoryRef.set(buildProviderDirectoryDoc(providerId, providerData, availabilityData, servicesData, reviewAggregate), { merge: true });
    return { action: 'published' };
}
async function syncProviderDirectoryFromProviderRef({ db }, providerId) {
    const providerSnap = await db.collection('providers').doc(providerId).get();
    if (!providerSnap.exists) {
        await db.collection('providerDirectory').doc(providerId).delete().catch(() => undefined);
        return { action: 'deleted_missing_provider' };
    }
    const providerData = providerSnap.data() || {};
    const result = await syncProviderDirectorySnapshot({ db }, providerId, providerData);
    (0, logging_1.writeStructuredLog)('info', {
        action: 'sync_provider_directory',
        uid: providerId,
        role: 'provider',
        resourceType: 'providerDirectory',
        resourceId: providerId,
        statusTo: providerData.status || null,
        outcome: result.action,
    }, 'Provider directory snapshot was synchronized.');
    return result;
}
