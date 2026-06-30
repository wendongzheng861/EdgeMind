// ============================================================
// EdgeMind — 设置页
// 展示端侧AI配置、技术架构信息
// ============================================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ARCHITECTURE_ITEMS = [
  {
    icon: 'layers-outline',
    title: '分层架构',
    description: '服务层(Repository/Service) → Hooks(状态管理) → Components/Presentational → Expo Router(路由)',
  },
  {
    icon: 'git-branch-outline',
    title: '策略模式',
    description: 'IEdgeAIService 接口统一契约，支持 ONNX/MNN/WebLLM/Mock 多后端自由切换',
  },
  {
    icon: 'cube-outline',
    title: '工厂模式',
    description: 'AIServiceFactory 根据配置动态创建端侧AI服务实例，按需加载/卸载',
  },
  {
    icon: 'hardware-chip-outline',
    title: '端侧AI能力',
    description: '对话推理、文本嵌入(语义搜索)、智能摘要、自动标签，全部在设备本地运行',
  },
  {
    icon: 'shield-checkmark-outline',
    title: '隐私优先',
    description: '所有数据处理在端侧完成，数据不出设备。用户数据主权是核心设计原则',
  },
  {
    icon: 'flash-outline',
    title: '量化与优化',
    description: '支持 INT8/INT4 量化，并行推理，按需内存管理，推理耗时<200ms（取决于设备）',
  },
];

const AI_WORKFLOW_ITEMS = [
  '1. 用户输入 → useAI Hook 收集消息',
  '2. AIServiceFactory 创建对应后端服务实例',
  '3. IEdgeAIService.chat() 执行端侧推理',
  '4. 推理引擎加载量化模型 → 前向传播 → Token生成',
  '5. 记录 inferenceMs 性能指标',
  '6. 结果返回 → 更新UI → 可一键保存为笔记',
  '',
  '💡 整个过程在设备本地完成，无需联网',
];

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ 设置</Text>
        <Text style={styles.subtitle}>EdgeMind 端侧AI架构展示</Text>
      </View>

      {/* 项目信息 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 项目概述</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            EdgeMind 是一个端侧AI智能笔记助手Demo，展示了完整的移动端AI Native应用架构设计。
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="code-slash" size={16} color="#6C63FF" />
            <Text style={styles.infoText}>React Native + Expo + TypeScript</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="phone-portrait" size={16} color="#6C63FF" />
            <Text style={styles.infoText}>Android + iOS 双端一套代码</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="rocket-outline" size={16} color="#6C63FF" />
            <Text style={styles.infoText}>Vibe Coding 模式开发，AI辅助全流程</Text>
          </View>
        </View>
      </View>

      {/* 架构设计 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏗️ 架构设计</Text>
        {ARCHITECTURE_ITEMS.map((item, index) => (
          <View key={index} style={styles.archCard}>
            <View style={styles.archIcon}>
              <Ionicons name={item.icon as any} size={20} color="#6C63FF" />
            </View>
            <View style={styles.archText}>
              <Text style={styles.archTitle}>{item.title}</Text>
              <Text style={styles.archDesc}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* AI工作流 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 AI工作流（推理管线）</Text>
        <View style={styles.card}>
          {AI_WORKFLOW_ITEMS.map((line, i) => (
            <Text
              key={i}
              style={[
                styles.workflowLine,
                line.startsWith('💡') && styles.workflowHint,
                line === '' && { height: 8 },
              ]}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>

      {/* Vibe Coding */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎵 Vibe Coding 实践</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            本项目通过 Vibe Coding 模式开发，使用AI辅助完成：
          </Text>
          {[
            '✓ 架构设计决策与代码生成',
            '✓ Prompt Engineering 替代条件分支逻辑',
            '✓ AI工作流定义（推理管线编排）',
            '✓ 类型定义与数据契约设计',
            '✓ 组件架构与状态管理',
            '✓ 完整README和项目文档',
          ].map((item, i) => (
            <Text key={i} style={styles.vibeItem}>
              {item}
            </Text>
          ))}
        </View>
      </View>

      {/* 端侧AI配置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧠 端侧AI配置</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>推理引擎</Text>
            <Text style={styles.configValue}>Mock (演示) / ONNX / MNN / WebLLM</Text>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>模型量化</Text>
            <Text style={styles.configValue}>INT8 / INT4 可选</Text>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>最大Token</Text>
            <Text style={styles.configValue}>512 (可配置)</Text>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>推理模式</Text>
            <Text style={styles.configValue}>端侧离线 (不需联网)</Text>
          </View>
        </View>
      </View>

      {/* 项目说明 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 关于本项目</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            这个Demo项目是为展示以下核心能力而设计的：
          </Text>
          {[
            '1. 端侧AI架构设计与落地能力',
            '2. 跨平台移动端开发 (Android + iOS)',
            '3. Vibe Coding 模式下的AI研发提效',
            '4. 架构设计模式（策略/工厂/仓储）',
            '5. Prompt Engineering 与 AI工作流',
            '6. 产品思维（端侧AI的用户价值转化）',
          ].map((item, i) => (
            <Text key={i} style={styles.vibeItem}>
              {item}
            </Text>
          ))}
        </View>
        <Text style={styles.footer}>
          EdgeMind v1.0.0 | Built with Vibe Coding 🎵
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  title: {
    color: '#e0e0e0',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6C63FF',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#e0e0e0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#12122a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a3e',
  },
  cardText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
  },
  archCard: {
    flexDirection: 'row',
    backgroundColor: '#12122a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a3e',
    gap: 12,
  },
  archIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1a1a3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archText: {
    flex: 1,
  },
  archTitle: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  archDesc: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  workflowLine: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  workflowHint: {
    color: '#6C63FF',
  },
  vibeItem: {
    color: '#888',
    fontSize: 13,
    lineHeight: 24,
    paddingLeft: 8,
  },
  configCard: {
    backgroundColor: '#12122a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a3e',
    overflow: 'hidden',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  configLabel: {
    color: '#888',
    fontSize: 14,
  },
  configValue: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  configDivider: {
    height: 1,
    backgroundColor: '#1a1a3e',
    marginHorizontal: 16,
  },
  footer: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
