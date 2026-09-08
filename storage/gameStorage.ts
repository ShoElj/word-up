import AsyncStorage from '@react-native-async-storage/async-storage';

import { DailyGame, HistoricalResult } from '@/types/game';
import { PlayerStats } from '@/types/player';

const TODAY_KEY = 'wordup.today';
const HISTORY_KEY = 'wordup.history';
const STATS_KEY = 'wordup.stats';

export const defaultStats: PlayerStats = {
  currentStreak: 0,
  longestStreak: 0,
  gamesPlayed: 0,
  gamesWon: 0,
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

export function loadTodayGame() {
  return readJson<DailyGame | null>(TODAY_KEY, null);
}

export function clearTodayGame() {
  return AsyncStorage.removeItem(TODAY_KEY);
}

export function saveTodayGame(game: DailyGame) {
  return AsyncStorage.setItem(TODAY_KEY, JSON.stringify(game));
}

export function loadHistory() {
  return readJson<HistoricalResult[]>(HISTORY_KEY, []);
}

export function saveHistory(history: HistoricalResult[]) {
  return AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function loadStats() {
  return readJson<PlayerStats>(STATS_KEY, defaultStats);
}

export function saveStats(stats: PlayerStats) {
  return AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
