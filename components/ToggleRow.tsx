import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radii, spacing } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';

export function ToggleRow({
  label,
  value,
  onValueChange,
  grouped = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  grouped?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        grouped && styles.groupedRow,
        { backgroundColor: grouped ? 'transparent' : colors.surface, borderColor: grouped ? 'transparent' : colors.border },
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.raised, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export function LinkRow({
  label,
  value,
  onPress,
  grouped = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  grouped?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        grouped && styles.groupedRow,
        {
          backgroundColor: grouped ? 'transparent' : colors.surface,
          borderColor: grouped ? 'transparent' : colors.border,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.trailing}>
        {value ? <Text style={[styles.value, { color: colors.secondaryText }]}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupedRow: {
    minHeight: 56,
    borderWidth: 0,
    borderRadius: 0,
  },
  label: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  trailing: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  value: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
});
