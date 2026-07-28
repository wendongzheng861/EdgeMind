import type { AIConfig, ChatMessage } from '../types';
import type { IEdgeAIService } from './ai';
import { setWebLLMStatus } from './webllmStatus';

class UnsupportedWebLLMService implements IEdgeAIService {
  readonly provider = 'webllm' as const;
  isLoaded = false;

  async load(_config: Partial<AIConfig>): Promise<void> {
    const message = 'WebLLM 仅在支持 WebGPU 的浏览器中可用。';
    setWebLLMStatus({ phase: 'unsupported', progress: 0, detail: message });
    throw new Error(message);
  }

  async unload(): Promise<void> {
    this.isLoaded = false;
  }

  async chat(_messages: ChatMessage[]): Promise<ChatMessage> {
    throw new Error('请在 Safari 或 Chrome 浏览器中使用离线 WebLLM。');
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error('WebLLM 不支持当前原生运行环境。');
  }

  async summarize(_text: string): Promise<string> {
    throw new Error('WebLLM 不支持当前原生运行环境。');
  }

  async suggestTags(_text: string): Promise<string[]> {
    throw new Error('WebLLM 不支持当前原生运行环境。');
  }
}

export function createWebLLMService(): IEdgeAIService {
  return new UnsupportedWebLLMService();
}
