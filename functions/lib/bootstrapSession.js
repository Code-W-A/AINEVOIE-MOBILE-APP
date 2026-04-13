"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapSessionService = bootstrapSessionService;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("./errors");
const claims_1 = require("./claims");
const logging_1 = require("./logging");
const profileBuilders_1 = require("./profileBuilders");
const shared_1 = require("./shared");
function getAuthProviderIds(authUser) {
    return (0, shared_1.sanitizeAuthProviders)(authUser.providerData.map((provider) => provider.providerId));
}
function inferDisplayName(authUser, fallbackDisplayName) {
    const trimmedFallback = (0, shared_1.sanitizeString)(fallbackDisplayName);
    if (trimmedFallback) {
        return trimmedFallback;
    }
    if ((0, shared_1.sanitizeString)(authUser.displayName)) {
        return (0, shared_1.sanitizeString)(authUser.displayName);
    }
    if ((0, shared_1.sanitizeString)(authUser.email)) {
        return (0, shared_1.sanitizeString)(String(authUser.email).split('@')[0]);
    }
    if ((0, shared_1.sanitizeString)(authUser.phoneNumber)) {
        return (0, shared_1.sanitizeString)(authUser.phoneNumber);
    }
    return 'Cont AI Nevoie';
}
function buildBootstrapResponse({ uid, role, accountStatus, providerStatus, authProviders, hasPrimaryLocation, bootstrapOutcome, }) {
    return {
        uid,
        role,
        accountStatus,
        providerStatus,
        authProviders,
        profileFlags: (0, shared_1.computeBootstrapProfileFlags)({
            role,
            accountStatus,
            providerStatus,
            hasPrimaryLocation,
        }),
        bootstrapOutcome,
    };
}
async function bootstrapSessionService({ db, auth }, { uid, authUser, payload }) {
    const normalizedPayload = (0, shared_1.sanitizeBootstrapPayload)(payload || {});
    const userRef = db.collection('users').doc(uid);
    const providerRef = db.collection('providers').doc(uid);
    const [userSnap, providerSnap] = await Promise.all([userRef.get(), providerRef.get()]);
    if (userSnap.exists && providerSnap.exists) {
        (0, logging_1.writeStructuredLog)('error', {
            action: 'bootstrap_session',
            uid,
            outcome: 'role_conflict',
            documentPresence: 'users+providers',
        }, 'Bootstrap refused because both user and provider documents exist.');
        throw (0, errors_1.failedPrecondition)('Role conflict detected for this account.');
    }
    let role = null;
    if (userSnap.exists) {
        role = shared_1.ROLES.USER;
    }
    else if (providerSnap.exists) {
        role = shared_1.ROLES.PROVIDER;
    }
    else if (normalizedPayload.intendedRole === shared_1.ROLES.USER || normalizedPayload.intendedRole === shared_1.ROLES.PROVIDER) {
        role = normalizedPayload.intendedRole;
    }
    else if (authUser.customClaims && (authUser.customClaims.role === shared_1.ROLES.USER || authUser.customClaims.role === shared_1.ROLES.PROVIDER)) {
        role = authUser.customClaims.role;
    }
    if (!role) {
        (0, logging_1.writeStructuredLog)('warn', {
            action: 'bootstrap_session',
            uid,
            outcome: 'missing_role',
            claimsPresence: authUser.customClaims?.role ? 'present' : 'missing',
            documentPresence: 'none',
        }, 'Bootstrap failed because role could not be determined.');
        throw (0, errors_1.badRequest)('Unable to determine the account role for bootstrap.');
    }
    let bootstrapOutcome = 'ok';
    const authProviders = getAuthProviderIds(authUser);
    const displayName = inferDisplayName(authUser, normalizedPayload.displayName);
    if (role === shared_1.ROLES.USER && !userSnap.exists) {
        await userRef.set((0, profileBuilders_1.buildUserProfileDoc)({
            uid,
            createdBy: uid,
            displayName,
            email: authUser.email || null,
            phoneNumber: authUser.phoneNumber || null,
            authProviders,
            locale: normalizedPayload.locale,
        }));
        bootstrapOutcome = 'created_profile';
    }
    if (role === shared_1.ROLES.PROVIDER && !providerSnap.exists) {
        await providerRef.set((0, profileBuilders_1.buildProviderProfileDoc)({
            uid,
            createdBy: uid,
            displayName,
            email: authUser.email || null,
            phoneNumber: authUser.phoneNumber || null,
            authProviders,
            locale: normalizedPayload.locale,
        }));
        bootstrapOutcome = 'created_profile';
    }
    const activeSnap = role === shared_1.ROLES.USER ? await userRef.get() : await providerRef.get();
    if (!activeSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Profile document is still missing after bootstrap.');
    }
    const activeData = activeSnap.data() || {};
    const accountStatus = activeData.accountStatus === shared_1.ACCOUNT_STATUSES.DISABLED ? shared_1.ACCOUNT_STATUSES.DISABLED : shared_1.ACCOUNT_STATUSES.ACTIVE;
    const providerStatus = role === shared_1.ROLES.PROVIDER && activeData.status
        ? String(activeData.status)
        : null;
    if (role === shared_1.ROLES.PROVIDER && providerStatus && !Object.values(shared_1.PROVIDER_STATUSES).includes(providerStatus)) {
        (0, logging_1.writeStructuredLog)('error', {
            action: 'bootstrap_session',
            uid,
            role,
            outcome: 'invalid_provider_status',
            statusTo: providerStatus,
        }, 'Bootstrap refused because provider status is invalid.');
        throw (0, errors_1.failedPrecondition)('Invalid provider status detected on the provider profile.');
    }
    const nextClaims = (0, claims_1.buildClaims)({
        role,
        providerStatus,
        accountStatus,
    });
    if (!(0, claims_1.claimsMatchState)(authUser.customClaims, nextClaims)) {
        await auth.setCustomUserClaims(uid, nextClaims);
        bootstrapOutcome = bootstrapOutcome === 'created_profile' ? bootstrapOutcome : 'repaired_claims';
    }
    await activeSnap.ref.set({
        authProviders,
        lastLoginAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: uid,
        ...(role === shared_1.ROLES.USER && !activeData.displayName ? { displayName } : {}),
    }, { merge: true });
    const response = buildBootstrapResponse({
        uid,
        role,
        accountStatus,
        providerStatus: role === shared_1.ROLES.PROVIDER ? providerStatus : null,
        authProviders,
        hasPrimaryLocation: Boolean(activeData.primaryLocation?.formattedAddress),
        bootstrapOutcome,
    });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'bootstrap_session',
        uid,
        role,
        resourceType: role,
        resourceId: uid,
        outcome: 'success',
        bootstrapOutcome: response.bootstrapOutcome,
        statusTo: response.providerStatus,
    }, 'Bootstrap session completed successfully.');
    return response;
}
