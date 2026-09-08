import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { router } from 'expo-router';
import type { Notification } from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { AppStateProvider, useAppState } from '@/contexts/AppStateContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

function useNotificationObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    let active = true;
    let subscription: { remove: () => void } | null = null;

    function redirect(notification: Notification) {
      if (notification.request.content.data?.kind === 'wordupDailyReminder') {
        router.replace('/today');
      }
    }

    void import('expo-notifications').then((Notifications) => {
      if (!active) return;

      const response = Notifications.getLastNotificationResponse();
      if (response?.notification) {
        redirect(response.notification);
      }

      subscription = Notifications.addNotificationResponseReceivedListener((nextResponse) => {
        redirect(nextResponse.notification);
      });
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
}

function RootNavigator() {
  const appState = useAppState();
  useNotificationObserver();
  return (
    <ThemeProvider settings={appState.settings}>
      <ThemedStack />
    </ThemeProvider>
  );
}

function ThemedStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <RootNavigator />
    </AppStateProvider>
  );
}
