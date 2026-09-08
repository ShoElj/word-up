import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { darkColors, lightColors } from '@/constants/colors';
import { PlayerSettings } from '@/types/player';

type ThemeContextValue = {
  colors: typeof lightColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({
  children,
  settings,
}: PropsWithChildren<{ settings: PlayerSettings | null }>) {
  const isDark = settings?.darkMode ?? false;
  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: typeof lightColors) => T
) {
  return () => {
    const { colors } = useTheme();
    return StyleSheet.create(factory(colors));
  };
}
