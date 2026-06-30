// ============================================================
// EdgeMind — useAI Hook
// 封装端侧AI对话的完整生命周期
// 展示：Hooks模式 + 端侧推理状态管理
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, AIProvider } from '../types';
import { getAIService, type IEdgeAIService } from '../services/ai';
import { v4 as uuid } from 'uuid';

interface UseAIReturn {
  messages: ChatMessage[];
  isThinking: boolean;
  provider: AIProvider;
  inferenceHistory: { avgMs: number; totalCalls: number };
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  switchProvider: (provider: AIProvider) => void;
}

export function useAI(initialProvider: AIProvider = 'mock'): UseAIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-welcome',
      role: 'assistant',
      content: '你好！我是 EdgeMind 端侧AI助手 🧠\n\n所有推理都在你的设备上本地运行，数据不会离开你的手机。\n\n试试问我关于笔记管理、AI技术或任何问题！',
      timestamp: Date.now(),
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(initialProvider);
  const aiRef = useRef<IEdgeAIService>(getAIService(initialProvider));

  // 推理性能统计
  const statsRef = useRef({ totalMs: 0, totalCalls: 0 });

  const inferenceHistory = {
    avgMs: statsRef.current.totalCalls > 0
      ? Math.round(statsRef.current.totalMs / statsRef.current.totalCalls)
      : 0,
    totalCalls: statsRef.current.totalCalls,
  };

  // 切换AI后端
  const switchProvider = useCallback((newProvider: AIProvider) => {
    setProvider(newProvider);
    aiRef.current = getAIService(newProvider);
    statsRef.current = { totalMs: 0, totalCalls: 0 };

    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: 'system',
        content: `🔄 已切换到 ${newProvider === 'mock' ? '演示模式' : newProvider.toUpperCase()} 推理引擎`,
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
          content: '⚠️ 端侧推理出错，请重试。\n\n错误信息：' + (error instanceof Error ? error.message : '未知错误'),
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, [messages, isThinking]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: uuid(),
        role: 'assistant',
        content: '🧹 对话已清空，开始新话题吧！',
        timestamp: Date.now(),
      },
    ]);
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
