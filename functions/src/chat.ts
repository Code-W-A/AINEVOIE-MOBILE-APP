import { Firestore, Timestamp, Transaction } from 'firebase-admin/firestore';
import { writeAuditEvent } from './audit';
import { badRequest, failedPrecondition, permissionDenied } from './errors';
import { PROVIDER_STATUSES, sanitizeString } from './shared';

type ChatDeps = {
  db: Firestore,
};

type EnsureDirectConversationPayload = {
  providerId?: unknown,
};

type EnsureBookingConversationPayload = {
  bookingId?: unknown,
};

type SendChatMessagePayload = {
  conversationId?: unknown,
  body?: unknown,
};

type MarkConversationReadPayload = {
  conversationId?: unknown,
  lastReadMessageId?: unknown,
};

const CHAT_SCHEMA_VERSION = 1;
const MAX_TEXT_MESSAGE_LENGTH = 2000;

function conversationMembershipId(conversationId: string, uid: string) {
  return `${conversationId}_${uid}`;
}

export function directConversationId(userId: string, providerId: string) {
  return `conv_direct_${userId}_${providerId}`;
}

export function bookingConversationId(bookingId: string) {
  return `conv_bk_${bookingId}`;
}

function normalizeTextMessage(value: unknown) {
  const body = sanitizeString(value);

  if (!body) {
    throw badRequest('Message body is required.');
  }

  if (body.length > MAX_TEXT_MESSAGE_LENGTH) {
    throw badRequest(`Message body must be at most ${MAX_TEXT_MESSAGE_LENGTH} characters.`);
  }

  return body;
}

function serializeTimestamp(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof (value as { toDate?: () => Date })?.toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  const parsedValue = new Date(String(value));
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString();
}

function serializeConversationForClient(conversation: Record<string, any>) {
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

function serializeMessageForClient(message: Record<string, any>) {
  return {
    ...message,
    createdAt: serializeTimestamp(message.createdAt),
    updatedAt: serializeTimestamp(message.updatedAt),
    deletedAt: serializeTimestamp(message.deletedAt),
  };
}

function getUserSnapshot(uid: string, userData: Record<string, any>) {
  return {
    uid,
    displayName: sanitizeString(userData.displayName) || 'Client',
    avatarPath: sanitizeString(userData.photoPath) || null,
  };
}

function getProviderSnapshot(providerId: string, sourceData: Record<string, any>) {
  return {
    uid: providerId,
    displayName: sanitizeString(sourceData.displayName)
      || sanitizeString(sourceData.professionalProfile?.businessName)
      || sanitizeString(sourceData.professionalProfile?.displayName)
      || 'Prestator',
    avatarPath: sanitizeString(sourceData.avatarPath)
      || sanitizeString(sourceData.professionalProfile?.avatarPath)
      || null,
  };
}

function normalizeConversation(conversationId: string, payload: Record<string, any>) {
  return {
    conversationId: sanitizeString(payload.conversationId) || conversationId,
    type: sanitizeString(payload.type) || 'direct',
    participantIds: Array.isArray(payload.participantIds) ? payload.participantIds.map(sanitizeString).filter(Boolean) : [],
    participantRoles: payload.participantRoles || {},
    bookingId: sanitizeString(payload.bookingId) || null,
    userId: sanitizeString(payload.userId) || null,
    providerId: sanitizeString(payload.providerId) || null,
    status: sanitizeString(payload.status) || 'active',
    lastMessage: payload.lastMessage || null,
    closedAt: payload.closedAt || null,
    closedBy: sanitizeString(payload.closedBy) || null,
    createdAt: payload.createdAt || null,
    updatedAt: payload.updatedAt || null,
    schemaVersion: Number(payload.schemaVersion) || CHAT_SCHEMA_VERSION,
  };
}

function buildConversationDocument({
  conversationId,
  type,
  userId,
  providerId,
  bookingId = null,
  now,
}: {
  conversationId: string,
  type: 'direct' | 'booking',
  userId: string,
  providerId: string,
  bookingId?: string | null,
  now: Timestamp,
}) {
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

function buildMembershipDocument({
  conversationId,
  uid,
  role,
  otherParticipantSnapshot,
  now,
}: {
  conversationId: string,
  uid: string,
  role: 'user' | 'provider',
  otherParticipantSnapshot: Record<string, any>,
  now: Timestamp,
}) {
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

function ensureParticipant(conversation: Record<string, any>, uid: string) {
  if (!Array.isArray(conversation.participantIds) || !conversation.participantIds.includes(uid)) {
    throw permissionDenied('Only conversation participants can perform this chat action.');
  }
}

export function writeBookingConversationDocuments({
  db,
  transaction,
  booking,
  now,
}: {
  db: Firestore,
  transaction: Transaction,
  booking: Record<string, any>,
  now: Timestamp,
}) {
  const bookingId = sanitizeString(booking.bookingId);
  const userId = sanitizeString(booking.userId);
  const providerId = sanitizeString(booking.providerId);

  if (!bookingId || !userId || !providerId) {
    throw badRequest('Booking conversation payload is incomplete.');
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

export async function ensureDirectConversationService(
  { db }: ChatDeps,
  actorUid: string,
  rawPayload: EnsureDirectConversationPayload,
) {
  const providerId = sanitizeString(rawPayload.providerId);

  if (!providerId) {
    throw badRequest('Provider id is required.');
  }

  if (actorUid === providerId) {
    throw badRequest('A provider cannot start a direct conversation with themselves.');
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
      throw failedPrecondition('User profile is missing.');
    }

    const userData = userSnap.data() || {};
    if (sanitizeString(userData.role) !== 'user' || sanitizeString(userData.accountStatus) !== 'active') {
      throw failedPrecondition('Only active user accounts can start direct conversations.');
    }

    if (!providerDirectorySnap.exists || sanitizeString(providerDirectorySnap.data()?.status) !== PROVIDER_STATUSES.APPROVED) {
      throw failedPrecondition('Direct conversations require an approved provider.');
    }

    const providerDirectoryData = providerDirectorySnap.data() || {};
    const now = Timestamp.now();

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
      conversation: normalizeConversation(
        conversationId,
        conversationSnap.exists
          ? conversationSnap.data() || {}
          : buildConversationDocument({ conversationId, type: 'direct', userId: actorUid, providerId, now }),
      ),
      created: !conversationSnap.exists,
    };
  });

  if (result.created) {
    await writeAuditEvent({ db }, {
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

export async function ensureBookingConversationService(
  { db }: ChatDeps,
  actorUid: string,
  rawPayload: EnsureBookingConversationPayload,
) {
  const bookingId = sanitizeString(rawPayload.bookingId);

  if (!bookingId) {
    throw badRequest('Booking id is required.');
  }

  const result = await db.runTransaction(async (transaction) => {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await transaction.get(bookingRef);

    if (!bookingSnap.exists) {
      throw failedPrecondition('Booking is missing.');
    }

    const booking = bookingSnap.data() || {};
    if (actorUid !== sanitizeString(booking.userId) && actorUid !== sanitizeString(booking.providerId)) {
      throw permissionDenied('Only booking participants can open this conversation.');
    }

    const now = Timestamp.now();
    const conversationId = sanitizeString(booking.conversationId) || bookingConversationId(bookingId);
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
      conversation: normalizeConversation(
        conversationId,
        conversationSnap.exists
          ? conversationSnap.data() || {}
          : buildConversationDocument({
            conversationId,
            type: 'booking',
            userId: sanitizeString(booking.userId),
            providerId: sanitizeString(booking.providerId),
            bookingId,
            now,
          }),
      ),
      created: !conversationSnap.exists,
    };
  });

  if (result.created) {
    await writeAuditEvent({ db }, {
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

export async function sendChatMessageService(
  { db }: ChatDeps,
  actorUid: string,
  rawPayload: SendChatMessagePayload,
) {
  const conversationId = sanitizeString(rawPayload.conversationId);
  const body = normalizeTextMessage(rawPayload.body);

  if (!conversationId) {
    throw badRequest('Conversation id is required.');
  }

  const result = await db.runTransaction(async (transaction) => {
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationSnap = await transaction.get(conversationRef);

    if (!conversationSnap.exists) {
      throw failedPrecondition('Conversation is missing.');
    }

    const conversation = normalizeConversation(conversationId, conversationSnap.data() || {});
    ensureParticipant(conversation, actorUid);

    if (conversation.status !== 'active') {
      throw failedPrecondition('Conversation is not active.');
    }

    const senderRole = sanitizeString(conversation.participantRoles?.[actorUid]);
    if (senderRole !== 'user' && senderRole !== 'provider') {
      throw permissionDenied('Sender role is not valid for this conversation.');
    }

    const now = Timestamp.now();
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
    const membershipSnaps = await Promise.all(participantIds.map(async (uid: string) => {
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

  await writeAuditEvent({ db }, {
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

export async function markConversationReadService(
  { db }: ChatDeps,
  actorUid: string,
  rawPayload: MarkConversationReadPayload,
) {
  const conversationId = sanitizeString(rawPayload.conversationId);
  const lastReadMessageId = sanitizeString(rawPayload.lastReadMessageId) || null;

  if (!conversationId) {
    throw badRequest('Conversation id is required.');
  }

  const result = await db.runTransaction(async (transaction) => {
    const conversationRef = db.collection('conversations').doc(conversationId);
    const membershipRef = db.collection('conversationMemberships').doc(conversationMembershipId(conversationId, actorUid));
    const [conversationSnap, membershipSnap] = await Promise.all([
      transaction.get(conversationRef),
      transaction.get(membershipRef),
    ]);

    if (!conversationSnap.exists) {
      throw failedPrecondition('Conversation is missing.');
    }

    const conversation = normalizeConversation(conversationId, conversationSnap.data() || {});
    ensureParticipant(conversation, actorUid);

    if (!membershipSnap.exists) {
      throw failedPrecondition('Conversation membership is missing.');
    }

    const actorRole = sanitizeString(conversation.participantRoles?.[actorUid]) || sanitizeString(membershipSnap.data()?.role);
    const now = Timestamp.now();
    transaction.set(membershipRef, {
      unreadCount: 0,
      lastReadMessageId,
      updatedAt: now,
    }, { merge: true });

    return { actorRole };
  });

  await writeAuditEvent({ db }, {
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
