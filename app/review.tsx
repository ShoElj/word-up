import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/constants/spacing';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';
import { longDate } from '@/utils/date';

function shuffled<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ReviewScreen() {
  const { history, playPronunciation, settings } = useAppState();
  const { colors } = useTheme();

  const words = useMemo(() => shuffled(history), [history]);
  const [index, setIndex] = useState(0);
  const [audioMessage, setAudioMessage] = useState('');

  if (words.length === 0) {
    return (
      <Screen scroll>
        <Header back />
        <Text style={[styles.title, { color: colors.text }]}>Review</Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No words to review yet.</Text>
          <Text style={[styles.emptyCopy, { color: colors.secondaryText }]}>
            Learn your first daily word and it will appear here for review.
          </Text>
          <Button label="Go to Today" onPress={() => router.replace('/today')} style={styles.emptyButton} />
        </View>
      </Screen>
    );
  }

  const word = words[index];
  const total = words.length;
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  const listen = async () => {
    setAudioMessage('');
    const played = await playPronunciation(word.audioUrl);
    if (!played) {
      setAudioMessage(settings.sound ? 'Pronunciation audio unavailable.' : 'Sound is off.');
    }
  };

  return (
    <Screen scroll>
      <Header back />
      <View style={styles.progress}>
        <Text style={[styles.progressText, { color: colors.secondaryText }]}>
          {index + 1} of {total}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.learnedLabel, { color: colors.secondaryText }]}>
          LEARNED {longDate(word.date)}
        </Text>
        <Text style={[styles.word, { color: colors.text }]}>{word.word}</Text>
        {word.pronunciation ? (
          <Text style={[styles.pronunciation, { color: colors.secondaryText }]}>{word.pronunciation}</Text>
        ) : null}
        {word.partOfSpeech ? (
          <Text style={[styles.partOfSpeech, { color: colors.secondaryText }]}>{word.partOfSpeech}</Text>
        ) : null}
        {word.audioUrl ? (
          <>
            <Button label="Listen" variant="secondary" onPress={listen} style={styles.listenButton} />
            {audioMessage ? (
              <Text style={[styles.audioMessage, { color: colors.secondaryText }]}>{audioMessage}</Text>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Definition</Text>
        <Text style={[styles.body, { color: colors.text }]}>{word.definition}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Example</Text>
        <Text style={[styles.body, { color: colors.text }]}>{word.example}</Text>
      </View>

      {word.category ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Category</Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {word.category.replace(/_/g, ' ')}
          </Text>
        </View>
      ) : null}

      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous word"
          disabled={!hasPrev}
          onPress={() => {
            setAudioMessage('');
            setIndex((i) => i - 1);
          }}
          style={[
            styles.navButton,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: hasPrev ? 1 : 0.3 },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[styles.navLabel, { color: colors.text }]}>Previous</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next word"
          disabled={!hasNext}
          onPress={() => {
            setAudioMessage('');
            setIndex((i) => i + 1);
          }}
          style={[
            styles.navButton,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: hasNext ? 1 : 0.3 },
          ]}
        >
          <Text style={[styles.navLabel, { color: colors.text }]}>Next</Text>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 36,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
  },
  progress: {
    marginTop: 28,
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  card: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    alignItems: 'center',
  },
  learnedLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  word: {
    marginTop: spacing.sm,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '900',
    textAlign: 'center',
  },
  pronunciation: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  partOfSpeech: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  listenButton: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  audioMessage: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 28,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  nav: {
    marginTop: 36,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  navLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    minHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: spacing.sm,
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
});
