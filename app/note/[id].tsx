// ============================================================
// EdgeMind — 笔记详情页
// 展示AI增强后的笔记详情，支持编辑和AI重新增强
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NoteRepository } from '../../src/services/storage';
import { useNotes } from '../../src/hooks/useNotes';
import type { Note } from '../../src/types';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { aiEnhance } = useNotes();

  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    if (!id) return;
    setIsLoading(true);
    const n = await NoteRepository.getById(id);
    setNote(n);
    if (n) {
      setEditTitle(n.title);
      setEditContent(n.content);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!note || !id) return;
    await NoteRepository.update(id, { title: editTitle, content: editContent });
    setIsEditing(false);
    loadNote();
    Alert.alert('✅ 已保存');
  };

  const handleAIEnhance = async () => {
    if (!note) return;
    setIsEnhancing(true);
    try {
      const enhanced = await aiEnhance(note);
      setNote(enhanced);
      setEditTitle(enhanced.title);
      setEditContent(enhanced.content);
      Alert.alert('✨ 已增强', `AI 已重新生成摘要和标签`);
    } catch (error) {
      Alert.alert('❌ 增强失败', '请重试');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !id) return;
    Alert.alert('删除笔记', '确定要删除这条笔记吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await NoteRepository.delete(id);
          router.back();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>笔记未找到</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 操作栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#e0e0e0" />
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAIEnhance}
            disabled={isEnhancing}
          >
            {isEnhancing ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Ionicons name="bulb" size={20} color="#6C63FF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Ionicons
              name={isEditing ? 'checkmark-circle' : 'create-outline'}
              size={20}
              color="#4CAF50"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* 标题 */}
        {isEditing ? (
          <TextInput
            style={styles.editTitle}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholderTextColor="#666"
          />
        ) : (
          <Text style={styles.title}>{note.title}</Text>
        )}

        {/* AI摘要 */}
        {note.summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="bulb" size={16} color="#6C63FF" />
              <Text style={styles.summaryLabel}>AI 摘要</Text>
            </View>
            <Text style={styles.summaryText}>{note.summary}</Text>
          </View>
        ) : null}

        {/* 标签 */}
        {note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            <View style={styles.tag}>
              <Ionicons name="time-outline" size={12} color="#888" />
              <Text style={[styles.tagText, { color: '#888' }]}>
                {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
              </Text>
            </View>
          </View>
        )}

        {/* 内容 */}
        {isEditing ? (
          <TextInput
            style={styles.editContent}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            placeholderTextColor="#666"
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.content} selectable>
            {note.content}
          </Text>
        )}

        {/* 元信息 */}
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            来源: {note.source === 'voice' ? '语音' : note.source === 'ai_chat' ? 'AI对话' : note.source === 'summary' ? '摘要' : '手动'}
          </Text>
          <Text style={styles.metaText}>
            字数: {note.content.length}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: '#0a0a1a',
  },
  backButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#e0e0e0',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 32,
  },
  editTitle: {
    color: '#e0e0e0',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#6C63FF',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  summaryLabel: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    flexDirection: 'row',
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    alignItems: 'center',
  },
  tagText: {
    color: '#6C63FF',
    fontSize: 12,
  },
  content: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  editContent: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 26,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    minHeight: 200,
    marginBottom: 20,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    paddingTop: 12,
  },
  metaText: {
    color: '#666',
    fontSize: 12,
  },
});
