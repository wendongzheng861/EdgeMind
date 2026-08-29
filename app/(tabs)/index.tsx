import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppHeader from '../../src/components/AppHeader';
import { BackendApi } from '../../src/services/backend';
import { colors, radius, shadows } from '../../src/theme';
import type { DashboardData, Task } from '../../src/types';

type CaptureMode = 'note' | 'task';

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('note');
  const [captureText, setCaptureText] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try { setDashboard(await BackendApi.dashboard()); }
    catch { setDashboard(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const openCapture = (mode: CaptureMode) => {
    setCaptureMode(mode);
    setCaptureText('');
    setCaptureOpen(true);
  };

  const submitCapture = async () => {
    const value = captureText.trim();
    if (!value) return;
    setSaving(true);
    try {
      if (captureMode === 'task') {
        await BackendApi.createTask({ title: value, priority: 'medium', status: 'todo' });
      } else {
        const title = value.split(/\n|。|！|？/)[0].slice(0, 42) || '快速记录';
        await BackendApi.createNote({ title, content: value, summary: value.slice(0, 80), tags: ['收件箱'], source: 'manual', starred: false, status: 'inbox', projectId: null });
      }
      setCaptureOpen(false);
      await refresh();
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '本机后端暂时不可用');
    } finally { setSaving(false); }
  };

  const cycleTask = async (task: Task) => {
    const next = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
    await BackendApi.updateTask(task.id, { status: next });
    await refresh();
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.shell}>
          <AppHeader eyebrow="LOCAL KNOWLEDGE OS" title="EdgeMind 工作台" subtitle="所有数据只在你的设备与本机后端流转" />
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>{greeting}，今天想推进什么？</Text>
              <Text style={styles.heroTitle}>把碎片变成{wide ? '\n' : ' '}下一步行动。</Text>
              <Text style={styles.heroBody}>快速记录进入收件箱，随后归入项目、连接知识，并由本地 AI 帮你继续推演。</Text>
              <View style={styles.heroActions}>
                <Pressable accessibilityRole="button" style={styles.primaryAction} onPress={() => openCapture('note')}><Ionicons name="add" size={18} color={colors.white} /><Text style={styles.primaryActionText}>快速记录</Text></Pressable>
                <Pressable accessibilityRole="button" style={styles.secondaryAction} onPress={() => openCapture('task')}><Ionicons name="checkbox-outline" size={16} color={colors.primary} /><Text style={styles.secondaryActionText}>添加任务</Text></Pressable>
              </View>
            </View>
            <View style={styles.heroSignal}>
              <View style={styles.signalOrb}><Ionicons name="sparkles" size={28} color={colors.primary} /></View>
              <Text style={styles.signalLabel}>TODAY SIGNAL</Text><Text style={styles.signalValue}>{dashboard?.stats.openTasks ?? '—'}</Text><Text style={styles.signalMeta}>个待推进任务</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="让 AI 帮我规划" onPress={() => router.push('/ai')} style={styles.askButton}><Text style={styles.askButtonText}>让 AI 帮我规划</Text><Ionicons name="arrow-forward" size={14} color={colors.cyan} /></Pressable>
            </View>
          </View>

          {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>正在连接本地知识库</Text></View> : dashboard ? <>
            <View style={styles.metrics}>
              <Metric icon="archive-outline" value={dashboard.stats.inboxCount} label="收件箱" accent={colors.primary} />
              <Metric icon="folder-open-outline" value={dashboard.stats.activeProjects} label="活跃项目" accent={colors.cyan} />
              <Metric icon="checkbox-outline" value={dashboard.stats.openTasks} label="待办任务" accent={colors.warning} />
              <Metric icon="git-network-outline" value={dashboard.notes.length} label="最近知识" accent={colors.success} />
            </View>
            <View style={[styles.columns, wide && styles.columnsWide]}>
              <View style={styles.mainColumn}>
                <SectionTitle title="今日焦点" detail="点击任务即可推进状态" action="查看项目" onPress={() => router.push('/projects')} />
                <View style={styles.taskList}>{dashboard.tasks.filter((task) => task.status !== 'done').slice(0, 4).map((task) => <Pressable key={task.id} style={styles.taskRow} onPress={() => void cycleTask(task)} accessibilityRole="button"><View style={[styles.taskCheck, task.status === 'doing' && styles.taskCheckDoing]}><Ionicons name={task.status === 'doing' ? 'play' : 'ellipse-outline'} size={12} color={task.status === 'doing' ? colors.background : colors.muted} /></View><View style={styles.taskCopy}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskMeta}>{task.status === 'doing' ? '进行中' : '待开始'} · {task.priority === 'high' ? '高优先级' : '普通优先级'}</Text></View><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>)}</View>
                <SectionTitle title="知识流" detail="最近整理与关联" action="打开知识库" onPress={() => router.push('/notes')} />
                <View style={styles.noteGrid}>{dashboard.notes.slice(0, wide ? 4 : 3).map((note) => <View key={note.id} style={[styles.noteCard, wide && styles.noteCardWide]}><View style={styles.noteTop}><View style={styles.noteIcon}><Ionicons name="document-text-outline" size={15} color={colors.primary} /></View><Text style={styles.noteStatus}>{note.status === 'inbox' ? 'INBOX' : 'KNOWLEDGE'}</Text></View><Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text><Text style={styles.noteSummary} numberOfLines={2}>{note.summary || note.content}</Text><View style={styles.tagRow}>{note.tags.slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View></View>)}</View>
              </View>
              <View style={styles.sideColumn}>
                <SectionTitle title="项目脉搏" detail={`${dashboard.projects.length} 个空间`} />
                <View style={styles.projectStack}>{dashboard.projects.slice(0, 3).map((project) => { const taskCount = dashboard.tasks.filter((task) => task.projectId === project.id).length; const doneCount = dashboard.tasks.filter((task) => task.projectId === project.id && task.status === 'done').length; const progress = taskCount ? Math.round((doneCount / taskCount) * 100) : 0; return <Pressable key={project.id} style={styles.projectCard} onPress={() => router.push('/projects')}><View style={styles.projectHeader}><View style={[styles.projectDot, { backgroundColor: project.color }]} /><Text style={styles.projectName}>{project.name}</Text><Text style={styles.projectPercent}>{progress}%</Text></View><Text style={styles.projectDescription} numberOfLines={2}>{project.description}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(progress, 6)}%`, backgroundColor: project.color }]} /></View></Pressable>; })}</View>
                <Pressable style={styles.aiInsight} onPress={() => router.push('/ai')}><View style={styles.aiInsightIcon}><Ionicons name="sparkles" size={18} color={colors.cyan} /></View><View style={styles.aiInsightCopy}><Text style={styles.aiInsightLabel}>LOCAL AI INSIGHT</Text><Text style={styles.aiInsightText}>“移动端模型体验”仍有高优任务，建议先验证 Safari 缓存，再优化下载反馈。</Text></View></Pressable>
              </View>
            </View>
          </> : <View style={styles.offlineCard}><Ionicons name="server-outline" size={24} color={colors.warning} /><Text style={styles.offlineTitle}>本机后端尚未连接</Text><Text style={styles.offlineText}>运行 scripts/start-full-stack.ps1 后，这里会显示真实项目、任务和知识数据。</Text></View>}
        </View>
      </ScrollView>

      <Modal transparent visible={captureOpen} animationType="fade" onRequestClose={() => setCaptureOpen(false)}><View style={styles.modalScreen}><Pressable style={styles.modalBackdrop} onPress={() => setCaptureOpen(false)} /><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>QUICK CAPTURE</Text><Text style={styles.modalTitle}>{captureMode === 'note' ? '记录一个想法' : '添加下一步任务'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="关闭快速记录" onPress={() => setCaptureOpen(false)} style={styles.closeButton}><Ionicons name="close" size={20} color={colors.textSecondary} /></Pressable></View><TextInput autoFocus multiline={captureMode === 'note'} value={captureText} onChangeText={setCaptureText} placeholder={captureMode === 'note' ? '写下灵感、会议结论或待整理的素材…' : '下一步要完成什么？'} placeholderTextColor={colors.muted} style={[styles.captureInput, captureMode === 'task' && styles.captureInputCompact]} accessibilityLabel={captureMode === 'note' ? '快速记录内容' : '任务标题'} /><View style={styles.modalFooter}><View style={styles.localHint}><Ionicons name="lock-closed" size={12} color={colors.success} /><Text style={styles.localHintText}>保存到本机后端</Text></View><Pressable accessibilityRole="button" accessibilityLabel="保存到本机" disabled={!captureText.trim() || saving} style={[styles.saveButton, (!captureText.trim() || saving) && styles.saveButtonDisabled]} onPress={() => void submitCapture()}>{saving ? <ActivityIndicator size="small" color={colors.white} /> : <><Text style={styles.saveButtonText}>保存</Text><Ionicons name="arrow-forward" size={15} color={colors.white} /></>}</Pressable></View></View></View></Modal>
    </SafeAreaView>
  );
}

function Metric({ icon, value, label, accent }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: number; label: string; accent: string }) { return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${accent}1A` }]}><Ionicons name={icon} size={17} color={accent} /></View><View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View></View>; }
function SectionTitle({ title, detail, action, onPress }: { title: string; detail?: string; action?: string; onPress?: () => void }) { return <View style={styles.sectionTitleRow}><View><Text style={styles.sectionTitle}>{title}</Text>{detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}</View>{action ? <Pressable onPress={onPress}><Text style={styles.sectionAction}>{action} →</Text></Pressable> : null}</View>; }

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.background},scroll:{paddingBottom:34},shell:{width:'100%',maxWidth:1180,alignSelf:'center',paddingHorizontal:18},hero:{padding:22,borderRadius:radius.xl,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,overflow:'hidden'},heroWide:{minHeight:300,flexDirection:'row',alignItems:'stretch',padding:34},heroCopy:{flex:1,justifyContent:'center'},heroKicker:{color:colors.success,fontSize:11,fontWeight:'700',letterSpacing:.4},heroTitle:{maxWidth:640,color:colors.text,fontSize:38,lineHeight:46,fontWeight:'900',letterSpacing:-1.6,marginTop:10},heroBody:{maxWidth:590,color:colors.textSecondary,fontSize:13,lineHeight:21,marginTop:12},heroActions:{flexDirection:'row',gap:10,marginTop:22},primaryAction:{minHeight:46,paddingHorizontal:18,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:colors.primaryStrong,...shadows.glow},primaryActionText:{color:colors.white,fontSize:12,fontWeight:'800'},secondaryAction:{minHeight:46,paddingHorizontal:16,borderRadius:14,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:'#443B76'},secondaryActionText:{color:colors.text,fontSize:12,fontWeight:'700'},heroSignal:{width:230,marginTop:22,padding:20,borderRadius:radius.lg,alignItems:'center',justifyContent:'center',backgroundColor:colors.background,borderWidth:1,borderColor:colors.borderStrong},signalOrb:{width:56,height:56,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft},signalLabel:{color:colors.muted,fontSize:8,fontWeight:'800',letterSpacing:1.4,marginTop:14},signalValue:{color:colors.text,fontSize:35,fontWeight:'900',marginTop:2},signalMeta:{color:colors.textSecondary,fontSize:10},askButton:{flexDirection:'row',alignItems:'center',gap:6,marginTop:16},askButtonText:{color:colors.cyan,fontSize:10,fontWeight:'700'},loading:{height:180,alignItems:'center',justifyContent:'center',gap:10},loadingText:{color:colors.muted,fontSize:11},metrics:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:14},metric:{flex:1,minWidth:150,minHeight:78,paddingHorizontal:15,borderRadius:radius.md,flexDirection:'row',alignItems:'center',gap:11,backgroundColor:colors.surfaceSoft,borderWidth:1,borderColor:colors.border},metricIcon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},metricValue:{color:colors.text,fontSize:18,fontWeight:'800'},metricLabel:{color:colors.muted,fontSize:9,marginTop:2},columns:{gap:24},columnsWide:{flexDirection:'row',alignItems:'flex-start'},mainColumn:{flex:1.65,minWidth:0},sideColumn:{flex:1,minWidth:0},sectionTitleRow:{minHeight:58,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',paddingBottom:10},sectionTitle:{color:colors.text,fontSize:15,fontWeight:'800'},sectionDetail:{color:colors.muted,fontSize:9,marginTop:3},sectionAction:{color:colors.primary,fontSize:10,fontWeight:'700'},taskList:{borderRadius:radius.lg,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},taskRow:{minHeight:66,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:11,borderBottomWidth:1,borderBottomColor:colors.border},taskCheck:{width:26,height:26,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceElevated,borderWidth:1,borderColor:colors.borderStrong},taskCheckDoing:{backgroundColor:colors.warning,borderColor:colors.warning},taskCopy:{flex:1},taskTitle:{color:colors.text,fontSize:12,fontWeight:'700'},taskMeta:{color:colors.muted,fontSize:9,marginTop:4},noteGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},noteCard:{width:'100%',minHeight:150,padding:15,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},noteCardWide:{width:'48.8%'},noteTop:{flexDirection:'row',alignItems:'center'},noteIcon:{width:30,height:30,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft},noteStatus:{color:colors.muted,fontSize:8,fontWeight:'800',letterSpacing:1,marginLeft:8},noteTitle:{color:colors.text,fontSize:13,lineHeight:19,fontWeight:'800',marginTop:12},noteSummary:{color:colors.textSecondary,fontSize:10,lineHeight:16,marginTop:6},tagRow:{flexDirection:'row',gap:8,marginTop:10},tag:{color:colors.primary,fontSize:9,fontWeight:'600'},projectStack:{gap:9},projectCard:{minHeight:122,padding:15,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},projectHeader:{flexDirection:'row',alignItems:'center',gap:8},projectDot:{width:9,height:9,borderRadius:5},projectName:{flex:1,color:colors.text,fontSize:12,fontWeight:'800'},projectPercent:{color:colors.muted,fontSize:10,fontWeight:'700'},projectDescription:{color:colors.textSecondary,fontSize:9,lineHeight:15,marginTop:10},progressTrack:{height:5,borderRadius:3,backgroundColor:colors.background,marginTop:12,overflow:'hidden'},progressFill:{height:'100%',borderRadius:3},aiInsight:{minHeight:110,padding:15,marginTop:12,borderRadius:radius.lg,flexDirection:'row',alignItems:'flex-start',gap:11,backgroundColor:colors.cyanSoft,borderWidth:1,borderColor:'#1B5062'},aiInsightIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#183E52'},aiInsightCopy:{flex:1},aiInsightLabel:{color:colors.cyan,fontSize:8,fontWeight:'800',letterSpacing:1.2},aiInsightText:{color:colors.text,fontSize:10,lineHeight:16,marginTop:6},offlineCard:{marginTop:20,padding:28,borderRadius:radius.xl,alignItems:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},offlineTitle:{color:colors.text,fontSize:15,fontWeight:'800',marginTop:12},offlineText:{maxWidth:480,color:colors.muted,fontSize:10,lineHeight:16,textAlign:'center',marginTop:6},modalScreen:{flex:1,alignItems:'center',justifyContent:'center',padding:18},modalBackdrop:{...StyleSheet.absoluteFillObject,backgroundColor:colors.overlay},modalCard:{width:'100%',maxWidth:560,padding:20,borderRadius:radius.xl,backgroundColor:colors.surfaceElevated,borderWidth:1,borderColor:colors.borderStrong,...shadows.card},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},modalEyebrow:{color:colors.primary,fontSize:8,fontWeight:'800',letterSpacing:1.2},modalTitle:{color:colors.text,fontSize:20,fontWeight:'800',marginTop:4},closeButton:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},captureInput:{minHeight:150,marginTop:18,padding:15,borderRadius:radius.md,color:colors.text,fontSize:13,lineHeight:20,textAlignVertical:'top',backgroundColor:colors.background,borderWidth:1,borderColor:colors.borderStrong},captureInputCompact:{minHeight:54,textAlignVertical:'center'},modalFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:14},localHint:{flexDirection:'row',alignItems:'center',gap:5},localHintText:{color:colors.success,fontSize:9},saveButton:{minWidth:96,minHeight:42,paddingHorizontal:16,borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:colors.primaryStrong},saveButtonDisabled:{opacity:.42},saveButtonText:{color:colors.white,fontSize:11,fontWeight:'800'}
});
