import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NoteCard from '../../src/components/NoteCard';
import { useNotes } from '../../src/hooks/useNotes';
import { useBackendStatus } from '../../src/hooks/useBackendStatus';
import type { Note } from '../../src/types';
import { colors, radius, shadows } from '../../src/theme';

type NoteFilter = 'all' | 'starred' | 'ai';

const FILTERS: Array<{ id: NoteFilter; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { id: 'all', label: '全部', icon: 'albums-outline' },
  { id: 'starred', label: '收藏', icon: 'star-outline' },
  { id: 'ai', label: 'AI 生成', icon: 'sparkles-outline' },
];

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
  } = useNotes();
  const backend = useBackendStatus();

  const [filter, setFilter] = useState<NoteFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  const visibleNotes = useMemo(() => {
    if (filter === 'starred') return notes.filter((note) => note.starred);
    if (filter === 'ai') return notes.filter((note) => note.source === 'ai_chat');
    return notes;
  }, [filter, notes]);

  const closeComposer = () => {
    setShowCreateModal(false);
    setNewNoteContent('');
  };

  const handleCreateNote = async () => {
    const content = newNoteContent.trim();
    if (!content) return;

    try {
      await createNote(content);
      closeComposer();
      Alert.alert(
        '笔记已创建',
        backend.phase === 'online'
          ? '数据已写入 EdgeMind 后端，并保留浏览器离线副本。'
          : '后端不可用，数据已安全写入浏览器离线缓存。'
      );
    } catch {
      Alert.alert('创建失败', '请稍后再试。');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
        <Text style={styles.loadingTitle}>正在打开知识库</Text>
        <Text style={styles.loadingText}>
          {backend.phase === 'online' ? '正在从 EdgeMind API 同步' : '正在读取离线缓存'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PRIVATE KNOWLEDGE</Text>
          <Text style={styles.title}>知识库</Text>
          <Text style={styles.subtitle}>
            {stats?.totalNotes ?? 0} 条想法 ·{' '}
            {backend.phase === 'online' ? '后端已同步' : '离线缓存'}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="新建笔记"
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={23} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleNotes}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={(note) => router.push(`/note/${note.id}` as any)}
            onStar={(note) => toggleStar(note.id)}
            onDelete={(note) => {
              Alert.alert('删除这条笔记？', '删除后无法恢复。', [
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
        ListHeaderComponent={
          <>
            <View style={styles.statsCard}>
              <StatItem
                icon="documents-outline"
                value={`${stats?.totalNotes ?? 0}`}
                label="笔记"
                color={colors.primary}
              />
              <View style={styles.statDivider} />
              <StatItem
                icon="text-outline"
                value={`${stats?.totalWords ?? 0}`}
                label="字数"
                color={colors.cyan}
              />
              <View style={styles.statDivider} />
              <StatItem
                icon="flame-outline"
                value={`${stats?.streakDays ?? 0}`}
                label="连续天数"
                color={colors.warning}
              />
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel="搜索笔记"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="搜索标题、正文或标签"
                placeholderTextColor={colors.muted}
              />
              {searchQuery ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="清空搜索"
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.localSearchBadge,
                    backend.phase === 'online' && styles.backendSearchBadge,
                  ]}
                >
                  <Ionicons
                    name={backend.phase === 'online' ? 'server-outline' : 'phone-portrait'}
                    size={10}
                    color={backend.phase === 'online' ? colors.cyan : colors.success}
                  />
                  <Text
                    style={[
                      styles.localSearchText,
                      backend.phase === 'online' && styles.backendSearchText,
                    ]}
                  >
                    {backend.phase === 'online' ? 'API' : '离线'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.filters}>
              {FILTERS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  accessibilityRole="button"
                  style={[
                    styles.filterButton,
                    filter === item.id && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilter(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={filter === item.id ? colors.text : colors.muted}
                  />
                  <Text
                    style={[
                      styles.filterText,
                      filter === item.id && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.listTitleRow}>
              <Text style={styles.listTitle}>最近更新</Text>
              <Text style={styles.resultCount}>{visibleNotes.length} 条</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>没有找到匹配的笔记</Text>
            <Text style={styles.emptySubtitle}>换个关键词，或切回“全部”看看。</Text>
          </View>
        }
      />

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={closeComposer}
      >
        <KeyboardAvoidingView
          style={styles.modalScreen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeComposer} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>记录一个想法</Text>
                <Text style={styles.modalHint}>标题、摘要与标签将在本机生成</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="关闭"
                style={styles.modalClose}
                onPress={closeComposer}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              accessibilityLabel="笔记内容"
              style={styles.modalInput}
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              placeholder="写下会议结论、灵感，或一段还没整理好的思路…"
              placeholderTextColor={colors.muted}
              multiline
              autoFocus
            />

            <View style={styles.privacyNotice}>
              <Ionicons name="lock-closed" size={12} color={colors.success} />
              <Text style={styles.privacyNoticeText}>
                {backend.phase === 'online'
                  ? '写入本机 API，并保留离线副本'
                  : '仅写入当前浏览器缓存'}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.createButton,
                !newNoteContent.trim() && styles.createButtonDisabled,
              ]}
              onPress={handleCreateNote}
              disabled={!newNoteContent.trim()}
            >
              <Ionicons name="sparkles" size={16} color={colors.white} />
              <Text style={styles.createButtonText}>智能整理并保存</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function StatItem({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  header: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 5,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
    ...shadows.glow,
  },
  noteList: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 26,
  },
  statsCard: {
    paddingVertical: 14,
    borderRadius: radius.lg,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 5,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    alignSelf: 'center',
    backgroundColor: colors.border,
  },
  searchBar: {
    height: 48,
    paddingHorizontal: 13,
    marginTop: 14,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    marginLeft: 9,
  },
  localSearchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  localSearchText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: '700',
  },
  backendSearchBadge: {
    backgroundColor: colors.cyanSoft,
  },
  backendSearchText: {
    color: colors.cyan,
  },
  filters: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 11,
  },
  filterButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: '#443C74',
  },
  filterText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.text,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  listTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  resultCount: {
    color: colors.muted,
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 54,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 15,
  },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },
  modalScreen: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalCard: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  modalHeaderCopy: {
    flex: 1,
    marginLeft: 11,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  modalHint: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  modalInput: {
    minHeight: 150,
    padding: 15,
    marginTop: 17,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyNotice: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  privacyNoticeText: {
    color: colors.success,
    fontSize: 10,
  },
  createButton: {
    height: 50,
    marginTop: 16,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primaryStrong,
  },
  createButtonDisabled: {
    backgroundColor: colors.borderStrong,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
