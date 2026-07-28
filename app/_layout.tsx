// ============================================================
// EdgeMind — 根布局
// Expo Router 入口，配置全局导航和主题
// ============================================================

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { colors } from '../src/theme';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;

    navigator.serviceWorker?.register('/sw.js').catch(() => {
      // 离线外壳不可用时，WebLLM 仍可独立使用浏览器模型缓存。
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="note/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
