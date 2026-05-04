import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { markConversationRead, subscribeChatMemberships } from '../src/firebase/chat';
import { resolveStoragePathDownloadUrl } from '../src/firebase/storageUploads';

const USER_AVATAR_FALLBACK = require('../assets/images/user/user_5.jpg');
const PROVIDER_AVATAR_FALLBACK = require('../assets/images/provider-role/provider_7.jpg');

function formatConversationTime(value) {
  if (!value) {
    return '';
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return '';
  }

  return parsedValue.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
  });
}

function toConversationListItem(membership, role, avatarUrl = null) {
  const otherParticipant = membership.otherParticipantSnapshot || {};
  const fallbackImage = role === 'provider' ? USER_AVATAR_FALLBACK : PROVIDER_AVATAR_FALLBACK;

  return {
    id: membership.conversationId,
    conversationId: membership.conversationId,
    membershipId: membership.membershipId,
    image: avatarUrl ? { uri: avatarUrl } : fallbackImage,
    name: otherParticipant.displayName || (role === 'provider' ? 'Client' : 'Prestator'),
    about: membership.lastMessageAt ? 'Deschide conversația' : 'Conversație nouă',
    seen: formatConversationTime(membership.lastMessageAt),
    isUnread: membership.unreadCount > 0,
    unreadCount: membership.unreadCount,
    status: 'Chat activ',
    lastMessageAt: membership.lastMessageAt,
  };
}

export function useChatConversations(role) {
  const { session } = useSession();
  const [memberships, setMemberships] = useState([]);
  const [avatarUrls, setAvatarUrls] = useState({});
  const [isLoading, setIsLoading] = useState(Boolean(session.uid && role));
  const [error, setError] = useState(null);
  const canSubscribe = Boolean(
    session.isAuthenticated
    && session.uid
    && role
    && !session.configError,
  );

  useEffect(() => {
    if (!canSubscribe) {
      setMemberships([]);
      setAvatarUrls({});
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError(null);

    return subscribeChatMemberships(
      { uid: session.uid, role },
      (nextMemberships) => {
        setMemberships(nextMemberships);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setMemberships([]);
        setAvatarUrls({});
        setIsLoading(false);
      },
    );
  }, [canSubscribe, role, session.configError, session.isAuthenticated, session.uid]);

  useEffect(() => {
    let isActive = true;
    const membershipsWithAvatar = memberships.filter((membership) => (
      membership.otherParticipantSnapshot?.avatarPath
    ));

    if (!membershipsWithAvatar.length) {
      setAvatarUrls({});
      return () => {
        isActive = false;
      };
    }

    void Promise.all(membershipsWithAvatar.map(async (membership) => {
      try {
        const avatarUrl = await resolveStoragePathDownloadUrl(membership.otherParticipantSnapshot.avatarPath);
        return [membership.membershipId, avatarUrl];
      } catch {
        return [membership.membershipId, null];
      }
    })).then((entries) => {
      if (!isActive) {
        return;
      }

      setAvatarUrls(Object.fromEntries(entries.filter(([, avatarUrl]) => avatarUrl)));
    });

    return () => {
      isActive = false;
    };
  }, [memberships]);

  const conversations = useMemo(
    () => memberships.map((membership) => (
      toConversationListItem(membership, role, avatarUrls[membership.membershipId])
    )),
    [avatarUrls, memberships, role],
  );

  const unreadCount = useMemo(
    () => memberships.reduce((total, membership) => total + (Number(membership.unreadCount) || 0), 0),
    [memberships],
  );

  async function markAllAsRead() {
    const unreadMemberships = memberships.filter((membership) => membership.unreadCount > 0);
    await Promise.all(unreadMemberships.map((membership) => (
      markConversationRead(membership.conversationId, membership.lastReadMessageId)
    )));
  }

  return {
    conversations,
    memberships,
    unreadCount,
    isLoading,
    error,
    markAllAsRead,
  };
}
