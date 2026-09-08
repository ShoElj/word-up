import { PropsWithChildren } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/constants/spacing';
import { useTheme } from '@/contexts/ThemeContext';

type ScreenProps = PropsWithChildren<ViewProps & { scroll?: false }>;
type ScrollScreenProps = PropsWithChildren<ScrollViewProps & { scroll: true; bottomTabs?: boolean }>;

export function Screen(props: ScreenProps | ScrollScreenProps) {
  const { colors } = useTheme();

  if ('scroll' in props && props.scroll) {
    const { children, bottomTabs, contentContainerStyle, ...rest } = props;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView
          {...rest}
          contentContainerStyle={[
            styles.content,
            bottomTabs ? styles.withTabs : undefined,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { children, style, ...rest } = props;
  return (
    <SafeAreaView {...rest} style={[styles.safe, { backgroundColor: colors.background }, style]}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  withTabs: {
    paddingBottom: 128,
  },
});
