import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CalendarDay, CalendarDayState } from '@/components/CalendarDay';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { ThreeDAsset } from '@/components/ThreeDAsset';
import { radii, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toDateKey } from '@/utils/date';

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
let hasAnimatedStreakCount = false;

export default function StreakScreen() {
  const { stats, history } = useAppState();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDay = monthStart.getDay();
  const todayKey = toDateKey(now);
  const completedDates = new Set(history.map((entry) => entry.date));
  const cells: { day?: number; state: CalendarDayState }[] = [
    ...Array.from({ length: firstDay }, () => ({ state: 'empty' as const })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      const key = toDateKey(date);
      const state: CalendarDayState =
        key === todayKey ? 'today' : date > now ? 'future' : completedDates.has(key) ? 'completed' : 'missed';
      return { day, state };
    }),
  ];
  const [displayStreak, setDisplayStreak] = useState(hasAnimatedStreakCount ? stats.currentStreak : 0);
  const calendarInnerWidth = width - 48 - 32;
  const daySize = Math.min(34, Math.floor((calendarInnerWidth - 36) / 7));
  const dayGap = Math.max(4, Math.min(12, Math.floor((calendarInnerWidth - daySize * 7) / 6)));

  useEffect(() => {
    if (hasAnimatedStreakCount) {
      setDisplayStreak(stats.currentStreak);
      return;
    }

    hasAnimatedStreakCount = true;
    if (stats.currentStreak <= 0) return;

    const steps = Math.min(stats.currentStreak, 18);
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      setDisplayStreak(Math.round((stats.currentStreak * currentStep) / steps));
      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [stats.currentStreak]);

  return (
    <Screen scroll bottomTabs>
      <Header />
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={[styles.kicker, { color: colors.secondaryText }]}>Learning Streak</Text>
          <Text style={[styles.big, { color: colors.text }]}>{displayStreak}</Text>
          <Text style={[styles.sub, { color: colors.text }]}>days</Text>
        </View>
        <ThreeDAsset label="Streak Flame asset slot" size={96} entrance={!hasAnimatedStreakCount} />
      </View>
      <View style={styles.stats}>
        <StatCard value={stats.currentStreak} label="Current" />
        <StatCard value={stats.longestStreak} label="Longest" />
        <StatCard value={history.length} label="Words" />
      </View>
      <Text style={[styles.monthTitle, { color: colors.text }]}>
        {new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(now)}
      </Text>
      <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.weekdays}>
          {weekdays.map((day) => (
            <Text key={day} style={[styles.weekday, { width: daySize, color: colors.secondaryText }]}>
              {day}
            </Text>
          ))}
        </View>
        <View style={[styles.days, { gap: dayGap }]}>
          {cells.map((cell, index) => (
            <CalendarDay key={`${cell.day ?? 'empty'}-${index}`} day={cell.day} state={cell.state} size={daySize} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 36,
    minHeight: 144,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  kicker: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  big: {
    marginTop: 2,
    fontSize: 86,
    lineHeight: 92,
    fontWeight: '900',
  },
  sub: {
    marginLeft: 6,
    marginTop: -4,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  stats: {
    marginTop: 28,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  monthTitle: {
    marginTop: 36,
    ...typography.title,
  },
  calendar: {
    marginTop: spacing.md,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekday: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
