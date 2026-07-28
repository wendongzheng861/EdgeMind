import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage, AIProvider } from '../types';
import { AI_PROVIDER_LABELS } from '../types';
import { colors, radius, shadows } from '../theme';
import { useWebLLMStatus } from '../services/webllmStatus';

interface AIChatProps {
  messages: ChatMessage[];
  isThinking: boolean;
  provider: AIProvider;
  inferenceHistory: { avgMs: number; totalCalls: number };
  onSend: (text: string) => void;
  onClear: () => void;
  onSaveMessage: (message: ChatMessage) => void;
  onSwitchProvider: (provider: AIProvider) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const QUICK_PROMPTS: Array<{
  icon: IoniconName;
  title: string;
  description: string;
  prompt: string;
}> = [
  {
    icon: 'sparkles-outline',
    title: '整理今天的想法',
    description: '把碎片变成行动清单',
    prompt: '帮我把今天的想法整理成一份有优先级的行动清单。',
  },
  {
    icon: 'hardware-chip-outline',
    title: '解释端侧 AI',
    description: '从产品价值讲清技术',
    prompt: '用产品经理也能听懂的方式解释端侧 AI 的价值。',
  },
  {
    icon: 'layers-outline',
    title: '设计笔记结构',
    description: '快速搭建知识框架',
    prompt: '帮我设计一个适合项目复盘的笔记结构。',
  },
];

const PROVIDERS: Array<{
  id: AIProvider;
  description: string;
  available: boolean;
}> = [
  { id: 'llamacpp', description: '已接入 · Qwen2.5 7B Q4_K_M', available: true },
  { id: 'mock', description: '可用 · 本地演示逻辑', available: true },
  { id: 'onnx', description: '接口已预留 · 待接入模型', available: false },
  { id: 'mnn', description: '接口已预留 · 待接入模型', available: false },
  { id: 'webllm', description: '已接入 · Qwen2.5 0.5B · WebGPU', available: true },
];

function isMobileBrowser(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
}

export default function AIChat({
  messages,
  isThinking,
  provider,
  inferenceHistory,
  onSend,
  onClear,
  onSaveMessage,
  onSwitchProvider,
}: AIChatProps) {
  const [input, setInput] = useState('');
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const webllmStatus = useWebLLMStatus();
  const isMobileWeb = isMobileBrowser();
  const visibleProviders = isMobileWeb
    ? PROVIDERS.filter((item) => item.id === 'webllm')
    : PROVIDERS;
  const isWebLLM = provider === 'webllm';
  const offlineProgress = Math.round(webllmStatus.progress * 100);
  const offlinePill =
    webllmStatus.phase === 'ready'
      ? 'OFFLINE READY'
      : webllmStatus.phase === 'unsupported'
        ? '需要 WEBGPU'
        : webllmStatus.phase === 'error'
          ? '需要重试'
          : `${offlineProgress}% 下载中`;

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        120
      );
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSend = (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || isThinking) return;

    onSend(text);
    setInput('');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Ionicons name="information-circle" size={14} color={colors.cyan} />
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantHeader}>
            <View style={styles.assistantIdentity}>
              <View style={styles.assistantIcon}>
                <Ionicons
                  name="hardware-chip"
                  size={13}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.assistantLabel}>EdgeMind</Text>
            </View>

            <View style={styles.messageActions}>
              {item.inferenceMs ? (
                <View style={styles.inferenceBadge}>
                  <Ionicons name="flash" size={10} color={colors.success} />
                  <Text style={styles.inferenceText}>
                    {item.inferenceMs} ms
                    {item.tokensPerSecond
                      ? ` · ${item.tokensPerSecond.toFixed(1)} tok/s`
                      : ''}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="保存这条 AI 回复"
                style={styles.saveMessageButton}
                onPress={() => onSaveMessage(item)}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={15}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.messageText, isUser && styles.userText]} selectable>
          {item.content}
        </Text>
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.engineBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isMobileWeb ? '手机离线推理引擎' : '选择推理引擎'}
          disabled={isMobileWeb}
          style={styles.providerButton}
          onPress={() => setShowProviderMenu((visible) => !visible)}
        >
          <View style={styles.engineDot} />
          <View>
            <Text style={styles.engineLabel}>推理引擎</Text>
            <Text style={styles.providerText}>{AI_PROVIDER_LABELS[provider]}</Text>
          </View>
          {!isMobileWeb && (
            <Ionicons
              name={showProviderMenu ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.muted}
            />
          )}
        </TouchableOpacity>

        <View style={styles.engineRight}>
          {inferenceHistory.totalCalls > 0 ? (
            <View style={styles.sessionStats}>
              <Ionicons name="pulse" size={14} color={colors.cyan} />
              <Text style={styles.sessionStatsText}>
                均值 {inferenceHistory.avgMs} ms
              </Text>
            </View>
          ) : isWebLLM ? (
            <View style={styles.demoPill}>
              <Text style={styles.demoPillText}>
                {offlinePill}
              </Text>
            </View>
          ) : (
            <View style={styles.demoPill}>
              <Text style={styles.demoPillText}>
                {provider === 'llamacpp' ? 'LOCAL MODEL' : 'DEMO MODE'}
              </Text>
            </View>
          )}

          {messages.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="清空对话"
              style={styles.iconButton}
              onPress={onClear}
            >
              <Ionicons name="refresh" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showProviderMenu && !isMobileWeb && (
        <View style={styles.providerMenu}>
          <View style={styles.providerMenuHeader}>
            <Text style={styles.providerMenuTitle}>推理后端</Text>
            <Text style={styles.providerMenuHint}>桌面可切换本机 Qwen 与浏览器离线 Qwen</Text>
          </View>
          {visibleProviders.map((item) => (
            <TouchableOpacity
              key={item.id}
              accessibilityRole="button"
              disabled={!item.available}
              style={[
                styles.providerOption,
                item.id === provider && styles.providerOptionActive,
                !item.available && styles.providerOptionDisabled,
              ]}
              onPress={() => {
                onSwitchProvider(item.id);
                setShowProviderMenu(false);
              }}
            >
              <View style={styles.providerOptionIcon}>
                <Ionicons
                  name="hardware-chip-outline"
                  size={17}
                  color={
                    item.id === provider ? colors.primary : colors.textSecondary
                  }
                />
              </View>
              <View style={styles.providerOptionCopy}>
                <Text
                  style={[
                    styles.providerOptionTitle,
                    item.id === provider && styles.providerOptionTitleActive,
                  ]}
                >
                  {AI_PROVIDER_LABELS[item.id]}
                </Text>
                <Text style={styles.providerOptionDescription}>
                  {item.description}
                </Text>
              </View>
              {item.id === provider ? (
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={colors.primary}
                />
              ) : (
                <Text style={styles.providerOptionStatus}>
                  {item.available ? '可用' : '待接入'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.emptyMessageList,
        ]}
        ListEmptyComponent={
          <WelcomeExperience
            provider={provider}
            onSelectPrompt={(prompt) => handleSend(prompt)}
          />
        }
        ListFooterComponent={
          isThinking ? (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.thinkingText}>正在本机生成回答</Text>
                <View style={styles.privateThinkingBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.success} />
                  <Text style={styles.privateThinkingText}>不上传</Text>
                </View>
              </View>
            </View>
          ) : null
        }
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="输入消息"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="把一个想法交给本机 AI…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            onSubmitEditing={() => handleSend()}
            blurOnSubmit
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="发送消息"
            style={[
              styles.sendButton,
              (!input.trim() || isThinking) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isThinking}
          >
            {isThinking ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.composerMeta}>
          <Ionicons name="lock-closed" size={10} color={colors.muted} />
          <Text style={styles.composerMetaText}>
            {provider === 'llamacpp'
              ? '内容仅发送到 127.0.0.1 本机模型服务'
              : provider === 'webllm'
                ? '首次下载后，模型和推理都保留在此设备'
                : '内容仅用于当前设备上的演示推理'}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function WelcomeExperience({
  provider,
  onSelectPrompt,
}: {
  provider: AIProvider;
  onSelectPrompt: (prompt: string) => void;
}) {
  const isLlamaCpp = provider === 'llamacpp';
  const isWebLLM = provider === 'webllm';
  const webllmStatus = useWebLLMStatus();
  const offlineProgress = Math.round(webllmStatus.progress * 100);

  return (
    <View style={styles.welcome}>
      <View style={styles.eyebrow}>
        <Ionicons name="shield-checkmark" size={13} color={colors.success} />
        <Text style={styles.eyebrowText}>PRIVATE BY DESIGN</Text>
      </View>

      <Text style={styles.welcomeTitle}>想法进来，{'\n'}数据不出去。</Text>
      <Text style={styles.welcomeSubtitle}>
        在设备上完成整理、总结与灵感延展。无账号、无上传，也能把思绪变成知识。
      </Text>

      <View style={styles.localStatusCard}>
        <View style={styles.localStatusTop}>
          <View style={styles.localStatusIcon}>
            <Ionicons name="hardware-chip" size={19} color={colors.cyan} />
          </View>
          <View style={styles.localStatusCopy}>
            <Text style={styles.localStatusTitle}>
              {isLlamaCpp
                ? '本机 Qwen 模型已选择'
                : isWebLLM
                  ? webllmStatus.phase === 'ready'
                    ? '手机离线模型已就绪'
                    : webllmStatus.phase === 'unsupported'
                      ? 'Safari 需要开启 WebGPU'
                      : webllmStatus.phase === 'error'
                        ? '手机离线模型未能准备完成'
                        : '正在准备手机离线模型'
                  : '本机推理通道已就绪'}
            </Text>
            <Text style={styles.localStatusDescription}>
              {isLlamaCpp
                ? 'Qwen2.5 7B · GGUF · llama.cpp'
                : isWebLLM
                  ? webllmStatus.detail
                  : '当前运行 Demo Engine，不会请求云端模型'}
            </Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.localMetrics}>
          <View style={styles.localMetric}>
            <Text style={styles.localMetricValue}>0</Text>
            <Text style={styles.localMetricLabel}>云端请求</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.localMetric}>
            <Text style={styles.localMetricValue}>
              {isLlamaCpp ? 'Q4_K_M' : isWebLLM ? '0.5B' : '本机'}
            </Text>
            <Text style={styles.localMetricLabel}>
              {isLlamaCpp ? '量化精度' : isWebLLM ? 'Q4 量化' : '数据存储'}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.localMetric}>
            <Text style={styles.localMetricValue}>
              {isLlamaCpp ? '本机 GPU' : isWebLLM ? `${offlineProgress}%` : '可离线'}
            </Text>
            <Text style={styles.localMetricLabel}>
              {isLlamaCpp ? '推理设备' : isWebLLM ? '模型准备' : '演示模式'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.promptHeader}>
        <Text style={styles.promptHeaderTitle}>从一个问题开始</Text>
        <Text style={styles.promptHeaderMeta}>轻触即用</Text>
      </View>

      <View style={styles.promptList}>
        {QUICK_PROMPTS.map((item) => (
          <TouchableOpacity
            key={item.title}
            accessibilityRole="button"
            style={styles.promptCard}
            onPress={() => onSelectPrompt(item.prompt)}
          >
            <View style={styles.promptIcon}>
              <Ionicons name={item.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.promptCopy}>
              <Text style={styles.promptTitle}>{item.title}</Text>
              <Text style={styles.promptDescription}>{item.description}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  engineBar: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
  },
  engineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  engineLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  providerText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  engineRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  demoPillText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.cyanSoft,
  },
  sessionStatsText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerMenu: {
    position: 'absolute',
    top: 62,
    left: 14,
    right: 14,
    zIndex: 20,
    padding: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...shadows.card,
  },
  providerMenuHeader: {
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerMenuTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  providerMenuHint: {
    color: colors.muted,
    fontSize: 9,
  },
  providerOption: {
    minHeight: 58,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerOptionActive: {
    backgroundColor: colors.primarySoft,
  },
  providerOptionDisabled: {
    opacity: 0.62,
  },
  providerOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  providerOptionCopy: {
    flex: 1,
    marginLeft: 10,
  },
  providerOptionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  providerOptionTitleActive: {
    color: colors.text,
  },
  providerOptionDescription: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
  },
  providerOptionStatus: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '600',
  },
  messageList: {
    padding: 16,
    paddingBottom: 18,
  },
  emptyMessageList: {
    flexGrow: 1,
  },
  welcome: {
    flex: 1,
    paddingTop: 18,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  eyebrowText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  welcomeTitle: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '800',
    letterSpacing: -1.3,
    marginTop: 17,
  },
  welcomeSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 11,
    maxWidth: 350,
  },
  localStatusCard: {
    marginTop: 22,
    padding: 15,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  localStatusTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  localStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyanSoft,
  },
  localStatusCopy: {
    flex: 1,
    marginLeft: 11,
  },
  localStatusTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  localStatusDescription: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  localMetrics: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
  },
  localMetric: {
    flex: 1,
    alignItems: 'center',
  },
  localMetricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  localMetricLabel: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: 29,
    backgroundColor: colors.border,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 23,
    marginBottom: 10,
  },
  promptHeaderTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  promptHeaderMeta: {
    color: colors.muted,
    fontSize: 10,
  },
  promptList: {
    gap: 8,
    paddingBottom: 8,
  },
  promptCard: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  promptCopy: {
    flex: 1,
    marginLeft: 11,
  },
  promptTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  promptDescription: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 19,
    padding: 13,
    marginBottom: 13,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryStrong,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  assistantIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  assistantLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inferenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  inferenceText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: '700',
  },
  saveMessageButton: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: colors.white,
  },
  timestamp: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 7,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'right',
  },
  systemMessage: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.cyanSoft,
    marginBottom: 12,
  },
  systemText: {
    color: colors.cyan,
    fontSize: 10,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  privateThinkingBadge: {
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  privateThinkingText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: '700',
  },
  composerWrap: {
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composer: {
    minHeight: 52,
    maxHeight: 118,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
    maxHeight: 96,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
    ...shadows.glow,
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  composerMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  composerMetaText: {
    color: colors.muted,
    fontSize: 9,
  },
});
