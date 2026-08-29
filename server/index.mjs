import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { JsonStore, calculateStats } from './store.mjs';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.EDGEMIND_API_HOST || '127.0.0.1';
const PORT = Number(process.env.EDGEMIND_API_PORT || 8787);
const DATA_FILE =
  process.env.EDGEMIND_DATA_FILE || path.join(serverDirectory, 'data', 'edgemind.json');
const LLAMA_BASE_URL = process.env.EDGEMIND_LLAMA_URL || 'http://127.0.0.1:8080';
const LLAMA_MODEL =
  process.env.EDGEMIND_LLAMA_MODEL || 'qwen2.5-7b-instruct-q4_k_m';
const BODY_LIMIT = 1024 * 1024;
const NOTE_SOURCES = new Set(['manual', 'voice', 'ai_chat', 'summary']);
const NOTE_STATUSES = new Set(['inbox', 'active', 'archived']);
const PROJECT_STATUSES = new Set(['active', 'paused', 'completed']);
const TASK_STATUSES = new Set(['todo', 'doing', 'done']);
const TASK_PRIORITIES = new Set(['low', 'medium', 'high']);
const LINK_RELATIONS = new Set(['related', 'supports', 'contradicts', 'extends']);

const SYSTEM_PROMPT = `你是 EdgeMind 的本地 AI 助手。请求由本机 Node API 转发到本机 llama.cpp。
始终使用简体中文，表达清晰、直接、可执行。
帮助用户整理想法、总结笔记、生成结构和延展灵感。
不要声称访问了互联网、云端服务或用户没有提供的资料。`;

const store = await new JsonStore(DATA_FILE).init();

function allowedOrigin(origin) {
  if (!origin) return '*';
  const configured = (process.env.EDGEMIND_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return origin;
  try {
    const url = new URL(origin);
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return origin;
  } catch {
    return null;
  }
  return null;
}

function setCors(request, response) {
  const origin = allowedOrigin(request.headers.origin);
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Request-Id');
}

function send(request, response, status, payload, requestId) {
  setCors(request, response);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Request-Id': requestId,
  });
  response.end(JSON.stringify(payload));
}

function apiError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

async function readJson(request) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > BODY_LIMIT) throw apiError(413, 'BODY_TOO_LARGE', '请求体超过 1 MB');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw apiError(400, 'INVALID_JSON', '请求体不是有效 JSON');
  }
}

function cleanText(value, field, maximum, required = false) {
  if (value == null && !required) return undefined;
  if (typeof value !== 'string') throw apiError(400, 'INVALID_NOTE', `${field} 必须是字符串`);
  const cleaned = value.trim();
  if (required && !cleaned) throw apiError(400, 'INVALID_NOTE', `${field} 不能为空`);
  if (cleaned.length > maximum) {
    throw apiError(400, 'INVALID_NOTE', `${field} 最多 ${maximum} 个字符`);
  }
  return cleaned;
}

function cleanTags(value) {
  if (value == null) return undefined;
  if (!Array.isArray(value)) throw apiError(400, 'INVALID_NOTE', 'tags 必须是数组');
  return [...new Set(value.map((tag) => cleanText(tag, 'tag', 30, true)))].slice(0, 12);
}

function cleanSource(value) {
  if (value == null) return undefined;
  if (!NOTE_SOURCES.has(value)) throw apiError(400, 'INVALID_NOTE', 'source 不受支持');
  return value;
}

function cleanEnum(value, field, allowed, required = false) {
  if (value == null && !required) return undefined;
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw apiError(400, 'INVALID_INPUT', `${field} 不受支持`);
  }
  return value;
}

function cleanOptionalId(value, field = 'id') {
  if (value === null) return null;
  return cleanText(value, field, 160);
}

function cleanTimestamp(value, field) {
  if (value == null) return undefined;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw apiError(400, 'INVALID_INPUT', `${field} 必须是有效时间戳`);
  }
  return timestamp;
}

function noteInput(body, partial = false) {
  return {
    title: cleanText(body.title, 'title', 160, !partial),
    content: cleanText(body.content, 'content', 50000, !partial),
    summary: cleanText(body.summary, 'summary', 600),
    tags: cleanTags(body.tags),
    source: cleanSource(body.source),
    starred:
      body.starred == null
        ? undefined
        : typeof body.starred === 'boolean'
          ? body.starred
          : (() => {
              throw apiError(400, 'INVALID_NOTE', 'starred 必须是布尔值');
            })(),
    projectId: cleanOptionalId(body.projectId, 'projectId'),
    status: cleanEnum(body.status, 'status', NOTE_STATUSES),
  };
}

function projectInput(body, partial = false) {
  return {
    name: cleanText(body.name, 'name', 80, !partial),
    description: cleanText(body.description, 'description', 600),
    color: cleanText(body.color, 'color', 24),
    status: cleanEnum(body.status, 'status', PROJECT_STATUSES),
  };
}

function taskInput(body, partial = false) {
  return {
    title: cleanText(body.title, 'title', 180, !partial),
    note: cleanText(body.note, 'note', 1200),
    projectId: cleanOptionalId(body.projectId, 'projectId'),
    status: cleanEnum(body.status, 'status', TASK_STATUSES),
    priority: cleanEnum(body.priority, 'priority', TASK_PRIORITIES),
    dueAt: body.dueAt === null ? null : cleanTimestamp(body.dueAt, 'dueAt'),
  };
}

function sortNotes(notes) {
  return notes.slice().sort((left, right) => right.updatedAt - left.updatedAt);
}

function matchesQuery(note, query) {
  const value = query.trim().toLowerCase();
  return (
    !value ||
    note.title.toLowerCase().includes(value) ||
    note.content.toLowerCase().includes(value) ||
    note.tags.some((tag) => tag.toLowerCase().includes(value))
  );
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function llamaHealth() {
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(`${LLAMA_BASE_URL}/health`, {}, 1200);
    return {
      ready: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      endpoint: LLAMA_BASE_URL,
    };
  } catch {
    return {
      ready: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      endpoint: LLAMA_BASE_URL,
    };
  }
}

async function complete(messages, maxTokens = 512, temperature = 0.65) {
  let response;
  try {
    response = await fetchWithTimeout(
      `${LLAMA_BASE_URL}/v1/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LLAMA_MODEL,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          temperature,
          top_p: 0.9,
          max_tokens: maxTokens,
          stream: false,
        }),
      },
      120000
    );
  } catch (error) {
    const message = error?.name === 'AbortError' ? '本机模型生成超时' : '无法连接本机 llama.cpp';
    throw apiError(503, 'AI_UNAVAILABLE', message);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw apiError(502, 'AI_BAD_RESPONSE', 'llama.cpp 返回了无效 JSON');
  }
  if (!response.ok) {
    throw apiError(
      response.status === 503 ? 503 : 502,
      'AI_BAD_RESPONSE',
      payload?.error?.message || `llama.cpp 返回 ${response.status}`
    );
  }
  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) throw apiError(502, 'AI_EMPTY_RESPONSE', '本机模型没有返回内容');
  return {
    content: content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, ''),
    tokensPerSecond: payload?.timings?.predicted_per_second,
  };
}

async function route(request, response, url, requestId) {
  const method = request.method || 'GET';
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (request.headers.origin && !allowedOrigin(request.headers.origin)) {
    throw apiError(403, 'ORIGIN_FORBIDDEN', '该来源不允许访问本机 EdgeMind API');
  }

  if (method === 'OPTIONS') {
    setCors(request, response);
    response.writeHead(204, { 'X-Request-Id': requestId });
    response.end();
    return;
  }

  if (pathname === '/api/health' && method === 'GET') {
    const snapshot = store.snapshot();
    send(
      request,
      response,
      200,
      {
        ok: true,
        service: 'edgemind-api',
        version: 2,
        storage: {
          driver: 'json-file',
          notes: snapshot.notes.length,
          projects: snapshot.projects.length,
          tasks: snapshot.tasks.length,
        },
        ai: await llamaHealth(),
        now: Date.now(),
      },
      requestId
    );
    return;
  }

  if (pathname === '/api/notes' && method === 'GET') {
    const snapshot = store.snapshot();
    const query = url.searchParams.get('q') || '';
    const source = url.searchParams.get('source');
    const starred = url.searchParams.get('starred');
    const notes = sortNotes(snapshot.notes).filter(
      (note) =>
        matchesQuery(note, query) &&
        (!source || note.source === source) &&
        (starred == null || note.starred === (starred === 'true'))
    );
    send(request, response, 200, { notes, total: notes.length }, requestId);
    return;
  }

  if (pathname === '/api/notes' && method === 'POST') {
    const input = noteInput(await readJson(request));
    const now = Date.now();
    const note = {
      id: randomUUID(),
      title: input.title,
      content: input.content,
      summary: input.summary || '',
      tags: input.tags || [],
      source: input.source || 'manual',
      starred: input.starred || false,
      projectId: input.projectId ?? null,
      status: input.status || (input.projectId ? 'active' : 'inbox'),
      createdAt: now,
      updatedAt: now,
    };
    await store.mutate('note.created', (draft) => {
      draft.notes.unshift(note);
      return note;
    }, { noteId: note.id });
    send(request, response, 201, { note }, requestId);
    return;
  }

  if (pathname === '/api/notes/sync' && method === 'POST') {
    const body = await readJson(request);
    if (!Array.isArray(body.notes) || body.notes.length > 5000) {
      throw apiError(400, 'INVALID_SYNC', 'notes 必须是最多 5000 项的数组');
    }
    const incoming = body.notes.map((raw) => {
      const input = noteInput(raw);
      const id = cleanText(raw.id, 'id', 160, true);
      const createdAt = Number(raw.createdAt);
      const updatedAt = Number(raw.updatedAt);
      if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) {
        throw apiError(400, 'INVALID_SYNC', '笔记时间戳无效');
      }
      return {
        id,
        title: input.title,
        content: input.content,
        summary: input.summary || '',
        tags: input.tags || [],
        source: input.source || 'manual',
        starred: input.starred || false,
        projectId: input.projectId ?? null,
        status: input.status || (input.projectId ? 'active' : 'inbox'),
        createdAt,
        updatedAt,
      };
    });
    const notes = await store.mutate('notes.synced', (draft) => {
      const merged = new Map(draft.notes.map((note) => [note.id, note]));
      for (const note of incoming) {
        const existing = merged.get(note.id);
        if (!existing || note.updatedAt > existing.updatedAt) merged.set(note.id, note);
      }
      draft.notes = sortNotes([...merged.values()]);
      return draft.notes;
    }, { count: incoming.length });
    send(request, response, 200, { notes, total: notes.length }, requestId);
    return;
  }

  if (pathname === '/api/stats' && method === 'GET') {
    send(request, response, 200, { stats: calculateStats(store.snapshot().notes) }, requestId);
    return;
  }

  if (pathname === '/api/activity' && method === 'GET') {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
    const events = store.snapshot().audit.slice(-limit).reverse();
    send(request, response, 200, { events }, requestId);
    return;
  }

  if (pathname === '/api/dashboard' && method === 'GET') {
    const snapshot = store.snapshot();
    const stats = calculateStats(snapshot.notes);
    const tasks = snapshot.tasks.slice().sort((left, right) => {
      const order = { doing: 0, todo: 1, done: 2 };
      return order[left.status] - order[right.status] || right.updatedAt - left.updatedAt;
    });
    send(request, response, 200, {
      dashboard: {
        notes: sortNotes(snapshot.notes).slice(0, 6),
        projects: snapshot.projects
          .slice()
          .sort((left, right) => right.updatedAt - left.updatedAt),
        tasks: tasks.slice(0, 8),
        activity: snapshot.audit.slice(-8).reverse(),
        stats: {
          ...stats,
          inboxCount: snapshot.notes.filter((note) => note.status === 'inbox').length,
          activeProjects: snapshot.projects.filter((project) => project.status === 'active').length,
          openTasks: snapshot.tasks.filter((task) => task.status !== 'done').length,
          completedTasks: snapshot.tasks.filter((task) => task.status === 'done').length,
        },
      },
    }, requestId);
    return;
  }

  if (pathname === '/api/projects' && method === 'GET') {
    const projects = store.snapshot().projects
      .slice()
      .sort((left, right) => right.updatedAt - left.updatedAt);
    send(request, response, 200, { projects, total: projects.length }, requestId);
    return;
  }

  if (pathname === '/api/projects' && method === 'POST') {
    const input = projectInput(await readJson(request));
    const now = Date.now();
    const project = {
      id: randomUUID(),
      name: input.name,
      description: input.description || '',
      color: input.color || '#7C5CFF',
      status: input.status || 'active',
      createdAt: now,
      updatedAt: now,
    };
    await store.mutate('project.created', (draft) => {
      draft.projects.unshift(project);
      return project;
    }, { projectId: project.id });
    send(request, response, 201, { project }, requestId);
    return;
  }

  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = decodeURIComponent(projectMatch[1]);
    if (method === 'PATCH') {
      const input = projectInput(await readJson(request), true);
      const project = await store.mutate('project.updated', (draft) => {
        const index = draft.projects.findIndex((item) => item.id === id);
        if (index < 0) throw apiError(404, 'PROJECT_NOT_FOUND', '没有找到这个项目');
        const updates = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
        draft.projects[index] = { ...draft.projects[index], ...updates, id, updatedAt: Date.now() };
        return draft.projects[index];
      }, { projectId: id });
      send(request, response, 200, { project }, requestId);
      return;
    }
    if (method === 'DELETE') {
      await store.mutate('project.deleted', (draft) => {
        const index = draft.projects.findIndex((item) => item.id === id);
        if (index < 0) throw apiError(404, 'PROJECT_NOT_FOUND', '没有找到这个项目');
        draft.projects.splice(index, 1);
        draft.notes = draft.notes.map((note) => note.projectId === id
          ? { ...note, projectId: null, status: 'inbox', updatedAt: Date.now() }
          : note);
        draft.tasks = draft.tasks.map((task) => task.projectId === id
          ? { ...task, projectId: null, updatedAt: Date.now() }
          : task);
        return true;
      }, { projectId: id });
      send(request, response, 200, { deleted: true, id }, requestId);
      return;
    }
  }

  if (pathname === '/api/tasks' && method === 'GET') {
    const projectId = url.searchParams.get('projectId');
    const tasks = store.snapshot().tasks
      .filter((task) => !projectId || task.projectId === projectId)
      .sort((left, right) => right.updatedAt - left.updatedAt);
    send(request, response, 200, { tasks, total: tasks.length }, requestId);
    return;
  }

  if (pathname === '/api/tasks' && method === 'POST') {
    const input = taskInput(await readJson(request));
    const now = Date.now();
    const task = {
      id: randomUUID(),
      title: input.title,
      note: input.note || '',
      projectId: input.projectId ?? null,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      dueAt: input.dueAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await store.mutate('task.created', (draft) => {
      if (task.projectId && !draft.projects.some((project) => project.id === task.projectId)) {
        throw apiError(400, 'PROJECT_NOT_FOUND', '任务所属项目不存在');
      }
      draft.tasks.unshift(task);
      return task;
    }, { taskId: task.id, projectId: task.projectId });
    send(request, response, 201, { task }, requestId);
    return;
  }

  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const id = decodeURIComponent(taskMatch[1]);
    if (method === 'PATCH') {
      const input = taskInput(await readJson(request), true);
      const task = await store.mutate('task.updated', (draft) => {
        const index = draft.tasks.findIndex((item) => item.id === id);
        if (index < 0) throw apiError(404, 'TASK_NOT_FOUND', '没有找到这个任务');
        if (input.projectId && !draft.projects.some((project) => project.id === input.projectId)) {
          throw apiError(400, 'PROJECT_NOT_FOUND', '任务所属项目不存在');
        }
        const updates = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
        draft.tasks[index] = { ...draft.tasks[index], ...updates, id, updatedAt: Date.now() };
        return draft.tasks[index];
      }, { taskId: id });
      send(request, response, 200, { task }, requestId);
      return;
    }
    if (method === 'DELETE') {
      await store.mutate('task.deleted', (draft) => {
        const index = draft.tasks.findIndex((item) => item.id === id);
        if (index < 0) throw apiError(404, 'TASK_NOT_FOUND', '没有找到这个任务');
        draft.tasks.splice(index, 1);
        return true;
      }, { taskId: id });
      send(request, response, 200, { deleted: true, id }, requestId);
      return;
    }
  }

  if (pathname === '/api/links' && method === 'GET') {
    const noteId = url.searchParams.get('noteId');
    const links = store.snapshot().links.filter((link) =>
      !noteId || link.fromNoteId === noteId || link.toNoteId === noteId
    );
    send(request, response, 200, { links, total: links.length }, requestId);
    return;
  }

  if (pathname === '/api/links' && method === 'POST') {
    const body = await readJson(request);
    const fromNoteId = cleanText(body.fromNoteId, 'fromNoteId', 160, true);
    const toNoteId = cleanText(body.toNoteId, 'toNoteId', 160, true);
    const relation = cleanEnum(body.relation, 'relation', LINK_RELATIONS, true);
    if (fromNoteId === toNoteId) throw apiError(400, 'INVALID_LINK', '不能关联同一条笔记');
    const link = { id: randomUUID(), fromNoteId, toNoteId, relation, createdAt: Date.now() };
    await store.mutate('link.created', (draft) => {
      const noteIds = new Set(draft.notes.map((note) => note.id));
      if (!noteIds.has(fromNoteId) || !noteIds.has(toNoteId)) {
        throw apiError(400, 'NOTE_NOT_FOUND', '关联的笔记不存在');
      }
      draft.links.push(link);
      return link;
    }, { noteId: fromNoteId });
    send(request, response, 201, { link }, requestId);
    return;
  }

  if (pathname === '/api/export' && method === 'GET') {
    const snapshot = store.snapshot();
    send(request, response, 200, {
      data: { ...snapshot, exportedAt: Date.now(), product: 'EdgeMind' },
    }, requestId);
    return;
  }

  if (pathname === '/api/import' && method === 'POST') {
    const body = await readJson(request);
    const data = body.data;
    if (!data || !Array.isArray(data.notes) || !Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
      throw apiError(400, 'INVALID_IMPORT', '导入文件缺少 notes、projects 或 tasks');
    }
    if (data.notes.length > 5000 || data.projects.length > 500 || data.tasks.length > 10000) {
      throw apiError(400, 'IMPORT_TOO_LARGE', '导入数据超过数量限制');
    }
    await store.mutate('workspace.imported', (draft) => {
      draft.notes = data.notes;
      draft.projects = data.projects;
      draft.tasks = data.tasks;
      draft.links = Array.isArray(data.links) ? data.links : [];
      return true;
    }, { notes: data.notes.length, projects: data.projects.length, tasks: data.tasks.length });
    send(request, response, 200, { imported: true }, requestId);
    return;
  }

  const noteMatch = pathname.match(/^\/api\/notes\/([^/]+)$/);
  if (noteMatch) {
    const id = decodeURIComponent(noteMatch[1]);
    if (method === 'GET') {
      const note = store.snapshot().notes.find((item) => item.id === id);
      if (!note) throw apiError(404, 'NOTE_NOT_FOUND', '没有找到这条笔记');
      send(request, response, 200, { note }, requestId);
      return;
    }
    if (method === 'PATCH') {
      const input = noteInput(await readJson(request), true);
      const note = await store.mutate('note.updated', (draft) => {
        const index = draft.notes.findIndex((item) => item.id === id);
        if (index < 0) throw apiError(404, 'NOTE_NOT_FOUND', '没有找到这条笔记');
        const updates = Object.fromEntries(
          Object.entries(input).filter(([, value]) => value !== undefined)
        );
        draft.notes[index] = { ...draft.notes[index], ...updates, id, updatedAt: Date.now() };
        return draft.notes[index];
      }, { noteId: id });
      send(request, response, 200, { note }, requestId);
      return;
    }
    if (method === 'DELETE') {
      await store.mutate('note.deleted', (draft) => {
        const index = draft.notes.findIndex((item) => item.id === id);
        if (index < 0) throw apiError(404, 'NOTE_NOT_FOUND', '没有找到这条笔记');
        draft.notes.splice(index, 1);
        return true;
      }, { noteId: id });
      send(request, response, 200, { deleted: true, id }, requestId);
      return;
    }
  }

  if (pathname === '/api/ai/chat' && method === 'POST') {
    const body = await readJson(request);
    if (!Array.isArray(body.messages) || !body.messages.length) {
      throw apiError(400, 'INVALID_MESSAGES', 'messages 不能为空');
    }
    const messages = body.messages.slice(-12).map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: cleanText(message.content, 'content', 12000, true),
    }));
    const startedAt = Date.now();
    const result = await complete(messages, Number(body.maxTokens) || 512);
    send(request, response, 200, { ...result, inferenceMs: Date.now() - startedAt }, requestId);
    return;
  }

  if (pathname === '/api/ai/summarize' && method === 'POST') {
    const body = await readJson(request);
    const content = cleanText(body.content, 'content', 50000, true);
    const result = await complete(
      [{ role: 'user', content: `请把下面内容总结成一句不超过50字的话，只输出摘要：\n\n${content}` }],
      100,
      0.3
    );
    send(request, response, 200, { summary: result.content }, requestId);
    return;
  }

  if (pathname === '/api/ai/tags' && method === 'POST') {
    const body = await readJson(request);
    const content = cleanText(body.content, 'content', 50000, true);
    const result = await complete(
      [{ role: 'user', content: `请生成1到3个简短中文标签，只输出英文逗号分隔的标签：\n\n${content}` }],
      60,
      0.3
    );
    const tags = result.content
      .replace(/[#\[\]，、\n]/g, ',')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 3);
    send(request, response, 200, { tags }, requestId);
    return;
  }

  throw apiError(404, 'ROUTE_NOT_FOUND', '接口不存在');
}

const server = http.createServer(async (request, response) => {
  const requestId = request.headers['x-request-id'] || randomUUID();
  const startedAt = Date.now();
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${HOST}:${PORT}`}`);
    await route(request, response, url, requestId);
  } catch (error) {
    const status = Number(error?.status) || 500;
    send(
      request,
      response,
      status,
      {
        error: {
          code: error?.code || 'INTERNAL_ERROR',
          message: status >= 500 && !error?.code ? '后端发生内部错误' : error?.message,
          details: error?.details,
        },
      },
      requestId
    );
    if (status >= 500) console.error('[EdgeMind API]', requestId, error);
  } finally {
    console.log(
      JSON.stringify({
        requestId,
        method: request.method,
        path: request.url,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
      })
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[EdgeMind API] http://${HOST}:${PORT}/api/health`);
  console.log(`[EdgeMind API] data: ${path.resolve(DATA_FILE)}`);
  console.log(`[EdgeMind API] llama.cpp: ${LLAMA_BASE_URL}`);
});

function shutdown(signal) {
  console.log(`[EdgeMind API] ${signal}; shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
