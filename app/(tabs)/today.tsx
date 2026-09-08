import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Countdown } from '@/components/Countdown';
import { Header } from '@/components/Header';
import { FadeScale, FadeUp } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { ThreeDAsset } from '@/components/ThreeDAsset';
import { radii, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TodayScreen() {
  const {
    today,
    stats,
    history,
    settings,
    dailyPuzzleStatus,
    dailyPuzzleError,
    retryDailyPuzzle,
    completeTodayLearning,
    playPronunciation,
  } = useAppState();
  const { colors } = useTheme();
  const [audioMessage, setAudioMessage] = useState('');
  const collected = history.length;
  const completed = today?.completed ?? false;

  const listen = async () => {
    if (!today) return;
    setAudioMessage('');
    const played = await playPronunciation(today.audioUrl);
    if (!played) {
      setAudioMessage(settings.sound ? 'Pronunciation audio unavailable.' : 'Sound is off.');
    }
  };

  const complete = async () => {
    await completeTodayLearning();
  };

  return (
    <Screen scroll bottomTabs>
      <Header />
      {dailyPuzzleStatus === 'loading' ? (
        <View style={styles.stateMessage}>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Loading today’s word…</Text>
        </View>
      ) : dailyPuzzleStatus === 'error' || !today ? (
        <View style={styles.stateMessage}>
          <Text style={[styles.stateTitle, { color: colors.text }]}>
            {dailyPuzzleError === 'OFFLINE' ? 'You’re offline.' : 'Couldn’t load today’s word.'}
          </Text>
          <Text style={[styles.stateCopy, { color: colors.secondaryText }]}>
            {dailyPuzzleError === 'OFFLINE'
              ? 'We’ll load today’s word when you reconnect.'
              : 'Try again to fetch today’s word.'}
          </Text>
          <Button label="Try again" onPress={retryDailyPuzzle} style={styles.retryButton} />
        </View>
      ) : (
        <>
          <FadeUp>
            <Text style={[styles.greeting, { color: colors.secondaryText }]}>GOOD MORNING</Text>
          </FadeUp>
          <FadeUp delay={60}>
            <Text style={[styles.title, { color: colors.text }]}>Today’s Word</Text>
            <Text style={[styles.daily, { color: colors.secondaryText }]}>DAILY #{`${today.dailyNumber}`.padStart(3, '0')}</Text>
          </FadeUp>
          <FadeScale delay={120}>
            <View style={[styles.wordCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThreeDAsset label="Word Collection asset slot" size={72} entrance />
              <Text style={[styles.word, { color: colors.text }]}>{today.word}</Text>
              {today.pronunciation ? (
                <Text style={[styles.pronunciation, { color: colors.secondaryText }]}>{today.pronunciation}</Text>
              ) : null}
              {today.partOfSpeech ? (
                <Text style={[styles.partOfSpeech, { color: colors.secondaryText }]}>{today.partOfSpeech}</Text>
              ) : null}
              {today.audioUrl ? (
                <>
                  <Button label="Listen" variant="secondary" onPress={listen} style={styles.listenButton} />
                  {audioMessage ? <Text style={[styles.audioMessage, { color: colors.secondaryText }]}>{audioMessage}</Text> : null}
                </>
              ) : null}
            </View>
          </FadeScale>
          <FadeUp delay={170}>
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Definition</Text>
              <Text style={[styles.body, { color: colors.text }]}>{today.definition}</Text>
            </View>
          </FadeUp>
          <FadeUp delay={220}>
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Example</Text>
              <Text style={[styles.body, { color: colors.text }]}>{today.example}</Text>
            </View>
          </FadeUp>
          {today.category ? (
            <FadeUp delay={250}>
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Category</Text>
                <Text style={[styles.body, { color: colors.text }]}>
                  {today.category.replace(/_/g, ' ')}
                </Text>
              </View>
            </FadeUp>
          ) : null}
          <FadeUp delay={270}>
            <View style={styles.actions}>
              {completed ? (
                <View style={[styles.confirmation, { backgroundColor: colors.raised, borderColor: colors.border }]}>
                  <Ionicons name="checkmark-circle" size={19} color={colors.primary} />
                  <Text style={[styles.confirmationText, { color: colors.text }]}>Added to Your Words</Text>
                </View>
              ) : (
                <Button label="Add to Your Words" onPress={complete} />
              )}
            </View>
          </FadeUp>
          <View style={[styles.statsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.currentStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>day streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{collected}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>words collected</Text>
            </View>
          </View>
          <Countdown style={styles.countdown} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginTop: 36,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  title: {
    marginTop: spacing.sm,
    ...typography.hero,
  },
  daily: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  wordCard: {
    marginTop: 28,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    alignItems: 'center',
  },
  word: {
    marginTop: spacing.md,
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
  actions: {
    marginTop: 32,
  },
  confirmation: {
    minHeight: 56,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmationText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  statsPanel: {
    marginTop: 28,
    minHeight: 84,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 42,
  },
  countdown: {
    marginTop: 24,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  stateMessage: {
    marginTop: 96,
  },
  stateTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  stateCopy: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 28,
  },
});
