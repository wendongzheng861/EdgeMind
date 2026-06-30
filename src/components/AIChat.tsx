// ============================================================
// EdgeMind — AIChat 组件
// 端侧AI对话面板：流式对话 + 推理性能展示 + Provider切换
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage, AIProvider } from '../types';
import { AI_PROVIDER_LABELS } from '../types';

interface AIChatProps {
  messages: ChatMessage[];
  isThinking: boolean;
  provider: AIProvider;
  inferenceHistory: { avgMs: number; totalCalls: number };
  onSend: (text: string) => void;
  onClear: () => void;
  onSwitchProvider: (provider: AIProvider) => void;
}

export default function AIChat({
  messages,
  isThinking,
  provider,
  inferenceHistory,
  onSend,
  onClear,
  onSwitchProvider,
}: AIChatProps) {
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [showProviderMenu, setShowProviderMenu] = useState(false);

  // 新消息时自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (text && !isThinking) {
      onSend(text);
      setInput('');
    }
  };

  const providers: AIProvider[] = ['mock', 'onnx', 'mnn', 'webllm'];

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser
            ? styles.userBubble
            : isSystem
            ? styles.systemBubble
            : styles.assistantBubble,
        ]}
      >
        {!isUser && !isSystem && (
          <View style={styles.assistantHeader}>
            <Ionicons name="bulb" size={16} color="#6C63FF" />
            <Text style={styles.assistantLabel}>EdgeMind AI</Text>
            {item.inferenceMs && (
              <View style={styles.inferenceBadge}>
                <Text style={styles.inferenceText}>
                  {item.inferenceMs}ms
                </Text>
              </View>
            )}
          </View>
        )}
        <Text
          style={[
            styles.messageText,
            isUser && styles.userText,
            isSystem && styles.systemText,
          ]}
          selectable
        >
          {item.content}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* 顶部栏：Provider信息 + 操作 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.providerBadge}
          onPress={() => setShowProviderMenu(!showProviderMenu)}
        >
          <Ionicons name="hardware-chip" size={14} color="#6C63FF" />
          <Text style={styles.providerText}>
            {AI_PROVIDER_LABELS[provider]}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#888" />
        </TouchableOpacity>

        {inferenceHistory.totalCalls > 0 && (
          <Text style={styles.statsText}>
            ⚡ 平均 {inferenceHistory.avgMs}ms · {inferenceHistory.totalCalls}次推理
          </Text>
        )}

        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      {/* Provider切换菜单 */}
      {showProviderMenu && (
        <View style={styles.providerMenu}>
          {providers.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.providerOption,
                p === provider && styles.providerOptionActive,
              ]}
              onPress={() => {
                onSwitchProvider(p);
                setShowProviderMenu(false);
              }}
            >
              <Text
                style={[
                  styles.providerOptionText,
                  p === provider && styles.providerOptionTextActive,
                ]}
              >
                {AI_PROVIDER_LABELS[p]}
              </Text>
              {p === provider && (
                <Ionicons name="checkmark-circle" size={16} color="#6C63FF" />
              )}
            </TouchableOpacity>
          ))}
          <Text style={styles.providerHint}>
            💡 当前为演示模式(Mock)，接入真实模型后选择对应后端
          </Text>
        </View>
      )}

      {/* 消息列表 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* 输入区域 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="输入消息，与端侧AI对话..."
          placeholderTextColor="#666"
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isThinking) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isThinking}
        >
          {isThinking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    gap: 8,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  providerText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  statsText: {
    color: '#666',
    fontSize: 11,
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  providerMenu: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  providerOptionActive: {
    backgroundColor: '#2a1a4e',
  },
  providerOptionText: {
    color: '#ccc',
    fontSize: 14,
  },
  providerOptionTextActive: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  providerHint: {
    color: '#666',
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  messageList: {
    padding: 16,
  },
  messageBubble: {
    marginBottom: 12,
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: '#1a2a1e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '90%',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  assistantLabel: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '600',
  },
  inferenceBadge: {
    backgroundColor: '#2a1a3e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  inferenceText: {
    color: '#6C63FF',
    fontSize: 10,
    fontWeight: '500',
  },
  messageText: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  systemText: {
    color: '#4CAF50',
    fontSize: 13,
    textAlign: 'center',
  },
  timestamp: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    backgroundColor: '#0a0a1a',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#e0e0e0',
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#6C63FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#3a3a5e',
  },
});
