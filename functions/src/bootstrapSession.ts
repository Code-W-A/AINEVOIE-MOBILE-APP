import { Auth, UserRecord } from 'firebase-admin/auth';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { badRequest, failedPrecondition } from './errors';
import { buildClaims, claimsMatchState } from './claims';
import { writeStructuredLog } from './logging';
import { buildProviderProfileDoc, buildUserProfileDoc } from './profileBuilders';
import {
  ACCOUNT_STATUSES,
  computeBootstrapProfileFlags,
  PROVIDER_STATUSES,
  ROLES,
  sanitizeAuthProviders,
  sanitizeBootstrapPayload,
  sanitizeString,
} from './shared';
import type { BootstrapSessionResponse } from './types';

type BootstrapDeps = {
  db: Firestore,
  auth: Auth,
};

type BootstrapInput = {
  uid: string,
  authUser: UserRecord,
  payload?: unknown,
};

function getAuthProviderIds(authUser: UserRecord) {
  return sanitizeAuthProviders(authUser.providerData.map((provider) => provider.providerId));
}

function inferDisplayName(authUser: UserRecord, fallbackDisplayName: string) {
  const trimmedFallback = sanitizeString(fallbackDisplayName);

  if (trimmedFallback) {
    return trimmedFallback;
  }

  if (sanitizeString(authUser.displayName)) {
    return sanitizeString(authUser.displayName);
  }

  if (sanitizeString(authUser.email)) {
    return sanitizeString(String(authUser.email).split('@')[0]);
  }

  if (sanitizeString(authUser.phoneNumber)) {
    return sanitizeString(authUser.phoneNumber as string);
  }

  return 'Cont AI Nevoie';
}

function buildBootstrapResponse({
  uid,
  role,
  accountStatus,
  providerStatus,
  authProviders,
  hasPrimaryLocation,
  bootstrapOutcome,
}: {
  uid: string,
  role: 'user' | 'provider',
  accountStatus: 'active' | 'disabled',
  providerStatus: 'pre_registered' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | null,
  authProviders: string[],
  hasPrimaryLocation: boolean,
  bootstrapOutcome: BootstrapSessionResponse['bootstrapOutcome'],
}): BootstrapSessionResponse {
  return {
    uid,
    role,
    accountStatus,
    providerStatus,
    authProviders,
    profileFlags: computeBootstrapProfileFlags({
      role,
      accountStatus,
      providerStatus,
      hasPrimaryLocation,
    }),
    bootstrapOutcome,
  };
}

export async function bootstrapSessionService(
  { db, auth }: BootstrapDeps,
  { uid, authUser, payload }: BootstrapInput,
): Promise<BootstrapSessionResponse> {
  const normalizedPayload = sanitizeBootstrapPayload(payload || {});
  const userRef = db.collection('users').doc(uid);
  const providerRef = db.collection('providers').doc(uid);
  const [userSnap, providerSnap] = await Promise.all([userRef.get(), providerRef.get()]);

  if (userSnap.exists && providerSnap.exists) {
    writeStructuredLog('error', {
      action: 'bootstrap_session',
      uid,
      outcome: 'role_conflict',
      documentPresence: 'users+providers',
    }, 'Bootstrap refused because both user and provider documents exist.');
    throw failedPrecondition('Role conflict detected for this account.');
  }

  let role: 'user' | 'provider' | null = null;

  if (userSnap.exists) {
    role = ROLES.USER;
  } else if (providerSnap.exists) {
    role = ROLES.PROVIDER;
  } else if (normalizedPayload.intendedRole === ROLES.USER || normalizedPayload.intendedRole === ROLES.PROVIDER) {
    role = normalizedPayload.intendedRole;
  } else if (authUser.customClaims && (authUser.customClaims.role === ROLES.USER || authUser.customClaims.role === ROLES.PROVIDER)) {
    role = authUser.customClaims.role as 'user' | 'provider';
  }

  if (!role) {
    writeStructuredLog('warn', {
      action: 'bootstrap_session',
      uid,
      outcome: 'missing_role',
      claimsPresence: authUser.customClaims?.role ? 'present' : 'missing',
      documentPresence: 'none',
    }, 'Bootstrap failed because role could not be determined.');
    throw badRequest('Unable to determine the account role for bootstrap.');
  }

  let bootstrapOutcome: BootstrapSessionResponse['bootstrapOutcome'] = 'ok';
  const authProviders = getAuthProviderIds(authUser);
  const displayName = inferDisplayName(authUser, normalizedPayload.displayName);

  if (role === ROLES.USER && !userSnap.exists) {
    await userRef.set(buildUserProfileDoc({
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

  if (role === ROLES.PROVIDER && !providerSnap.exists) {
    await providerRef.set(buildProviderProfileDoc({
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

  const activeSnap = role === ROLES.USER ? await userRef.get() : await providerRef.get();

  if (!activeSnap.exists) {
    throw failedPrecondition('Profile document is still missing after bootstrap.');
  }

  const activeData = activeSnap.data() || {};
  const accountStatus = activeData.accountStatus === ACCOUNT_STATUSES.DISABLED ? ACCOUNT_STATUSES.DISABLED : ACCOUNT_STATUSES.ACTIVE;
  const providerStatus = role === ROLES.PROVIDER && activeData.status
    ? String(activeData.status)
    : null;

  if (role === ROLES.PROVIDER && providerStatus && !Object.values(PROVIDER_STATUSES).includes(providerStatus as never)) {
    writeStructuredLog('error', {
      action: 'bootstrap_session',
      uid,
      role,
      outcome: 'invalid_provider_status',
      statusTo: providerStatus,
    }, 'Bootstrap refused because provider status is invalid.');
    throw failedPrecondition('Invalid provider status detected on the provider profile.');
  }

  const nextClaims = buildClaims({
    role,
    providerStatus,
    accountStatus,
  });

  if (!claimsMatchState(authUser.customClaims, nextClaims)) {
    await auth.setCustomUserClaims(uid, nextClaims);
    bootstrapOutcome = bootstrapOutcome === 'created_profile' ? bootstrapOutcome : 'repaired_claims';
  }

  await activeSnap.ref.set({
    authProviders,
    lastLoginAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
    ...(role === ROLES.USER && !activeData.displayName ? { displayName } : {}),
  }, { merge: true });

  const response = buildBootstrapResponse({
    uid,
    role,
    accountStatus,
    providerStatus: role === ROLES.PROVIDER ? (providerStatus as BootstrapSessionResponse['providerStatus']) : null,
    authProviders,
    hasPrimaryLocation: Boolean(activeData.primaryLocation?.formattedAddress),
    bootstrapOutcome,
  });

  writeStructuredLog('info', {
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
