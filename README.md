# 🧠 EdgeMind — 端侧AI智能笔记助手

[![Expo](https://img.shields.io/badge/Expo-52.0-000020?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-6C63FF)](#)
[![Vibe Coding](https://img.shields.io/badge/Vibe%20Coding-%F0%9F%8E%B5-6C63FF)](#)

> **面试展示项目** — 展示端侧AI架构设计 + 跨平台开发 + Vibe Coding 实践

EdgeMind 是一个本地优先的 AI 笔记应用 Demo，展示了**真实本地推理、可插拔 AI 架构和跨平台开发**。

- **Windows Web / 桌面演示**：通过只监听 `127.0.0.1` 的 llama.cpp 服务调用电脑上的 Qwen2.5 7B GGUF。
- **iPhone Safari 网页版**：通过 WebLLM 在浏览器 WebGPU 中运行 Qwen2.5 0.5B；第一次下载模型，之后模型和推理都保留在 Safari 本机缓存中。

两条链路都不调用云端大模型；笔记数据保存在浏览器或移动设备本地。

---

## ✨ 核心功能

| 功能 | 说明 | 技术实现 |
|------|------|----------|
| 🤖 **端侧AI对话** | 与本机 Qwen 真实对话 | llama.cpp（桌面 7B）/ WebLLM（Safari 0.5B） |
| 📝 **智能笔记** | AI自动生成标题、摘要、标签 | Prompt Engineering + 端侧推理 |
| 🔍 **语义搜索** | 基于向量嵌入的离线搜索 | Embedding Service |
| 🏷️ **自动标签** | 端侧AI识别内容主题并打标签 | suggestTags() 推理管线 |
| 📊 **使用统计** | 笔记数、字数、连续天数追踪 | SQLite + Repository 模式 |
| 🎙️ **语音输入** | 语音转文字输入（预留） | Expo Speech API |

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────┐
│              Expo Router (路由层)              │
│   app/(tabs) → AI对话 / 笔记 / 设置           │
├─────────────────────────────────────────────┤
│            Components (展示层)                 │
│   AIChat.tsx / NoteCard.tsx / NoteDetail     │
├─────────────────────────────────────────────┤
│              Hooks (状态管理层)                 │
│   useAI.ts / useNotes.ts                     │
├─────────────────────────────────────────────┤
│            Services (服务层)                   │
│   ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│   │ AI Service│ │ Storage  │ │ Embedding  │  │
│   │ (策略模式)│ │(仓储模式)│ │(向量搜索)  │  │
│   └────┬─────┘ └──────────┘ └────────────┘  │
│        │                                      │
│   ┌──────────┐ ┌──────┐ ┌────────┐         │
│   │llama.cpp │ │WebLLM│ │ Mock   │         │
│   │桌面 7B   │ │手机0.5B│ │备用   │         │
│   └──────────┘ └──────┘ └────────┘         │
├─────────────────────────────────────────────┤
│          Data Layer (端侧存储)                │
│   SQLite (结构化) + AsyncStorage (KV)        │
└─────────────────────────────────────────────┘
```

### 设计模式运用

| 模式 | 位置 | 说明 |
|------|------|------|
| **策略模式** | `services/ai.ts` | IEdgeAIService 接口，支持 llama.cpp/ONNX/MNN/Mock 多后端 |
| **工厂模式** | `AIServiceFactory` | 根据配置动态创建AI服务实例 |
| **仓储模式** | `NoteRepository` | 封装SQLite数据访问，提供统一CRUD接口 |
| **Hooks模式** | `hooks/useAI.ts` | 封装端侧AI生命周期，React状态管理 |
| **单例模式** | `getAIService()` | 全局端侧AI服务实例管理 |

## 🧠 端侧AI能力

### 支持的推理后端

| 后端 | 框架 | 特点 | 状态 |
|------|------|------|------|
| **Qwen2.5 7B** | llama.cpp + GGUF | 本机 GPU、Q4_K_M、OpenAI 兼容接口 | ✅ 已接入 |
| **ONNX Runtime** | onnxruntime-react-native | 微软开源，跨平台，支持INT8量化 | 🔧 需集成 |
| **MNN** | MNN-Chat | 阿里巴巴开源，移动端优化，算子融合 | 🔧 需集成 |
| **WebLLM** | WebLLM + WebGPU | Safari 浏览器内运行 Qwen2.5 0.5B；首次下载后离线 | ✅ 已接入（Web） |
| **Mock** | 内置 | 演示模式，展示AI工作流架构 | ✅ 可用 |

### 端侧AI推理管线

```
用户输入 → Hook收集消息 → Factory创建服务实例
  → 模型加载(按需) → 量化推理 → Token生成
  → 记录inferenceMs → 返回结果 → UI更新
```

### 当前本地模型

- **模型文件**：`qwen2.5-7b-instruct-q4_k_m.gguf`
- **模型大小**：约 4.68 GB
- **量化格式**：Q4_K_M
- **推理后端**：llama.cpp Vulkan
- **接口地址**：`http://127.0.0.1:8080`
- **性能展示**：界面记录真实总耗时和生成速度（tok/s）
- **本机实测**：RTX 4060 Laptop 8GB / i7-14650HX，示例回答约 40.5 tok/s；具体速度会随提示词和输出长度变化

### iPhone Safari 离线模型

- **模型**：WebLLM 预编译的 `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`
- **下载**：首次在 Safari 中启用时约 290 MB；浏览器还需要约 945 MB WebGPU 可用内存。
- **离线边界**：模型下载并缓存完成后，对话推理无需电脑或网络；若 Safari 清理网站数据，需要重新下载。
- **设备边界**：需要支持 WebGPU 的新版 Safari。它是轻量离线助手，能力明显弱于桌面 7B。
- **安装方式**：访问已发布地址后，在 iPhone Safari 选择“分享”→“添加到主屏幕”。

## 🎵 Vibe Coding 实践

本项目采用 **Vibe Coding** 模式开发——通过AI辅助完成：

### 使用的AI工具
- **Cursor** — 代码生成与重构
- **AI对话** — 架构设计与决策讨论
- **Prompt Engineering** — 替代传统条件分支

### Prompt 方法论
在项目中展示了 **Prompt Engineering** 替代传统编码的实践：
- `generateResponse()` — 用Prompt模板替代if-else逻辑树
- `summarize()` — 端侧摘要Prompt模板
- `suggestTags()` — 基于关键词的AI标签生成

### Vibe Coding 流程
```
需求分析 → AI对话设计架构 → Cursor生成代码
  → AI Review → Prompt调优 → 迭代完善
```

## 🚀 快速开始

### 前置要求
- Node.js 20（Expo SDK 52 推荐）
- npm / yarn
- Expo CLI (`npx expo`)
- Windows 本地模型：llama.cpp Vulkan 运行库与 GGUF 模型
- iOS：Xcode (Mac)
- Android：Android Studio + Android SDK

### 安装

```bash
# 克隆仓库
git clone https://github.com/<你的用户名>/EdgeMind.git
cd EdgeMind

# 安装依赖
npm install

# 桌面 7B（Windows 可选）：终端 1 启动本地 Qwen
npm run model:start

# 终端 2：启动 Web Demo
npm run web
```

验证本地模型：

```powershell
npm run model:check
```

默认模型路径和服务端口写在 `scripts/start-local-model.ps1`。如需修改前端连接地址，可复制 `.env.example` 为 `.env.local` 后调整。

仅体验 iPhone Safari 离线版时，无需启动 `llama.cpp`；在手机打开发布后的网页，等待 Qwen2.5 0.5B 首次下载完成即可。

### 运行

```bash
# iOS 模拟器 (Mac)
npx expo start --ios

# Android 模拟器
npx expo start --android

# Web 浏览器 (快速预览)
npx expo start --web

# 真机扫码 (Expo Go App)
npx expo start
```

## 📁 项目结构

```
EdgeMind/
├── app/                    # Expo Router 页面
│   ├── _layout.tsx         # 根布局
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Tab导航
│   │   ├── index.tsx       # AI对话主页
│   │   ├── notes.tsx       # 笔记列表
│   │   └── settings.tsx    # 设置/架构展示
│   └── note/
│       └── [id].tsx        # 笔记详情
├── src/
│   ├── components/         # UI组件
│   │   ├── AIChat.tsx      # AI对话面板
│   │   └── NoteCard.tsx    # 笔记卡片
│   ├── services/
│   │   ├── ai.ts           # 端侧AI服务 (策略/工厂模式)
│   │   └── storage.ts      # 本地存储 (仓储模式)
│   ├── hooks/
│   │   ├── useAI.ts        # AI对话状态管理
│   │   └── useNotes.ts     # 笔记CRUD状态管理
│   └── types.ts            # TypeScript 类型定义
├── scripts/
│   ├── start-local-model.ps1 # 启动本机 GGUF 推理
│   └── check-local-model.ps1 # 健康检查与真实问答
├── package.json
├── tsconfig.json
├── app.json
└── README.md
```

## 🔑 面试亮点

### 为什么这个项目能展示我的能力

1. **✅ 端侧AI落地** — 完整展示了端侧AI架构设计，从接口抽象到多后端策略模式
2. **✅ 跨平台开发** — Expo一套代码覆盖Android+iOS，展示移动端生命周期管理
3. **✅ 架构设计** — 策略模式、工厂模式、仓储模式、Hooks模式的实际运用
4. **✅ Vibe Coding** — 通过AI辅助完成整个项目，展示Prompt工程和AI工作流
5. **✅ 产品思维** — 将端侧AI能力转化为"智能笔记"这一用户可感知的产品价值
6. **✅ 代码审美** — TypeScript类型安全、模块化、清晰的接口定义
7. **✅ MNN-Chat理解** — 展示了MNN架构、量化策略、端侧优化方案
8. **✅ 性能意识** — inferenceMs追踪、量化配置、内存管理设计

### 面试官引导

在面试中，我可以深入讲解：
- 端侧AI的**量化策略选择**和**内存管理方案**
- **MNN-Chat**的架构设计与部署经验
- 如何用**Prompt Engineering**替代传统条件分支逻辑
- **端侧AI推理管线**的性能优化方法
- **Vibe Coding**模式下的研发效率提升实践

## 📄 License

MIT

---

*Built with 🎵 Vibe Coding — 用AI从底层重构移动端技术架构*
