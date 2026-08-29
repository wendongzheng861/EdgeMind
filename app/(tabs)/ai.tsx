import React, { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AIChat from '../../src/components/AIChat';
import AppHeader from '../../src/components/AppHeader';
import { useAI } from '../../src/hooks/useAI';
import { useNotes } from '../../src/hooks/useNotes';
import type { ChatMessage, AIProvider } from '../../src/types';
import { colors } from '../../src/theme';

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
        await createNote(message.content, `AI 洞察 · ${new Date().toLocaleDateString('zh-CN')}`);
        Alert.alert('已保存到知识库', '这条 AI 回复已经生成摘要和标签。');
      } catch {
        Alert.alert('保存失败', '请稍后再试。');
      }
    },
    [createNote]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerWrap}>
        <AppHeader
          eyebrow="CONTEXTUAL AI"
          title="与知识一起思考"
          subtitle="问笔记、拆任务、延展项目"
        />
      </View>
      <AIChat
        messages={messages}
        isThinking={isThinking}
        provider={provider}
        inferenceHistory={inferenceHistory}
        onSend={sendMessage}
        onClear={clearMessages}
        onSaveMessage={handleSaveToNotes}
        onSwitchProvider={(nextProvider: AIProvider) => switchProvider(nextProvider)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerWrap: {
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
