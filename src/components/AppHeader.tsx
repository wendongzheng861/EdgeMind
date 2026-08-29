import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export default function AppHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brandIcon}>
        <Ionicons name="hardware-chip" size={18} color={colors.white} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.privateBadge}>
        <Ionicons name="shield-checkmark" size={13} color={colors.success} />
        <Text style={styles.privateText}>LOCAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
  },
  copy: { flex: 1 },
  eyebrow: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.35,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },
  privateBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: '#1E5147',
  },
  privateText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
