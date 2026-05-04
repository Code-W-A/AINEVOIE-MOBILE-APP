import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { Storage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { badRequest, failedPrecondition } from './errors';
import {
  PROVIDER_DOCUMENT_TYPES,
  PROVIDER_STATUSES,
  isProviderDocumentType,
  sanitizeStoragePath,
  sanitizeString,
} from './shared';
import { writeStructuredLog } from './logging';

type FinalizeDeps = {
  db: Firestore,
  storage: Storage,
};

type FinalizeUploadPayload = {
  storagePath?: string,
  originalFileName?: string | null,
};

type FinalizeProviderDocumentPayload = FinalizeUploadPayload & {
  documentType?: string,
};

const PROVIDER_AVATAR_OUTPUT_SIZE = 1024;
const PROVIDER_AVATAR_QUALITY = 88;

function ensurePathPrefix(storagePath: string, prefix: string) {
  if (!storagePath.startsWith(prefix)) {
    throw badRequest('The uploaded file path is invalid for this resource.');
  }
}

async function ensureStoredFileExists(storage: Storage, storagePath: string) {
  const [exists] = await storage.bucket().file(storagePath).exists();

  if (!exists) {
    throw failedPrecondition('Uploaded file was not found in storage.');
  }
}

async function deleteIfReplaced(storage: Storage, previousPath: string | null | undefined, nextPath: string) {
  const normalizedPreviousPath = sanitizeStoragePath(previousPath);

  if (!normalizedPreviousPath || normalizedPreviousPath === nextPath) {
    return;
  }

  await storage.bucket().file(normalizedPreviousPath).delete().catch(() => undefined);
}

function providerCanUpdateAvatar(status: string) {
  return ([
    PROVIDER_STATUSES.PRE_REGISTERED,
    PROVIDER_STATUSES.REJECTED,
    PROVIDER_STATUSES.APPROVED,
  ] as string[]).includes(status);
}

function providerCanUpdateDocuments(status: string) {
  return ([
    PROVIDER_STATUSES.PRE_REGISTERED,
    PROVIDER_STATUSES.REJECTED,
  ] as string[]).includes(status);
}

async function normalizeProviderAvatarImage(storage: Storage, uid: string, storagePath: string) {
  const bucket = storage.bucket();
  const sourceFile = bucket.file(storagePath);
  const [sourceBuffer] = await sourceFile.download();

  let normalizedBuffer: Buffer;

  try {
    normalizedBuffer = await sharp(sourceBuffer, { failOn: 'warning' })
      .rotate()
      .resize(PROVIDER_AVATAR_OUTPUT_SIZE, PROVIDER_AVATAR_OUTPUT_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality: PROVIDER_AVATAR_QUALITY,
        mozjpeg: true,
      })
      .toBuffer();
  } catch {
    throw badRequest('Provider avatar must be a valid image file.');
  }

  const normalizedPath = `providers/${uid}/avatar/profile.jpg`;
  await bucket.file(normalizedPath).save(normalizedBuffer, {
    resumable: false,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=3600',
      metadata: {
        firebaseStorageDownloadTokens: randomUUID(),
      },
    },
  });

  return normalizedPath;
}

export async function finalizeUserAvatarUploadService(
  { db, storage }: FinalizeDeps,
  uid: string,
  payload: FinalizeUploadPayload,
) {
  const storagePath = sanitizeStoragePath(payload.storagePath);

  if (!storagePath) {
    throw badRequest('A valid user avatar storage path is required.');
  }

  ensurePathPrefix(storagePath, `users/${uid}/avatar/`);
  await ensureStoredFileExists(storage, storagePath);

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw failedPrecondition('User profile not found.');
  }

  const userData = userSnap.data() || {};
  await deleteIfReplaced(storage, userData.photoPath, storagePath);

  await userRef.set({
    photoPath: storagePath,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  }, { merge: true });

  writeStructuredLog('info', {
    action: 'finalize_user_avatar_upload',
    uid,
    role: 'user',
    resourceType: 'user',
    resourceId: uid,
    outcome: 'success',
  }, 'User avatar upload was finalized.');

  return { photoPath: storagePath };
}

export async function finalizeProviderAvatarUploadService(
  { db, storage }: FinalizeDeps,
  uid: string,
  payload: FinalizeUploadPayload,
) {
  const storagePath = sanitizeStoragePath(payload.storagePath);

  if (!storagePath) {
    throw badRequest('A valid provider avatar storage path is required.');
  }

  ensurePathPrefix(storagePath, `providers/${uid}/avatar/`);
  await ensureStoredFileExists(storage, storagePath);

  const providerRef = db.collection('providers').doc(uid);
  const providerSnap = await providerRef.get();

  if (!providerSnap.exists) {
    throw failedPrecondition('Provider profile not found.');
  }

  const providerData = providerSnap.data() || {};
  const currentStatus = providerData.status || PROVIDER_STATUSES.PRE_REGISTERED;

  if (!providerCanUpdateAvatar(currentStatus)) {
    throw failedPrecondition('Provider avatar cannot be updated in the current status.');
  }

  const normalizedAvatarPath = await normalizeProviderAvatarImage(storage, uid, storagePath);
  await deleteIfReplaced(storage, providerData.professionalProfile?.avatarPath, normalizedAvatarPath);
  await deleteIfReplaced(storage, storagePath, normalizedAvatarPath);

  await providerRef.set({
    professionalProfile: {
      ...providerData.professionalProfile,
      avatarPath: normalizedAvatarPath,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  }, { merge: true });

  writeStructuredLog('info', {
    action: 'finalize_provider_avatar_upload',
    uid,
    role: 'provider',
    resourceType: 'provider',
    resourceId: uid,
    statusTo: currentStatus,
    outcome: 'success',
  }, 'Provider avatar upload was finalized.');

  return { avatarPath: normalizedAvatarPath };
}

export async function finalizeProviderDocumentUploadService(
  { db, storage }: FinalizeDeps,
  uid: string,
  payload: FinalizeProviderDocumentPayload,
) {
  const documentType = isProviderDocumentType(payload.documentType)
    ? payload.documentType
    : null;
  const storagePath = sanitizeStoragePath(payload.storagePath);
  const originalFileName = sanitizeString(payload.originalFileName) || null;

  if (!documentType) {
    throw badRequest('A valid provider document type is required.');
  }

  if (!storagePath) {
    throw badRequest('A valid provider document storage path is required.');
  }

  ensurePathPrefix(storagePath, `providers/${uid}/documents/${documentType}/`);
  await ensureStoredFileExists(storage, storagePath);

  const providerRef = db.collection('providers').doc(uid);
  const providerSnap = await providerRef.get();

  if (!providerSnap.exists) {
    throw failedPrecondition('Provider profile not found.');
  }

  const providerData = providerSnap.data() || {};
  const currentStatus = providerData.status || PROVIDER_STATUSES.PRE_REGISTERED;

  if (!providerCanUpdateDocuments(currentStatus)) {
    throw failedPrecondition('Provider documents cannot be updated in the current status.');
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
        uploadedAt: FieldValue.serverTimestamp(),
      },
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  }, { merge: true });

  writeStructuredLog('info', {
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
