import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../src/components/AppHeader';
import { BackendApi } from '../../src/services/backend';
import { colors, radius } from '../../src/theme';
import type { Project, Task } from '../../src/types';

const STATUS_LABEL: Record<Task['status'], string> = { todo: '待开始', doing: '进行中', done: '已完成' };
const STATUS_ICON: Record<Task['status'], React.ComponentProps<typeof Ionicons>['name']> = { todo: 'ellipse-outline', doing: 'play-circle', done: 'checkmark-circle' };

export default function ProjectsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'project' | 'task' | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextProjects, nextTasks] = await Promise.all([BackendApi.listProjects(), BackendApi.listTasks()]);
      setProjects(nextProjects);
      setTasks(nextTasks);
    } catch (error) {
      Alert.alert('加载失败', error instanceof Error ? error.message : '本机后端暂时不可用');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visibleTasks = useMemo(() => selected === 'all' ? tasks : tasks.filter((task) => task.projectId === selected), [selected, tasks]);
  const activeProject = projects.find((project) => project.id === selected);

  const openModal = (kind: 'project' | 'task') => {
    setModal(kind);
    setTitle('');
    setDescription('');
  };

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (modal === 'project') {
        await BackendApi.createProject({ name: title.trim(), description: description.trim(), color: '#7C5CFF', status: 'active' });
      } else {
        await BackendApi.createTask({ title: title.trim(), note: description.trim(), projectId: selected === 'all' ? null : selected, status: 'todo', priority: 'medium' });
      }
      setModal(null);
      await refresh();
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '请稍后再试');
    } finally { setSaving(false); }
  };

  const cycleTask = async (task: Task) => {
    const next: Task['status'] = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
    await BackendApi.updateTask(task.id, { status: next });
    await refresh();
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>正在加载项目空间</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.shell}>
          <AppHeader eyebrow="PROJECT SPACES" title="项目与行动" subtitle="让知识有上下文，让想法有下一步" />
          <View style={styles.topActions}>
            <View style={styles.summaryCopy}><Text style={styles.summaryValue}>{tasks.filter((task) => task.status !== 'done').length}</Text><Text style={styles.summaryLabel}>个开放任务 · {projects.filter((project) => project.status === 'active').length} 个活跃项目</Text></View>
            <Pressable accessibilityRole="button" style={styles.ghostButton} onPress={() => openModal('project')}><Ionicons name="folder-open-outline" size={15} color={colors.primary} /><Text style={styles.ghostText}>新建项目</Text></Pressable>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => openModal('task')}><Ionicons name="add" size={17} color={colors.white} /><Text style={styles.primaryText}>添加任务</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectTabs}>
            <ProjectTab active={selected === 'all'} label="全部任务" color={colors.textSecondary} onPress={() => setSelected('all')} />
            {projects.map((project) => <ProjectTab key={project.id} active={selected === project.id} label={project.name} color={project.color} onPress={() => setSelected(project.id)} />)}
          </ScrollView>

          <View style={[styles.workspace, wide && styles.workspaceWide]}>
            <View style={styles.board}>
              <View style={styles.boardHeader}><View><Text style={styles.boardEyebrow}>{activeProject ? 'PROJECT BOARD' : 'MASTER BOARD'}</Text><Text style={styles.boardTitle}>{activeProject?.name || '所有行动'}</Text></View><Text style={styles.boardMeta}>{visibleTasks.length} TASKS</Text></View>
              <View style={[styles.lanes, wide && styles.lanesWide]}>
                {(['todo', 'doing', 'done'] as Task['status'][]).map((status) => <TaskLane key={status} status={status} tasks={visibleTasks.filter((task) => task.status === status)} projects={projects} onCycle={cycleTask} />)}
              </View>
            </View>
            <View style={styles.sidebar}>
              <Text style={styles.sideEyebrow}>PROJECT PULSE</Text><Text style={styles.sideTitle}>正在发生</Text>
              {projects.map((project) => { const projectTasks = tasks.filter((task) => task.projectId === project.id); const done = projectTasks.filter((task) => task.status === 'done').length; const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0; return <Pressable key={project.id} style={styles.pulseCard} onPress={() => setSelected(project.id)}><View style={styles.pulseTop}><View style={[styles.projectDot,{backgroundColor:project.color}]} /><Text style={styles.pulseName}>{project.name}</Text><Text style={styles.pulsePercent}>{progress}%</Text></View><Text style={styles.pulseDescription} numberOfLines={2}>{project.description}</Text><View style={styles.track}><View style={[styles.fill,{width:`${Math.max(progress,5)}%`,backgroundColor:project.color}]} /></View><Text style={styles.pulseMeta}>{projectTasks.length} 个任务 · {done} 已完成</Text></Pressable>; })}
              <View style={styles.localCard}><Ionicons name="shield-checkmark" size={19} color={colors.success} /><View style={styles.localCopy}><Text style={styles.localTitle}>本地项目数据</Text><Text style={styles.localText}>项目、任务和活动记录均由 EdgeMind API 写入本机 JSON 数据库。</Text></View></View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(modal)} animationType="fade" onRequestClose={() => setModal(null)}><View style={styles.modalScreen}><Pressable style={styles.backdrop} onPress={() => setModal(null)} /><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.boardEyebrow}>{modal === 'project' ? 'NEW PROJECT' : 'NEW TASK'}</Text><Text style={styles.modalTitle}>{modal === 'project' ? '创建项目空间' : '添加行动任务'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="关闭" style={styles.close} onPress={() => setModal(null)}><Ionicons name="close" size={19} color={colors.textSecondary} /></Pressable></View><TextInput autoFocus value={title} onChangeText={setTitle} placeholder={modal === 'project' ? '项目名称' : '任务标题'} placeholderTextColor={colors.muted} style={styles.input} /><TextInput multiline value={description} onChangeText={setDescription} placeholder="补充目标、背景或验收标准（可选）" placeholderTextColor={colors.muted} style={[styles.input,styles.descriptionInput]} /><Pressable accessibilityRole="button" accessibilityLabel="保存到本机" disabled={!title.trim() || saving} style={[styles.submitButton,(!title.trim()||saving)&&styles.disabled]} onPress={() => void submit()}>{saving ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.submitText}>保存到本机</Text><Ionicons name="arrow-forward" size={15} color={colors.white} /></>}</Pressable></View></View></Modal>
    </SafeAreaView>
  );
}

function ProjectTab({ active, label, color, onPress }: { active: boolean; label: string; color: string; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.projectTab,active&&styles.projectTabActive]}><View style={[styles.projectDot,{backgroundColor:color}]} /><Text style={[styles.projectTabText,active&&styles.projectTabTextActive]}>{label}</Text></Pressable>; }
function TaskLane({ status, tasks, projects, onCycle }: { status: Task['status']; tasks: Task[]; projects: Project[]; onCycle: (task: Task) => void }) { return <View style={styles.lane}><View style={styles.laneHeader}><Ionicons name={STATUS_ICON[status]} size={15} color={status==='done'?colors.success:status==='doing'?colors.warning:colors.muted} /><Text style={styles.laneTitle}>{STATUS_LABEL[status]}</Text><Text style={styles.laneCount}>{tasks.length}</Text></View><View style={styles.laneBody}>{tasks.length ? tasks.map((task) => { const project=projects.find((item)=>item.id===task.projectId); return <Pressable key={task.id} style={styles.taskCard} onPress={()=>void onCycle(task)}><View style={styles.taskTop}><Text style={[styles.priority,task.priority==='high'&&styles.priorityHigh]}>{task.priority==='high'?'HIGH':'NORMAL'}</Text><Ionicons name="ellipsis-horizontal" size={15} color={colors.muted} /></View><Text style={styles.taskTitle}>{task.title}</Text>{task.note?<Text numberOfLines={2} style={styles.taskNote}>{task.note}</Text>:null}<View style={styles.taskFooter}><View style={[styles.projectDot,{backgroundColor:project?.color||colors.muted}]} /><Text style={styles.taskProject}>{project?.name||'未归档'}</Text><Text style={styles.taskHint}>点击推进 →</Text></View></Pressable>; }) : <View style={styles.emptyLane}><Ionicons name="leaf-outline" size={18} color={colors.muted} /><Text style={styles.emptyText}>暂时没有任务</Text></View>}</View></View>; }

const styles=StyleSheet.create({container:{flex:1,backgroundColor:colors.background},scroll:{paddingBottom:36},shell:{width:'100%',maxWidth:1220,alignSelf:'center',paddingHorizontal:18},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10},loadingText:{color:colors.muted,fontSize:11},topActions:{minHeight:86,padding:16,borderRadius:radius.lg,flexDirection:'row',alignItems:'center',gap:9,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},summaryCopy:{flex:1},summaryValue:{color:colors.text,fontSize:25,fontWeight:'900'},summaryLabel:{color:colors.muted,fontSize:9,marginTop:2},ghostButton:{minHeight:42,paddingHorizontal:14,borderRadius:13,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:colors.primarySoft,borderWidth:1,borderColor:'#443B76'},ghostText:{color:colors.text,fontSize:10,fontWeight:'700'},primaryButton:{minHeight:42,paddingHorizontal:14,borderRadius:13,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:colors.primaryStrong},primaryText:{color:colors.white,fontSize:10,fontWeight:'800'},projectTabs:{gap:8,paddingVertical:14},projectTab:{height:38,paddingHorizontal:13,borderRadius:12,flexDirection:'row',alignItems:'center',gap:7,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},projectTabActive:{backgroundColor:colors.primarySoft,borderColor:'#4D4284'},projectTabText:{color:colors.muted,fontSize:10,fontWeight:'700'},projectTabTextActive:{color:colors.text},projectDot:{width:8,height:8,borderRadius:4},workspace:{gap:18},workspaceWide:{flexDirection:'row',alignItems:'flex-start'},board:{flex:1,minWidth:0},boardHeader:{minHeight:70,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},boardEyebrow:{color:colors.primary,fontSize:8,fontWeight:'800',letterSpacing:1.2},boardTitle:{color:colors.text,fontSize:22,fontWeight:'900',marginTop:3},boardMeta:{color:colors.muted,fontSize:9,fontWeight:'800',letterSpacing:1},lanes:{gap:12},lanesWide:{flexDirection:'row',alignItems:'flex-start'},lane:{flex:1,minWidth:0,borderRadius:radius.lg,backgroundColor:colors.surfaceSoft,borderWidth:1,borderColor:colors.border,overflow:'hidden'},laneHeader:{height:50,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:7,borderBottomWidth:1,borderBottomColor:colors.border},laneTitle:{flex:1,color:colors.text,fontSize:11,fontWeight:'800'},laneCount:{color:colors.muted,fontSize:10,fontWeight:'700'},laneBody:{padding:9,gap:9},taskCard:{minHeight:130,padding:13,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},taskTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},priority:{color:colors.muted,fontSize:7,fontWeight:'900',letterSpacing:1},priorityHigh:{color:colors.danger},taskTitle:{color:colors.text,fontSize:12,lineHeight:18,fontWeight:'800',marginTop:11},taskNote:{color:colors.textSecondary,fontSize:9,lineHeight:14,marginTop:6},taskFooter:{flexDirection:'row',alignItems:'center',marginTop:14,gap:6},taskProject:{flex:1,color:colors.muted,fontSize:8},taskHint:{color:colors.primary,fontSize:8,fontWeight:'700'},emptyLane:{height:110,alignItems:'center',justifyContent:'center',gap:7},emptyText:{color:colors.muted,fontSize:9},sidebar:{width:'100%',maxWidth:330},sideEyebrow:{color:colors.cyan,fontSize:8,fontWeight:'800',letterSpacing:1.2,marginTop:18},sideTitle:{color:colors.text,fontSize:18,fontWeight:'900',marginTop:3,marginBottom:10},pulseCard:{minHeight:126,padding:14,marginBottom:9,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},pulseTop:{flexDirection:'row',alignItems:'center',gap:7},pulseName:{flex:1,color:colors.text,fontSize:11,fontWeight:'800'},pulsePercent:{color:colors.muted,fontSize:9,fontWeight:'700'},pulseDescription:{color:colors.textSecondary,fontSize:9,lineHeight:14,marginTop:9},track:{height:5,borderRadius:3,overflow:'hidden',backgroundColor:colors.background,marginTop:11},fill:{height:'100%',borderRadius:3},pulseMeta:{color:colors.muted,fontSize:8,marginTop:7},localCard:{padding:14,borderRadius:radius.lg,flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:colors.successSoft,borderWidth:1,borderColor:'#1B4B40'},localCopy:{flex:1},localTitle:{color:colors.success,fontSize:10,fontWeight:'800'},localText:{color:colors.textSecondary,fontSize:8,lineHeight:13,marginTop:4},modalScreen:{flex:1,alignItems:'center',justifyContent:'center',padding:18},backdrop:{...StyleSheet.absoluteFillObject,backgroundColor:colors.overlay},modalCard:{width:'100%',maxWidth:520,padding:20,borderRadius:radius.xl,backgroundColor:colors.surfaceElevated,borderWidth:1,borderColor:colors.borderStrong},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},modalTitle:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:4},close:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},input:{minHeight:50,marginTop:16,paddingHorizontal:14,borderRadius:13,color:colors.text,fontSize:12,backgroundColor:colors.background,borderWidth:1,borderColor:colors.borderStrong},descriptionInput:{minHeight:100,paddingTop:14,textAlignVertical:'top'},submitButton:{height:46,marginTop:16,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:colors.primaryStrong},disabled:{opacity:.42},submitText:{color:colors.white,fontSize:11,fontWeight:'800'}});
