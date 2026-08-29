// ============================================================
// EdgeMind — Tab 导航布局
// 五个核心工作区：今日 / 知识 / AI / 项目 / 系统
// ============================================================

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 70,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
        },
        tabBarItemStyle: {
          paddingVertical: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: '知识',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: '项目',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '系统',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size - 1} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
