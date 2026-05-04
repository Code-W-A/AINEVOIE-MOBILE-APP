import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import { Sizes } from '../../../../constant/styles';
import { useLocale } from '../../../../context/localeContext';
import {
  AinevoieDiscoveryTypography,
  AinevoieDiscoveryTokens,
} from '../../shared/styles/discoverySystem';
import { ensureBookingConversation, ensureDirectConversation } from '../../../firebase/chat';
import { useChatMessages } from '../../../../hooks/useChatMessages';
import ChatCircleButton from '../components/chat/ChatCircleButton';
import ChatComposer from '../components/chat/ChatComposer';
import ChatContactIdentity from '../components/chat/ChatContactIdentity';
import ChatMessageBubble from '../components/chat/ChatMessageBubble';
import ChatOverflowMenu from '../components/chat/ChatOverflowMenu';
import ChatTopBar from '../components/chat/ChatTopBar';

const fallbackAvatar = require('../../../../assets/images/user/user_1.jpg');

export default function SharedMessageScreen() {
  const { t } = useLocale();
  const { name, conversationId, providerId, bookingId } = useLocalSearchParams();
  const navigation = useNavigation();
  const listRef = useRef(null);
  const [activeConversationId, setActiveConversationId] = useState(
    typeof conversationId === 'string' ? conversationId : '',
  );
  const [draftMessage, setDraftMessage] = useState('');
  const [isResolvingConversation, setIsResolvingConversation] = useState(!conversationId && (providerId || bookingId));
  const [conversationError, setConversationError] = useState(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    listItems: messagesList,
    isLoading: isMessagesLoading,
    isSending,
    error: messagesError,
    sendMessage,
  } = useChatMessages(activeConversationId);

  useEffect(() => {
    let isMounted = true;

    async function resolveConversation() {
      if (activeConversationId) {
        setIsResolvingConversation(false);
        return;
      }

      const nextBookingId = typeof bookingId === 'string' ? bookingId : '';
      const nextProviderId = typeof providerId === 'string' ? providerId : '';

      if (!nextBookingId && !nextProviderId) {
        setIsResolvingConversation(false);
        return;
      }

      setIsResolvingConversation(true);
      setConversationError(null);

      try {
        const result = nextBookingId
          ? await ensureBookingConversation(nextBookingId)
          : await ensureDirectConversation(nextProviderId);
        const resolvedConversationId = result?.conversation?.conversationId;

        if (isMounted && resolvedConversationId) {
          setActiveConversationId(resolvedConversationId);
        }
      } catch (error) {
        if (isMounted) {
          setConversationError(error);
        }
      } finally {
        if (isMounted) {
          setIsResolvingConversation(false);
        }
      }
    }

    void resolveConversation();

    return () => {
      isMounted = false;
    };
  }, [activeConversationId, bookingId, providerId]);

  const contactName = useMemo(() => {
    if (typeof name === 'string' && name.trim()) {
      return name.trim();
    }

    return t('messages.defaultConversation');
  }, [name, t]);

  const filteredMessages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return messagesList;
    }

    return messagesList.filter((item) => item.message.toLowerCase().includes(normalizedQuery));
  }, [messagesList, searchQuery]);

  function showUnavailableAction(label) {
    Alert.alert(label, 'Această acțiune nu este disponibilă încă pentru conversațiile reale.');
  }

  function openSearch() {
    setIsMenuVisible(false);
    setIsSearchVisible(true);
  }

  function closeSearch() {
    setIsSearchVisible(false);
    setSearchQuery('');
  }

  function handleDeleteConversation() {
    setIsMenuVisible(false);
    showUnavailableAction(t('messages.deleteUnavailable'));
  }

  function handleBlockConversation() {
    setIsMenuVisible(false);
    showUnavailableAction(t('messages.blockUnavailable'));
  }

  async function handleSendMessage() {
    const body = draftMessage.trim();

    if (!body || isSending || isResolvingConversation || !activeConversationId) {
      return;
    }

    setDraftMessage('');

    try {
      await sendMessage(body);
    } catch (error) {
      setDraftMessage(body);
      Alert.alert('Mesaj netrimis', error?.message || 'Încearcă din nou.');
    }
  }

  function renderHeader() {
    return (
      <View style={styles.headerWrapStyle}>
        <ChatTopBar
          onBackPress={() => navigation.canGoBack() ? navigation.goBack() : null}
          centerContent={(
            <ChatContactIdentity
              image={fallbackAvatar}
              name={contactName}
              status="Chat activ"
            />
          )}
          rightContent={(
            <View style={styles.headerActionsWrapStyle}>
              <ChatCircleButton onPress={() => setIsMenuVisible((currentValue) => !currentValue)}>
                <MaterialIcons name="more-horiz" size={22} color={AinevoieDiscoveryTokens.brandDark} />
              </ChatCircleButton>
              <ChatOverflowMenu
                visible={isMenuVisible}
                items={[
                  { label: t('messages.search'), onPress: openSearch },
                  { label: t('messages.deleteConversation'), onPress: handleDeleteConversation },
                  { label: t('messages.block'), onPress: handleBlockConversation },
                ]}
              />
            </View>
          )}
        />
      </View>
    );
  }

  function renderSearchBar() {
    return (
      <View style={styles.searchBarWrapStyle}>
        <MaterialIcons name="search" size={20} color={AinevoieDiscoveryTokens.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('messages.searchPlaceholder')}
          placeholderTextColor={AinevoieDiscoveryTokens.textSecondary}
          style={styles.searchInputStyle}
          selectionColor={AinevoieDiscoveryTokens.accent}
        />
        <ChatCircleButton onPress={closeSearch} style={styles.searchCloseButtonStyle}>
          <MaterialIcons name="close" size={18} color={AinevoieDiscoveryTokens.brandDark} />
        </ChatCircleButton>
      </View>
    );
  }

  function renderEmptyConversation() {
    if (isResolvingConversation || isMessagesLoading) {
      return (
        <View style={styles.emptyConversationWrapStyle}>
          <ActivityIndicator color={AinevoieDiscoveryTokens.accent} />
          <Text style={styles.emptyConversationTitleStyle}>Se încarcă conversația</Text>
        </View>
      );
    }

    const error = conversationError || messagesError;
    if (error) {
      return (
        <View style={styles.emptyConversationWrapStyle}>
          <MaterialIcons name="error-outline" size={30} color={AinevoieDiscoveryTokens.accent} />
          <Text style={styles.emptyConversationTitleStyle}>Conversația nu poate fi încărcată</Text>
          <Text style={styles.emptyConversationTextStyle}>
            {error?.message || 'Încearcă din nou mai târziu.'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyConversationWrapStyle}>
        <MaterialIcons name="chat-bubble-outline" size={30} color={AinevoieDiscoveryTokens.accent} />
        <Text style={styles.emptyConversationTitleStyle}>Începe conversația</Text>
        <Text style={styles.emptyConversationTextStyle}>
          Trimite primul mesaj pentru această conversație.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrapStyle}>
        {renderHeader()}
        <View style={styles.contentWrapStyle}>
          {isMenuVisible ? <Pressable style={styles.menuBackdropStyle} onPress={() => setIsMenuVisible(false)} /> : null}
          {isSearchVisible ? renderSearchBar() : null}
          {isSearchVisible && searchQuery.trim().length > 0 && filteredMessages.length === 0 ? (
            <View style={styles.emptySearchStateStyle}>
              <Text style={styles.emptySearchTitleStyle}>{t('messages.noResultsTitle')}</Text>
              <Text style={styles.emptySearchTextStyle}>{t('messages.noResultsBody')}</Text>
            </View>
          ) : null}
          <FlatList
            ref={listRef}
            inverted
            data={filteredMessages}
            keyExtractor={(item) => `${item.id}`}
            renderItem={({ item }) => (
              <ChatMessageBubble
                item={item}
                seenIconColor={AinevoieDiscoveryTokens.accent}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messageListStyle}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={renderEmptyConversation}
          />
        </View>
        <ChatComposer
          value={draftMessage}
          onChangeText={setDraftMessage}
          onEmojiPress={() => showUnavailableAction('Emoji')}
          onAttachPress={() => showUnavailableAction('Atașamente')}
          onCameraPress={() => showUnavailableAction('Cameră')}
          onTrailingPress={handleSendMessage}
          trailingMode={draftMessage.trim() ? 'send' : 'mic'}
          placeholder={t('messages.composerPlaceholder')}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F5F2',
  },
  keyboardWrapStyle: {
    flex: 1,
  },
  headerWrapStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Sizes.fixPadding * 2.0,
    paddingTop: Sizes.fixPadding + 5.0,
    paddingBottom: Sizes.fixPadding + 4.0,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: AinevoieDiscoveryTokens.borderSubtle,
    zIndex: 3,
  },
  headerActionsWrapStyle: {
    position: 'relative',
  },
  contentWrapStyle: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F5F2EE',
  },
  messageListStyle: {
    paddingHorizontal: Sizes.fixPadding * 2.0,
    paddingTop: Sizes.fixPadding,
    paddingBottom: Sizes.fixPadding * 2.0,
    flexDirection: 'column-reverse',
    flexGrow: 1,
  },
  menuBackdropStyle: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  searchBarWrapStyle: {
    marginHorizontal: Sizes.fixPadding * 2.0,
    marginTop: Sizes.fixPadding,
    marginBottom: 4,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#141923',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  searchInputStyle: {
    flex: 1,
    marginLeft: 10,
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.brandDark,
    paddingVertical: 0,
  },
  searchCloseButtonStyle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: 8,
  },
  emptySearchStateStyle: {
    marginHorizontal: Sizes.fixPadding * 2.0,
    marginTop: Sizes.fixPadding,
    marginBottom: 4,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  emptySearchTitleStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.brandDark,
    marginBottom: 4,
  },
  emptySearchTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
  },
  emptyConversationWrapStyle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 26,
    marginTop: Sizes.fixPadding * 2,
    borderRadius: 20,
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
  },
  emptyConversationTitleStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.brandDark,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyConversationTextStyle: {
    ...AinevoieDiscoveryTypography.caption,
    color: AinevoieDiscoveryTokens.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
