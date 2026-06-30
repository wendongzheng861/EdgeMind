# 🧠 EdgeMind — 端侧AI智能笔记助手

[![Expo](https://img.shields.io/badge/Expo-52.0-000020?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-6C63FF)](#)
[![Vibe Coding](https://img.shields.io/badge/Vibe%20Coding-%F0%9F%8E%B5-6C63FF)](#)

> **面试展示项目** — 展示端侧AI架构设计 + 跨平台开发 + Vibe Coding 实践

EdgeMind 是一个完整的端侧AI Native移动应用 Demo，展示了**端侧大模型推理、AI智能体架构、跨平台开发**的核心能力。所有AI推理均在设备本地完成，数据不出手机。

---

## ✨ 核心功能

| 功能 | 说明 | 技术实现 |
|------|------|----------|
| 🤖 **端侧AI对话** | 与本地AI模型对话，响应<200ms | IEdgeAIService 策略模式 |
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
│   ┌────┴─────┐ ┌──────┐ ┌────────┐         │
│   │ ONNX RT  │ │ MNN  │ │ Mock   │         │
│   │ (微软)   │ │ (阿里)│ │ (演示) │         │
│   └──────────┘ └──────┘ └────────┘         │
├─────────────────────────────────────────────┤
│          Data Layer (端侧存储)                │
│   SQLite (结构化) + AsyncStorage (KV)        │
└─────────────────────────────────────────────┘
```

### 设计模式运用

| 模式 | 位置 | 说明 |
|------|------|------|
| **策略模式** | `services/ai.ts` | IEdgeAIService 接口，支持 ONNX/MNN/Mock 多后端 |
| **工厂模式** | `AIServiceFactory` | 根据配置动态创建AI服务实例 |
| **仓储模式** | `NoteRepository` | 封装SQLite数据访问，提供统一CRUD接口 |
| **Hooks模式** | `hooks/useAI.ts` | 封装端侧AI生命周期，React状态管理 |
| **单例模式** | `getAIService()` | 全局端侧AI服务实例管理 |

## 🧠 端侧AI能力

### 支持的推理后端

| 后端 | 框架 | 特点 | 状态 |
|------|------|------|------|
| **ONNX Runtime** | onnxruntime-react-native | 微软开源，跨平台，支持INT8量化 | 🔧 需集成 |
| **MNN** | MNN-Chat | 阿里巴巴开源，移动端优化，算子融合 | 🔧 需集成 |
| **WebLLM** | WebLLM via WebView | WebGPU加速，支持LLM | 📋 计划中 |
| **Mock** | 内置 | 演示模式，展示AI工作流架构 | ✅ 可用 |

### 端侧AI推理管线

```
用户输入 → Hook收集消息 → Factory创建服务实例
  → 模型加载(按需) → 量化推理 → Token生成
  → 记录inferenceMs → 返回结果 → UI更新
```

### 性能特征（模拟数据）

- **模型加载**：~300ms（量化模型）
- **单次推理**：50-500ms（取决于模型大小和设备）
- **内存占用**：<200MB（INT8量化后）
- **量化支持**：INT8 / INT4

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
- Node.js >= 18
- npm / yarn
- Expo CLI (`npx expo`)
- iOS：Xcode (Mac)
- Android：Android Studio + Android SDK

### 安装

```bash
# 克隆仓库
git clone https://github.com/<你的用户名>/EdgeMind.git
cd EdgeMind

# 安装依赖
npm install

# 启动
npx expo start
```

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
