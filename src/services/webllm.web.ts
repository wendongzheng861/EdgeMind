import { v4 as uuid } from 'uuid';
import type { ChatCompletionMessageParam, MLCEngine } from '@mlc-ai/web-llm';
import type { AIConfig, ChatMessage } from '../types';
import type { IEdgeAIService } from './ai';
import { setWebLLMStatus } from './webllmStatus';

const WEBLLM_MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const WEBLLM_SYSTEM_PROMPT = `你是 EdgeMind 的离线 AI 助手，运行在用户手机浏览器内。
请始终使用简体中文，回答简洁、清晰、可执行。
帮助用户整理想法、总结笔记、生成结构和延展灵感。
只输出纯文本与简单编号，不使用 Markdown 标题或粗体。
不要声称访问了互联网、云端服务或用户没有提供的资料。`;

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

function userFacingError(error: unknown): string {
  const detail = error instanceof Error ? error.message : '未知错误';

  if (/WebGPU|navigator\.gpu|GPU/i.test(detail)) {
    return '当前浏览器未开启 WebGPU。请使用最新 Safari 并升级 iOS 后重试。';
  }

  if (/memory|OOM|device lost/i.test(detail)) {
    return '设备内存不足，请关闭后台页面后重新打开 EdgeMind。';
  }

  return `离线模型准备失败：${detail}`;
}

class WebLLMAIService implements IEdgeAIService {
  readonly provider = 'webllm' as const;
  isLoaded = false;
  private engine: MLCEngine | null = null;
  private loadPromise: Promise<void> | null = null;

  async load(_config: Partial<AIConfig>): Promise<void> {
    if (this.isLoaded && this.engine) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.loadModel();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async loadModel(): Promise<void> {
    const browserNavigator =
      typeof navigator === 'undefined'
        ? undefined
        : (navigator as Navigator & { gpu?: unknown });

    if (!browserNavigator?.gpu) {
      const message = '当前浏览器不支持 WebGPU，请使用最新 Safari。';
      setWebLLMStatus({ phase: 'unsupported', progress: 0, detail: message });
      throw new Error(message);
    }

    setWebLLMStatus({
      phase: 'checking',
      progress: 0,
      detail: '正在检查本机离线模型缓存',
    });

    try {
      const webllm = await import('@mlc-ai/web-llm');
      this.engine = await webllm.CreateMLCEngine(WEBLLM_MODEL_ID, {
        initProgressCallback: (report) => {
          const progress = Math.max(0, Math.min(1, report.progress));
          setWebLLMStatus({
            phase: progress >= 1 ? 'checking' : 'downloading',
            progress,
            detail: report.text || '正在下载离线模型',
          });
        },
      });
      this.isLoaded = true;
      setWebLLMStatus({
        phase: 'ready',
        progress: 1,
        detail: 'Qwen2.5 0.5B 已在本机就绪，可离线使用',
      });
    } catch (error) {
      this.engine = null;
      this.isLoaded = false;
      const message = userFacingError(error);
      setWebLLMStatus({ phase: 'error', progress: 0, detail: message });
      throw new Error(message);
    }
  }

  async unload(): Promise<void> {
    await this.engine?.unload();
    this.engine = null;
    this.isLoaded = false;
    setWebLLMStatus({
      phase: 'idle',
      progress: 0,
      detail: '离线模型已释放；缓存仍保留在此设备',
    });
  }

  async chat(messages: ChatMessage[]): Promise<ChatMessage> {
    await this.load({});
    if (!this.engine) throw new Error('离线模型尚未准备完成');

    const start = Date.now();
    const prompt: ChatCompletionMessageParam[] = [
      { role: 'system', content: WEBLLM_SYSTEM_PROMPT },
      ...messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-8)
        .map((message): ChatCompletionMessageParam =>
          message.role === 'user'
            ? { role: 'user', content: message.content }
            : { role: 'assistant', content: message.content }
        ),
    ];

    const completion = await this.engine.chat.completions.create({
      model: WEBLLM_MODEL_ID,
      messages: prompt,
      temperature: 0.65,
      top_p: 0.9,
      max_tokens: 280,
      stream: false,
    });
    const inferenceMs = Date.now() - start;
    const content = cleanText(completion.choices[0]?.message.content || '');

    if (!content) throw new Error('离线模型没有返回有效内容');

    const completionTokens = completion.usage?.completion_tokens;
    return {
      id: uuid(),
      role: 'assistant',
      content,
      inferenceMs,
      tokensPerSecond:
        completionTokens && inferenceMs > 0
          ? (completionTokens * 1000) / inferenceMs
          : undefined,
      timestamp: Date.now(),
    };
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error('离线语义搜索需要单独下载 Embedding 模型');
  }

  async summarize(text: string): Promise<string> {
    const reply = await this.chat([
      {
        id: uuid(),
        role: 'user',
        content: `请把下面内容总结成一句不超过50字的话，只输出摘要：\n\n${text.slice(0, 3000)}`,
        timestamp: Date.now(),
      },
    ]);
    return reply.content;
  }

  async suggestTags(text: string): Promise<string[]> {
    const reply = await this.chat([
      {
        id: uuid(),
        role: 'user',
        content: `请为下面内容生成1到3个简短中文标签。只输出用英文逗号分隔的标签，不要输出解释：\n\n${text.slice(0, 3000)}`,
        timestamp: Date.now(),
      },
    ]);

    return reply.content
      .replace(/[#\[\]，、\n]/g, ',')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 3);
  }
}

export function createWebLLMService(): IEdgeAIService {
  return new WebLLMAIService();
}
