// ============================================================
// EdgeMind — 端侧本地存储服务
// 使用 SQLite + AsyncStorage 实现离线数据持久化
// 架构设计：Repository 模式 + 缓存层
// ============================================================

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note, NoteStats, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { v4 as uuid } from 'uuid';

const DB_NAME = 'edgemind.db';
const SETTINGS_KEY = '@edgemind:settings';
const STREAK_KEY = '@edgemind:streak';

// ============================================================
// 数据库初始化 — 使用SQLite实现结构化存储
// ============================================================

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initTables(db);
  }
  return db;
}

async function initTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'manual',
      starred INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags);
  `);
}

// ============================================================
// Notes Repository — 数据访问层
// 展示Repository模式的端侧数据管理
// ============================================================

export const NoteRepository = {
  /** 获取所有笔记，按更新时间降序 */
  async getAll(): Promise<Note[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM notes ORDER BY updated_at DESC'
    );
    return rows.map(mapRowToNote);
  },

  /** 根据ID获取单条笔记 */
  async getById(id: string): Promise<Note | null> {
    const database = await getDb();
    const row = await database.getFirstAsync<any>(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
    return row ? mapRowToNote(row) : null;
  },

  /** 创建笔记 */
  async create(note: Partial<Note>): Promise<Note> {
    const database = await getDb();
    const now = Date.now();
    const newNote: Note = {
      id: uuid(),
      title: note.title || '未命名笔记',
      content: note.content || '',
      summary: note.summary || '',
      tags: note.tags || [],
      source: note.source || 'manual',
      starred: note.starred || false,
      createdAt: now,
      updatedAt: now,
    };

    await database.runAsync(
      `INSERT INTO notes (id, title, content, summary, tags, source, starred, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newNote.id,
        newNote.title,
        newNote.content,
        newNote.summary,
        JSON.stringify(newNote.tags),
        newNote.source,
        newNote.starred ? 1 : 0,
        newNote.createdAt,
        newNote.updatedAt,
      ]
    );

    return newNote;
  },

  /** 更新笔记 */
  async update(id: string, updates: Partial<Note>): Promise<Note | null> {
    const database = await getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Note = {
      ...existing,
      ...updates,
      id, // 防止ID被覆盖
      updatedAt: Date.now(),
    };

    await database.runAsync(
      `UPDATE notes SET title=?, content=?, summary=?, tags=?, starred=?, updated_at=? WHERE id=?`,
      [
        updated.title,
        updated.content,
        updated.summary,
        JSON.stringify(updated.tags),
        updated.starred ? 1 : 0,
        updated.updatedAt,
        id,
      ]
    );

    return updated;
  },

  /** 删除笔记 */
  async delete(id: string): Promise<boolean> {
    const database = await getDb();
    const result = await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    return (result as any).changes > 0;
  },

  /** 搜索笔记（语义搜索 + 全文搜索结合） */
  async search(query: string): Promise<Note[]> {
    const database = await getDb();
    // 使用SQLite的LIKE实现基础搜索（真实场景结合端侧Embedding）
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM notes
       WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
       ORDER BY updated_at DESC`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return rows.map(mapRowToNote);
  },

  /** 获取收藏笔记 */
  async getStarred(): Promise<Note[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM notes WHERE starred = 1 ORDER BY updated_at DESC'
    );
    return rows.map(mapRowToNote);
  },

  /** 获取笔记统计 */
  async getStats(): Promise<NoteStats> {
    const database = await getDb();
    const notes = await this.getAll();

    const tagCount = new Map<string, number>();
    let totalWords = 0;

    for (const note of notes) {
      totalWords += note.content.length;
      note.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1));
    }

    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    const streakDays = await getStreak();

    return {
      totalNotes: notes.length,
      totalWords,
      topTags,
      averageLength: notes.length > 0 ? Math.round(totalWords / notes.length) : 0,
      streakDays,
    };
  },
};

// ============================================================
// 设置管理
// ============================================================

export const SettingsStore = {
  async get(): Promise<AppSettings> {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    }
    return DEFAULT_SETTINGS;
  },

  async set(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  },
};

// ============================================================
// 连续使用天数追踪（展示用户粘性）
// ============================================================

async function getStreak(): Promise<number> {
  try {
    const json = await AsyncStorage.getItem(STREAK_KEY);
    const data = json ? JSON.parse(json) : { streak: 0, lastDate: null };

    const today = new Date().toDateString();
    if (data.lastDate === today) return data.streak;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (data.lastDate === yesterday) {
      data.streak += 1;
    } else {
      data.streak = 1;
    }
    data.lastDate = today;
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
    return data.streak;
  } catch {
    return 0;
  }
}

// ============================================================
// 辅助函数
// ============================================================

function mapRowToNote(row: any): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    summary: row.summary,
    tags: JSON.parse(row.tags || '[]'),
    source: row.source,
    starred: row.starred === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
