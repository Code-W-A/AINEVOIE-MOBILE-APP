import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { writeStructuredLog } from './logging';
import { sanitizeString } from './shared';

type AuditDeps = {
  db: Firestore,
};

type AuditContext = Record<string, unknown>;

type WriteAuditEventInput = {
  action: string,
  actorUid?: string | null,
  actorRole?: string | null,
  resourceType?: string | null,
  resourceId?: string | null,
  result?: string | null,
  statusFrom?: string | null,
  statusTo?: string | null,
  errorCode?: string | null,
  context?: AuditContext | null,
};

function sanitizeContextValue(value: unknown): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const nextValue = sanitizeString(value);
    return nextValue || undefined;
  }

  if (Array.isArray(value)) {
    const nextArray = value
      .map((item) => sanitizeContextValue(item))
      .filter((item) => item !== undefined);

    return nextArray.length ? nextArray : undefined;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, itemValue]) => [key, sanitizeContextValue(itemValue)] as const)
      .filter(([, itemValue]) => itemValue !== undefined);

    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  return undefined;
}

function sanitizeAuditContext(context: AuditContext | null | undefined) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return undefined;
  }

  const nextContext = sanitizeContextValue(context);
  return nextContext && typeof nextContext === 'object' && !Array.isArray(nextContext)
    ? nextContext as Record<string, unknown>
    : undefined;
}

export async function writeAuditEvent(
  { db }: AuditDeps,
  input: WriteAuditEventInput,
) {
  const action = sanitizeString(input.action);

  if (!action) {
    return;
  }

  const actorUid = sanitizeString(input.actorUid) || 'system';
  const actorRole = sanitizeString(input.actorRole) || 'system';
  const resourceType = sanitizeString(input.resourceType) || 'unknown';
  const resourceId = sanitizeString(input.resourceId) || 'unknown';
  const result = sanitizeString(input.result) || 'success';
  const eventRef = db.collection('auditEvents').doc();
  const context = sanitizeAuditContext(input.context);
  const eventPayload: Record<string, unknown> = {
    eventId: eventRef.id,
    action,
    actorUid,
    actorRole,
    resourceType,
    resourceId,
    result,
    createdAt: Timestamp.now(),
  };

  const statusFrom = sanitizeString(input.statusFrom);
  const statusTo = sanitizeString(input.statusTo);
  const errorCode = sanitizeString(input.errorCode);

  if (statusFrom) {
    eventPayload.statusFrom = statusFrom;
  }

  if (statusTo) {
    eventPayload.statusTo = statusTo;
  }

  if (errorCode) {
    eventPayload.errorCode = errorCode;
  }

  if (context && Object.keys(context).length) {
    eventPayload.context = context;
  }

  try {
    await eventRef.set(eventPayload);
  } catch (error) {
    writeStructuredLog('error', {
      action: 'audit.write_failed',
      uid: actorUid,
      role: actorRole,
      resourceType,
      resourceId,
      outcome: 'failure',
      reasonCode: error instanceof Error ? error.name : 'audit_write_failed',
    }, 'Failed to persist audit event.');
  }
}
