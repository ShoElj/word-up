import { Image, ImageSourcePropType, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, useReducedMotion, ZoomIn } from 'react-native-reanimated';

import { radii } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';

type ThreeDAssetProps = {
  source?: ImageSourcePropType;
  size?: number;
  label: string;
  entrance?: boolean;
  style?: ViewStyle;
};

export function ThreeDAsset({ source, size = 88, label, entrance = false, style }: ThreeDAssetProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const content = (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: Math.min(radii.lg, size / 5),
          backgroundColor: colors.raised,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {source ? (
        <Image source={source} resizeMode="contain" style={styles.image} />
      ) : (
        <Text style={[styles.placeholder, { color: colors.secondaryText }]}>{label}</Text>
      )}
    </View>
  );

  if (!entrance || reducedMotion) return content;

  return (
    <Animated.View entering={ZoomIn.duration(280).springify().damping(14)}>
      <Animated.View entering={FadeIn.duration(220)}>{content}</Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '86%',
    height: '86%',
  },
  placeholder: {
    maxWidth: '78%',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
