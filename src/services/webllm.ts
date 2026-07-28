// TypeScript 的通用回退实现。Expo 会按平台优先选择 webllm.web.ts 或
// webllm.native.ts；保留此文件让非 Expo 工具也能解析模块。
export { createWebLLMService } from './webllm.native';
