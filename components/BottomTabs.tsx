import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';

const tabs = [
  { label: 'Today', icon: 'home' as const, route: '/today' as const, name: 'today' },
  { label: 'Words', icon: 'book' as const, route: '/words' as const, name: 'words' },
  { label: 'Streak', icon: 'flame' as const, route: '/streak' as const, name: 'streak' },
  { label: 'Settings', icon: 'settings' as const, route: '/settings' as const, name: 'settings' },
];

type TabItemProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
};

function TabItem({ label, icon, active, onPress }: TabItemProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 200 });
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.03 }],
    backgroundColor: active ? `${colors.primary}14` : 'transparent',
  }));

  const color = active ? colors.primary : colors.secondaryText;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View style={[styles.activePill, animatedStyle]}>
        <Ionicons name={icon} size={21} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function WordUpTabBar({ state, navigation }: { state: { index: number; routes: { key: string; name: string }[] }; navigation: any }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          minHeight: 66 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = tabs.find((item) => item.name === route.name);
        if (!tab) return null;
        return (
          <TabItem
            key={route.key}
            label={tab.label}
            icon={tab.icon}
            active={state.index === index}
            onPress={() => navigation.navigate(route.name)}
          />
        );
      })}
    </View>
  );
}

export function BottomTabs({ active = 'Today' }: { active?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        styles.absolute,
        {
          minHeight: 66 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {tabs.map((tab) => (
        <TabItem key={tab.label} label={tab.label} icon={tab.icon} active={active === tab.label} onPress={() => router.replace(tab.route)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
  },
  absolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  item: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    minWidth: 62,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});
