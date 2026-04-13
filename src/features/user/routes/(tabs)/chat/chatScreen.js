import React from 'react';
import SharedChatListScreen from '../../../../shared/screens/SharedChatListScreen';
import { userChatConversations } from '../../../../shared/data/chatConversations';

export default function UserChatScreen() {
  return (
    <SharedChatListScreen
      conversations={userChatConversations}
      messageRoute="/user/message/messageScreen"
    />
  );
}
