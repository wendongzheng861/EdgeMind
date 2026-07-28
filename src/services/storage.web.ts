import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, Note, NoteStats } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { v4 as uuid } from 'uuid';

const SETTINGS_KEY = '@edgemind:settings';
const STREAK_KEY = '@edgemind:streak';
const NOTES_KEY = '@edgemind:web-notes:v2';

function createDemoNotes(): Note[] {
  const now = Date.now();

  return [
    {
      id: 'demo-edge-ai-review',
      title: '端侧 AI 发布复盘',
      content:
        '今天完成了端侧 AI 助手的发布复盘。核心结论是：用户真正感知到的不是模型参数，而是响应速度、隐私边界和离线可用性。下一版需要把模型状态、推理耗时和数据去向表达得更清楚。',
      summary: '用户价值应聚焦速度、隐私和离线可用性，而非模型参数。',
      tags: ['端侧AI', '产品'],
      source: 'ai_chat',
      starred: true,
      createdAt: now - 1000 * 60 * 60 * 26,
      updatedAt: now - 1000 * 60 * 18,
    },
    {
      id: 'demo-quantization-checklist',
      title: '移动端模型量化清单',
      content:
        '模型上线前检查：基准精度、INT8 回归、首 Token 延迟、峰值内存、热启动耗时、低端机稳定性。所有指标都要保留设备型号和模型版本，避免只给一个平均数。',
      summary: '移动端量化验收需要同时覆盖精度、时延、内存和设备差异。',
      tags: ['模型优化', '技术'],
      source: 'manual',
      starred: false,
      createdAt: now - 1000 * 60 * 60 * 48,
      updatedAt: now - 1000 * 60 * 60 * 5,
    },
    {
      id: 'demo-private-knowledge-base',
      title: '下一代私人知识库',
      content:
        '一个真正可信的私人知识库，应该默认在本地完成搜索、摘要和关联推荐。云端能力可以作为用户明确选择的增强项，而不是默认的数据出口。',
      summary: '私人知识库应默认本地处理，云端增强必须由用户明确选择。',
      tags: ['隐私', '灵感'],
      source: 'voice',
      starred: false,
      createdAt: now - 1000 * 60 * 60 * 72,
      updatedAt: now - 1000 * 60 * 60 * 28,
    },
  ];
}

async function readNotes(): Promise<Note[]> {
  const json = await AsyncStorage.getItem(NOTES_KEY);
  if (json) return JSON.parse(json) as Note[];

  const notes = createDemoNotes();
  await writeNotes(notes);
  return notes;
}

async function writeNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export const NoteRepository = {
  async getAll(): Promise<Note[]> {
    return (await readNotes()).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getById(id: string): Promise<Note | null> {
    return (await readNotes()).find((note) => note.id === id) ?? null;
  },

  async create(note: Partial<Note>): Promise<Note> {
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

    await writeNotes([newNote, ...(await readNotes())]);
    return newNote;
  },

  async update(id: string, updates: Partial<Note>): Promise<Note | null> {
    const notes = await readNotes();
    const existing = notes.find((note) => note.id === id);
    if (!existing) return null;

    const updated: Note = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };
    await writeNotes(notes.map((note) => (note.id === id ? updated : note)));
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const notes = await readNotes();
    const nextNotes = notes.filter((note) => note.id !== id);
    await writeNotes(nextNotes);
    return nextNotes.length !== notes.length;
  },

  async search(query: string): Promise<Note[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return this.getAll();

    return (await readNotes()).filter(
      (note) =>
        note.title.toLowerCase().includes(normalized) ||
        note.content.toLowerCase().includes(normalized) ||
        note.tags.some((tag) => tag.toLowerCase().includes(normalized))
    );
  },

  async getStarred(): Promise<Note[]> {
    return (await readNotes()).filter((note) => note.starred);
  },

  async getStats(): Promise<NoteStats> {
    const notes = await this.getAll();
    const tagCount = new Map<string, number>();
    let totalWords = 0;

    for (const note of notes) {
      totalWords += note.content.length;
      note.tags.forEach((tag) =>
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
      );
    }

    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      totalNotes: notes.length,
      totalWords,
      topTags,
      averageLength: notes.length ? Math.round(totalWords / notes.length) : 0,
      streakDays: await getStreak(),
    };
  },
};

export const SettingsStore = {
  async get(): Promise<AppSettings> {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
  },

  async set(settings: Partial<AppSettings>): Promise<AppSettings> {
    const updated = { ...(await this.get()), ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  },
};

async function getStreak(): Promise<number> {
  try {
    const json = await AsyncStorage.getItem(STREAK_KEY);
    const data = json ? JSON.parse(json) : { streak: 0, lastDate: null };
    const today = new Date().toDateString();
    if (data.lastDate === today) return data.streak;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    data.streak = data.lastDate === yesterday ? data.streak + 1 : 1;
    data.lastDate = today;
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
    return data.streak;
  } catch {
    return 0;
  }
}

