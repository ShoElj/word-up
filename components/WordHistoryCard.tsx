import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radii, spacing } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';
import { WordCollectionEntry } from '@/types/game';
import { shortDate } from '@/utils/date';

export function WordHistoryCard({
  result,
  onListen,
}: {
  result: WordCollectionEntry;
  onListen?: (audioUrl?: string) => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/word/${result.date}`)}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.76 : 1 },
        ]}
      >
        <View style={styles.copy}>
          <Text style={[styles.date, { color: colors.secondaryText }]}>LEARNED {shortDate(result.date)}</Text>
          <Text style={[styles.word, { color: colors.text }]}>{result.word}</Text>
          <Text numberOfLines={2} style={[styles.definition, { color: colors.secondaryText }]}>
            {result.definition}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Listen to ${result.word}`}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onListen?.(result.audioUrl);
          }}
          style={[styles.listen, { backgroundColor: colors.raised }]}
        >
          <Ionicons name="volume-medium" size={18} color={colors.primary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
  },
  date: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  word: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  definition: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  listen: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
