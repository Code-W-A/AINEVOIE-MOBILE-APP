import React, { useMemo, useRef, useState } from 'react';
import {
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
import { getChatContactByName } from '../data/chatConversations';
import ChatCircleButton from '../components/chat/ChatCircleButton';
import ChatComposer from '../components/chat/ChatComposer';
import ChatContactIdentity from '../components/chat/ChatContactIdentity';
import ChatDateSeparator from '../components/chat/ChatDateSeparator';
import ChatMessageBubble from '../components/chat/ChatMessageBubble';
import ChatOverflowMenu from '../components/chat/ChatOverflowMenu';
import ChatTopBar from '../components/chat/ChatTopBar';

function getInitialMessages(t) {
  return [
    { id: '1', message: t('messages.sampleMessage1'), time: '09:35', isSender: true, isSeen: true },
    { id: '2', message: t('messages.sampleMessage2'), time: '09:36', isSender: false },
    { id: '3', message: t('messages.sampleMessage3'), time: '09:37', isSender: false },
    { id: '4', message: t('messages.sampleMessage4'), time: '09:38', isSender: true, isSeen: false },
  ];
}

const fallbackAvatar = require('../../../../assets/images/user/user_1.jpg');

export default function SharedMessageScreen({ role }) {
  const normalizedRole = role === 'provider' ? 'provider' : 'user';
  const { t } = useLocale();
  const { name } = useLocalSearchParams();
  const navigation = useNavigation();
  const listRef = useRef(null);
  const [messagesList, setMessagesList] = useState(() => getInitialMessages(t));
  const [message, setMessage] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const contactName = useMemo(() => {
    if (typeof name === 'string' && name.trim()) {
      return name.trim();
    }

    return t('messages.defaultConversation');
  }, [name, t]);

  const contact = useMemo(() => getChatContactByName(normalizedRole, contactName), [contactName, normalizedRole]);
  const filteredMessages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return messagesList;
    }

    return messagesList.filter((item) => item.message.toLowerCase().includes(normalizedQuery));
  }, [messagesList, searchQuery]);

  function showDemoAction(label) {
    Alert.alert(label, t('messages.demoBody'));
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
    showDemoAction(t('messages.deleteUnavailable'));
  }

  function handleBlockConversation() {
    setIsMenuVisible(false);
    showDemoAction(t('messages.blockUnavailable'));
  }

  function addMessage(nextMessage) {
    const date = new Date();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    setMessagesList((currentMessages) => [
      ...currentMessages,
      {
        id: `${currentMessages.length + 1}`,
        message: nextMessage,
        time: `${hour}:${minute}`,
        isSender: true,
        isSeen: false,
      },
    ]);

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    });
  }

  function handleSend() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    addMessage(trimmedMessage);
    setMessage('');
  }

  function renderHeader() {
    return (
      <View style={styles.headerWrapStyle}>
        <ChatTopBar
          onBackPress={() => navigation.canGoBack() ? navigation.goBack() : null}
          centerContent={(
            <ChatContactIdentity
              image={contact?.image || fallbackAvatar}
              name={contactName}
              status={contact?.status || t('messages.online')}
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

  function renderDateLabel() {
    return <ChatDateSeparator label={t('messages.todaySeparator')} />;
  }

  function renderMessageItem({ item }) {
    return <ChatMessageBubble item={item} seenIconColor={normalizedRole === 'provider' ? AinevoieDiscoveryTokens.accent : AinevoieDiscoveryTokens.accentDark} />;
  }

  function renderComposer() {
    return (
      <ChatComposer
        value={message}
        onChangeText={setMessage}
        onEmojiPress={() => showDemoAction(t('messages.emojiUnavailable'))}
        onAttachPress={() => showDemoAction(t('messages.attachmentUnavailable'))}
        onCameraPress={() => showDemoAction(t('messages.cameraUnavailable'))}
        onTrailingPress={message.trim() ? handleSend : () => showDemoAction(t('messages.microphoneUnavailable'))}
        trailingMode={message.trim() ? 'send' : 'mic'}
        placeholder={t('messages.composerPlaceholder')}
      />
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
          {renderDateLabel()}
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
            renderItem={renderMessageItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messageListStyle}
            keyboardShouldPersistTaps="handled"
          />
        </View>
        {renderComposer()}
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
});
