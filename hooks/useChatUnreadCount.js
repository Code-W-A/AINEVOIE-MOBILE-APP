import { useChatConversations } from './useChatConversations';

export function useChatUnreadCount(role) {
  const { unreadCount, isLoading, error } = useChatConversations(role);

  return {
    unreadCount,
    isLoading,
    error,
  };
}
