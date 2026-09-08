import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  clearDailyPuzzleCacheForDate,
  getDateKeyForTimezone,
  getTodayDailyWordCore,
} from '@/services/dailyWordCore';
import { DailyWordResult } from '@/types/dailyPuzzle';

export function getDeviceTimezone() {
  return (
    Localization.getCalendars()[0]?.timeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC'
  );
}

export async function getTodayDailyWord(timezone = getDeviceTimezone()): Promise<DailyWordResult> {
  return getTodayDailyWordCore({
    timezone,
    cache: AsyncStorage,
    allowDevelopmentFallback: __DEV__,
    debugLogSource: __DEV__,
    remoteClient: {
      fetchDailyWord: async (resolvedTimezone) => {
        if (!isSupabaseConfigured || !supabase) {
          return { error: 'SERVER_ERROR' };
        }

        const { data, error } = await supabase.functions.invoke('daily-word', {
          body: { timezone: resolvedTimezone },
        });

        if (error) {
          const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
          if (context?.json) {
            return context.json();
          }
          throw error;
        }

        return data;
      },
    },
  });
}

export async function clearTodayDailyPuzzleCacheForDevelopment(timezone = getDeviceTimezone()) {
  if (!__DEV__) {
    return false;
  }

  const dateKey = getDateKeyForTimezone(timezone);
  return clearDailyPuzzleCacheForDate(AsyncStorage, dateKey);
}

if (__DEV__) {
  Object.assign(globalThis, {
    wordUpClearTodayDailyPuzzleCache: clearTodayDailyPuzzleCacheForDevelopment,
  });
}
