import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
import { BackendApi } from '../../src/services/backend';
import { useNotes } from '../../src/hooks/useNotes';
import { useBackendStatus } from '../../src/hooks/useBackendStatus';
import type { KnowledgeLink, Note } from '../../src/types';
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
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<KnowledgeLink[]>([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

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
      if (BackendApi.isConfigured()) {
        try {
          const [notes, related] = await Promise.all([
            BackendApi.listNotes(),
            BackendApi.listLinks(id),
          ]);
          setAllNotes(notes.filter((item) => item.id !== id));
          setLinks(related);
        } catch {
          setAllNotes([]);
          setLinks([]);
        }
      }
    }
    setIsLoading(false);
  };

  const handleCreateLink = async (targetId: string) => {
    if (!id) return;
    try {
      await BackendApi.createLink({
        fromNoteId: id,
        toNoteId: targetId,
        relation: 'related',
      });
      setLinkModalOpen(false);
      setLinks(await BackendApi.listLinks(id));
    } catch (error) {
      Alert.alert('关联失败', error instanceof Error ? error.message : '请稍后再试');
    }
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

        <View style={styles.relationHeader}>
          <View>
            <Text style={styles.contentLabel}>知识关联</Text>
            <Text style={styles.relationHint}>把这条笔记连接到同一条思考链</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关联其他笔记"
            style={styles.linkButton}
            onPress={() => setLinkModalOpen(true)}
          >
            <Ionicons name="git-network-outline" size={14} color={colors.primary} />
            <Text style={styles.linkButtonText}>关联</Text>
          </Pressable>
        </View>
        {links.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relationList}>
            {links.map((link) => {
              const targetId = link.fromNoteId === note.id ? link.toNoteId : link.fromNoteId;
              const target = allNotes.find((item) => item.id === targetId);
              return target ? (
                <Pressable key={link.id} style={styles.relationCard} onPress={() => router.push(`/note/${target.id}` as any)}>
                  <View style={styles.relationIcon}><Ionicons name="link" size={14} color={colors.cyan} /></View>
                  <Text style={styles.relationTitle} numberOfLines={2}>{target.title}</Text>
                  <Text style={styles.relationType}>{link.relation.toUpperCase()}</Text>
                </Pressable>
              ) : null;
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyRelation}><Ionicons name="git-network-outline" size={17} color={colors.muted} /><Text style={styles.emptyRelationText}>还没有关联笔记</Text></View>
        )}

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

      <Modal transparent visible={linkModalOpen} animationType="fade" onRequestClose={() => setLinkModalOpen(false)}>
        <View style={styles.modalScreen}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLinkModalOpen(false)} />
          <View style={styles.linkModalCard}>
            <View style={styles.linkModalHeader}>
              <View><Text style={styles.topBarEyebrow}>KNOWLEDGE LINK</Text><Text style={styles.linkModalTitle}>选择要关联的笔记</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="关闭" style={styles.topBarButton} onPress={() => setLinkModalOpen(false)}><Ionicons name="close" size={18} color={colors.text} /></Pressable>
            </View>
            <ScrollView style={styles.linkOptions}>
              {allNotes.filter((item) => !links.some((link) => link.fromNoteId === item.id || link.toNoteId === item.id)).map((item) => (
                <Pressable key={item.id} style={styles.linkOption} onPress={() => void handleCreateLink(item.id)}>
                  <View style={styles.relationIcon}><Ionicons name="document-text-outline" size={14} color={colors.primary} /></View>
                  <View style={styles.linkOptionCopy}><Text style={styles.linkOptionTitle}>{item.title}</Text><Text style={styles.linkOptionSummary} numberOfLines={1}>{item.summary || item.content}</Text></View>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  relationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 10,
  },
  relationHint: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  linkButton: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#443B76',
  },
  linkButtonText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  relationList: {
    gap: 9,
    paddingRight: 6,
  },
  relationCard: {
    width: 170,
    minHeight: 112,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relationIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyanSoft,
  },
  relationTitle: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    marginTop: 9,
  },
  relationType: {
    color: colors.cyan,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
  },
  emptyRelation: {
    minHeight: 70,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyRelationText: {
    color: colors.muted,
    fontSize: 9,
  },
  modalScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  linkModalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '72%',
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  linkModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkModalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  linkOptions: {
    marginTop: 14,
  },
  linkOption: {
    minHeight: 64,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkOptionCopy: { flex: 1 },
  linkOptionTitle: { color: colors.text, fontSize: 11, fontWeight: '700' },
  linkOptionSummary: { color: colors.muted, fontSize: 8, marginTop: 3 },
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
