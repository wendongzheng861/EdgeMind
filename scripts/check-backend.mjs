import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const port = 18787;
const baseUrl = `http://127.0.0.1:${port}/api`;
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'edgemind-api-'));
const dataFile = path.join(temporaryDirectory, 'data.json');
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: path.resolve('.'),
  env: {
    ...process.env,
    EDGEMIND_API_PORT: String(port),
    EDGEMIND_DATA_FILE: dataFile,
    EDGEMIND_LLAMA_URL: 'http://127.0.0.1:18999',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let logs = '';
child.stdout.on('data', (chunk) => {
  logs += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  logs += chunk.toString();
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, init) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const payload = await response.json();
  return { response, payload };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const result = await request('/health');
      if (result.response.ok) return result.payload;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Backend did not start:\n${logs}`);
}

try {
  const health = await waitForServer();
  assert(health.service === 'edgemind-api', 'Health response is missing service name');
  assert(health.ai.ready === false, 'Unavailable llama.cpp must be reported honestly');

  const initial = await request('/notes');
  assert(initial.response.ok && initial.payload.notes.length === 3, 'Expected three seed notes');

  const forbiddenOrigin = await request('/notes', {
    method: 'POST',
    headers: { Origin: 'https://malicious.example' },
    body: JSON.stringify({ title: '不应写入', content: '跨站请求' }),
  });
  assert(
    forbiddenOrigin.response.status === 403 &&
      forbiddenOrigin.payload.error.code === 'ORIGIN_FORBIDDEN',
    'Cross-origin writes to the loopback API must be rejected'
  );

  const invalid = await request('/notes', {
    method: 'POST',
    body: JSON.stringify({ title: '', content: '' }),
  });
  assert(invalid.response.status === 400, 'Invalid notes must be rejected');

  const created = await request('/notes', {
    method: 'POST',
    body: JSON.stringify({
      title: '后端联调笔记',
      content: '这条数据由真实 Node API 持久化。',
      summary: '验证前后端闭环。',
      tags: ['后端', '联调'],
      source: 'manual',
      starred: false,
    }),
  });
  assert(created.response.status === 201, 'Create note failed');
  const noteId = created.payload.note.id;

  const updated = await request(`/notes/${encodeURIComponent(noteId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ starred: true, title: '已联调的后端笔记' }),
  });
  assert(updated.payload.note.starred === true, 'Update note failed');

  const search = await request('/notes?q=%E5%90%8E%E7%AB%AF&starred=true');
  assert(search.payload.notes.some((note) => note.id === noteId), 'Backend search failed');

  const synced = await request('/notes/sync', {
    method: 'POST',
    body: JSON.stringify({
      notes: [
        {
          id: 'offline-note',
          title: '离线迁移',
          content: '浏览器离线笔记已合并进后端。',
          summary: '',
          tags: ['同步'],
          source: 'manual',
          starred: false,
          createdAt: 1000,
          updatedAt: Date.now() + 1000,
        },
      ],
    }),
  });
  assert(synced.payload.notes.some((note) => note.id === 'offline-note'), 'Offline sync failed');

  const stats = await request('/stats');
  assert(stats.payload.stats.totalNotes === 5, 'Stats do not reflect mutations');

  const activity = await request('/activity?limit=10');
  assert(activity.payload.events.length >= 3, 'Audit activity was not recorded');

  const projects = await request('/projects');
  assert(projects.response.ok && projects.payload.projects.length >= 2, 'Projects were not seeded');

  const projectCreated = await request('/projects', {
    method: 'POST',
    body: JSON.stringify({ name: 'API 验收项目', description: '验证大型工作台的数据闭环。' }),
  });
  assert(projectCreated.response.status === 201, 'Create project failed');

  const taskCreated = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: '验证项目任务流转',
      projectId: projectCreated.payload.project.id,
      status: 'todo',
      priority: 'high',
    }),
  });
  assert(taskCreated.response.status === 201, 'Create task failed');
  const taskUpdated = await request(`/tasks/${taskCreated.payload.task.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'doing' }),
  });
  assert(taskUpdated.payload.task.status === 'doing', 'Update task failed');

  const linkCreated = await request('/links', {
    method: 'POST',
    body: JSON.stringify({
      fromNoteId: 'demo-edge-ai-review',
      toNoteId: 'demo-quantization-checklist',
      relation: 'extends',
    }),
  });
  assert(linkCreated.response.status === 201, 'Create knowledge link failed');

  const dashboard = await request('/dashboard');
  assert(
    dashboard.response.ok && dashboard.payload.dashboard.stats.activeProjects >= 3,
    'Dashboard aggregation failed'
  );

  const exported = await request('/export');
  assert(exported.payload.data.tasks.length >= 4, 'Workspace export failed');

  const ai = await request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
  });
  assert(ai.response.status === 503 && ai.payload.error.code === 'AI_UNAVAILABLE', 'AI proxy failure must be explicit');

  const deleted = await request(`/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
  assert(deleted.payload.deleted === true, 'Delete note failed');

  const persisted = JSON.parse(await readFile(dataFile, 'utf8'));
  assert(persisted.notes.some((note) => note.id === 'offline-note'), 'Data file was not persisted');
  assert(!persisted.notes.some((note) => note.id === noteId), 'Deleted note remained on disk');

  console.log('Backend health: PASS');
  console.log('Notes CRUD/search/sync/stats/activity: PASS');
  console.log('Projects/tasks/links/dashboard/export: PASS');
  console.log('AI unavailable error boundary: PASS');
  console.log(`Persistent JSON store: PASS (${persisted.notes.length} notes)`);
} finally {
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 3000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await rm(temporaryDirectory, { recursive: true, force: true });
}
