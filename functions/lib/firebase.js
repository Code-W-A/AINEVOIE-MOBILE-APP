"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminApp = exports.adminStorage = exports.adminDb = exports.adminAuth = void 0;
exports.resolveStorageBucket = resolveStorageBucket;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
function resolveStorageBucket(projectId = process.env.GCLOUD_PROJECT || '', firebaseConfigRaw = process.env.FIREBASE_CONFIG || '') {
    try {
        const parsedConfig = JSON.parse(firebaseConfigRaw || '{}');
        const storageBucket = String(parsedConfig.storageBucket || '').trim();
        if (storageBucket) {
            return storageBucket;
        }
    }
    catch {
        // Ignore invalid FIREBASE_CONFIG and fall back to the project id heuristic.
    }
    const normalizedProjectId = String(projectId || '').trim();
    if (!normalizedProjectId) {
        return undefined;
    }
    return `${normalizedProjectId}.firebasestorage.app`;
}
const storageBucket = resolveStorageBucket();
const adminApp = (0, app_1.getApps)().length
    ? (0, app_1.getApps)()[0]
    : (0, app_1.initializeApp)({
        credential: (0, app_1.applicationDefault)(),
        ...(storageBucket ? { storageBucket } : {}),
    });
exports.adminApp = adminApp;
exports.adminAuth = (0, auth_1.getAuth)(adminApp);
exports.adminDb = (0, firestore_1.getFirestore)(adminApp);
exports.adminStorage = (0, storage_1.getStorage)(adminApp);
