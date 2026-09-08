import assert from 'node:assert/strict';
import { test } from 'node:test';

const cachePrefix = 'wordup.dailyPuzzle.';
const dailyEpoch = '2026-07-01';
const dailyWords = [
  { word: 'SHINE', definition: 'To give out a bright light.' },
  { word: 'CRANE', definition: 'A tall machine used for lifting heavy objects.' },
  { word: 'PLANT', definition: 'A living thing that grows in soil or water.' },
  { word: 'CLOUD', definition: 'A visible mass of condensed water vapor in the sky.' },
  { word: 'BRAVE', definition: 'Ready to face danger or difficulty.' },
  { word: 'TRACE', definition: 'A small sign or mark left behind.' },
  { word: 'FLOUR', definition: 'Powder made by grinding grain.' },
  { word: 'GLASS', definition: 'A hard, brittle transparent material.' },
  { word: 'HEART', definition: 'The organ that pumps blood through the body.' },
  { word: 'MIRTH', definition: 'Amusement, especially as expressed in laughter.' },
  { word: 'PRIDE', definition: 'A feeling of deep satisfaction in an achievement.' },
  { word: 'RIVER', definition: 'A large natural stream of water.' },
  { word: 'STONE', definition: 'Hard solid nonmetallic mineral matter.' },
  { word: 'WOVEN', definition: 'Made by interlacing threads.' },
  { word: 'YEARN', definition: 'To have an intense feeling of longing.' },
  { word: 'BLOOM', definition: 'A flower, especially one cultivated for beauty.' },
  { word: 'CHAIR', definition: 'A seat with a back for one person.' },
  { word: 'DREAM', definition: 'A series of thoughts or images during sleep.' },
  { word: 'FIELD', definition: 'An open area of land.' },
  { word: 'GRACE', definition: 'Simple elegance or refinement of movement.' },
  { word: 'LIGHT', definition: 'Natural brightness that makes sight possible.' },
  { word: 'NORTH', definition: 'The direction toward the top of a map.' },
  { word: 'PAUSE', definition: 'A temporary stop in action or speech.' },
  { word: 'SCALE', definition: 'A system of ordered marks or values.' },
];
const wordExamples = {
  LIGHT: 'The first light of morning filled the room.',
  GRACE: 'She accepted the news with grace and patience.',
  NORTH: 'The hikers turned north after crossing the stream.',
};

function getDailyPuzzleCacheKey(dateKey) {
  return `${cachePrefix}${dateKey}`;
}

function getDateKeyForTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new RangeError('Invalid timezone date parts');
  return `${year}-${month}-${day}`;
}

function isValidTimezone(timezone) {
  try {
    getDateKeyForTimezone(timezone);
    return true;
  } catch {
    return false;
  }
}

function daysBetween(startKey, endKey) {
  const start = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function validateDailyPuzzlePayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload;
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

function parseError(payload) {
  if (payload && typeof payload === 'object' && ['INVALID_TIMEZONE', 'NO_DAILY_WORD', 'SERVER_ERROR'].includes(payload.error)) {
    return payload.error;
  }
  return 'SERVER_ERROR';
}

function getDevelopmentDailyPuzzle(dateKey) {
  const daysSinceEpoch = daysBetween(dailyEpoch, dateKey);
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

async function readCachedPuzzle(cache, dateKey) {
  const cached = await cache.getItem(getDailyPuzzleCacheKey(dateKey));
  if (!cached) return null;
  const puzzle = validateDailyPuzzlePayload(JSON.parse(cached));
  return puzzle?.date === dateKey ? puzzle : null;
}

function logDailyPuzzleSource(source, logs) {
  logs?.push(`[WordUp] Daily puzzle source: ${source}`);
}

async function useDevelopmentFallback(cache, dateKey, debugLogs) {
  const puzzle = getDevelopmentDailyPuzzle(dateKey);
  logDailyPuzzleSource('development', debugLogs);
  await cache.setItem(getDailyPuzzleCacheKey(dateKey), JSON.stringify(puzzle));
  return { ok: true, puzzle, source: 'development' };
}

async function getTodayDailyWordCore({ timezone, cache, remoteClient, now = new Date(), allowDevelopmentFallback = false, debugLogs }) {
  if (!isValidTimezone(timezone)) return { ok: false, error: 'INVALID_TIMEZONE' };
  const dateKey = getDateKeyForTimezone(timezone, now);
  const cachedPuzzle = await readCachedPuzzle(cache, dateKey);
  if (cachedPuzzle) {
    logDailyPuzzleSource('cache', debugLogs);
    return { ok: true, puzzle: cachedPuzzle, source: 'cache' };
  }
  try {
    const payload = await remoteClient.fetchDailyWord(timezone);
    const remotePuzzle = validateDailyPuzzlePayload(payload);
    if (!remotePuzzle) {
      if (allowDevelopmentFallback) return useDevelopmentFallback(cache, dateKey, debugLogs);
      return { ok: false, error: parseError(payload) };
    }
    if (remotePuzzle.date !== dateKey) {
      if (allowDevelopmentFallback) return useDevelopmentFallback(cache, dateKey, debugLogs);
      return { ok: false, error: 'SERVER_ERROR' };
    }
    await cache.setItem(getDailyPuzzleCacheKey(dateKey), JSON.stringify(remotePuzzle));
    logDailyPuzzleSource('supabase', debugLogs);
    return { ok: true, puzzle: remotePuzzle, source: 'supabase' };
  } catch {
    if (allowDevelopmentFallback) return useDevelopmentFallback(cache, dateKey, debugLogs);
    return { ok: false, error: 'OFFLINE' };
  }
}

function createMemoryCache(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async getItem(key) {
      return store.get(key) ?? null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

function pronunciationForWord(word) {
  return `/${word.trim().toLowerCase()}/`;
}

function pronunciationAudioUrlForWord(word) {
  const normalized = word.trim().toLowerCase();
  return /^[a-z]{5}$/.test(normalized)
    ? `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${normalized}--_us_1.mp3`
    : undefined;
}

function exampleForWord(word) {
  const normalized = word.trim().toUpperCase();
  return wordExamples[normalized] ?? `Learning ${normalized.toLowerCase()} helps you use the word with more confidence.`;
}

function createDailyLearning(puzzle) {
  const word = puzzle.word.toUpperCase();
  return {
    dailyWordId: puzzle.id,
    date: puzzle.date,
    dailyNumber: puzzle.dailyNumber,
    word,
    definition: puzzle.definition,
    pronunciation: puzzle.pronunciation ?? pronunciationForWord(word),
    example: puzzle.example ?? exampleForWord(word),
    audioUrl: puzzle.audioUrl ?? pronunciationAudioUrlForWord(word),
    guesses: [],
    solved: false,
    attempts: 0,
    completed: false,
  };
}

function completeDailyLearning(learning) {
  const word = learning.word.toUpperCase();
  return {
    ...learning,
    word,
    pronunciation: learning.pronunciation ?? pronunciationForWord(word),
    example: learning.example ?? exampleForWord(word),
    audioUrl: learning.audioUrl ?? pronunciationAudioUrlForWord(word),
    guesses: learning.guesses ?? [],
    solved: true,
    completed: true,
    attempts: 1,
  };
}

function resolveDailyLearningForPuzzle(storedToday, puzzle) {
  if (storedToday?.date === puzzle.date && (storedToday.completed || storedToday.dailyWordId === puzzle.id)) {
    return completeDailyLearning(storedToday);
  }
  return createDailyLearning(puzzle);
}

function nextStats(previous, learning) {
  if (previous.lastCompletedDate === learning.date) return previous;
  const consecutive = previous.lastCompletedDate ? daysBetween(previous.lastCompletedDate, learning.date) === 1 : false;
  const currentStreak = consecutive ? previous.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(previous.longestStreak, currentStreak),
    gamesPlayed: previous.gamesPlayed + 1,
    gamesWon: previous.gamesWon + 1,
    lastCompletedDate: learning.date,
  };
}

function addToCollection(history, learning) {
  const completed = completeDailyLearning(learning);
  return [completed, ...history.filter((entry) => entry.date !== completed.date)];
}

function shouldPlayPronunciation({ soundEnabled, audioUrl }) {
  return soundEnabled && Boolean(audioUrl);
}

test('today daily word loads from Supabase and is cached', async () => {
  const cache = createMemoryCache();
  const puzzle = { id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'light', definition: 'Natural brightness that makes sight possible.' };
  const result = await getTodayDailyWordCore({
    timezone: 'Africa/Lagos',
    now: new Date('2026-08-14T10:00:00Z'),
    cache,
    remoteClient: { fetchDailyWord: async () => puzzle },
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'supabase');
  assert.equal(result.puzzle.word, 'LIGHT');
  assert.equal(cache.store.has(getDailyPuzzleCacheKey('2026-08-14')), true);
});

test('daily puzzle payload accepts vocabulary metadata from Supabase', () => {
  const puzzle = validateDailyPuzzlePayload({
    id: 'daily-45',
    dailyNumber: 45,
    date: '2026-08-14',
    word: 'light',
    definition: 'Natural brightness that makes sight possible.',
    example: 'The light from the window made the room feel open.',
    pronunciation: '/lyt/',
    audioUrl: 'https://example.com/light.mp3',
    partOfSpeech: 'noun',
    category: 'everyday_life',
  });

  assert.equal(puzzle.word, 'LIGHT');
  assert.equal(puzzle.partOfSpeech, 'noun');
  assert.equal(puzzle.category, 'everyday_life');
});

test('cache beats remote fetch for the same local date', async () => {
  const puzzle = { id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'LIGHT', definition: 'Natural brightness that makes sight possible.' };
  const cache = createMemoryCache({ [getDailyPuzzleCacheKey('2026-08-14')]: JSON.stringify(puzzle) });
  let calls = 0;
  const result = await getTodayDailyWordCore({
    timezone: 'Africa/Lagos',
    now: new Date('2026-08-14T18:00:00Z'),
    cache,
    remoteClient: { fetchDailyWord: async () => { calls += 1; return puzzle; } },
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'cache');
  assert.equal(calls, 0);
});

test('development fallback only runs after remote failure', async () => {
  let calls = 0;
  const result = await getTodayDailyWordCore({
    timezone: 'UTC',
    now: new Date('2026-08-13T10:00:00Z'),
    cache: createMemoryCache(),
    allowDevelopmentFallback: true,
    remoteClient: {
      fetchDailyWord: async () => {
        calls += 1;
        throw new Error('offline');
      },
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.source, 'development');
});

test('production never uses development fallback', async () => {
  const result = await getTodayDailyWordCore({
    timezone: 'UTC',
    now: new Date('2026-08-13T10:00:00Z'),
    cache: createMemoryCache(),
    allowDevelopmentFallback: false,
    remoteClient: { fetchDailyWord: async () => { throw new Error('offline'); } },
  });

  assert.deepEqual(result, { ok: false, error: 'OFFLINE' });
});

test('source reporting distinguishes cache, supabase, and development', async () => {
  const puzzle = { id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'LIGHT', definition: 'Natural brightness that makes sight possible.' };
  const cacheLogs = [];
  const supabaseLogs = [];
  const developmentLogs = [];

  await getTodayDailyWordCore({
    timezone: 'Africa/Lagos',
    now: new Date('2026-08-14T10:00:00Z'),
    cache: createMemoryCache({ [getDailyPuzzleCacheKey('2026-08-14')]: JSON.stringify(puzzle) }),
    debugLogs: cacheLogs,
    remoteClient: { fetchDailyWord: async () => { throw new Error('should not fetch'); } },
  });
  await getTodayDailyWordCore({
    timezone: 'Africa/Lagos',
    now: new Date('2026-08-14T10:00:00Z'),
    cache: createMemoryCache(),
    debugLogs: supabaseLogs,
    remoteClient: { fetchDailyWord: async () => puzzle },
  });
  await getTodayDailyWordCore({
    timezone: 'Africa/Lagos',
    now: new Date('2026-08-14T10:00:00Z'),
    cache: createMemoryCache(),
    allowDevelopmentFallback: true,
    debugLogs: developmentLogs,
    remoteClient: { fetchDailyWord: async () => ({ error: 'SERVER_ERROR' }) },
  });

  assert.deepEqual(cacheLogs, ['[WordUp] Daily puzzle source: cache']);
  assert.deepEqual(supabaseLogs, ['[WordUp] Daily puzzle source: supabase']);
  assert.deepEqual(developmentLogs, ['[WordUp] Daily puzzle source: development']);
});

test('daily learning model includes pronunciation, example, and audio metadata', () => {
  const learning = createDailyLearning({ id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'LIGHT', definition: 'Natural brightness.' });

  assert.equal(learning.pronunciation, '/light/');
  assert.equal(learning.example, 'The first light of morning filled the room.');
  assert.equal(learning.audioUrl.endsWith('/light--_us_1.mp3'), true);
});

test('completing today adds the word to the collection once', () => {
  const learning = createDailyLearning({ id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'LIGHT', definition: 'Natural brightness.' });
  const once = addToCollection([], learning);
  const twice = addToCollection(once, learning);

  assert.equal(twice.length, 1);
  assert.equal(twice[0].word, 'LIGHT');
  assert.equal(twice[0].completed, true);
});

test('next day uses a new cache key and keeps previous collection entry', () => {
  const yesterday = completeDailyLearning(createDailyLearning({ id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'LIGHT', definition: 'Natural brightness.' }));
  const today = createDailyLearning({ id: 'daily-46', dailyNumber: 46, date: '2026-08-15', word: 'NORTH', definition: 'The direction toward the top of a map.' });

  assert.notEqual(getDailyPuzzleCacheKey(yesterday.date), getDailyPuzzleCacheKey(today.date));
  assert.deepEqual(addToCollection([yesterday], today).map((entry) => entry.word), ['NORTH', 'LIGHT']);
});

test('learning streak increments for consecutive completion and resets after a missed day', () => {
  const first = completeDailyLearning(createDailyLearning({ id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'LIGHT', definition: 'Natural brightness.' }));
  const second = completeDailyLearning(createDailyLearning({ id: 'daily-46', dailyNumber: 46, date: '2026-08-15', word: 'NORTH', definition: 'A direction.' }));
  const missedReset = completeDailyLearning(createDailyLearning({ id: 'daily-48', dailyNumber: 48, date: '2026-08-17', word: 'SCALE', definition: 'Ordered marks.' }));
  const afterFirst = nextStats({ currentStreak: 0, longestStreak: 0, gamesPlayed: 0, gamesWon: 0 }, first);
  const afterSecond = nextStats(afterFirst, second);
  const afterMissed = nextStats(afterSecond, missedReset);

  assert.equal(afterSecond.currentStreak, 2);
  assert.equal(afterMissed.currentStreak, 1);
  assert.equal(afterMissed.longestStreak, 2);
});

test('reopening after completion does not increment streak again', () => {
  const learning = completeDailyLearning(createDailyLearning({ id: 'daily-45', dailyNumber: 45, date: '2026-08-14', word: 'LIGHT', definition: 'Natural brightness.' }));
  const first = nextStats({ currentStreak: 0, longestStreak: 0, gamesPlayed: 0, gamesWon: 0 }, learning);
  const reopened = nextStats(first, learning);

  assert.deepEqual(reopened, first);
});

test('completed same-date local learning is preserved when live puzzle id differs', () => {
  const completedDevelopmentLearning = completeDailyLearning(createDailyLearning({
    id: 'dev-2026-08-14',
    dailyNumber: 45,
    date: '2026-08-14',
    word: 'LIGHT',
    definition: 'Natural brightness.',
  }));
  const livePuzzle = {
    id: '16f0500c-b1bf-4bfc-8acc-24a20a088098',
    dailyNumber: 45,
    date: '2026-08-14',
    word: 'LIGHT',
    definition: 'Natural brightness.',
  };

  assert.equal(resolveDailyLearningForPuzzle(completedDevelopmentLearning, livePuzzle).dailyWordId, 'dev-2026-08-14');
});

test('audio setting gates pronunciation playback', () => {
  assert.equal(shouldPlayPronunciation({ soundEnabled: false, audioUrl: 'https://example.com/light.mp3' }), false);
  assert.equal(shouldPlayPronunciation({ soundEnabled: true, audioUrl: undefined }), false);
  assert.equal(shouldPlayPronunciation({ soundEnabled: true, audioUrl: 'https://example.com/light.mp3' }), true);
});

test('invalid timezone returns INVALID_TIMEZONE', async () => {
  const result = await getTodayDailyWordCore({
    timezone: 'Not/AZone',
    cache: createMemoryCache(),
    remoteClient: { fetchDailyWord: async () => ({}) },
  });

  assert.deepEqual(result, { ok: false, error: 'INVALID_TIMEZONE' });
});

// --- validateDailyPuzzlePayload: curriculum word acceptance ---

const validBase = { id: 'daily-1', dailyNumber: 1, date: '2026-09-15', definition: 'A definition.' };

test('validateDailyPuzzlePayload accepts CLEAN (5 letters)', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'CLEAN' });
  assert.equal(result?.word, 'CLEAN');
});

test('validateDailyPuzzlePayload accepts CONCISE (7 letters)', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'CONCISE' });
  assert.equal(result?.word, 'CONCISE');
});

test('validateDailyPuzzlePayload accepts ARTICULATE (10 letters)', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'ARTICULATE' });
  assert.equal(result?.word, 'ARTICULATE');
});

test('validateDailyPuzzlePayload accepts INTERDEPENDENCE (15 letters)', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'INTERDEPENDENCE' });
  assert.equal(result?.word, 'INTERDEPENDENCE');
});

test('validateDailyPuzzlePayload accepts hyphenated words', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'WELL-BEING' });
  assert.equal(result?.word, 'WELL-BEING');
});

test('validateDailyPuzzlePayload accepts multi-word phrases', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'CRITICAL THINKING' });
  assert.equal(result?.word, 'CRITICAL THINKING');
});

test('validateDailyPuzzlePayload rejects empty string', () => {
  assert.equal(validateDailyPuzzlePayload({ ...validBase, word: '' }), null);
});

test('validateDailyPuzzlePayload normalises lowercase word to uppercase', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'concise' });
  assert.equal(result?.word, 'CONCISE');
});

test('validateDailyPuzzlePayload rejects word with digits', () => {
  assert.equal(validateDailyPuzzlePayload({ ...validBase, word: 'W0RD5' }), null);
});

test('validateDailyPuzzlePayload rejects word with trailing space', () => {
  assert.equal(validateDailyPuzzlePayload({ ...validBase, word: 'CLEAN ' }), null);
});

test('validateDailyPuzzlePayload rejects missing definition', () => {
  const { definition: _, ...noDefinition } = validBase;
  assert.equal(validateDailyPuzzlePayload({ ...noDefinition, word: 'CLEAN' }), null);
});

test('validateDailyPuzzlePayload does not truncate long words', () => {
  const result = validateDailyPuzzlePayload({ ...validBase, word: 'ARTICULATE' });
  assert.equal(result?.word, 'ARTICULATE');
  assert.equal(result?.word.length, 10);
});
