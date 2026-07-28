// ============================================================
// EdgeMind — Tab 导航布局
// 底部三Tab：AI对话 / 笔记 / 设置
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
          height: 66,
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
          title: 'AI 对话',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: '笔记',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '技术',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size - 1} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
