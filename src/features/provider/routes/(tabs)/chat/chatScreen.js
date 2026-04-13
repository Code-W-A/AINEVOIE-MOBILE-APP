import React from 'react';
import SharedChatListScreen from '../../../../shared/screens/SharedChatListScreen';
import { providerChatConversations } from '../../../../shared/data/chatConversations';

export default function ProviderChatScreen() {
  return (
    <SharedChatListScreen
      conversations={providerChatConversations}
      messageRoute="/provider/message/messageScreen"
    />
  );
}
