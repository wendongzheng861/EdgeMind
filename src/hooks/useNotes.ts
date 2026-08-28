// ============================================================
// EdgeMind — useNotes Hook
// 笔记管理状态层：CRUD + AI增强 + 搜索
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import type { Note, NoteStats } from '../types';
import { NoteRepository } from '../services/storage';
import { getAIService } from '../services/ai';
import { BackendApi } from '../services/backend';

interface UseNotesReturn {
  notes: Note[];
  stats: NoteStats | null;
  isLoading: boolean;
  searchQuery: string;

  loadNotes: () => Promise<void>;
  createNote: (content: string, title?: string) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;

  /** AI智能增强：自动生成摘要和标签 */
  aiEnhance: (note: Note) => Promise<Note>;
}

function noteAIService() {
  const mobileWeb =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (mobileWeb) return getAIService('webllm');
  if (Platform.OS === 'web' && BackendApi.isConfigured()) return getAIService('backend');
  return getAIService();
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allNotes, noteStats] = await Promise.all([
        NoteRepository.getAll(),
        NoteRepository.getStats(),
      ]);
      setNotes(allNotes);
      setStats(noteStats);
    } catch (error) {
      console.error('[EdgeMind] 加载笔记失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(
    async (content: string, title?: string): Promise<Note> => {
      const ai = noteAIService();

      // 后端模型未启动时仍要允许保存；摘要和标签降级为可解释的本地结果。
      let summary = content.split('\n').find(Boolean)?.slice(0, 80) || '新笔记';
      let tags = ['待整理'];
      try {
        [summary, tags] = await Promise.all([
          ai.summarize(content),
          ai.suggestTags(content),
        ]);
      } catch (error) {
        console.warn('[EdgeMind] AI 整理暂不可用，笔记将直接保存:', error);
      }

      const note = await NoteRepository.create({
        title: title || summary.slice(0, 30) || '新笔记',
        content,
        summary,
        tags,
        source: 'manual',
      });

      setNotes((prev) => [note, ...prev]);
      // 刷新统计
      NoteRepository.getStats().then(setStats);
      return note;
    },
    []
  );

  const updateNote = useCallback(
    async (id: string, updates: Partial<Note>) => {
      const updated = await NoteRepository.update(id, updates);
      if (updated) {
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? updated : n))
        );
        NoteRepository.getStats().then(setStats);
      }
    },
    []
  );

  const deleteNote = useCallback(async (id: string) => {
    await NoteRepository.delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    NoteRepository.getStats().then(setStats);
  }, []);

  const toggleStar = useCallback(async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      await updateNote(id, { starred: !note.starred });
    }
  }, [notes, updateNote]);

  const aiEnhance = useCallback(async (note: Note): Promise<Note> => {
    const ai = noteAIService();
    const [summary, tags] = await Promise.all([
      ai.summarize(note.content),
      ai.suggestTags(note.content),
    ]);

    const enhanced = await NoteRepository.update(note.id, {
      summary,
      tags,
    });

    if (enhanced) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? enhanced : n))
      );
      return enhanced;
    }
    return note;
  }, []);

  // 搜索过滤
  const filteredNotes = searchQuery
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.tags.some((t) => t.includes(searchQuery))
      )
    : notes;

  return {
    notes: filteredNotes,
    stats,
    isLoading,
    searchQuery,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    toggleStar,
    setSearchQuery,
    aiEnhance,
  };
}
