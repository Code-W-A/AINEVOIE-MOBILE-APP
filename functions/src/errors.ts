import { HttpsError } from 'firebase-functions/v2/https';

export function badRequest(message: string) {
  return new HttpsError('invalid-argument', message);
}

export function permissionDenied(message: string) {
  return new HttpsError('permission-denied', message);
}

export function failedPrecondition(message: string) {
  return new HttpsError('failed-precondition', message);
}

export function internalError(message: string) {
  return new HttpsError('internal', message);
}
