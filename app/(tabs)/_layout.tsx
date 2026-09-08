import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { WordUpTabBar } from '@/components/BottomTabs';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <WordUpTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          height: 82,
          paddingTop: 10,
          paddingBottom: 18,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="words"
        options={{
          title: 'Words',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="streak"
        options={{
          title: 'Streak',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
