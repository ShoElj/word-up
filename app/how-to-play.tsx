import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';

const steps = [
  'Open WordUp for one new word each day.',
  'Listen to the pronunciation and read the definition.',
  'Read the example, then add the word to Your Words.',
];

export default function HowToPlayScreen() {
  const { markOnboarded } = useAppState();
  const { colors } = useTheme();
  const done = async () => {
    await markOnboarded();
    router.replace('/today');
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>How WordUp works</Text>
      <Text style={[styles.copy, { color: colors.secondaryText }]}>Learn one new word every day.</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step} style={[styles.step, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.number, { backgroundColor: colors.raised }]}>
              <Text style={[styles.numberText, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
          </View>
        ))}
      </View>
      <View style={styles.button}>
        <Button label="Got it" onPress={done} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 24,
    ...typography.hero,
  },
  copy: {
    marginTop: spacing.sm,
    ...typography.body,
  },
  steps: {
    marginTop: 48,
    gap: spacing.md,
  },
  step: {
    minHeight: 82,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  number: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  button: {
    marginTop: 'auto',
    paddingBottom: 70,
  },
});
