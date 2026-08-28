import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const SCHEMA_VERSION = 1;
const MAX_AUDIT_EVENTS = 200;

function createDemoNotes(now = Date.now()) {
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

function initialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    notes: createDemoNotes(),
    audit: [],
  };
}

function normalizeState(value) {
  if (!value || value.schemaVersion !== SCHEMA_VERSION || !Array.isArray(value.notes)) {
    throw new Error('Unsupported or corrupt EdgeMind data file');
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    notes: value.notes,
    audit: Array.isArray(value.audit) ? value.audit.slice(-MAX_AUDIT_EVENTS) : [],
  };
}

export class JsonStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.state = null;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      this.state = normalizeState(JSON.parse(await readFile(this.filePath, 'utf8')));
    } catch (error) {
      if (error && error.code !== 'ENOENT') throw error;
      this.state = initialState();
      await this.persist();
    }
    return this;
  }

  snapshot() {
    if (!this.state) throw new Error('Store is not initialized');
    return structuredClone(this.state);
  }

  async mutate(action, mutator, metadata = {}) {
    const operation = this.writeQueue.then(async () => {
      const draft = this.snapshot();
      const result = await mutator(draft);
      draft.audit.push({
        id: randomUUID(),
        action,
        at: Date.now(),
        ...metadata,
      });
      draft.audit = draft.audit.slice(-MAX_AUDIT_EVENTS);
      this.state = draft;
      await this.persist();
      return structuredClone(result);
    });
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async persist() {
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    const body = `${JSON.stringify(this.state, null, 2)}\n`;
    await writeFile(temporaryPath, body, 'utf8');
    await rename(temporaryPath, this.filePath);
  }
}

export function calculateStats(notes) {
  const tagCounts = new Map();
  let totalWords = 0;
  const activeDates = new Set();

  for (const note of notes) {
    totalWords += note.content.length;
    activeDates.add(new Date(note.updatedAt).toDateString());
    for (const tag of note.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  let streakDays = 0;
  const cursor = new Date();
  while (activeDates.has(cursor.toDateString())) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalNotes: notes.length,
    totalWords,
    topTags: [...tagCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([tag]) => tag),
    averageLength: notes.length ? Math.round(totalWords / notes.length) : 0,
    streakDays,
  };
}
