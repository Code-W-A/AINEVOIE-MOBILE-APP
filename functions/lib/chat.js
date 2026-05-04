"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.directConversationId = directConversationId;
exports.bookingConversationId = bookingConversationId;
exports.writeBookingConversationDocuments = writeBookingConversationDocuments;
exports.ensureDirectConversationService = ensureDirectConversationService;
exports.ensureBookingConversationService = ensureBookingConversationService;
exports.sendChatMessageService = sendChatMessageService;
exports.markConversationReadService = markConversationReadService;
const firestore_1 = require("firebase-admin/firestore");
const audit_1 = require("./audit");
const errors_1 = require("./errors");
const shared_1 = require("./shared");
const CHAT_SCHEMA_VERSION = 1;
const MAX_TEXT_MESSAGE_LENGTH = 2000;
function conversationMembershipId(conversationId, uid) {
    return `${conversationId}_${uid}`;
}
function directConversationId(userId, providerId) {
    return `conv_direct_${userId}_${providerId}`;
}
function bookingConversationId(bookingId) {
    return `conv_bk_${bookingId}`;
}
function normalizeTextMessage(value) {
    const body = (0, shared_1.sanitizeString)(value);
    if (!body) {
        throw (0, errors_1.badRequest)('Message body is required.');
    }
    if (body.length > MAX_TEXT_MESSAGE_LENGTH) {
        throw (0, errors_1.badRequest)(`Message body must be at most ${MAX_TEXT_MESSAGE_LENGTH} characters.`);
    }
    return body;
}
function serializeTimestamp(value) {
    if (!value) {
        return null;
    }
    if (value instanceof firestore_1.Timestamp) {
        return value.toDate().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value?.toDate === 'function') {
        return value.toDate().toISOString();
    }
    const parsedValue = new Date(String(value));
    return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}
function serializeConversationForClient(conversation) {
    return {
        ...conversation,
        lastMessage: conversation.lastMessage ? {
            ...conversation.lastMessage,
            createdAt: serializeTimestamp(conversation.lastMessage.createdAt),
        } : null,
        closedAt: serializeTimestamp(conversation.closedAt),
        createdAt: serializeTimestamp(conversation.createdAt),
        updatedAt: serializeTimestamp(conversation.updatedAt),
    };
}
function serializeMessageForClient(message) {
    return {
        ...message,
        createdAt: serializeTimestamp(message.createdAt),
        updatedAt: serializeTimestamp(message.updatedAt),
        deletedAt: serializeTimestamp(message.deletedAt),
    };
}
function getUserSnapshot(uid, userData) {
    return {
        uid,
        displayName: (0, shared_1.sanitizeString)(userData.displayName) || 'Client',
        avatarPath: (0, shared_1.sanitizeString)(userData.photoPath) || null,
    };
}
function getProviderSnapshot(providerId, sourceData) {
    return {
        uid: providerId,
        displayName: (0, shared_1.sanitizeString)(sourceData.displayName)
            || (0, shared_1.sanitizeString)(sourceData.professionalProfile?.businessName)
            || (0, shared_1.sanitizeString)(sourceData.professionalProfile?.displayName)
            || 'Prestator',
        avatarPath: (0, shared_1.sanitizeString)(sourceData.avatarPath)
            || (0, shared_1.sanitizeString)(sourceData.professionalProfile?.avatarPath)
            || null,
    };
}
function normalizeConversation(conversationId, payload) {
    return {
        conversationId: (0, shared_1.sanitizeString)(payload.conversationId) || conversationId,
        type: (0, shared_1.sanitizeString)(payload.type) || 'direct',
        participantIds: Array.isArray(payload.participantIds) ? payload.participantIds.map(shared_1.sanitizeString).filter(Boolean) : [],
        participantRoles: payload.participantRoles || {},
        bookingId: (0, shared_1.sanitizeString)(payload.bookingId) || null,
        userId: (0, shared_1.sanitizeString)(payload.userId) || null,
        providerId: (0, shared_1.sanitizeString)(payload.providerId) || null,
        status: (0, shared_1.sanitizeString)(payload.status) || 'active',
        lastMessage: payload.lastMessage || null,
        closedAt: payload.closedAt || null,
        closedBy: (0, shared_1.sanitizeString)(payload.closedBy) || null,
        createdAt: payload.createdAt || null,
        updatedAt: payload.updatedAt || null,
        schemaVersion: Number(payload.schemaVersion) || CHAT_SCHEMA_VERSION,
    };
}
function buildConversationDocument({ conversationId, type, userId, providerId, bookingId = null, now, }) {
    return {
        conversationId,
        type,
        participantIds: [userId, providerId],
        participantRoles: {
            [userId]: 'user',
            [providerId]: 'provider',
        },
        bookingId,
        userId,
        providerId,
        status: 'active',
        lastMessage: null,
        closedAt: null,
        closedBy: null,
        createdAt: now,
        updatedAt: now,
        schemaVersion: CHAT_SCHEMA_VERSION,
    };
}
function buildMembershipDocument({ conversationId, uid, role, otherParticipantSnapshot, now, }) {
    return {
        membershipId: conversationMembershipId(conversationId, uid),
        conversationId,
        uid,
        role,
        otherParticipantSnapshot,
        unreadCount: 0,
        lastReadMessageId: null,
        lastMessageAt: null,
        archivedAt: null,
        mutedUntil: null,
        blockedAt: null,
        createdAt: now,
        updatedAt: now,
        schemaVersion: CHAT_SCHEMA_VERSION,
    };
}
function ensureParticipant(conversation, uid) {
    if (!Array.isArray(conversation.participantIds) || !conversation.participantIds.includes(uid)) {
        throw (0, errors_1.permissionDenied)('Only conversation participants can perform this chat action.');
    }
}
function writeBookingConversationDocuments({ db, transaction, booking, now, }) {
    const bookingId = (0, shared_1.sanitizeString)(booking.bookingId);
    const userId = (0, shared_1.sanitizeString)(booking.userId);
    const providerId = (0, shared_1.sanitizeString)(booking.providerId);
    if (!bookingId || !userId || !providerId) {
        throw (0, errors_1.badRequest)('Booking conversation payload is incomplete.');
    }
    const conversationId = bookingConversationId(bookingId);
    const conversationRef = db.collection('conversations').doc(conversationId);
    const userMembershipRef = db.collection('conversationMemberships').doc(conversationMembershipId(conversationId, userId));
    const providerMembershipRef = db.collection('conversationMemberships').doc(conversationMembershipId(conversationId, providerId));
    const userSnapshot = getUserSnapshot(userId, booking.userSnapshot || {});
    const providerSnapshot = getProviderSnapshot(providerId, booking.providerSnapshot || {});
    transaction.set(conversationRef, buildConversationDocument({
        conversationId,
        type: 'booking',
        userId,
        providerId,
        bookingId,
        now,
    }));
    transaction.set(userMembershipRef, buildMembershipDocument({
        conversationId,
        uid: userId,
        role: 'user',
        otherParticipantSnapshot: providerSnapshot,
        now,
    }));
    transaction.set(providerMembershipRef, buildMembershipDocument({
        conversationId,
        uid: providerId,
        role: 'provider',
        otherParticipantSnapshot: userSnapshot,
        now,
    }));
    return conversationId;
}
async function ensureDirectConversationService({ db }, actorUid, rawPayload) {
    const providerId = (0, shared_1.sanitizeString)(rawPayload.providerId);
    if (!providerId) {
        throw (0, errors_1.badRequest)('Provider id is required.');
    }
    if (actorUid === providerId) {
        throw (0, errors_1.badRequest)('A provider cannot start a direct conversation with themselves.');
    }
    const conversationId = directConversationId(actorUid, providerId);
    const result = await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(actorUid);
        const providerDirectoryRef = db.collection('providerDirectory').doc(providerId);
        const conversationRef = db.collection('conversations').doc(conversationId);
        const userMembershipRef = db.collection('conversationMemberships').doc(conversationMembershipId(conversationId, actorUid));
        const providerMembershipRef = db.collection('conversationMemberships').doc(conversationMembershipId(conversationId, providerId));
        const [userSnap, providerDirectorySnap, conversationSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(providerDirectoryRef),
            transaction.get(conversationRef),
        ]);
        if (!userSnap.exists) {
            throw (0, errors_1.failedPrecondition)('User profile is missing.');
        }
        const userData = userSnap.data() || {};
        if ((0, shared_1.sanitizeString)(userData.role) !== 'user' || (0, shared_1.sanitizeString)(userData.accountStatus) !== 'active') {
            throw (0, errors_1.failedPrecondition)('Only active user accounts can start direct conversations.');
        }
        if (!providerDirectorySnap.exists || (0, shared_1.sanitizeString)(providerDirectorySnap.data()?.status) !== shared_1.PROVIDER_STATUSES.APPROVED) {
            throw (0, errors_1.failedPrecondition)('Direct conversations require an approved provider.');
        }
        const providerDirectoryData = providerDirectorySnap.data() || {};
        const now = firestore_1.Timestamp.now();
        if (!conversationSnap.exists) {
            transaction.set(conversationRef, buildConversationDocument({
                conversationId,
                type: 'direct',
                userId: actorUid,
                providerId,
                now,
            }));
            transaction.set(userMembershipRef, buildMembershipDocument({
                conversationId,
                uid: actorUid,
                role: 'user',
                otherParticipantSnapshot: getProviderSnapshot(providerId, providerDirectoryData),
                now,
            }));
            transaction.set(providerMembershipRef, buildMembershipDocument({
                conversationId,
                uid: providerId,
                role: 'provider',
                otherParticipantSnapshot: getUserSnapshot(actorUid, userData),
                now,
            }));
        }
        return {
            conversation: normalizeConversation(conversationId, conversationSnap.exists
                ? conversationSnap.data() || {}
                : buildConversationDocument({ conversationId, type: 'direct', userId: actorUid, providerId, now })),
            created: !conversationSnap.exists,
        };
    });
    if (result.created) {
        await (0, audit_1.writeAuditEvent)({ db }, {
            action: 'chat.conversation.create',
            actorUid,
            actorRole: 'user',
            resourceType: 'conversation',
            resourceId: conversationId,
            result: 'created',
            context: { providerId, type: 'direct' },
        });
    }
    return {
        conversation: serializeConversationForClient(result.conversation),
        created: result.created,
    };
}
async function ensureBookingConversationService({ db }, actorUid, rawPayload) {
    const bookingId = (0, shared_1.sanitizeString)(rawPayload.bookingId);
    if (!bookingId) {
        throw (0, errors_1.badRequest)('Booking id is required.');
    }
    const result = await db.runTransaction(async (transaction) => {
        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Booking is missing.');
        }
        const booking = bookingSnap.data() || {};
        if (actorUid !== (0, shared_1.sanitizeString)(booking.userId) && actorUid !== (0, shared_1.sanitizeString)(booking.providerId)) {
            throw (0, errors_1.permissionDenied)('Only booking participants can open this conversation.');
        }
        const now = firestore_1.Timestamp.now();
        const conversationId = (0, shared_1.sanitizeString)(booking.conversationId) || bookingConversationId(bookingId);
        const conversationRef = db.collection('conversations').doc(conversationId);
        const conversationSnap = await transaction.get(conversationRef);
        if (!conversationSnap.exists) {
            writeBookingConversationDocuments({
                db,
                transaction,
                booking: { ...booking, bookingId, conversationId },
                now,
            });
            transaction.set(bookingRef, {
                conversationId,
                updatedAt: now,
            }, { merge: true });
        }
        return {
            conversation: normalizeConversation(conversationId, conversationSnap.exists
                ? conversationSnap.data() || {}
                : buildConversationDocument({
                    conversationId,
                    type: 'booking',
                    userId: (0, shared_1.sanitizeString)(booking.userId),
                    providerId: (0, shared_1.sanitizeString)(booking.providerId),
                    bookingId,
                    now,
                })),
            created: !conversationSnap.exists,
        };
    });
    if (result.created) {
        await (0, audit_1.writeAuditEvent)({ db }, {
            action: 'chat.conversation.create',
            actorUid,
            actorRole: result.conversation.participantRoles?.[actorUid] || 'unknown',
            resourceType: 'conversation',
            resourceId: result.conversation.conversationId,
            result: 'created',
            context: { bookingId, type: 'booking' },
        });
    }
    return {
        conversation: serializeConversationForClient(result.conversation),
        created: result.created,
    };
}
async function sendChatMessageService({ db }, actorUid, rawPayload) {
    const conversationId = (0, shared_1.sanitizeString)(rawPayload.conversationId);
    const body = normalizeTextMessage(rawPayload.body);
    if (!conversationId) {
        throw (0, errors_1.badRequest)('Conversation id is required.');
    }
    const result = await db.runTransaction(async (transaction) => {
        const conversationRef = db.collection('conversations').doc(conversationId);
        const conversationSnap = await transaction.get(conversationRef);
        if (!conversationSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Conversation is missing.');
        }
        const conversation = normalizeConversation(conversationId, conversationSnap.data() || {});
        ensureParticipant(conversation, actorUid);
        if (conversation.status !== 'active') {
            throw (0, errors_1.failedPrecondition)('Conversation is not active.');
        }
        const senderRole = (0, shared_1.sanitizeString)(conversation.participantRoles?.[actorUid]);
        if (senderRole !== 'user' && senderRole !== 'provider') {
            throw (0, errors_1.permissionDenied)('Sender role is not valid for this conversation.');
        }
        const now = firestore_1.Timestamp.now();
        const messageRef = conversationRef.collection('messages').doc();
        const message = {
            messageId: messageRef.id,
            conversationId,
            senderUid: actorUid,
            senderRole,
            type: 'text',
            body,
            attachment: null,
            systemEvent: null,
            status: 'sent',
            createdAt: now,
            updatedAt: now,
        };
        const lastMessage = {
            messageId: messageRef.id,
            senderUid: actorUid,
            type: 'text',
            preview: body.length > 120 ? `${body.slice(0, 117)}...` : body,
            createdAt: now,
        };
        const participantIds = conversation.participantIds || [];
        const membershipSnaps = await Promise.all(participantIds.map(async (uid) => {
            const membershipRef = db.collection('conversationMemberships').doc(conversationMembershipId(conversationId, uid));
            const membershipSnap = await transaction.get(membershipRef);
            return { uid, membershipRef, membershipSnap };
        }));
        transaction.set(messageRef, message);
        transaction.set(conversationRef, {
            lastMessage,
            updatedAt: now,
        }, { merge: true });
        membershipSnaps.forEach(({ uid, membershipRef, membershipSnap }) => {
            const currentUnreadCount = Number(membershipSnap.data()?.unreadCount) || 0;
            transaction.set(membershipRef, {
                lastMessageAt: now,
                unreadCount: uid === actorUid ? 0 : currentUnreadCount + 1,
                updatedAt: now,
                archivedAt: null,
            }, { merge: true });
        });
        return {
            message,
            senderRole,
            bookingId: conversation.bookingId,
        };
    });
    await (0, audit_1.writeAuditEvent)({ db }, {
        action: 'chat.message.send',
        actorUid,
        actorRole: result.senderRole,
        resourceType: 'conversation',
        resourceId: conversationId,
        result: 'sent',
        context: {
            messageId: result.message.messageId,
            bookingId: result.bookingId || null,
        },
    });
    return {
        message: serializeMessageForClient(result.message),
    };
}
async function markConversationReadService({ db }, actorUid, rawPayload) {
    const conversationId = (0, shared_1.sanitizeString)(rawPayload.conversationId);
    const lastReadMessageId = (0, shared_1.sanitizeString)(rawPayload.lastReadMessageId) || null;
    if (!conversationId) {
        throw (0, errors_1.badRequest)('Conversation id is required.');
    }
    const result = await db.runTransaction(async (transaction) => {
        const conversationRef = db.collection('conversations').doc(conversationId);
        const membershipRef = db.collection('conversationMemberships').doc(conversationMembershipId(conversationId, actorUid));
        const [conversationSnap, membershipSnap] = await Promise.all([
            transaction.get(conversationRef),
            transaction.get(membershipRef),
        ]);
        if (!conversationSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Conversation is missing.');
        }
        const conversation = normalizeConversation(conversationId, conversationSnap.data() || {});
        ensureParticipant(conversation, actorUid);
        if (!membershipSnap.exists) {
            throw (0, errors_1.failedPrecondition)('Conversation membership is missing.');
        }
        const actorRole = (0, shared_1.sanitizeString)(conversation.participantRoles?.[actorUid]) || (0, shared_1.sanitizeString)(membershipSnap.data()?.role);
        const now = firestore_1.Timestamp.now();
        transaction.set(membershipRef, {
            unreadCount: 0,
            lastReadMessageId,
            updatedAt: now,
        }, { merge: true });
        return { actorRole };
    });
    await (0, audit_1.writeAuditEvent)({ db }, {
        action: 'chat.conversation.read',
        actorUid,
        actorRole: result.actorRole,
        resourceType: 'conversation',
        resourceId: conversationId,
        result: 'success',
    });
    return {
        conversationId,
        unreadCount: 0,
        lastReadMessageId,
    };
}
