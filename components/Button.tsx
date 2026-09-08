import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radii } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', style }: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 110 });
        }}
        style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isGhost ? 'transparent' : isPrimary ? colors.primary : colors.surface,
          borderColor: isGhost ? 'transparent' : colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
      >
        <Text style={[styles.text, { color: isPrimary ? colors.primaryText : colors.text }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
});
