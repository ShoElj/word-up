import { DAILY_EPOCH, WORD_LENGTH } from '@/constants/game';
import { dailyWords } from '@/data/words';
import { DailyPuzzle, DailyWordErrorCode, DailyWordResult } from '@/types/dailyPuzzle';
import { daysBetween } from '@/utils/date';

type DailyPuzzleSource = Extract<DailyWordResult, { ok: true }>['source'];

export type DailyPuzzleCache = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem?: (key: string) => Promise<void>;
};

export type DailyWordRemoteClient = {
  fetchDailyWord: (timezone: string) => Promise<unknown>;
};

const cachePrefix = 'wordup.dailyPuzzle.';

export function getDailyPuzzleCacheKey(dateKey: string) {
  return `${cachePrefix}${dateKey}`;
}

export function getDateKeyForTimezone(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new RangeError('Invalid timezone date parts');
  }

  return `${year}-${month}-${day}`;
}

export function isValidTimezone(timezone: string) {
  try {
    getDateKeyForTimezone(timezone);
    return true;
  } catch {
    return false;
  }
}

export function validateDailyPuzzlePayload(payload: unknown): DailyPuzzle | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<DailyPuzzle>;
  const word = typeof candidate.word === 'string' ? candidate.word.toUpperCase() : '';

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.dailyNumber !== 'number' ||
    !Number.isInteger(candidate.dailyNumber) ||
    typeof candidate.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(candidate.date) ||
    !/^[A-Z]+([ -][A-Z]+)*$/.test(word) ||
    typeof candidate.definition !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    dailyNumber: candidate.dailyNumber,
    date: candidate.date,
    word,
    definition: candidate.definition,
    pronunciation: typeof candidate.pronunciation === 'string' ? candidate.pronunciation : undefined,
    example: typeof candidate.example === 'string' ? candidate.example : undefined,
    audioUrl: typeof candidate.audioUrl === 'string' ? candidate.audioUrl : undefined,
    partOfSpeech: typeof candidate.partOfSpeech === 'string' ? candidate.partOfSpeech : undefined,
    category: typeof candidate.category === 'string' ? candidate.category : undefined,
  };
}

export function getDevelopmentDailyPuzzle(dateKey: string): DailyPuzzle {
  const daysSinceEpoch = daysBetween(DAILY_EPOCH, dateKey);
  const index = ((daysSinceEpoch % dailyWords.length) + dailyWords.length) % dailyWords.length;
  const entry = dailyWords[index];

  return {
    id: `dev-${dateKey}`,
    dailyNumber: Math.max(1, daysSinceEpoch + 1),
    date: dateKey,
    word: entry.word,
    definition: entry.definition,
  };
}

function parseError(payload: unknown): DailyWordErrorCode {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (error === 'INVALID_TIMEZONE' || error === 'NO_DAILY_WORD' || error === 'SERVER_ERROR') {
      return error;
    }
  }
  return 'SERVER_ERROR';
}

function logDailyPuzzleSource(source: DailyPuzzleSource) {
  console.log(`[WordUp] Daily puzzle source: ${source}`);
}

async function readCachedPuzzle(cache: DailyPuzzleCache, dateKey: string) {
  const cached = await cache.getItem(getDailyPuzzleCacheKey(dateKey));
  if (!cached) return null;
  try {
    const puzzle = validateDailyPuzzlePayload(JSON.parse(cached));
    return puzzle?.date === dateKey ? puzzle : null;
  } catch {
    return null;
  }
}

async function useDevelopmentFallback(cache: DailyPuzzleCache, dateKey: string, debugLogSource: boolean): Promise<DailyWordResult> {
  const puzzle = getDevelopmentDailyPuzzle(dateKey);
  if (debugLogSource) {
    logDailyPuzzleSource('development');
  }
  await cache.setItem(getDailyPuzzleCacheKey(dateKey), JSON.stringify(puzzle));
  return { ok: true, puzzle, source: 'development' };
}

export async function getTodayDailyWordCore({
  timezone,
  cache,
  remoteClient,
  now = new Date(),
  allowDevelopmentFallback = false,
  debugLogSource = false,
}: {
  timezone: string;
  cache: DailyPuzzleCache;
  remoteClient: DailyWordRemoteClient;
  now?: Date;
  allowDevelopmentFallback?: boolean;
  debugLogSource?: boolean;
}): Promise<DailyWordResult> {
  if (!isValidTimezone(timezone)) {
    return { ok: false, error: 'INVALID_TIMEZONE' };
  }

  const dateKey = getDateKeyForTimezone(timezone, now);
  const cachedPuzzle = await readCachedPuzzle(cache, dateKey);
  if (cachedPuzzle) {
    if (debugLogSource) {
      logDailyPuzzleSource('cache');
    }
    return { ok: true, puzzle: cachedPuzzle, source: 'cache' };
  }

  try {
    const payload = await remoteClient.fetchDailyWord(timezone);
    const remotePuzzle = validateDailyPuzzlePayload(payload);
    if (!remotePuzzle) {
      if (allowDevelopmentFallback) {
        return useDevelopmentFallback(cache, dateKey, debugLogSource);
      }
      return { ok: false, error: parseError(payload) };
    }
    if (remotePuzzle.date !== dateKey) {
      if (allowDevelopmentFallback) {
        return useDevelopmentFallback(cache, dateKey, debugLogSource);
      }
      return { ok: false, error: 'SERVER_ERROR' };
    }

    await cache.setItem(getDailyPuzzleCacheKey(dateKey), JSON.stringify(remotePuzzle));
    if (debugLogSource) {
      logDailyPuzzleSource('supabase');
    }
    return { ok: true, puzzle: remotePuzzle, source: 'supabase' };
  } catch {
    if (allowDevelopmentFallback) {
      return useDevelopmentFallback(cache, dateKey, debugLogSource);
    }
    return { ok: false, error: 'OFFLINE' };
  }
}

export async function clearDailyPuzzleCacheForDate(cache: DailyPuzzleCache, dateKey: string) {
  if (!cache.removeItem) {
    return false;
  }
  await cache.removeItem(getDailyPuzzleCacheKey(dateKey));
  return true;
}
