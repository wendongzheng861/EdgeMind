// ============================================================
// EdgeMind — NoteCard 组件
// 笔记卡片：展示AI增强后的笔记信息
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onStar: (note: Note) => void;
  onDelete: (note: Note) => void | Promise<void>;
}

export default function NoteCard({ note, onPress, onStar, onDelete }: NoteCardProps) {
  const timeAgo = getTimeAgo(note.updatedAt);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(note)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {note.title}
        </Text>
        <TouchableOpacity onPress={() => onStar(note)}>
          <Ionicons
            name={note.starred ? 'star' : 'star-outline'}
            size={20}
            color={note.starred ? '#FFD700' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {note.summary ? (
        <Text style={styles.summary} numberOfLines={2}>
          📝 {note.summary}
        </Text>
      ) : null}

      <Text style={styles.content} numberOfLines={2}>
        {note.content}
      </Text>

      {/* AI生成的标签 */}
      {note.tags.length > 0 && (
        <View style={styles.tags}>
          {note.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {note.source === 'ai_chat' && (
            <View style={[styles.tag, { backgroundColor: '#1a2a3e' }]}>
              <Text style={[styles.tagText, { color: '#4FC3F7' }]}>AI生成</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons
            name={note.source === 'voice' ? 'mic' : note.source === 'ai_chat' ? 'bulb' : 'create'}
            size={12}
            color="#666"
          />
          <Text style={styles.sourceLabel}>{sourceLabel(note.source)}</Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(note)}>
          <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'voice': return '语音';
    case 'ai_chat': return 'AI对话';
    case 'summary': return '摘要';
    default: return '手动';
  }
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#12122a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a3e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  summary: {
    color: '#6C63FF',
    fontSize: 13,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  content: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    color: '#6C63FF',
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceLabel: {
    color: '#666',
    fontSize: 11,
  },
  timeAgo: {
    color: '#555',
    fontSize: 11,
    marginLeft: 4,
  },
});
