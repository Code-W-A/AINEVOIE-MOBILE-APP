import React from 'react';
import SharedChatListScreen from '../../../../shared/screens/SharedChatListScreen';
import { useChatConversations } from '../../../../../../hooks/useChatConversations';

export default function UserChatScreen() {
  const { conversations, isLoading, error, markAllAsRead } = useChatConversations('user');

  return (
    <SharedChatListScreen
      conversations={conversations}
      isLoading={isLoading}
      error={error}
      onMarkAllAsRead={markAllAsRead}
      messageRoute="/user/message/messageScreen"
    />
  );
}
