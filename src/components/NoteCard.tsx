import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Note } from '../types';
import { colors, radius } from '../theme';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onStar: (note: Note) => void;
  onDelete: (note: Note) => void | Promise<void>;
}

export default function NoteCard({ note, onPress, onStar, onDelete }: NoteCardProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`打开笔记：${note.title}`}
        style={styles.openArea}
        onPress={() => onPress(note)}
        activeOpacity={0.76}
      >
        <View style={styles.cardTop}>
          <View style={styles.sourcePill}>
            <Ionicons
              name={sourceIcon(note.source)}
              size={12}
              color={sourceColor(note.source)}
            />
            <Text style={[styles.sourceText, { color: sourceColor(note.source) }]}>
              {sourceLabel(note.source)}
            </Text>
          </View>
          <Text style={styles.timeAgo}>{getTimeAgo(note.updatedAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {note.title}
        </Text>

        {note.summary ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Ionicons name="sparkles" size={11} color={colors.primary} />
            </View>
            <Text style={styles.summary} numberOfLines={2}>
              {note.summary}
            </Text>
          </View>
        ) : (
          <Text style={styles.content} numberOfLines={2}>
            {note.content}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={styles.tags}>
          {note.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={note.starred ? '取消收藏' : '收藏笔记'}
            style={[styles.starButton, note.starred && styles.starButtonActive]}
            onPress={() => onStar(note)}
          >
            <Ionicons
              name={note.starred ? 'star' : 'star-outline'}
              size={16}
              color={note.starred ? colors.warning : colors.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="删除笔记"
            style={styles.moreButton}
            onPress={() => onDelete(note)}
          >
            <Ionicons name="trash-outline" size={15} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
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

function sourceColor(source: Note['source']): string {
  switch (source) {
    case 'voice':
      return colors.cyan;
    case 'ai_chat':
      return colors.primary;
    case 'summary':
      return colors.success;
    default:
      return colors.textSecondary;
  }
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 11,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  openArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  cardTop: {
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
    backgroundColor: colors.surfaceElevated,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: '700',
  },
  timeAgo: {
    color: colors.muted,
    fontSize: 9,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.25,
    marginTop: 12,
  },
  starButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  starButtonActive: {
    backgroundColor: '#3A311D',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  summaryIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginTop: 1,
  },
  summary: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  content: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: 10,
  },
  tags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  tagText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  moreButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
