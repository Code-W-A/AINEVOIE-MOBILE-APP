"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditEvent = writeAuditEvent;
const firestore_1 = require("firebase-admin/firestore");
const logging_1 = require("./logging");
const shared_1 = require("./shared");
function sanitizeContextValue(value) {
    if (value == null || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const nextValue = (0, shared_1.sanitizeString)(value);
        return nextValue || undefined;
    }
    if (Array.isArray(value)) {
        const nextArray = value
            .map((item) => sanitizeContextValue(item))
            .filter((item) => item !== undefined);
        return nextArray.length ? nextArray : undefined;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value)
            .map(([key, itemValue]) => [key, sanitizeContextValue(itemValue)])
            .filter(([, itemValue]) => itemValue !== undefined);
        return entries.length ? Object.fromEntries(entries) : undefined;
    }
    return undefined;
}
function sanitizeAuditContext(context) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return undefined;
    }
    const nextContext = sanitizeContextValue(context);
    return nextContext && typeof nextContext === 'object' && !Array.isArray(nextContext)
        ? nextContext
        : undefined;
}
async function writeAuditEvent({ db }, input) {
    const action = (0, shared_1.sanitizeString)(input.action);
    if (!action) {
        return;
    }
    const actorUid = (0, shared_1.sanitizeString)(input.actorUid) || 'system';
    const actorRole = (0, shared_1.sanitizeString)(input.actorRole) || 'system';
    const resourceType = (0, shared_1.sanitizeString)(input.resourceType) || 'unknown';
    const resourceId = (0, shared_1.sanitizeString)(input.resourceId) || 'unknown';
    const result = (0, shared_1.sanitizeString)(input.result) || 'success';
    const eventRef = db.collection('auditEvents').doc();
    const context = sanitizeAuditContext(input.context);
    const eventPayload = {
        eventId: eventRef.id,
        action,
        actorUid,
        actorRole,
        resourceType,
        resourceId,
        result,
        createdAt: firestore_1.Timestamp.now(),
    };
    const statusFrom = (0, shared_1.sanitizeString)(input.statusFrom);
    const statusTo = (0, shared_1.sanitizeString)(input.statusTo);
    const errorCode = (0, shared_1.sanitizeString)(input.errorCode);
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
    }
    catch (error) {
        (0, logging_1.writeStructuredLog)('error', {
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
