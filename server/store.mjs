import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const SCHEMA_VERSION = 2;
const MAX_AUDIT_EVENTS = 500;

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
      projectId: 'project-edgemind-launch',
      status: 'active',
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
      projectId: 'project-mobile-ai',
      status: 'active',
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
      projectId: null,
      status: 'inbox',
      createdAt: now - 1000 * 60 * 60 * 72,
      updatedAt: now - 1000 * 60 * 60 * 28,
    },
  ];
}

function createDemoProjects(now = Date.now()) {
  return [
    {
      id: 'project-edgemind-launch',
      name: 'EdgeMind 发布',
      description: '把端侧 AI 从演示升级为可持续使用的本地知识产品。',
      color: '#7C5CFF',
      status: 'active',
      createdAt: now - 1000 * 60 * 60 * 96,
      updatedAt: now - 1000 * 60 * 20,
    },
    {
      id: 'project-mobile-ai',
      name: '移动端模型体验',
      description: '跟踪量化、性能、离线缓存与 iPhone 端体验。',
      color: '#38D6C1',
      status: 'active',
      createdAt: now - 1000 * 60 * 60 * 80,
      updatedAt: now - 1000 * 60 * 60 * 5,
    },
  ];
}

function createDemoTasks(now = Date.now()) {
  return [
    {
      id: 'task-mobile-download',
      title: '验证 Safari 模型下载进度与缓存',
      note: '重点记录首次加载、断点恢复和二次打开速度。',
      projectId: 'project-mobile-ai',
      status: 'doing',
      priority: 'high',
      dueAt: now + 1000 * 60 * 60 * 24,
      createdAt: now - 1000 * 60 * 60 * 20,
      updatedAt: now - 1000 * 60 * 35,
    },
    {
      id: 'task-release-story',
      title: '整理端侧 AI 产品故事',
      note: '把隐私、离线和零调用费用转成用户可理解的价值。',
      projectId: 'project-edgemind-launch',
      status: 'todo',
      priority: 'medium',
      dueAt: now + 1000 * 60 * 60 * 48,
      createdAt: now - 1000 * 60 * 60 * 10,
      updatedAt: now - 1000 * 60 * 60 * 2,
    },
    {
      id: 'task-backend-complete',
      title: '打通本地后端与知识库同步',
      note: 'CRUD、搜索、统计与活动记录可用。',
      projectId: 'project-edgemind-launch',
      status: 'done',
      priority: 'high',
      dueAt: null,
      createdAt: now - 1000 * 60 * 60 * 30,
      updatedAt: now - 1000 * 60 * 60 * 4,
    },
  ];
}

function createDemoLinks(now = Date.now()) {
  return [
    {
      id: 'link-review-private',
      fromNoteId: 'demo-edge-ai-review',
      toNoteId: 'demo-private-knowledge-base',
      relation: 'supports',
      createdAt: now - 1000 * 60 * 16,
    },
  ];
}

function initialState() {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    notes: createDemoNotes(now),
    projects: createDemoProjects(now),
    tasks: createDemoTasks(now),
    links: createDemoLinks(now),
    audit: [],
  };
}

function normalizeState(value) {
  if (!value || !Array.isArray(value.notes)) {
    throw new Error('Unsupported or corrupt EdgeMind data file');
  }

  const now = Date.now();
  const projects = Array.isArray(value.projects) ? value.projects : createDemoProjects(now);
  const tasks = Array.isArray(value.tasks) ? value.tasks : createDemoTasks(now);
  const links = Array.isArray(value.links) ? value.links : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    notes: value.notes.map((note) => ({
      ...note,
      projectId: note.projectId ?? null,
      status: note.status || (note.projectId ? 'active' : 'inbox'),
    })),
    projects,
    tasks,
    links,
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
