// ============================================================
// EdgeMind — AI对话主页
// 端侧AI对话 + 笔记一键保存
// ============================================================

import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AIChat from '../../src/components/AIChat';
import { useAI } from '../../src/hooks/useAI';
import { useNotes } from '../../src/hooks/useNotes';
import type { ChatMessage, AIProvider } from '../../src/types';

export default function ChatScreen() {
  const router = useRouter();
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

  // 长按消息存为笔记
  const handleSaveToNotes = useCallback(
    async (msg: ChatMessage) => {
      if (msg.role === 'user') return;
      try {
        await createNote(msg.content, `AI对话 - ${new Date().toLocaleDateString('zh-CN')}`);
        Alert.alert('✅ 已保存', 'AI回复已保存为笔记');
      } catch (error) {
        Alert.alert('❌ 保存失败', '请重试');
      }
    },
    [createNote]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <View style={styles.logoInner} />
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <View style={styles.badgeText}>
              <View style={styles.badgeTitle} />
              <View style={styles.badgeSub} />
            </View>
          </View>
        </View>
      </View>

      <AIChat
        messages={messages}
        isThinking={isThinking}
        provider={provider}
        inferenceHistory={inferenceHistory}
        onSend={sendMessage}
        onClear={clearMessages}
        onSwitchProvider={(p: AIProvider) => switchProvider(p)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: '#0a0a1a',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#fff',
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  badgeText: {
    gap: 2,
  },
  badgeTitle: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C63FF',
  },
  badgeSub: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
  },
});
