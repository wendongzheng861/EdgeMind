# 🧠 EdgeMind — 端侧AI智能笔记助手

[![Expo](https://img.shields.io/badge/Expo-52.0-000020?logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-6C63FF)](#)
[![Vibe Coding](https://img.shields.io/badge/Vibe%20Coding-%F0%9F%8E%B5-6C63FF)](#)

> **面试展示项目** — 展示端侧AI架构设计 + 跨平台开发 + Vibe Coding 实践

EdgeMind 是一个本地优先的全栈 AI 笔记 Demo，展示了**真实后端交互、持久化、本地推理、离线回退和跨平台开发**。

- **Windows Web / 桌面演示**：Expo Web 调用 `127.0.0.1:8787` 的 EdgeMind Node API；后端负责笔记 CRUD、搜索、统计、审计日志、JSON 原子落盘，并代理 `127.0.0.1:8080` 的 Qwen2.5 7B。
- **iPhone Safari 网页版**：通过 WebLLM 在浏览器 WebGPU 中运行 Qwen2.5 0.5B；第一次下载模型，之后模型和推理都保留在 Safari 本机缓存中。

两条链路都不调用云端大模型。桌面笔记保存在本机后端数据文件中并镜像到浏览器缓存；后端断开时仍可离线操作。手机离线入口的数据和模型留在 Safari 中。

---

## ✨ 核心功能

| 功能 | 说明 | 技术实现 |
|------|------|----------|
| 🤖 **本地 AI 对话** | 与本机 Qwen 真实对话 | Node AI Proxy + llama.cpp（桌面 7B）/ WebLLM（Safari 0.5B） |
| 📝 **笔记 CRUD** | 新建、读取、编辑、收藏和删除，刷新后仍保留 | REST API + JSON 原子落盘 + Repository 模式 |
| 🔍 **全文搜索** | 标题、正文和标签联合检索 | 服务端搜索接口；断网时浏览器本地检索 |
| 🏷️ **摘要与标签** | 本机模型生成摘要和主题标签；模型不可用时保底保存 | 后端 AI 接口 + 本地降级策略 |
| 📊 **实时统计** | 笔记数、字数、热门标签和平均长度 | 服务端聚合统计 + 前端状态卡 |
| 🔄 **离线同步** | 后端不可达时使用缓存，恢复后按 `updatedAt` 合并 | AsyncStorage + `/api/notes/sync` |

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
│   Backend API Client / AI Strategy / Repository│
├─────────────────────────────────────────────┤
│        EdgeMind Node API (业务后端)            │
│ Notes CRUD / Search / Stats / Sync / Audit   │
│ AI Proxy → llama.cpp 127.0.0.1:8080          │
├─────────────────────────────────────────────┤
│          Data Layer (本地持久化)               │
│ JSON 原子落盘 + AsyncStorage 离线镜像 + SQLite │
└─────────────────────────────────────────────┘
```

### 设计模式运用

| 模式 | 位置 | 说明 |
|------|------|------|
| **策略模式** | `services/ai.ts` | IEdgeAIService 接口，支持 llama.cpp/ONNX/MNN/Mock 多后端 |
| **工厂模式** | `AIServiceFactory` | 根据配置动态创建AI服务实例 |
| **仓储模式** | `NoteRepository` | API 优先、离线回退，对页面提供统一 CRUD 接口 |
| **Hooks模式** | `hooks/useAI.ts` | 封装端侧AI生命周期，React状态管理 |
| **单例模式** | `getAIService()` | 全局端侧AI服务实例管理 |

### 真实后端接口

后端完全使用 Node.js 内置模块，无额外 Web 框架依赖。默认只监听本机回环地址，数据写入 `server/data/edgemind.json`。

| 方法 | 路径 | 作用 |
|------|------|------|
| `GET` | `/api/health` | 后端、数据文件和 llama.cpp 健康状态 |
| `GET/POST` | `/api/notes` | 列表、搜索和创建笔记 |
| `GET/PATCH/DELETE` | `/api/notes/:id` | 笔记详情、更新和删除 |
| `POST` | `/api/notes/sync` | 浏览器缓存与后端按更新时间合并 |
| `GET` | `/api/stats` | 服务端实时统计 |
| `GET` | `/api/activity` | 最近业务操作审计记录 |
| `POST` | `/api/ai/chat` | 后端代理本机模型对话 |
| `POST` | `/api/ai/summarize` | 生成笔记摘要 |
| `POST` | `/api/ai/tags` | 生成主题标签 |

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
- **手机入口**：<https://wendongzheng861.github.io/EdgeMind/mobile/>；手机打开项目根地址也会在首屏脚本执行前跳转到这个轻量入口。
- **下载**：首次在 Safari 中启用时约 290 MB；35 个不超过 8 MiB 的固定 CDN 分片支持按完整参数包断点续下，浏览器运行时还需要约 945 MB WebGPU 可用内存。
- **离线边界**：模型下载并缓存完成后，对话推理无需电脑或网络；若 Safari 清理网站数据，需要重新下载。
- **真机诊断**：页面直接显示 WebGPU、`shader-f16`、存储配额、模型缓存、实际字节进度、WebLLM 初始化回调和错误原因，不再用静态 0% 代替状态。
- **设备边界**：需要 Safari 26 / iOS 26 的 WebGPU。它是轻量离线助手，能力明显弱于桌面 7B。
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

# 终端 2：同时启动 Node 后端和 Web 前端
npm run fullstack
```

验证本地模型：

```powershell
npm run model:check
```

单独验证后端的 CRUD、搜索、同步、统计、审计、持久化和 AI 错误边界：

```powershell
npm run backend:check
```

`npm run fullstack` 会为当前 Web 开发进程注入 `EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:8787`，退出前端时会一并停止由脚本启动的后端。也可以分别运行 `npm run backend` 和 `npm run web`。

> GitHub Pages 只能发布静态前端，不能运行 Node 后端。公开的手机地址继续使用 Safari WebLLM 离线模式；完整前后端版当前在本机运行。若要让任意手机共享服务端笔记，需要另外部署 Node API，并用 HTTPS 域名配置 `EXPO_PUBLIC_BACKEND_URL`。

默认模型路径和服务端口写在 `scripts/start-local-model.ps1`。如需修改前端连接地址，可复制 `.env.example` 为 `.env.local` 后调整。

仅体验 iPhone Safari 离线版时，无需启动 `llama.cpp`；直接打开
<https://wendongzheng861.github.io/EdgeMind/mobile/>，点击“下载并启动离线模型”并保持 Safari 在前台即可。

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
├── server/
│   ├── index.mjs            # REST API、校验、CORS、AI 代理
│   └── store.mjs            # JSON 数据库与原子写入队列
├── scripts/
│   ├── start-full-stack.ps1 # 一键启动后端 + Expo Web
│   ├── check-backend.mjs    # 独立数据文件上的后端集成测试
│   ├── start-local-model.ps1 # 启动本机 GGUF 推理
│   ├── check-local-model.ps1 # 健康检查与真实问答
│   └── verify-mobile-page.mjs # 手机入口、清单与分片一致性检查
├── public/mobile/index.html  # 不依赖 Expo 启动包的轻量手机入口
├── cdn/model-parts/          # 固定标签发布的 8 MiB WebLLM 模型分片
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
