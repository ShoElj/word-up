import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationPermissionsStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { ReminderTime } from '@/types/player';
import { nextReminderDate, toReminderKey } from '@/utils/reminderTime';

export const WORDUP_DAILY_CHANNEL_ID = 'wordup-daily';
const WORDUP_DAILY_NOTIFICATION_ID = 'wordup-daily-reminder';
const WORDUP_DAILY_IDENTIFIER_KEY = 'wordup.notifications.dailyIdentifier';

export type ReminderPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

if (Platform.OS !== 'web') {
  void import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  });
}

export function isUsablePermissionStatus(status: NotificationPermissionsStatus) {
  if (status.granted || status.status === 'granted') return true;
  const iosStatus = status.ios?.status;
  return iosStatus === 2 || iosStatus === 3 || iosStatus === 4;
}

export async function setupAndroidNotificationChannel(soundEnabled: boolean) {
  if (Platform.OS !== 'android') return;
  const Notifications = await import('expo-notifications');

  await Notifications.setNotificationChannelAsync(WORDUP_DAILY_CHANNEL_ID, {
    name: 'Daily Word Reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: soundEnabled ? 'default' : undefined,
  });
}

export async function checkReminderPermission(): Promise<ReminderPermissionStatus> {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }

  const Notifications = await import('expo-notifications');
  const permissions = await Notifications.getPermissionsAsync();
  if (isUsablePermissionStatus(permissions)) return 'granted';
  if (permissions.status === 'denied' || permissions.ios?.status === 1) {
    return 'denied';
  }
  return 'undetermined';
}

export async function requestReminderPermission(soundEnabled: boolean): Promise<ReminderPermissionStatus> {
  if (Platform.OS === 'web') {
    return 'unavailable';
  }

  await setupAndroidNotificationChannel(soundEnabled);
  const current = await checkReminderPermission();
  if (current !== 'undetermined') return current;

  const Notifications = await import('expo-notifications');
  const permissions = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: soundEnabled,
    },
  });

  if (isUsablePermissionStatus(permissions)) return 'granted';
  return 'denied';
}

export async function getCurrentWordUpReminder() {
  if (Platform.OS === 'web') {
    return null;
  }

  const Notifications = await import('expo-notifications');
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.find(
    (notification) =>
      notification.identifier === WORDUP_DAILY_NOTIFICATION_ID ||
      notification.content.data?.kind === 'wordupDailyReminder'
  );
}

export async function cancelWordUpReminder() {
  if (Platform.OS === 'web') {
    return;
  }

  const Notifications = await import('expo-notifications');
  const [storedIdentifier, currentReminder] = await Promise.all([
    AsyncStorage.getItem(WORDUP_DAILY_IDENTIFIER_KEY),
    getCurrentWordUpReminder(),
  ]);

  await Promise.all(
    [storedIdentifier, currentReminder?.identifier, WORDUP_DAILY_NOTIFICATION_ID]
      .filter((identifier): identifier is string => Boolean(identifier))
      .map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined))
  );

  await AsyncStorage.removeItem(WORDUP_DAILY_IDENTIFIER_KEY);
}

export async function scheduleWordUpReminder({
  reminderTime,
  soundEnabled,
  todayCompleted,
  now = new Date(),
}: {
  reminderTime: ReminderTime;
  soundEnabled: boolean;
  todayCompleted: boolean;
  now?: Date;
}) {
  if (Platform.OS === 'web') {
    return null;
  }

  await setupAndroidNotificationChannel(soundEnabled);
  await cancelWordUpReminder();
  const Notifications = await import('expo-notifications');

  const triggerDate = nextReminderDate(reminderTime, now, todayCompleted);
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: WORDUP_DAILY_NOTIFICATION_ID,
    content: {
      title: 'WordUp',
      body: 'Your new WordUp word is ready.',
      sound: soundEnabled,
      data: {
        kind: 'wordupDailyReminder',
        url: '/(tabs)/today',
        reminderTime: toReminderKey(reminderTime),
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: WORDUP_DAILY_CHANNEL_ID,
    },
  });

  await AsyncStorage.setItem(WORDUP_DAILY_IDENTIFIER_KEY, identifier);
  return identifier;
}

export async function syncWordUpReminder({
  enabled,
  reminderTime,
  soundEnabled,
  todayCompleted,
}: {
  enabled: boolean;
  reminderTime: ReminderTime;
  soundEnabled: boolean;
  todayCompleted: boolean;
}) {
  if (Platform.OS === 'web') {
    return { scheduled: false as const, permission: 'unavailable' as const };
  }

  if (!enabled) {
    await cancelWordUpReminder();
    return { scheduled: false as const, permission: await checkReminderPermission() };
  }

  const permission = await checkReminderPermission();
  if (permission !== 'granted') {
    await cancelWordUpReminder();
    return { scheduled: false as const, permission };
  }

  await scheduleWordUpReminder({ reminderTime, soundEnabled, todayCompleted });
  return { scheduled: true as const, permission };
}

export async function canScheduleWordUpReminder() {
  return (await checkReminderPermission()) === 'granted';
}
