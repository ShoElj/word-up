import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/constants/spacing';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';
import { longDate } from '@/utils/date';
import { learningShareText } from '@/utils/game';

export default function WordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, playPronunciation } = useAppState();
  const { colors } = useTheme();
  const result = history.find((entry) => entry.date === id);

  if (!result) {
    return (
      <Screen>
        <Header back />
        <Text style={[styles.missing, { color: colors.text }]}>Word not found.</Text>
      </Screen>
    );
  }

  const listen = async () => {
    await playPronunciation(result.audioUrl);
  };

  const share = async () => {
    await Share.share({
      message: learningShareText(result.word, result.definition, result.dailyNumber),
    });
  };

  return (
    <Screen scroll>
      <Header back />
      <Text style={[styles.label, { color: colors.secondaryText }]}>LEARNED {longDate(result.date)}</Text>
      <Text style={[styles.word, { color: colors.text }]}>{result.word}</Text>
      {result.pronunciation ? (
        <Text style={[styles.pronunciation, { color: colors.secondaryText }]}>{result.pronunciation}</Text>
      ) : null}
      {result.partOfSpeech ? (
        <Text style={[styles.partOfSpeech, { color: colors.secondaryText }]}>{result.partOfSpeech}</Text>
      ) : null}
      {result.audioUrl ? (
        <Button label="Listen" variant="secondary" onPress={listen} style={styles.listen} />
      ) : null}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Definition</Text>
        <Text style={[styles.body, { color: colors.text }]}>{result.definition}</Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Example</Text>
        <Text style={[styles.body, { color: colors.text }]}>{result.example}</Text>
      </View>
      {result.category ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Category</Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {result.category.replace(/_/g, ' ')}
          </Text>
        </View>
      ) : null}
      <View style={[styles.saved, { backgroundColor: colors.raised, borderColor: colors.border }]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
        <Text style={[styles.savedText, { color: colors.text }]}>Saved in Your Words</Text>
      </View>
      <Button label="Share word" onPress={share} style={styles.share} />
      <Button label="Back to words" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 48,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  word: {
    marginTop: spacing.sm,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '900',
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
  listen: {
    marginTop: spacing.lg,
  },
  section: {
    marginTop: 34,
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
  saved: {
    marginTop: 36,
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  savedText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  share: {
    marginTop: 38,
  },
  missing: {
    marginTop: 64,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
});
