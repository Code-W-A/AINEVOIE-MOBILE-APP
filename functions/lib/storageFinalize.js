"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeUserAvatarUploadService = finalizeUserAvatarUploadService;
exports.finalizeProviderAvatarUploadService = finalizeProviderAvatarUploadService;
exports.finalizeProviderDocumentUploadService = finalizeProviderDocumentUploadService;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("./errors");
const shared_1 = require("./shared");
const logging_1 = require("./logging");
function ensurePathPrefix(storagePath, prefix) {
    if (!storagePath.startsWith(prefix)) {
        throw (0, errors_1.badRequest)('The uploaded file path is invalid for this resource.');
    }
}
async function ensureStoredFileExists(storage, storagePath) {
    const [exists] = await storage.bucket().file(storagePath).exists();
    if (!exists) {
        throw (0, errors_1.failedPrecondition)('Uploaded file was not found in storage.');
    }
}
async function deleteIfReplaced(storage, previousPath, nextPath) {
    const normalizedPreviousPath = (0, shared_1.sanitizeStoragePath)(previousPath);
    if (!normalizedPreviousPath || normalizedPreviousPath === nextPath) {
        return;
    }
    await storage.bucket().file(normalizedPreviousPath).delete().catch(() => undefined);
}
function providerCanUpdateAvatar(status) {
    return [
        shared_1.PROVIDER_STATUSES.PRE_REGISTERED,
        shared_1.PROVIDER_STATUSES.REJECTED,
        shared_1.PROVIDER_STATUSES.APPROVED,
    ].includes(status);
}
function providerCanUpdateDocuments(status) {
    return [
        shared_1.PROVIDER_STATUSES.PRE_REGISTERED,
        shared_1.PROVIDER_STATUSES.REJECTED,
    ].includes(status);
}
async function finalizeUserAvatarUploadService({ db, storage }, uid, payload) {
    const storagePath = (0, shared_1.sanitizeStoragePath)(payload.storagePath);
    if (!storagePath) {
        throw (0, errors_1.badRequest)('A valid user avatar storage path is required.');
    }
    ensurePathPrefix(storagePath, `users/${uid}/avatar/`);
    await ensureStoredFileExists(storage, storagePath);
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw (0, errors_1.failedPrecondition)('User profile not found.');
    }
    const userData = userSnap.data() || {};
    await deleteIfReplaced(storage, userData.photoPath, storagePath);
    await userRef.set({
        photoPath: storagePath,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: uid,
    }, { merge: true });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'finalize_user_avatar_upload',
        uid,
        role: 'user',
        resourceType: 'user',
        resourceId: uid,
        outcome: 'success',
    }, 'User avatar upload was finalized.');
    return { photoPath: storagePath };
}
async function finalizeProviderAvatarUploadService({ db, storage }, uid, payload) {
    const storagePath = (0, shared_1.sanitizeStoragePath)(payload.storagePath);
    if (!storagePath) {
        throw (0, errors_1.badRequest)('A valid provider avatar storage path is required.');
    }
    ensurePathPrefix(storagePath, `providers/${uid}/avatar/`);
    await ensureStoredFileExists(storage, storagePath);
    const providerRef = db.collection('providers').doc(uid);
    const providerSnap = await providerRef.get();
    if (!providerSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Provider profile not found.');
    }
    const providerData = providerSnap.data() || {};
    const currentStatus = providerData.status || shared_1.PROVIDER_STATUSES.PRE_REGISTERED;
    if (!providerCanUpdateAvatar(currentStatus)) {
        throw (0, errors_1.failedPrecondition)('Provider avatar cannot be updated in the current status.');
    }
    await deleteIfReplaced(storage, providerData.professionalProfile?.avatarPath, storagePath);
    await providerRef.set({
        professionalProfile: {
            ...providerData.professionalProfile,
            avatarPath: storagePath,
        },
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: uid,
    }, { merge: true });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'finalize_provider_avatar_upload',
        uid,
        role: 'provider',
        resourceType: 'provider',
        resourceId: uid,
        statusTo: currentStatus,
        outcome: 'success',
    }, 'Provider avatar upload was finalized.');
    return { avatarPath: storagePath };
}
async function finalizeProviderDocumentUploadService({ db, storage }, uid, payload) {
    const documentType = (0, shared_1.isProviderDocumentType)(payload.documentType)
        ? payload.documentType
        : null;
    const storagePath = (0, shared_1.sanitizeStoragePath)(payload.storagePath);
    const originalFileName = (0, shared_1.sanitizeString)(payload.originalFileName) || null;
    if (!documentType) {
        throw (0, errors_1.badRequest)('A valid provider document type is required.');
    }
    if (!storagePath) {
        throw (0, errors_1.badRequest)('A valid provider document storage path is required.');
    }
    ensurePathPrefix(storagePath, `providers/${uid}/documents/${documentType}/`);
    await ensureStoredFileExists(storage, storagePath);
    const providerRef = db.collection('providers').doc(uid);
    const providerSnap = await providerRef.get();
    if (!providerSnap.exists) {
        throw (0, errors_1.failedPrecondition)('Provider profile not found.');
    }
    const providerData = providerSnap.data() || {};
    const currentStatus = providerData.status || shared_1.PROVIDER_STATUSES.PRE_REGISTERED;
    if (!providerCanUpdateDocuments(currentStatus)) {
        throw (0, errors_1.failedPrecondition)('Provider documents cannot be updated in the current status.');
    }
    const previousPath = providerData.documents?.[documentType]?.storagePath;
    await deleteIfReplaced(storage, previousPath, storagePath);
    await providerRef.set({
        documents: {
            ...providerData.documents,
            [documentType]: {
                status: 'uploaded',
                storagePath,
                originalFileName: originalFileName || providerData.documents?.[documentType]?.originalFileName || null,
                uploadedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy: uid,
    }, { merge: true });
    (0, logging_1.writeStructuredLog)('info', {
        action: 'finalize_provider_document_upload',
        uid,
        role: 'provider',
        resourceType: 'provider_document',
        resourceId: `${uid}:${documentType}`,
        statusTo: currentStatus,
        outcome: 'success',
    }, 'Provider document upload was finalized.');
    return {
        documentType,
        storagePath,
        status: 'uploaded',
    };
}
