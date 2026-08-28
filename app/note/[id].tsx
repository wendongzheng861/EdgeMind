import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NoteRepository } from '../../src/services/storage';
import { useNotes } from '../../src/hooks/useNotes';
import { useBackendStatus } from '../../src/hooks/useBackendStatus';
import type { Note } from '../../src/types';
import { colors, radius } from '../../src/theme';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { aiEnhance } = useNotes();
  const backend = useBackendStatus();

  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadNote();
  }, [id]);

  const loadNote = async () => {
    if (!id) return;

    setIsLoading(true);
    const loadedNote = await NoteRepository.getById(id);
    setNote(loadedNote);
    if (loadedNote) {
      setEditTitle(loadedNote.title);
      setEditContent(loadedNote.content);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!note || !id || !editTitle.trim()) return;

    await NoteRepository.update(id, {
      title: editTitle.trim(),
      content: editContent.trim(),
    });
    setIsEditing(false);
    await loadNote();
  };

  const handleAIEnhance = async () => {
    if (!note) return;

    setIsEnhancing(true);
    try {
      const enhanced = await aiEnhance(note);
      setNote(enhanced);
      setEditTitle(enhanced.title);
      setEditContent(enhanced.content);
      Alert.alert('AI 整理完成', '摘要和标签已经在本机更新。');
    } catch {
      Alert.alert('整理失败', '请稍后再试。');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDelete = () => {
    if (!note || !id) return;

    Alert.alert('删除这条笔记？', '删除后无法恢复。', [
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
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>
          {backend.phase === 'online' ? '正在从 EdgeMind API 打开笔记' : '正在读取离线笔记'}
        </Text>
      </View>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="document-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.errorTitle}>没有找到这条笔记</Text>
        <TouchableOpacity style={styles.backToListButton} onPress={() => router.back()}>
          <Text style={styles.backToListText}>返回知识库</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="返回"
          style={styles.topBarButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarEyebrow}>
            {backend.phase === 'online' ? 'BACKEND NOTE' : 'OFFLINE NOTE'}
          </Text>
          <Text style={styles.topBarTitle}>笔记详情</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="删除笔记"
          style={styles.topBarButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sourceRow}>
          <View style={styles.sourcePill}>
            <Ionicons
              name={sourceIcon(note.source)}
              size={12}
              color={colors.primary}
            />
            <Text style={styles.sourceText}>{sourceLabel(note.source)}</Text>
          </View>
          <Text style={styles.updatedAt}>
            更新于 {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
          </Text>
        </View>

        {isEditing ? (
          <TextInput
            accessibilityLabel="笔记标题"
            style={styles.editTitle}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="输入标题"
            placeholderTextColor={colors.muted}
          />
        ) : (
          <Text style={styles.title}>{note.title}</Text>
        )}

        {note.summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>AI 摘要</Text>
                <Text style={styles.summaryMeta}>由当前设备生成</Text>
              </View>
            </View>
            <Text style={styles.summaryText}>{note.summary}</Text>
          </View>
        ) : null}

        <View style={styles.tagsContainer}>
          {note.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contentHeader}>
          <Text style={styles.contentLabel}>正文</Text>
          <Text style={styles.wordCount}>{note.content.length} 字</Text>
        </View>

        {isEditing ? (
          <TextInput
            accessibilityLabel="笔记正文"
            style={styles.editContent}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            placeholder="输入笔记内容"
            placeholderTextColor={colors.muted}
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.content} selectable>
            {note.content}
          </Text>
        )}

        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Ionicons name="lock-closed" size={15} color={colors.success} />
          </View>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>仅存储在当前设备</Text>
            <Text style={styles.privacyDescription}>
              搜索、摘要和标签不会上传到云端
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.secondaryAction}
          onPress={handleAIEnhance}
          disabled={isEnhancing}
        >
          {isEnhancing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sparkles-outline" size={17} color={colors.primary} />
          )}
          <Text style={styles.secondaryActionText}>AI 重新整理</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.primaryAction}
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'create-outline'}
            size={18}
            color={colors.white}
          />
          <Text style={styles.primaryActionText}>
            {isEditing ? '保存修改' : '编辑笔记'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function sourceLabel(source: Note['source']): string {
  switch (source) {
    case 'voice':
      return '语音输入';
    case 'ai_chat':
      return 'AI 对话';
    case 'summary':
      return '智能摘要';
    default:
      return '手动记录';
  }
}

function sourceIcon(source: Note['source']): React.ComponentProps<typeof Ionicons>['name'] {
  switch (source) {
    case 'voice':
      return 'mic-outline';
    case 'ai_chat':
      return 'hardware-chip-outline';
    case 'summary':
      return 'sparkles-outline';
    default:
      return 'create-outline';
  }
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
  loadingText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 10,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  backToListButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  backToListText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  topBar: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topBarTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  topBarEyebrow: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  sourceText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  updatedAt: {
    color: colors.muted,
    fontSize: 9,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 17,
  },
  editTitle: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 17,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  summaryCard: {
    padding: 15,
    marginTop: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 9,
  },
  summaryMeta: {
    color: colors.muted,
    fontSize: 8,
    marginLeft: 9,
    marginTop: 2,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  tagText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '600',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 11,
  },
  contentLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  wordCount: {
    color: colors.muted,
    fontSize: 9,
  },
  content: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 25,
  },
  editContent: {
    minHeight: 220,
    padding: 14,
    borderRadius: radius.md,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 25,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    marginTop: 26,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#19483D',
  },
  privacyCopy: {
    marginLeft: 10,
  },
  privacyTitle: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  privacyDescription: {
    color: '#8CCFBD',
    fontSize: 9,
    marginTop: 3,
  },
  actionBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  secondaryAction: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryStrong,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
