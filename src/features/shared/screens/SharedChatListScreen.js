import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import MyStatusBar from '../../../../components/myStatusBar';
import {
  AinevoieDiscoveryPrimitives,
  AinevoieDiscoverySpacing,
  AinevoieDiscoveryTokens,
  AinevoieDiscoveryTypography,
} from '../styles/discoverySystem';
import ChatCircleButton from '../components/chat/ChatCircleButton';
import ChatConversationRow from '../components/chat/ChatConversationRow';
import ChatSearchBar from '../components/chat/ChatSearchBar';

export default function SharedChatListScreen({
  conversations = [],
  messageRoute,
  isLoading = false,
  error = null,
  onMarkAllAsRead,
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return conversations.filter((item) => {
      const matchesUnread = showUnreadOnly ? item.isUnread : true;
      const matchesQuery = normalizedQuery.length === 0
        ? true
        : String(item.name || '').toLowerCase().includes(normalizedQuery)
          || String(item.about || '').toLowerCase().includes(normalizedQuery);

      return matchesUnread && matchesQuery;
    });
  }, [conversations, query, showUnreadOnly]);

  function markAllAsRead() {
    if (onMarkAllAsRead) {
      void onMarkAllAsRead();
    }
    setShowUnreadOnly(false);
    setIsFilterSheetVisible(false);
  }

  function applyUnreadFilter() {
    setShowUnreadOnly(true);
    setIsFilterSheetVisible(false);
  }

  function clearFilters() {
    setShowUnreadOnly(false);
    setIsFilterSheetVisible(false);
  }

  function renderHeader() {
    return (
      <View style={styles.headerSectionStyle}>
        <View style={styles.topBarRowStyle}>
          <ChatCircleButton onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios-new" size={20} color={AinevoieDiscoveryTokens.brandDark} />
          </ChatCircleButton>

          <Text style={styles.headerTitle}>Mesaje</Text>

          <View style={styles.topBarSpacerStyle} />
        </View>

        <ChatSearchBar
          value={query}
          onChangeText={setQuery}
          onToggleFilter={() => setIsFilterSheetVisible(true)}
          filterActive={showUnreadOnly}
        />

        <Text style={styles.headerSubtitle}>
          {showUnreadOnly ? 'Afișezi doar conversațiile necitite.' : 'Conversațiile sunt sincronizate cu Firebase.'}
        </Text>
      </View>
    );
  }

  function renderFilterSheet() {
    return (
      <Modal
        visible={isFilterSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterSheetVisible(false)}
      >
        <View style={styles.sheetOverlayStyle}>
          <Pressable style={styles.sheetBackdropStyle} onPress={() => setIsFilterSheetVisible(false)} />
          <View style={styles.sheetCardStyle}>
            <View style={styles.sheetHandleStyle} />
            <Text style={styles.sheetTitleStyle}>Filtrare conversații</Text>

            <TouchableOpacity activeOpacity={0.88} style={styles.sheetActionStyle} onPress={applyUnreadFilter}>
              <Text style={styles.sheetActionTitleStyle}>Doar necitite</Text>
              {showUnreadOnly ? <MaterialIcons name="check" size={20} color={AinevoieDiscoveryTokens.accentDark} /> : null}
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.88} style={styles.sheetActionStyle} onPress={clearFilters}>
              <Text style={styles.sheetActionTitleStyle}>Toate conversațiile</Text>
              {!showUnreadOnly ? <MaterialIcons name="check" size={20} color={AinevoieDiscoveryTokens.accentDark} /> : null}
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.88} style={styles.secondarySheetButtonStyle} onPress={markAllAsRead}>
              <Text style={styles.secondarySheetButtonLabelStyle}>Marchează toate ca citite</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} style={styles.primarySheetButtonStyle} onPress={() => setIsFilterSheetVisible(false)}>
              <Text style={styles.primarySheetButtonLabelStyle}>Închide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderUser({ item }) {
    return (
      <ChatConversationRow
        item={item}
        onPress={() => router.push({
          pathname: messageRoute,
          params: {
            conversationId: item.conversationId,
            name: item.name,
          },
        })}
      />
    );
  }

  function renderLoadingState() {
    return (
      <View style={styles.emptyStateWrapStyle}>
        <ActivityIndicator color={AinevoieDiscoveryTokens.accent} />
        <Text style={styles.emptyStateTitleStyle}>Se încarcă mesajele</Text>
      </View>
    );
  }

  function renderErrorState() {
    return (
      <View style={styles.emptyStateWrapStyle}>
        <MaterialIcons name="error-outline" size={28} color={AinevoieDiscoveryTokens.accent} />
        <Text style={styles.emptyStateTitleStyle}>Nu am putut încărca mesajele.</Text>
        <Text style={styles.emptyStateTextStyle}>
          {error?.message || 'Încearcă din nou după câteva momente.'}
        </Text>
      </View>
    );
  }

  function renderEmptyState() {
    if (isLoading) {
      return renderLoadingState();
    }

    if (error) {
      return renderErrorState();
    }

    return (
      <View style={styles.emptyStateWrapStyle}>
        <MaterialIcons name="chat-bubble-outline" size={28} color={AinevoieDiscoveryTokens.accent} />
        <Text style={styles.emptyStateTitleStyle}>Nu ai conversații încă.</Text>
        <Text style={styles.emptyStateTextStyle}>
          Conversațiile apar aici după ce trimiți sau primești primul mesaj.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <MyStatusBar />
      {renderHeader()}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderUser}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.listContentStyle}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={renderEmptyState}
      />
      {renderFilterSheet()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...AinevoieDiscoveryPrimitives.screen,
  },
  listContentStyle: {
    paddingTop: AinevoieDiscoverySpacing.xs,
    paddingBottom: AinevoieDiscoverySpacing.xxl,
    flexGrow: 1,
  },
  emptyStateWrapStyle: {
    ...AinevoieDiscoveryPrimitives.emptyState,
    marginHorizontal: AinevoieDiscoverySpacing.xl,
    marginTop: AinevoieDiscoverySpacing.xl,
  },
  emptyStateTitleStyle: {
    ...AinevoieDiscoveryTypography.sectionTitle,
    textAlign: 'center',
    marginTop: AinevoieDiscoverySpacing.sm,
  },
  emptyStateTextStyle: {
    ...AinevoieDiscoveryTypography.bodyMuted,
    textAlign: 'center',
    marginTop: AinevoieDiscoverySpacing.sm,
  },
  headerSectionStyle: {
    paddingHorizontal: AinevoieDiscoverySpacing.xl,
    paddingTop: AinevoieDiscoverySpacing.xs,
    paddingBottom: AinevoieDiscoverySpacing.md,
    backgroundColor: AinevoieDiscoveryTokens.appBackground,
  },
  topBarRowStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 14,
    fontSize: 26,
    lineHeight: 30,
  },
  topBarSpacerStyle: {
    width: 46,
  },
  headerSubtitle: {
    ...AinevoieDiscoveryTypography.caption,
    marginTop: 12,
    paddingLeft: 2,
  },
  sheetOverlayStyle: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropStyle: {
    flex: 1,
    backgroundColor: 'rgba(20,25,35,0.24)',
  },
  sheetCardStyle: {
    backgroundColor: AinevoieDiscoveryTokens.surfaceCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: AinevoieDiscoverySpacing.xl,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandleStyle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: AinevoieDiscoveryTokens.borderSubtle,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetTitleStyle: {
    ...AinevoieDiscoveryTypography.screenTitle,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 18,
  },
  sheetActionStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AinevoieDiscoveryTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: AinevoieDiscoveryTokens.borderSubtle,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
  },
  sheetActionTitleStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.textPrimary,
  },
  secondarySheetButtonStyle: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.surfaceAccent,
    marginTop: 6,
    marginBottom: 10,
  },
  secondarySheetButtonLabelStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: AinevoieDiscoveryTokens.accentDark,
  },
  primarySheetButtonStyle: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AinevoieDiscoveryTokens.accent,
  },
  primarySheetButtonLabelStyle: {
    ...AinevoieDiscoveryTypography.body,
    color: '#FFFFFF',
  },
});
