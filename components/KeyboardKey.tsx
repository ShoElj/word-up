import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radii } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';
import { TileState } from '@/types/game';

type KeyboardKeyProps = {
  label: string;
  state?: Exclude<TileState, 'empty' | 'entered'>;
  wide?: boolean;
  onPress: () => void;
};

function stateIndex(state?: Exclude<TileState, 'empty' | 'entered'>) {
  if (state === 'correct') return 3;
  if (state === 'present') return 2;
  if (state === 'absent') return 1;
  return 0;
}

export function KeyboardKey({ label, state, wide = false, onPress }: KeyboardKeyProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(stateIndex(state));
  const foreground = state ? colors.primaryText : colors.text;

  useEffect(() => {
    colorProgress.value = withTiming(stateIndex(state), { duration: 180 });
  }, [colorProgress, state]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      [colors.key, colors.absent, colors.present, colors.correct]
    ),
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.key, wide && styles.wide, animatedStyle]}>
      <Pressable
        accessibilityRole="keyboardkey"
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.92, { duration: 55 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 95 });
        }}
        style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.72 : 1 }]}
      >
        {label === 'BACK' ? (
          <Ionicons name="backspace-outline" size={18} color={foreground} />
        ) : label === 'ENTER' ? (
          <Ionicons name="return-down-back" size={19} color={foreground} />
        ) : (
          <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  key: {
    height: 48,
    minWidth: 32,
    flex: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  wide: {
    flex: 1.55,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
});
