import { PropsWithChildren } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';

type FadeUpProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeUp({ children, delay = 0, style }: FadeUpProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.delay(delay).duration(260).springify().damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function FadeScale({ children, delay = 0, style }: FadeUpProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={FadeIn.delay(reducedMotion ? 0 : delay).duration(reducedMotion ? 1 : 220).springify().damping(16)}
      layout={reducedMotion ? undefined : LinearTransition.duration(200)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
