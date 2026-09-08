import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';

export function StatCard({ value, label }: { value: string | number; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.secondaryText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 86,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
