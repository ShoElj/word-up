import * as Haptics from 'expo-haptics';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getTodayDailyWord } from '@/services/dailyWordService';
import { playWordPronunciation, playWordUpSuccessSound } from '@/services/soundService';
import {
  cancelWordUpReminder,
  checkReminderPermission,
  requestReminderPermission,
  scheduleWordUpReminder,
  syncWordUpReminder,
} from '@/services/notificationService';
import {
  clearTodayGame,
  defaultStats,
  loadHistory,
  loadStats,
  loadTodayGame,
  saveHistory,
  saveStats,
  saveTodayGame,
} from '@/storage/gameStorage';
import { defaultSettings, loadSettings, saveSettings } from '@/storage/settingsStorage';
import { DailyWordErrorCode } from '@/types/dailyPuzzle';
import { DailyGame, HistoricalResult } from '@/types/game';
import { PlayerSettings, PlayerStats, ReminderTime } from '@/types/player';
import { daysBetween, toDateKey } from '@/utils/date';
import { completeDailyLearning, hydrateDailyLearning, resolveDailyGameForPuzzle } from '@/utils/game';

type DailyPuzzleStatus = 'loading' | 'ready' | 'error';

type AppStateValue = {
  ready: boolean;
  dailyPuzzleStatus: DailyPuzzleStatus;
  dailyPuzzleError: DailyWordErrorCode | null;
  settings: PlayerSettings;
  stats: PlayerStats;
  today: DailyGame | null;
  history: HistoricalResult[];
  notificationMessage: string | null;
  retryDailyPuzzle: () => Promise<void>;
  updateSettings: (patch: Partial<PlayerSettings>) => Promise<void>;
  setDailyReminderEnabled: (enabled: boolean) => Promise<void>;
  setReminderTimePreference: (reminderTime: ReminderTime) => Promise<void>;
  updateTodayGame: (game: DailyGame) => Promise<void>;
  markOnboarded: () => Promise<void>;
  completeTodayLearning: () => Promise<void>;
  submitCompletedGame: (game: DailyGame) => Promise<void>;
  triggerHaptic: (kind?: 'selection' | 'success' | 'error') => Promise<void>;
  playSuccessSound: () => void;
  playPronunciation: (audioUrl?: string) => Promise<boolean>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function nextStats(previous: PlayerStats, learning: DailyGame): PlayerStats {
  const lastDate = previous.lastCompletedDate;
  const alreadyCounted = lastDate === learning.date;
  if (alreadyCounted) {
    return previous;
  }

  const consecutive = lastDate ? daysBetween(lastDate, learning.date) === 1 : false;
  const currentStreak = consecutive ? previous.currentStreak + 1 : 1;

  return {
    currentStreak,
    longestStreak: Math.max(previous.longestStreak, currentStreak),
    gamesPlayed: previous.gamesPlayed + 1,
    gamesWon: previous.gamesWon + 1,
    lastCompletedDate: learning.date,
  };
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [dailyPuzzleStatus, setDailyPuzzleStatus] = useState<DailyPuzzleStatus>('loading');
  const [dailyPuzzleError, setDailyPuzzleError] = useState<DailyWordErrorCode | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [stats, setStats] = useState(defaultStats);
  const [today, setToday] = useState<DailyGame | null>(null);
  const [history, setHistory] = useState<HistoricalResult[]>([]);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const loadDailyPuzzle = useCallback(async (storedToday?: DailyGame | null) => {
    setDailyPuzzleStatus('loading');
    setDailyPuzzleError(null);

    const result = await getTodayDailyWord();
    if (!result.ok) {
      setToday(storedToday?.date === toDateKey() ? storedToday : null);
      setDailyPuzzleStatus('error');
      setDailyPuzzleError(result.error);
      return storedToday?.date === toDateKey() ? storedToday : null;
    }

    const puzzle = result.puzzle;
    const currentGame = resolveDailyGameForPuzzle(storedToday, puzzle);

    setToday(currentGame);
    setDailyPuzzleStatus('ready');
    setDailyPuzzleError(null);
    await saveTodayGame(currentGame);
    return currentGame;
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const [storedSettings, storedStats, storedHistory, storedToday] = await Promise.all([
        loadSettings(),
        loadStats(),
        loadHistory(),
        loadTodayGame(),
      ]);
      if (!active) return;
      const todayKey = toDateKey();
      const missedActiveStreak =
        storedStats.lastCompletedDate &&
        daysBetween(storedStats.lastCompletedDate, todayKey) > 1 &&
        storedStats.currentStreak > 0;
      const currentStats = missedActiveStreak ? { ...storedStats, currentStreak: 0 } : storedStats;
      setSettings(storedSettings);
      setStats(currentStats);
      setHistory(storedHistory.map(hydrateDailyLearning));
      setReady(true);
      await Promise.all([
        storedToday && storedToday.date !== todayKey ? clearTodayGame() : Promise.resolve(),
        missedActiveStreak ? saveStats(currentStats) : Promise.resolve(),
      ]);
      const currentGame = await loadDailyPuzzle(storedToday);
      await syncWordUpReminder({
        enabled: storedSettings.dailyReminder,
        reminderTime: storedSettings.reminderTime,
        soundEnabled: storedSettings.sound,
        todayCompleted: currentGame?.completed ?? false,
      });
    }
    void load();
    return () => {
      active = false;
    };
  }, [loadDailyPuzzle]);

  const retryDailyPuzzle = useCallback(async () => {
    await loadDailyPuzzle(await loadTodayGame());
  }, [loadDailyPuzzle]);

  const updateSettings = useCallback(
    async (patch: Partial<PlayerSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSettings(next);

      if ('sound' in patch && next.dailyReminder) {
        await syncWordUpReminder({
          enabled: true,
          reminderTime: next.reminderTime,
          soundEnabled: next.sound,
          todayCompleted: today?.completed ?? false,
        });
      }
    },
    [settings, today?.completed]
  );

  const setDailyReminderEnabled = useCallback(
    async (enabled: boolean) => {
      setNotificationMessage(null);

      if (!enabled) {
        const next = { ...settings, dailyReminder: false };
        setSettings(next);
        await Promise.all([saveSettings(next), cancelWordUpReminder()]);
        return;
      }

      const currentPermission = await checkReminderPermission();
      const permission =
        currentPermission === 'undetermined'
          ? await requestReminderPermission(settings.sound)
          : currentPermission;

      if (permission !== 'granted') {
        const next = { ...settings, dailyReminder: false };
        setSettings(next);
        setNotificationMessage(
          'Notifications are disabled. Enable them in your device settings to receive daily reminders.'
        );
        await Promise.all([saveSettings(next), cancelWordUpReminder()]);
        return;
      }

      const next = { ...settings, dailyReminder: true };
      setSettings(next);
      await Promise.all([
        saveSettings(next),
        scheduleWordUpReminder({
          reminderTime: next.reminderTime,
          soundEnabled: next.sound,
          todayCompleted: today?.completed ?? false,
        }),
      ]);
    },
    [settings, today?.completed]
  );

  const setReminderTimePreference = useCallback(
    async (reminderTime: ReminderTime) => {
      setNotificationMessage(null);
      const next = { ...settings, reminderTime };
      setSettings(next);
      await saveSettings(next);

      if (!next.dailyReminder) return;

      const permission = await checkReminderPermission();
      if (permission !== 'granted') {
        setNotificationMessage(
          'Notifications are disabled. Enable them in your device settings to receive daily reminders.'
        );
        return;
      }

      await scheduleWordUpReminder({
        reminderTime,
        soundEnabled: next.sound,
        todayCompleted: today?.completed ?? false,
      });
    },
    [settings, today?.completed]
  );

  const markOnboarded = useCallback(async () => {
    await updateSettings({ onboardingCompleted: true });
  }, [updateSettings]);

  const updateTodayGame = useCallback(async (game: DailyGame) => {
    setToday(game);
    await saveTodayGame(game);
  }, []);

  const triggerHaptic = useCallback(
    async (kind: 'selection' | 'success' | 'error' = 'selection') => {
      if (!settings.haptics) return;
      try {
        if (kind === 'success') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        if (kind === 'error') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        await Haptics.selectionAsync();
      } catch {
        return;
      }
    },
    [settings.haptics]
  );

  const saveCompletedLearning = useCallback(
    async (game: DailyGame) => {
      const completeGame = completeDailyLearning(game);
      const historical: HistoricalResult = {
        ...completeGame,
        definition: completeGame.definition,
      };
      const dedupedHistory = [historical, ...history.filter((entry) => entry.date !== completeGame.date)];
      const updatedStats = nextStats(stats, completeGame);
      setToday(completeGame);
      setHistory(dedupedHistory);
      setStats(updatedStats);
      await Promise.all([
        saveTodayGame(completeGame),
        saveHistory(dedupedHistory),
        saveStats(updatedStats),
      ]);
      await syncWordUpReminder({
        enabled: settings.dailyReminder,
        reminderTime: settings.reminderTime,
        soundEnabled: settings.sound,
        todayCompleted: true,
      });
    },
    [history, settings.dailyReminder, settings.reminderTime, settings.sound, stats]
  );

  const completeTodayLearning = useCallback(async () => {
    if (!today || today.completed) return;
    await saveCompletedLearning(today);
    void triggerHaptic('success');
  }, [saveCompletedLearning, today, triggerHaptic]);

  const submitCompletedGame = useCallback(
    async (game: DailyGame) => {
      await saveCompletedLearning(game);
    },
    [saveCompletedLearning]
  );

  const playSuccessSound = useCallback(() => {
    if (!settings.sound) return;
    void playWordUpSuccessSound();
  }, [settings.sound]);

  const playPronunciation = useCallback(
    async (audioUrl?: string) => {
      if (!settings.sound) return false;
      return playWordPronunciation(audioUrl);
    },
    [settings.sound]
  );

  const value = useMemo(
    () => ({
      ready,
      dailyPuzzleStatus,
      dailyPuzzleError,
      settings,
      stats,
      today,
      history,
      notificationMessage,
      retryDailyPuzzle,
      updateSettings,
      setDailyReminderEnabled,
      setReminderTimePreference,
      updateTodayGame,
      markOnboarded,
      completeTodayLearning,
      submitCompletedGame,
      triggerHaptic,
      playSuccessSound,
      playPronunciation,
    }),
    [
      completeTodayLearning,
      history,
      markOnboarded,
      playPronunciation,
      playSuccessSound,
      ready,
      dailyPuzzleError,
      dailyPuzzleStatus,
      notificationMessage,
      retryDailyPuzzle,
      setDailyReminderEnabled,
      setReminderTimePreference,
      settings,
      stats,
      submitCompletedGame,
      today,
      triggerHaptic,
      updateSettings,
      updateTodayGame,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return value;
}
