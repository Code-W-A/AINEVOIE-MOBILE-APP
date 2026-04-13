import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices } from './client';

function sanitizeFileName(fileName, fallbackExtension = 'jpg') {
  const trimmed = String(fileName || '').trim();
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized) {
    return normalized;
  }

  return `upload.${fallbackExtension}`;
}

function guessFileExtension(fileName, mimeType, fallbackExtension = 'jpg') {
  const trimmedName = String(fileName || '').trim();

  if (trimmedName.includes('.')) {
    return trimmedName.split('.').pop()?.toLowerCase() || fallbackExtension;
  }

  if (String(mimeType || '').includes('/')) {
    return String(mimeType).split('/').pop()?.toLowerCase() || fallbackExtension;
  }

  return fallbackExtension;
}

function buildObjectPath(prefix, fileName, mimeType, fallbackExtension = 'jpg') {
  const extension = guessFileExtension(fileName, mimeType, fallbackExtension);
  const safeFileName = sanitizeFileName(fileName || `upload.${extension}`, extension);
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName}`;
}

async function readAssetBlob(uri) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Unable to read the selected file for upload.');
  }

  return response.blob();
}

async function uploadAssetToPath(storagePath, asset) {
  const { storage } = getFirebaseServices();
  const storageRef = ref(storage, storagePath);
  const blob = await readAssetBlob(asset.uri);
  const metadata = asset?.mimeType ? { contentType: asset.mimeType } : undefined;

  await uploadBytes(storageRef, blob, metadata);
  return storagePath;
}

async function callStorageFinalize(callableName, payload) {
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, callableName);
  const response = await callable(payload);
  return response.data;
}

export async function resolveStoragePathDownloadUrl(storagePath) {
  if (!storagePath) {
    return null;
  }

  const { storage } = getFirebaseServices();
  return getDownloadURL(ref(storage, storagePath));
}

export async function uploadUserAvatarAsset(uid, asset) {
  const storagePath = buildObjectPath(`users/${uid}/avatar/`, asset.fileName || asset.name, asset.mimeType);
  await uploadAssetToPath(storagePath, asset);
  const result = await callStorageFinalize('finalizeUserAvatarUpload', { storagePath });
  const downloadURL = await resolveStoragePathDownloadUrl(result.photoPath || storagePath);

  return {
    storagePath: result.photoPath || storagePath,
    downloadURL,
  };
}

export async function uploadProviderAvatarAsset(uid, asset) {
  const storagePath = buildObjectPath(`providers/${uid}/avatar/`, asset.fileName || asset.name, asset.mimeType);
  await uploadAssetToPath(storagePath, asset);
  const result = await callStorageFinalize('finalizeProviderAvatarUpload', { storagePath });
  const downloadURL = await resolveStoragePathDownloadUrl(result.avatarPath || storagePath);

  return {
    storagePath: result.avatarPath || storagePath,
    downloadURL,
  };
}

export async function uploadProviderDocumentAsset(uid, documentType, asset) {
  const storagePath = buildObjectPath(
    `providers/${uid}/documents/${documentType}/`,
    asset.fileName || asset.name,
    asset.mimeType,
    'jpg',
  );
  await uploadAssetToPath(storagePath, asset);

  const result = await callStorageFinalize('finalizeProviderDocumentUpload', {
    documentType,
    storagePath,
    originalFileName: asset.fileName || asset.name || null,
  });

  return {
    documentType: result.documentType || documentType,
    storagePath: result.storagePath || storagePath,
    status: result.status || 'uploaded',
  };
}
