import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../context/sessionContext';
import { markConversationRead, sendChatMessage, subscribeChatMessages } from '../src/firebase/chat';

function formatMessageTime(value) {
  if (!value) {
    return '';
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return '';
  }

  return parsedValue.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toMessageListItem(message, uid) {
  return {
    id: message.messageId,
    messageId: message.messageId,
    conversationId: message.conversationId,
    message: message.body,
    time: formatMessageTime(message.createdAt),
    isSender: message.senderUid === uid,
    isSeen: true,
    createdAt: message.createdAt,
  };
}

export function useChatMessages(conversationId) {
  const { session } = useSession();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(conversationId));
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conversationId || !session.isAuthenticated || !session.uid || session.configError) {
      setMessages([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError(null);

    return subscribeChatMessages(
      conversationId,
      (nextMessages) => {
        setMessages(nextMessages);
        setIsLoading(false);
        if (nextMessages.length) {
          void markConversationRead(conversationId, nextMessages[0].messageId);
        }
      },
      (nextError) => {
        setError(nextError);
        setMessages([]);
        setIsLoading(false);
      },
    );
  }, [conversationId, session.configError, session.isAuthenticated, session.uid]);

  const listItems = useMemo(
    () => messages.map((message) => toMessageListItem(message, session.uid)),
    [messages, session.uid],
  );

  async function sendMessage(body) {
    if (!conversationId) {
      throw new Error('Conversation is not ready.');
    }

    setIsSending(true);
    try {
      return await sendChatMessage(conversationId, body);
    } finally {
      setIsSending(false);
    }
  }

  return {
    messages,
    listItems,
    isLoading,
    isSending,
    error,
    sendMessage,
  };
}
