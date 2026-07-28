import React, { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AIChat from '../../src/components/AIChat';
import { useAI } from '../../src/hooks/useAI';
import { useNotes } from '../../src/hooks/useNotes';
import type { ChatMessage, AIProvider } from '../../src/types';
import { colors, radius } from '../../src/theme';

export default function ChatScreen() {
  const {
    messages,
    isThinking,
    provider,
    inferenceHistory,
    sendMessage,
    clearMessages,
    switchProvider,
  } = useAI();
  const { createNote } = useNotes();

  const handleSaveToNotes = useCallback(
    async (message: ChatMessage) => {
      if (message.role !== 'assistant') return;

      try {
        await createNote(
          message.content,
          `AI 洞察 · ${new Date().toLocaleDateString('zh-CN')}`
        );
        Alert.alert('已保存到知识库', '这条 AI 回复已经生成摘要和标签。');
      } catch {
        Alert.alert('保存失败', '请稍后再试。');
      }
    },
    [createNote]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Ionicons name="hardware-chip" size={19} color={colors.white} />
          </View>
          <View>
            <Text style={styles.brandName}>EdgeMind</Text>
            <Text style={styles.brandMeta}>LOCAL INTELLIGENCE</Text>
          </View>
        </View>

        <View style={styles.privacyBadge}>
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={colors.success}
          />
          <Text style={styles.privacyText}>数据留在本机</Text>
        </View>
      </View>

      <AIChat
        messages={messages}
        isThinking={isThinking}
        provider={provider}
        inferenceHistory={inferenceHistory}
        onSend={sendMessage}
        onClear={clearMessages}
        onSaveMessage={handleSaveToNotes}
        onSwitchProvider={(nextProvider: AIProvider) =>
          switchProvider(nextProvider)
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
  },
  brandName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandMeta: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: '#1B4B40',
  },
  privacyText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '600',
  },
});
