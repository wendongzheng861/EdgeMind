import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../src/theme';
import { useBackendStatus } from '../../src/hooks/useBackendStatus';
import { BackendApi } from '../../src/services/backend';
import type { ActivityEvent } from '../../src/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PIPELINE = [
  { label: '输入', detail: 'Context', icon: 'chatbox-ellipses-outline' as IoniconName },
  { label: '调度', detail: 'Factory', icon: 'git-branch-outline' as IoniconName },
  { label: '推理', detail: 'On-device', icon: 'hardware-chip-outline' as IoniconName },
  { label: '沉淀', detail: 'REST + Disk', icon: 'server-outline' as IoniconName },
];

const CAPABILITIES: Array<{
  icon: IoniconName;
  title: string;
  description: string;
  accent: string;
  accentBg: string;
}> = [
  {
    icon: 'server-outline',
    title: '真实数据后端',
    description: 'Node API 提供笔记 CRUD、搜索、统计、原子持久化和浏览器离线同步。',
    accent: colors.cyan,
    accentBg: colors.cyanSoft,
  },
  {
    icon: 'layers-outline',
    title: '统一 AI 服务契约',
    description: '对话、摘要、标签和向量嵌入共享同一接口，UI 不感知底层引擎。',
    accent: colors.primary,
    accentBg: colors.primarySoft,
  },
  {
    icon: 'swap-horizontal-outline',
    title: '可插拔推理后端',
    description: 'Factory + Strategy 组合，让 llama.cpp、Mock、ONNX、MNN 与 WebLLM 可独立演进。',
    accent: colors.cyan,
    accentBg: colors.cyanSoft,
  },
  {
    icon: 'shield-checkmark-outline',
    title: '隐私边界清晰',
    description: 'Safari 离线模型下载完成后，笔记与推理上下文都留在当前设备。',
    accent: colors.success,
    accentBg: colors.successSoft,
  },
  {
    icon: 'speedometer-outline',
    title: '性能可观测',
    description: '每次推理记录耗时，为真实模型接入后的量化与设备选型提供依据。',
    accent: colors.warning,
    accentBg: '#3A311D',
  },
  {
    icon: 'cloud-offline-outline',
    title: '断网可继续',
    description: '后端不可达时自动回退浏览器缓存，恢复连接后按更新时间合并数据。',
    accent: colors.success,
    accentBg: colors.successSoft,
  },
];

const ENGINES = [
  {
    name: 'EdgeMind Node API',
    detail: 'CRUD · 搜索 · 统计 · AI 代理 · JSON 落盘',
    status: '已接入',
    ready: true,
  },
  {
    name: 'Qwen2.5 7B · llama.cpp',
    detail: 'Windows 本机 GPU · GGUF Q4_K_M',
    status: '已接入',
    ready: true,
  },
  {
    name: 'Demo Engine',
    detail: '完整演示路径',
    status: '备用',
    ready: true,
  },
  {
    name: 'ONNX Runtime',
    detail: '接口与生命周期已预留',
    status: '待接入',
    ready: false,
  },
  {
    name: 'MNN',
    detail: '量化与内存策略已设计',
    status: '待接入',
    ready: false,
  },
  {
    name: 'Qwen2.5 0.5B · WebLLM',
    detail: 'Safari WebGPU · 首次下载后可离线',
    status: '已接入',
    ready: true,
  },
];

export default function TechnologyScreen() {
  const backend = useBackendStatus();
  const [activityOpen, setActivityOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleActivity = async () => {
    try {
      setEvents(await BackendApi.activity(50));
      setActivityOpen(true);
    } catch (error) {
      Alert.alert('读取失败', error instanceof Error ? error.message : '本机后端不可用');
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await BackendApi.exportData();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `edgemind-backup-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        setImportText(json);
        setImportOpen(true);
      }
    } catch (error) {
      Alert.alert('导出失败', error instanceof Error ? error.message : '本机后端不可用');
    } finally { setBusy(false); }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const data = JSON.parse(importText) as Record<string, unknown>;
      await BackendApi.importData(data);
      setImportOpen(false);
      setImportText('');
      Alert.alert('导入完成', '工作区数据已经写入本机后端。');
    } catch (error) {
      Alert.alert('导入失败', error instanceof Error ? error.message : 'JSON 格式无效');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>UNDER THE HOOD</Text>
          <Text style={styles.title}>端侧技术栈</Text>
          <Text style={styles.subtitle}>
            一个能讲清产品价值，也经得住架构追问的移动端 AI Demo。
          </Text>
        </View>

        <View
          style={[
            styles.backendCard,
            backend.phase === 'online' && styles.backendCardOnline,
          ]}
        >
          <View style={styles.backendIcon}>
            <Ionicons
              name={backend.phase === 'online' ? 'server' : 'server-outline'}
              size={19}
              color={backend.phase === 'online' ? colors.success : colors.muted}
            />
          </View>
          <View style={styles.backendCopy}>
            <Text style={styles.backendLabel}>EDGEMIND BACKEND</Text>
            <Text style={styles.backendTitle}>
              {backend.phase === 'online' ? '本机 API 已连接' : '当前使用离线缓存'}
            </Text>
            <Text style={styles.backendDetail}>
              {backend.phase === 'online'
                ? `${backend.noteCount ?? 0} 条服务端笔记 · ${backend.latencyMs ?? 0} ms`
                : backend.message}
            </Text>
          </View>
          <View
            style={[
              styles.backendStatus,
              backend.phase === 'online' && styles.backendStatusOnline,
            ]}
          >
            <Text
              style={[
                styles.backendStatusText,
                backend.phase === 'online' && styles.backendStatusTextOnline,
              ]}
            >
              {backend.phase === 'online' ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={25} color={colors.success} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>PRIVACY FIRST</Text>
              <Text style={styles.heroTitle}>从输入到沉淀，核心路径都在设备内。</Text>
            </View>
          </View>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>0</Text>
              <Text style={styles.heroMetricLabel}>默认云端请求</Text>
            </View>
            <View style={styles.heroMetricDivider} />
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>5</Text>
              <Text style={styles.heroMetricLabel}>可扩展后端</Text>
            </View>
            <View style={styles.heroMetricDivider} />
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>2</Text>
              <Text style={styles.heroMetricLabel}>移动平台</Text>
            </View>
          </View>
        </View>

        <SectionHeader
          title="推理管线"
          description="每一层只负责一件事"
        />
        <View style={styles.pipelineCard}>
          {PIPELINE.map((step, index) => (
            <React.Fragment key={step.label}>
              <View style={styles.pipelineStep}>
                <View style={styles.pipelineIcon}>
                  <Ionicons name={step.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.pipelineLabel}>{step.label}</Text>
                <Text style={styles.pipelineDetail}>{step.detail}</Text>
              </View>
              {index < PIPELINE.length - 1 && (
                <Ionicons name="chevron-forward" size={13} color={colors.muted} />
              )}
            </React.Fragment>
          ))}
        </View>

        <SectionHeader
          title="架构亮点"
          description="为真实模型接入保留清晰边界"
        />
        <View style={styles.capabilityGrid}>
          {CAPABILITIES.map((item) => (
            <View key={item.title} style={styles.capabilityCard}>
              <View
                style={[
                  styles.capabilityIcon,
                  { backgroundColor: item.accentBg },
                ]}
              >
                <Ionicons name={item.icon} size={19} color={item.accent} />
              </View>
              <Text style={styles.capabilityTitle}>{item.title}</Text>
              <Text style={styles.capabilityDescription}>{item.description}</Text>
            </View>
          ))}
        </View>

        <SectionHeader
          title="引擎就绪度"
          description="明确区分可演示与待接入能力"
        />
        <View style={styles.engineCard}>
          {ENGINES.map((engine, index) => (
            <View key={engine.name}>
              <View style={styles.engineRow}>
                <View
                  style={[
                    styles.engineStatusDot,
                    engine.ready && styles.engineStatusDotReady,
                  ]}
                />
                <View style={styles.engineCopy}>
                  <Text style={styles.engineName}>{engine.name}</Text>
                  <Text style={styles.engineDetail}>{engine.detail}</Text>
                </View>
                <View
                  style={[
                    styles.engineStatus,
                    engine.ready && styles.engineStatusReady,
                  ]}
                >
                  <Text
                    style={[
                      styles.engineStatusText,
                      engine.ready && styles.engineStatusTextReady,
                    ]}
                  >
                    {engine.status}
                  </Text>
                </View>
              </View>
              {index < ENGINES.length - 1 && <View style={styles.engineDivider} />}
            </View>
          ))}
        </View>

        <SectionHeader
          title="数据与活动"
          description="备份、恢复和查看真实操作记录"
        />
        <View style={styles.dataGrid}>
          <Pressable accessibilityRole="button" style={styles.dataCard} onPress={() => void handleExport()}>
            <View style={[styles.dataIcon, { backgroundColor: colors.primarySoft }]}>
              {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="download-outline" size={19} color={colors.primary} />}
            </View>
            <Text style={styles.dataTitle}>导出工作区</Text>
            <Text style={styles.dataDescription}>下载包含笔记、项目、任务和知识关系的 JSON 备份。</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.dataCard} onPress={() => { setImportText(''); setImportOpen(true); }}>
            <View style={[styles.dataIcon, { backgroundColor: colors.cyanSoft }]}>
              <Ionicons name="cloud-upload-outline" size={19} color={colors.cyan} />
            </View>
            <Text style={styles.dataTitle}>导入工作区</Text>
            <Text style={styles.dataDescription}>粘贴 EdgeMind JSON 备份，恢复到本机持久化存储。</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.dataCard} onPress={() => void handleActivity()}>
            <View style={[styles.dataIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="pulse-outline" size={19} color={colors.success} />
            </View>
            <Text style={styles.dataTitle}>活动中心</Text>
            <Text style={styles.dataDescription}>查看创建、编辑、同步、导入和任务流转的审计日志。</Text>
          </Pressable>
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={17} color={colors.cyan} />
          <Text style={styles.disclaimerText}>
            Qwen2.5 的耗时和生成速度来自当前电脑上的真实推理；不同设备、模型版本和上下文长度会产生差异。
          </Text>
        </View>

        <Text style={styles.footer}>EdgeMind · Expo SDK 52 · TypeScript</Text>
      </ScrollView>

      <Modal transparent visible={activityOpen} animationType="fade" onRequestClose={() => setActivityOpen(false)}>
        <View style={styles.modalScreen}>
          <Pressable style={styles.modalBackdrop} onPress={() => setActivityOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.eyebrow}>AUDIT TRAIL</Text><Text style={styles.modalTitle}>活动中心</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="关闭活动中心" style={styles.modalClose} onPress={() => setActivityOpen(false)}><Ionicons name="close" size={19} color={colors.text} /></Pressable>
            </View>
            <ScrollView style={styles.activityList}>
              {events.map((event) => (
                <View key={event.id} style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityCopy}><Text style={styles.activityAction}>{activityLabel(event.action)}</Text><Text style={styles.activityMeta}>{new Date(event.at).toLocaleString('zh-CN')} · {event.action}</Text></View>
                </View>
              ))}
              {!events.length ? <Text style={styles.emptyActivity}>暂无活动记录</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={importOpen} animationType="fade" onRequestClose={() => setImportOpen(false)}>
        <View style={styles.modalScreen}>
          <Pressable style={styles.modalBackdrop} onPress={() => setImportOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.eyebrow}>LOCAL RESTORE</Text><Text style={styles.modalTitle}>导入工作区备份</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="关闭导入" style={styles.modalClose} onPress={() => setImportOpen(false)}><Ionicons name="close" size={19} color={colors.text} /></Pressable>
            </View>
            <Text style={styles.importHint}>粘贴从 EdgeMind 导出的完整 JSON。导入会替换当前工作区，请确认已有备份。</Text>
            <TextInput accessibilityLabel="工作区 JSON" multiline value={importText} onChangeText={setImportText} placeholder={'{ "notes": [...], "projects": [...], "tasks": [...] }'} placeholderTextColor={colors.muted} style={styles.importInput} />
            <Pressable accessibilityRole="button" disabled={!importText.trim() || busy} style={[styles.importButton, (!importText.trim() || busy) && styles.importButtonDisabled]} onPress={() => void handleImport()}>{busy ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.importButtonText}>验证并导入</Text><Ionicons name="arrow-forward" size={15} color={colors.white} /></>}</Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function activityLabel(action: string): string {
  const labels: Record<string, string> = {
    'note.created': '创建笔记',
    'note.updated': '更新笔记',
    'note.deleted': '删除笔记',
    'notes.synced': '同步离线笔记',
    'project.created': '创建项目',
    'project.updated': '更新项目',
    'project.deleted': '删除项目',
    'task.created': '创建任务',
    'task.updated': '推进任务',
    'task.deleted': '删除任务',
    'link.created': '建立知识关联',
    'workspace.imported': '导入工作区',
  };
  return labels[action] || '工作区发生变化';
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 2,
    paddingBottom: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 5,
  },
  subtitle: {
    maxWidth: 340,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },
  heroCard: {
    padding: 17,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backendCard: {
    minHeight: 84,
    marginTop: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backendCardOnline: {
    borderColor: '#245C50',
  },
  backendIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
  },
  backendCopy: {
    flex: 1,
    marginLeft: 11,
  },
  backendLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  backendTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  backendDetail: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  backendStatus: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  backendStatusOnline: {
    backgroundColor: colors.successSoft,
  },
  backendStatusText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  backendStatusTextOnline: {
    color: colors.success,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
  heroCopy: {
    flex: 1,
    marginLeft: 13,
  },
  heroLabel: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    marginTop: 5,
  },
  heroMetrics: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  heroMetric: {
    flex: 1,
    alignItems: 'center',
  },
  heroMetricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  heroMetricLabel: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  heroMetricDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 11,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 9,
  },
  pipelineCard: {
    minHeight: 100,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pipelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  pipelineIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  pipelineLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 7,
  },
  pipelineDetail: {
    color: colors.muted,
    fontSize: 7,
    marginTop: 2,
  },
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  capabilityCard: {
    width: '48.6%',
    minHeight: 156,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capabilityIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capabilityTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  capabilityDescription: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 6,
  },
  engineCard: {
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  engineRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },
  engineStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  engineStatusDotReady: {
    backgroundColor: colors.success,
  },
  engineCopy: {
    flex: 1,
    marginLeft: 10,
  },
  engineName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  engineDetail: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  engineStatus: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  engineStatusReady: {
    backgroundColor: colors.successSoft,
  },
  engineStatusText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '700',
  },
  engineStatusTextReady: {
    color: colors.success,
  },
  engineDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  dataCard: {
    flex: 1,
    minWidth: 220,
    minHeight: 150,
    padding: 15,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dataIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  dataDescription: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 15,
    marginTop: 6,
  },
  modalScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '76%',
    padding: 19,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 3,
  },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  activityList: { marginTop: 14 },
  activityRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  activityCopy: { flex: 1 },
  activityAction: { color: colors.text, fontSize: 11, fontWeight: '700' },
  activityMeta: { color: colors.muted, fontSize: 8, marginTop: 4 },
  emptyActivity: { color: colors.muted, fontSize: 10, textAlign: 'center', paddingVertical: 38 },
  importHint: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 15,
  },
  importInput: {
    minHeight: 190,
    padding: 13,
    marginTop: 12,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 10,
    lineHeight: 16,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  importButton: {
    height: 46,
    marginTop: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primaryStrong,
  },
  importButtonDisabled: { opacity: 0.42 },
  importButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  disclaimer: {
    padding: 14,
    marginTop: 16,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: colors.cyanSoft,
  },
  disclaimerText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 16,
  },
  footer: {
    color: colors.muted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 22,
  },
});
