import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThreeDAsset } from '@/components/ThreeDAsset';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function OnboardingScreen() {
  const { markOnboarded } = useAppState();
  const { colors } = useTheme();

  const start = async () => {
    await markOnboarded();
    router.replace('/today');
  };

  return (
    <Screen>
      <Text style={[styles.wordmark, { color: colors.text }]}>WORDUP</Text>
      <Text style={[styles.headline, { color: colors.text }]}>A new word, every day.</Text>
      <Text style={[styles.copy, { color: colors.secondaryText }]}>
        Learn it, hear it, understand it, and build your vocabulary one day at a time.
      </Text>
      <View style={styles.asset}>
        <ThreeDAsset label="Word Collection asset slot" size={150} entrance />
      </View>
      <View style={styles.actions}>
        <Button label="Get started" onPress={start} />
        <Button label="How it works" variant="ghost" onPress={() => router.push('/how-to-play')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    marginTop: 28,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  headline: {
    marginTop: 72,
    maxWidth: 285,
    ...typography.hero,
  },
  copy: {
    marginTop: spacing.md,
    ...typography.body,
  },
  asset: {
    marginTop: 56,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: 72,
    gap: spacing.md,
  },
});
