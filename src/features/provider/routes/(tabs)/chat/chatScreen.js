import React from 'react';
import SharedChatListScreen from '../../../../shared/screens/SharedChatListScreen';
import { useChatConversations } from '../../../../../../hooks/useChatConversations';

export default function ProviderChatScreen() {
  const { conversations, isLoading, error, markAllAsRead } = useChatConversations('provider');

  return (
    <SharedChatListScreen
      conversations={conversations}
      isLoading={isLoading}
      error={error}
      onMarkAllAsRead={markAllAsRead}
      messageRoute="/provider/message/messageScreen"
    />
  );
}
