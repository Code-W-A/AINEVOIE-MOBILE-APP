"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_STATUSES = void 0;
exports.normalizeProviderServiceData = normalizeProviderServiceData;
exports.isPublicProviderService = isPublicProviderService;
exports.buildProviderServiceSummaries = buildProviderServiceSummaries;
exports.derivePrimaryCategory = derivePrimaryCategory;
exports.deriveServiceKeywords = deriveServiceKeywords;
exports.fetchProviderServices = fetchProviderServices;
const shared_1 = require("./shared");
exports.SERVICE_STATUSES = Object.freeze({
    DRAFT: 'draft',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived',
});
function normalizeServiceStatus(value) {
    if (value === exports.SERVICE_STATUSES.DRAFT) {
        return exports.SERVICE_STATUSES.DRAFT;
    }
    if (value === exports.SERVICE_STATUSES.INACTIVE) {
        return exports.SERVICE_STATUSES.INACTIVE;
    }
    if (value === exports.SERVICE_STATUSES.ARCHIVED) {
        return exports.SERVICE_STATUSES.ARCHIVED;
    }
    return exports.SERVICE_STATUSES.ACTIVE;
}
function normalizeNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}
function normalizeProviderServiceData(serviceId, payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    return {
        serviceId: (0, shared_1.sanitizeString)(source.serviceId) || (0, shared_1.sanitizeString)(serviceId),
        providerId: (0, shared_1.sanitizeString)(source.providerId),
        name: (0, shared_1.sanitizeString)(source.name) || 'Serviciu',
        description: (0, shared_1.sanitizeString)(source.description),
        categoryKey: (0, shared_1.sanitizeString)(source.categoryKey),
        categoryLabel: (0, shared_1.sanitizeString)(source.categoryLabel) || 'Serviciu',
        status: normalizeServiceStatus(source.status),
        baseRateAmount: normalizeNumber(source.baseRateAmount),
        baseRateCurrency: (0, shared_1.sanitizeString)(source.baseRateCurrency) || 'RON',
        estimatedDurationMinutes: normalizeNumber(source.estimatedDurationMinutes),
        createdAt: source.createdAt || null,
        updatedAt: source.updatedAt || null,
    };
}
function isPublicProviderService(service) {
    return service.status === exports.SERVICE_STATUSES.ACTIVE;
}
function sortServices(services) {
    return [...services].sort((firstService, secondService) => {
        if (firstService.status !== secondService.status) {
            return firstService.status === exports.SERVICE_STATUSES.ACTIVE ? -1 : 1;
        }
        return firstService.name.localeCompare(secondService.name);
    });
}
function buildProviderServiceSummaries(services) {
    return sortServices(services)
        .filter(isPublicProviderService)
        .map((service) => ({
        serviceId: service.serviceId,
        name: service.name,
        categoryKey: service.categoryKey,
        categoryLabel: service.categoryLabel,
        status: service.status,
        baseRateAmount: service.baseRateAmount,
        baseRateCurrency: service.baseRateCurrency,
        estimatedDurationMinutes: service.estimatedDurationMinutes,
    }));
}
function derivePrimaryCategory(services, fallbackCategory) {
    return buildProviderServiceSummaries(services)[0]?.categoryLabel || (0, shared_1.sanitizeString)(fallbackCategory) || 'Serviciu';
}
function deriveServiceKeywords(services) {
    return sortServices(services)
        .filter((service) => service.status !== exports.SERVICE_STATUSES.ARCHIVED)
        .flatMap((service) => [
        service.name,
        service.description,
        service.categoryKey,
        service.categoryLabel,
    ]);
}
async function fetchProviderServices({ db }, providerId) {
    const servicesSnap = await db.collection('providers').doc(providerId).collection('services').get();
    return sortServices(servicesSnap.docs.map((docSnap) => normalizeProviderServiceData(docSnap.id, docSnap.data())));
}
