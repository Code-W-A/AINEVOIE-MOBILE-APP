import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { getFirebaseServices } from './client';
import {
  buildProviderServiceWritePayload,
  normalizeProviderServiceRecord,
  PROVIDER_SERVICE_STATUSES,
  resolveServiceCategory,
} from '../features/shared/utils/providerServices';

function getServicesCollectionRef(db, uid) {
  return collection(db, 'providers', uid, 'services');
}

function getServiceDocRef(db, uid, serviceId) {
  return doc(db, 'providers', uid, 'services', serviceId);
}

function getTimestampValue(value) {
  if (!value) {
    return 0;
  }

  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsedValue = new Date(value).getTime();
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function sortServices(services = []) {
  return [...services].sort((firstItem, secondItem) => {
    const updatedDelta = getTimestampValue(secondItem.updatedAt) - getTimestampValue(firstItem.updatedAt);

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    return String(firstItem.name || '').localeCompare(String(secondItem.name || ''));
  });
}

export async function fetchOwnerProviderServices(uid, locale = 'ro') {
  const { db } = getFirebaseServices();
  const snapshot = await getDocs(getServicesCollectionRef(db, uid));

  return sortServices(
    snapshot.docs.map((item) => normalizeProviderServiceRecord({
      serviceId: item.id,
      ...item.data(),
    }, locale)),
  );
}

export async function saveProviderService(uid, servicePayload, locale = 'ro') {
  const { db } = getFirebaseServices();
  const collectionRef = getServicesCollectionRef(db, uid);
  const existingServiceId = String(servicePayload?.serviceId || servicePayload?.id || '').trim();
  const serviceRef = existingServiceId
    ? getServiceDocRef(db, uid, existingServiceId)
    : doc(collectionRef);
  const normalizedService = normalizeProviderServiceRecord({
    ...servicePayload,
    serviceId: serviceRef.id,
    id: serviceRef.id,
    providerId: uid,
  }, locale);
  const payload = {
    ...buildProviderServiceWritePayload(normalizedService, locale),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  const snapshot = await getDoc(serviceRef);

  if (snapshot.exists()) {
    await updateDoc(serviceRef, payload);
  } else {
    await setDoc(serviceRef, {
      ...payload,
      status: normalizedService.status || PROVIDER_SERVICE_STATUSES.ACTIVE,
      createdAt: serverTimestamp(),
      createdBy: uid,
      schemaVersion: 1,
    });
  }

  const nextSnapshot = await getDoc(serviceRef);
  return normalizeProviderServiceRecord({
    serviceId: serviceRef.id,
    ...nextSnapshot.data(),
  }, locale);
}

export async function setProviderServiceStatus(uid, serviceId, status, locale = 'ro') {
  const { db } = getFirebaseServices();
  const serviceRef = getServiceDocRef(db, uid, serviceId);

  await updateDoc(serviceRef, {
    status,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  const snapshot = await getDoc(serviceRef);
  return normalizeProviderServiceRecord({
    serviceId,
    ...snapshot.data(),
  }, locale);
}

export async function archiveProviderService(uid, serviceId, locale = 'ro') {
  return setProviderServiceStatus(uid, serviceId, PROVIDER_SERVICE_STATUSES.ARCHIVED, locale);
}

export async function migrateProviderServices(uid, legacyServices = [], locale = 'ro', fallbackCategoryValue = '') {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  const collectionRef = getServicesCollectionRef(db, uid);

  legacyServices.forEach((service) => {
    const serviceRef = doc(collectionRef);
    const category = resolveServiceCategory(
      service?.categoryKey
        || service?.categoryLabel
        || service?.category
        || fallbackCategoryValue
        || service?.name,
      locale,
    );
    const normalizedService = normalizeProviderServiceRecord({
      ...service,
      serviceId: serviceRef.id,
      id: serviceRef.id,
      providerId: uid,
      categoryKey: category.key,
      categoryLabel: category.label,
      status: service?.status
        || (service?.isActive === false ? PROVIDER_SERVICE_STATUSES.INACTIVE : PROVIDER_SERVICE_STATUSES.ACTIVE),
    }, locale);

    batch.set(serviceRef, {
      ...buildProviderServiceWritePayload(normalizedService, locale),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
      updatedBy: uid,
      schemaVersion: 1,
    });
  });

  await batch.commit();
  return fetchOwnerProviderServices(uid, locale);
}
