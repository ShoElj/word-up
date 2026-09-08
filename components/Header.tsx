import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/contexts/ThemeContext';

export function Header({ back = false, centered = false }: { back?: boolean; centered?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, centered && styles.centered]}>
      {back ? (
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={16} style={styles.back}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.brand, { color: colors.text }, centered && styles.centerBrand]}>WordUp</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 34,
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
  },
  brand: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  centerBrand: {
    fontSize: 22,
  },
  back: {
    position: 'absolute',
    left: 0,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '300',
  },
});
