import AsyncStorage from '@react-native-async-storage/async-storage';

import { PlayerSettings } from '@/types/player';

const SETTINGS_KEY = 'wordup.settings';

export const defaultSettings: PlayerSettings = {
  onboardingCompleted: false,
  dailyReminder: false,
  reminderTime: { hour: 20, minute: 0 },
  haptics: true,
  sound: false,
  darkMode: false,
  colorBlindMode: false,
};

function normalizeReminderTime(value: unknown) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (match) {
      const rawHour = Number(match[1]);
      const minute = Number(match[2]);
      const period = match[3].toUpperCase();
      const hour = period === 'PM' ? (rawHour % 12) + 12 : rawHour % 12;
      return { hour, minute };
    }
  }

  if (
    value &&
    typeof value === 'object' &&
    'hour' in value &&
    'minute' in value &&
    Number.isInteger((value as { hour?: unknown }).hour) &&
    Number.isInteger((value as { minute?: unknown }).minute)
  ) {
    const { hour, minute } = value as { hour: number; minute: number };
    return {
      hour: Math.max(0, Math.min(23, hour)),
      minute: Math.max(0, Math.min(59, minute)),
    };
  }

  return defaultSettings.reminderTime;
}

export async function loadSettings() {
  const value = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!value) return defaultSettings;
  const parsed = JSON.parse(value) as Partial<PlayerSettings> & { reminderTime?: unknown };
  return {
    ...defaultSettings,
    ...parsed,
    reminderTime: normalizeReminderTime(parsed.reminderTime),
  };
}

export function saveSettings(settings: PlayerSettings) {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
