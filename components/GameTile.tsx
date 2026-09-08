import { StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { radii } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';
import { TileState } from '@/types/game';

type GameTileProps = {
  letter?: string;
  state?: TileState;
  size?: number;
  revealDelay?: number;
  active?: boolean;
  successDelay?: number;
  successSignal?: number;
  style?: ViewStyle;
};

export function GameTile({
  letter = '',
  state = 'empty',
  size = 58,
  revealDelay = 0,
  active = false,
  successDelay,
  successSignal = 0,
  style,
}: GameTileProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (letter && state === 'entered') {
      scale.value = withSequence(withTiming(1.08, { duration: 80 }), withTiming(1, { duration: 90 }));
    }
  }, [letter, scale, state]);

  useEffect(() => {
    if (state === 'correct' || state === 'present' || state === 'absent') {
      opacity.value = withDelay(revealDelay, withSequence(withTiming(0.35, { duration: 95 }), withTiming(1, { duration: 120 })));
      scale.value = withDelay(
        revealDelay,
        withSequence(withTiming(0.96, { duration: 95 }), withTiming(1.03, { duration: 80 }), withTiming(1, { duration: 90 }))
      );
    } else {
      opacity.value = 1;
    }
  }, [opacity, revealDelay, scale, state]);

  useEffect(() => {
    if (successSignal > 0 && typeof successDelay === 'number') {
      scale.value = withDelay(
        successDelay,
        withSequence(withTiming(1.07, { duration: 90 }), withTiming(1, { duration: 130 }))
      );
    }
  }, [scale, successDelay, successSignal]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor =
    state === 'correct'
      ? colors.correct
      : state === 'present'
        ? colors.present
        : state === 'absent'
          ? colors.absent
          : state === 'entered'
            ? colors.surface
            : 'transparent';
  const textColor = state === 'empty' || state === 'entered' ? colors.text : colors.primaryText;

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderColor: state === 'empty' ? (active ? colors.primary : colors.border) : backgroundColor,
          backgroundColor,
        },
        animatedStyle,
        style,
      ]}
    >
      <Text style={[styles.letter, { color: textColor, fontSize: size >= 56 ? 24 : 19 }]}>{letter}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    lineHeight: 28,
    fontWeight: '800',
  },
});
