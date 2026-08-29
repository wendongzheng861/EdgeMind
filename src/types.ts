// ============================================================
// EdgeMind — Core Type Definitions
// 架构设计：类型先行，所有模块共享一致的数据契约
// ============================================================

/** 笔记实体 — 端侧AI的核心数据模型 */
export interface Note {
  id: string;
  title: string;
  content: string;
  /** AI 自动生成的摘要 */
  summary: string;
  /** AI 自动生成的标签 */
  tags: string[];
  /** 创建时间戳 (ms) */
  createdAt: number;
  /** 最后修改时间戳 (ms) */
  updatedAt: number;
  /** 笔记来源 */
  source: NoteSource;
  /** 是否已收藏 */
  starred: boolean;
  /** 所属项目；为空时进入收件箱 */
  projectId?: string | null;
  /** 知识流转状态 */
  status?: 'inbox' | 'active' | 'archived';
}

export type NoteSource = 'manual' | 'voice' | 'ai_chat' | 'summary';

/** AI 对话消息 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** 端侧推理耗时 (ms)，展示端侧AI性能 */
  inferenceMs?: number;
  /** 真实本地模型的生成速度 */
  tokensPerSecond?: number;
  timestamp: number;
}

/** AI 服务策略 — 展示架构设计中的策略模式 */
export type AIProvider =
  | 'backend'
  | 'llamacpp'
  | 'onnx'
  | 'mnn'
  | 'webllm'
  | 'mock';

/** 端侧AI推理配置 */
export interface AIConfig {
  provider: AIProvider;
  /** 模型路径（端侧） */
  modelPath: string;
  /** 最大 token 数 */
  maxTokens: number;
  /** 温度参数 */
  temperature: number;
  /** 启用量化 */
  quantized: boolean;
}

/** 笔记统计 */
export interface NoteStats {
  totalNotes: number;
  totalWords: number;
  topTags: string[];
  averageLength: number;
  streakDays: number;
}

/** 项目空间 — 把笔记、任务和 AI 上下文组织到同一目标下 */
export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}

/** 可执行任务 */
export interface Task {
  id: string;
  title: string;
  note?: string;
  projectId?: string | null;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

/** 笔记之间的知识关系 */
export interface KnowledgeLink {
  id: string;
  fromNoteId: string;
  toNoteId: string;
  relation: 'related' | 'supports' | 'contradicts' | 'extends';
  createdAt: number;
}

export interface ActivityEvent {
  id: string;
  action: string;
  at: number;
  noteId?: string;
  projectId?: string;
  taskId?: string;
}

export interface DashboardData {
  notes: Note[];
  projects: Project[];
  tasks: Task[];
  activity: ActivityEvent[];
  stats: NoteStats & {
    inboxCount: number;
    activeProjects: number;
    openTasks: number;
    completedTasks: number;
  };
}

/** 语音识别结果 */
export interface VoiceResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

/** 应用设置 */
export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  aiProvider: AIProvider;
  language: 'zh' | 'en';
  autoSummarize: boolean;
  voiceInputEnabled: boolean;
  /** 端侧模型最高 token 预算 */
  maxTokens: number;
}

// ============================================================
// 常量
// ============================================================

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  aiProvider: 'llamacpp',
  language: 'zh',
  autoSummarize: true,
  voiceInputEnabled: true,
  maxTokens: 512,
};

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  backend: 'EdgeMind API · 本机后端',
  llamacpp: 'Qwen2.5 7B · 本机',
  onnx: 'ONNX Runtime',
  mnn: 'MNN',
  webllm: 'Qwen2.5 0.5B · Safari 离线',
  mock: 'Demo Engine',
};

// 面试官注意：
// 这个类型定义展示了架构设计的第一步——数据契约。
// 在实际项目中，端侧AI的每个推理结果都会记录 inferenceMs，
// 用于性能监控和模型选型决策。
