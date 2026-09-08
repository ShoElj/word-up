import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ThreeDAsset } from '@/components/ThreeDAsset';
import { WordHistoryCard } from '@/components/WordHistoryCard';
import { radii, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function WordsScreen() {
  const { history, today, playPronunciation } = useAppState();
  const { colors } = useTheme();
  const grouped = history.reduce<Record<string, typeof history>>((groups, result) => {
    const label = new Intl.DateTimeFormat('en', { month: 'long' })
      .format(new Date(`${result.date}T12:00:00`))
      .toUpperCase();
    groups[label] = [...(groups[label] ?? []), result];
    return groups;
  }, {});

  return (
    <Screen scroll bottomTabs>
      <Header />
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Your Words</Text>
          <Text style={[styles.count, { color: colors.secondaryText }]}>{history.length} words collected</Text>
        </View>
        {history.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review your words"
            onPress={() => router.push('/review')}
            style={[styles.reviewButton, { backgroundColor: colors.raised, borderColor: colors.border }]}
          >
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={[styles.reviewLabel, { color: colors.primary }]}>Review</Text>
          </Pressable>
        ) : null}
      </View>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <ThreeDAsset label="Word Collection asset slot" size={128} entrance />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your vocabulary journey starts here.</Text>
          <Text style={[styles.emptyCopy, { color: colors.secondaryText }]}>
            Learn today’s word to add your first word.
          </Text>
          {today && !today.completed ? (
            <Button label="Learn today’s word" onPress={() => router.push('/today')} style={styles.emptyButton} />
          ) : null}
        </View>
      ) : (
        Object.entries(grouped).map(([month, results]) => (
          <View key={month} style={styles.group}>
            <Text style={[styles.month, { color: colors.secondaryText }]}>{month}</Text>
            <View style={styles.list}>
              {results.map((result) => (
                <WordHistoryCard key={result.date} result={result} onListen={playPronunciation} />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.hero,
  },
  count: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  reviewLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: spacing.xs,
    maxWidth: 260,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  group: {
    marginTop: 34,
  },
  month: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  list: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
