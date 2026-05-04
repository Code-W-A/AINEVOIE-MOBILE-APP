import { httpsCallable } from 'firebase/functions';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseConfigError, getFirebaseServices, isFirebaseConfigured } from './client';

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error(getFirebaseConfigError());
  }
}

function extractFirebaseConsoleUrl(error) {
  const message = String(error?.message || '');
  const match = message.match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/);
  return match?.[0] || null;
}

function logChatSubscriptionError(scope, queryContext, error) {
  const indexUrl = extractFirebaseConsoleUrl(error);

  console.error(`[Chat][${scope}:error] ${error?.message || error}`);
  if (indexUrl) {
    console.error(`[Chat][${scope}:index-url] ${indexUrl}`);
  }
  console.error(`[Chat][${scope}:details]`, {
    code: error?.code || null,
    name: error?.name || null,
    query: queryContext,
  });
}

function serializeDate(value) {
  if (!value) {
    return null;
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

function normalizeConversationMembership(id, payload) {
  const otherParticipantSnapshot = payload?.otherParticipantSnapshot || {};
  const lastMessageAt = serializeDate(payload?.lastMessageAt);

  return {
    id,
    membershipId: payload?.membershipId || id,
    conversationId: String(payload?.conversationId || '').trim(),
    uid: String(payload?.uid || '').trim(),
    role: String(payload?.role || '').trim(),
    otherParticipantSnapshot: {
      uid: String(otherParticipantSnapshot.uid || '').trim(),
      displayName: String(otherParticipantSnapshot.displayName || '').trim(),
      avatarPath: String(otherParticipantSnapshot.avatarPath || '').trim() || null,
    },
    unreadCount: Number(payload?.unreadCount) || 0,
    lastReadMessageId: payload?.lastReadMessageId || null,
    lastMessageAt,
    archivedAt: serializeDate(payload?.archivedAt),
    mutedUntil: serializeDate(payload?.mutedUntil),
    blockedAt: serializeDate(payload?.blockedAt),
    createdAt: serializeDate(payload?.createdAt),
    updatedAt: serializeDate(payload?.updatedAt),
  };
}

function normalizeConversationMessage(id, payload) {
  return {
    id,
    messageId: String(payload?.messageId || id).trim(),
    conversationId: String(payload?.conversationId || '').trim(),
    senderUid: String(payload?.senderUid || '').trim(),
    senderRole: String(payload?.senderRole || '').trim(),
    type: String(payload?.type || 'text').trim(),
    body: String(payload?.body || '').trim(),
    status: String(payload?.status || 'sent').trim(),
    createdAt: serializeDate(payload?.createdAt),
    updatedAt: serializeDate(payload?.updatedAt),
    deletedAt: serializeDate(payload?.deletedAt),
  };
}

export function subscribeChatMemberships({ uid, role }, onNext, onError) {
  assertFirebaseConfigured();

  if (!uid || !role) {
    onNext([]);
    return () => {};
  }

  const { db } = getFirebaseServices();
  const membershipsQuery = query(
    collection(db, 'conversationMemberships'),
    where('uid', '==', uid),
    where('role', '==', role),
    where('archivedAt', '==', null),
    orderBy('lastMessageAt', 'desc'),
  );

  return onSnapshot(
    membershipsQuery,
    (snapshot) => {
      onNext(snapshot.docs.map((item) => normalizeConversationMembership(item.id, item.data())));
    },
    (error) => {
      logChatSubscriptionError('subscribeChatMemberships', {
        collection: 'conversationMemberships',
        where: {
          uid,
          role,
          archivedAt: null,
        },
        orderBy: {
          field: 'lastMessageAt',
          direction: 'desc',
        },
      }, error);
      onError(error);
    },
  );
}

export function subscribeChatMessages(conversationId, onNext, onError) {
  assertFirebaseConfigured();

  if (!conversationId) {
    onNext([]);
    return () => {};
  }

  const { db } = getFirebaseServices();
  const messagesQuery = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onNext(snapshot.docs.map((item) => normalizeConversationMessage(item.id, item.data())));
    },
    (error) => {
      logChatSubscriptionError('subscribeChatMessages', {
        collection: `conversations/${conversationId}/messages`,
        orderBy: {
          field: 'createdAt',
          direction: 'desc',
        },
      }, error);
      onError(error);
    },
  );
}

async function callChatCallable(callableName, payload) {
  assertFirebaseConfigured();
  const { functions } = getFirebaseServices();
  const callable = httpsCallable(functions, callableName);
  const response = await callable(payload);
  return response.data;
}

export async function ensureDirectConversation(providerId) {
  return callChatCallable('ensureDirectConversation', { providerId });
}

export async function ensureBookingConversation(bookingId) {
  return callChatCallable('ensureBookingConversation', { bookingId });
}

export async function sendChatMessage(conversationId, body) {
  return callChatCallable('sendChatMessage', { conversationId, body });
}

export async function markConversationRead(conversationId, lastReadMessageId = null) {
  return callChatCallable('markConversationRead', { conversationId, lastReadMessageId });
}
