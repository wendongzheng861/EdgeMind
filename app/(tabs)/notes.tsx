// ============================================================
// EdgeMind — 笔记列表页
// 展示AI增强的笔记列表 + 搜索 + 统计
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NoteCard from '../../src/components/NoteCard';
import { useNotes } from '../../src/hooks/useNotes';
import type { Note } from '../../src/types';

export default function NotesScreen() {
  const router = useRouter();
  const {
    notes,
    stats,
    isLoading,
    searchQuery,
    createNote,
    deleteNote,
    toggleStar,
    setSearchQuery,
    aiEnhance,
  } = useNotes();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      await createNote(newNoteContent.trim());
      setNewNoteContent('');
      setShowCreateModal(false);
      Alert.alert('✅ 笔记已创建', 'AI已自动生成标题、摘要和标签');
    } catch (error) {
      Alert.alert('❌ 创建失败', '请重试');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>加载笔记中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <Text style={styles.title}>📝 笔记</Text>
        <View style={styles.headerActions}>
          {stats && (
            <Text style={styles.statsText}>
              {stats.totalNotes}条 · {stats.totalWords.toLocaleString()}字
            </Text>
          )}
        </View>
      </View>

      {/* 统计卡片 — 展示AI增强效果 */}
      {stats && stats.totalNotes > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalNotes}</Text>
            <Text style={styles.statLabel}>笔记数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.averageLength}</Text>
            <Text style={styles.statLabel}>平均字数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🔥{stats.streakDays}</Text>
            <Text style={styles.statLabel}>连续天数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.topTags.length > 0 ? stats.topTags[0] : '-'}
            </Text>
            <Text style={styles.statLabel}>最热标签</Text>
          </View>
        </View>
      )}

      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索笔记、标签..."
          placeholderTextColor="#666"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 笔记列表 */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={(note) => router.push(`/note/${note.id}` as any)}
            onStar={(note: Note) => toggleStar(note.id)}
            onDelete={(note: Note) => {
              Alert.alert('删除笔记', '确定要删除这条笔记吗？', [
                { text: '取消', style: 'cancel' },
                {
                  text: '删除',
                  style: 'destructive',
                  onPress: () => deleteNote(note.id),
                },
              ]);
            }}
          />
        )}
        contentContainerStyle={styles.noteList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#333" />
            <Text style={styles.emptyTitle}>还没有笔记</Text>
            <Text style={styles.emptySubtitle}>
              💡 在AI对话中保存回复，或点击下方按钮创建
            </Text>
          </View>
        }
      />

      {/* 创建笔记按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* 创建笔记弹窗 */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>📝 新建笔记</Text>
            <Text style={styles.modalHint}>
              AI将自动生成标题、摘要和标签 ✨
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              placeholder="输入笔记内容..."
              placeholderTextColor="#666"
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewNoteContent('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  !newNoteContent.trim() && styles.modalConfirmDisabled,
                ]}
                onPress={handleCreateNote}
                disabled={!newNoteContent.trim()}
              >
                <Text style={styles.modalConfirmText}>AI 创建 ✨</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  loadingText: {
    color: '#666',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
  },
  title: {
    color: '#e0e0e0',
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: '#666',
    fontSize: 13,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#12122a',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a3e',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#e0e0e0',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1a1a3e',
    alignSelf: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 14,
    marginLeft: 8,
  },
  noteList: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#12122a',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: '#1a1a3e',
  },
  modalTitle: {
    color: '#e0e0e0',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalHint: {
    color: '#6C63FF',
    fontSize: 13,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#e0e0e0',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  modalCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 15,
  },
  modalConfirm: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
