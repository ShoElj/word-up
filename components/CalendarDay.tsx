import { StyleSheet, Text, View } from 'react-native';

import { radii } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';

export type CalendarDayState = 'completed' | 'missed' | 'today' | 'future' | 'empty';

export function CalendarDay({ day, state, size = 34 }: { day?: number; state: CalendarDayState; size?: number }) {
  const { colors } = useTheme();
  const backgroundColor =
    state === 'completed'
      ? colors.correct
      : state === 'today'
        ? colors.primary
        : state === 'missed'
          ? colors.raised
          : 'transparent';
  const textColor = state === 'completed' || state === 'today' ? colors.primaryText : colors.secondaryText;
  const borderColor =
    state === 'empty'
      ? 'transparent'
      : state === 'today'
        ? colors.primary
        : state === 'future'
          ? colors.raised
          : colors.border;
  return (
    <View
      style={[
        styles.day,
        {
          width: size,
          height: size,
          backgroundColor,
          borderColor,
          opacity: state === 'future' ? 0.52 : 1,
        },
      ]}
    >
      {day ? <Text style={[styles.text, { color: textColor }]}>{day}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  day: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
});
