import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function SplashScreen() {
  const { ready, settings } = useAppState();
  const { colors } = useTheme();

  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => {
      router.replace(settings.onboardingCompleted ? '/today' : '/onboarding');
    }, 900);
    return () => clearTimeout(timeout);
  }, [ready, settings.onboardingCompleted]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeIn.duration(420)} style={styles.logoWrap}>
        <Text style={[styles.logo, { color: colors.primary }]}>W</Text>
        <Text style={[styles.wordmark, { color: colors.text }]}>WORDUP</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 78,
    lineHeight: 92,
    fontWeight: '900',
  },
  wordmark: {
    marginTop: 2,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
});
