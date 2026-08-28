// ============================================================
// EdgeMind — useAI Hook
// 封装端侧AI对话的完整生命周期
// 展示：Hooks模式 + 端侧推理状态管理
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { ChatMessage, AIProvider } from '../types';
import { AI_PROVIDER_LABELS } from '../types';
import { getAIService, type IEdgeAIService } from '../services/ai';
import { v4 as uuid } from 'uuid';
import { BackendApi } from '../services/backend';

interface UseAIReturn {
  messages: ChatMessage[];
  isThinking: boolean;
  provider: AIProvider;
  inferenceHistory: { avgMs: number; totalCalls: number };
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  switchProvider: (provider: AIProvider) => void;
}

function isMobileWeb(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
}

function defaultProvider(): AIProvider {
  if (Platform.OS !== 'web') return 'llamacpp';
  return 'webllm';
}

export function useAI(initialProvider: AIProvider = defaultProvider()): UseAIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(initialProvider);
  const aiRef = useRef<IEdgeAIService>(getAIService(initialProvider));

  // 仅在浏览器/原生界面挂载后预热模型，避免静态 Web 导出阶段误触发 WebGPU 检查。
  useEffect(() => {
    const runtimeProvider =
      Platform.OS === 'web' && !isMobileWeb() && BackendApi.isConfigured()
        ? 'backend'
        : initialProvider;
    if (runtimeProvider !== provider) {
      setProvider(runtimeProvider);
      aiRef.current = getAIService(runtimeProvider);
    }
    void aiRef.current.load({}).catch(() => {
      // WebLLM 会把可恢复状态同步到界面；发送消息时仍会给出完整错误说明。
    });
  }, [initialProvider]);

  // 推理性能统计
  const statsRef = useRef({ totalMs: 0, totalCalls: 0 });

  const inferenceHistory = {
    avgMs: statsRef.current.totalCalls > 0
      ? Math.round(statsRef.current.totalMs / statsRef.current.totalCalls)
      : 0,
    totalCalls: statsRef.current.totalCalls,
  };

  // 切换AI后端
  const switchProvider = useCallback((requestedProvider: AIProvider) => {
    // 手机上的 llama.cpp 只会请求电脑的 127.0.0.1；固定使用浏览器内的 WebLLM，
    // 避免误选桌面 7B 后出现无法连接本机服务的错误。
    const newProvider =
      isMobileWeb() && requestedProvider !== 'webllm'
        ? 'webllm'
        : requestedProvider;

    setProvider(newProvider);
    aiRef.current = getAIService(newProvider);
    void aiRef.current.load({}).catch(() => {
      // Provider 自身负责显示加载状态；真正发送时保留错误反馈。
    });
    statsRef.current = { totalMs: 0, totalCalls: 0 };

    setMessages((prev) => [
      ...prev,
        {
          id: uuid(),
          role: 'system',
          content: `推理引擎已切换为 ${AI_PROVIDER_LABELS[newProvider]}`,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const currentMessages = [...messages, userMsg];
      const reply = await aiRef.current.chat(currentMessages);

      if (reply.inferenceMs) {
        statsRef.current.totalMs += reply.inferenceMs;
        statsRef.current.totalCalls += 1;
      }

      setMessages((prev) => [...prev, reply]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: 'assistant',
          content: '端侧推理暂时没有完成，请重试。\n\n错误信息：' + (error instanceof Error ? error.message : '未知错误'),
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, [messages, isThinking]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    statsRef.current = { totalMs: 0, totalCalls: 0 };
  }, []);

  return {
    messages,
    isThinking,
    provider,
    inferenceHistory,
    sendMessage,
    clearMessages,
    switchProvider,
  };
}
