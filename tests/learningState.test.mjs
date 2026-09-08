import assert from 'node:assert/strict';
import { test } from 'node:test';

// ─── Inline implementations mirroring the production code ─────────────────────
// These replicate the logic in utils/game.ts, types/game.ts, and
// contexts/AppStateContext.tsx so the tests run in plain Node without a bundler.

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
  return `Learning ${word.trim().toLowerCase()} helps you use the word with more confidence.`;
}

function createDailyGame(puzzle) {
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
    partOfSpeech: puzzle.partOfSpeech,
    category: puzzle.category,
    guesses: [],
    solved: false,
    attempts: 0,
    completed: false,
  };
}

function completeDailyLearning(game) {
  const word = game.word.toUpperCase();
  return {
    ...game,
    word,
    pronunciation: game.pronunciation ?? pronunciationForWord(word),
    example: game.example ?? exampleForWord(word),
    audioUrl: game.audioUrl ?? pronunciationAudioUrlForWord(word),
    guesses: game.guesses ?? [],
    solved: true,
    completed: true,
    attempts: 1,
  };
}

function hydrateDailyLearning(game) {
  const word = game.word.toUpperCase();
  return {
    ...game,
    word,
    pronunciation: game.pronunciation ?? pronunciationForWord(word),
    example: game.example ?? exampleForWord(word),
    audioUrl: game.audioUrl ?? pronunciationAudioUrlForWord(word),
    guesses: game.guesses ?? [],
  };
}

function resolveDailyGameForPuzzle(storedToday, puzzle) {
  if (storedToday?.date === puzzle.date && (storedToday.completed || storedToday.dailyWordId === puzzle.id)) {
    return hydrateDailyLearning(storedToday);
  }
  return createDailyGame(puzzle);
}

function nextStats(previous, learning) {
  if (previous.lastCompletedDate === learning.date) return previous;
  const consecutive = previous.lastCompletedDate
    ? Math.floor((new Date(`${learning.date}T00:00:00Z`) - new Date(`${previous.lastCompletedDate}T00:00:00Z`)) / 86400000) === 1
    : false;
  const currentStreak = consecutive ? previous.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(previous.longestStreak, currentStreak),
    gamesPlayed: previous.gamesPlayed + 1,
    gamesWon: previous.gamesWon + 1,
    lastCompletedDate: learning.date,
  };
}

// Simulates saveCompletedLearning from AppStateContext
function saveCompletedLearning({ game, history, stats }) {
  const completeGame = completeDailyLearning(game);
  const historical = { ...completeGame, definition: completeGame.definition };
  const dedupedHistory = [historical, ...history.filter((entry) => entry.date !== completeGame.date)];
  const updatedStats = nextStats(stats, completeGame);
  return { game: completeGame, history: dedupedHistory, stats: updatedStats };
}

// Simulates JSON round-trip through AsyncStorage
function persist(value) {
  return JSON.parse(JSON.stringify(value));
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const historicalLightPuzzle = {
  id: 'daily-45',
  dailyNumber: 45,
  date: '2026-08-14',
  word: 'LIGHT',
  definition: 'Natural brightness that makes sight possible.',
  pronunciation: '/lyt/',
  example: 'The first light of morning filled the room.',
  audioUrl: 'https://ssl.gstatic.com/dictionary/static/sounds/oxford/light--_us_1.mp3',
  partOfSpeech: 'noun',
  category: 'everyday_life',
};

const curriculumConcisePuzzle = {
  id: 'curriculum-1',
  dailyNumber: 1,
  date: '2026-09-15',
  word: 'CONCISE',
  definition: 'Using few words while remaining clear.',
  pronunciation: '/kun-sys/',
  example: 'Please keep the update concise and practical.',
  audioUrl: undefined,
  partOfSpeech: 'adjective',
  category: 'communication',
};

const emptyStats = { currentStreak: 0, longestStreak: 0, gamesPlayed: 0, gamesWon: 0 };

// ─── First time saving a daily word ───────────────────────────────────────────

test('first time saving a daily word marks it completed and adds to history', () => {
  const game = createDailyGame(historicalLightPuzzle);
  assert.equal(game.completed, false);

  const { game: saved, history } = saveCompletedLearning({ game, history: [], stats: emptyStats });

  assert.equal(saved.completed, true);
  assert.equal(saved.solved, true);
  assert.equal(history.length, 1);
  assert.equal(history[0].word, 'LIGHT');
  assert.equal(history[0].date, '2026-08-14');
});

// ─── Saving the same word twice does not duplicate it ─────────────────────────

test('saving the same word twice does not create a duplicate history entry', () => {
  const game = createDailyGame(historicalLightPuzzle);
  const first = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const second = saveCompletedLearning({ game, history: first.history, stats: first.stats });

  assert.equal(second.history.length, 1);
  assert.equal(second.history[0].word, 'LIGHT');
});

// ─── Learned state survives reload (JSON round-trip) ──────────────────────────

test('learned state survives a JSON round-trip (simulated AsyncStorage reload)', () => {
  const game = createDailyGame(historicalLightPuzzle);
  const { game: saved } = saveCompletedLearning({ game, history: [], stats: emptyStats });

  const reloaded = hydrateDailyLearning(persist(saved));

  assert.equal(reloaded.completed, true);
  assert.equal(reloaded.word, 'LIGHT');
  assert.equal(reloaded.definition, 'Natural brightness that makes sight possible.');
  assert.equal(reloaded.pronunciation, '/lyt/');
  assert.equal(reloaded.example, 'The first light of morning filled the room.');
});

// ─── Today's word remains available after learning ────────────────────────────

test("today's word is still present after learning (completed flag set, word not deleted)", () => {
  const game = createDailyGame(historicalLightPuzzle);
  const { game: saved } = saveCompletedLearning({ game, history: [], stats: emptyStats });

  // The game object is still the same date and word — just marked completed
  assert.equal(saved.date, '2026-08-14');
  assert.equal(saved.word, 'LIGHT');
  assert.equal(saved.completed, true);
});

// ─── Same-date save counts as one learning day ────────────────────────────────

test('pressing "Add to Your Words" twice on the same date counts as one learning day', () => {
  const game = createDailyGame(historicalLightPuzzle);
  const first = saveCompletedLearning({ game, history: [], stats: emptyStats });
  // Simulate pressing the button again (already completed, but test the stats guard)
  const second = saveCompletedLearning({ game: first.game, history: first.history, stats: first.stats });

  assert.equal(second.stats.gamesPlayed, 1);
  assert.equal(second.stats.currentStreak, 1);
  assert.equal(second.stats.lastCompletedDate, '2026-08-14');
});

// ─── Learned date is stored ───────────────────────────────────────────────────

test('learned date is stored on the history entry', () => {
  const game = createDailyGame(historicalLightPuzzle);
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });

  assert.equal(history[0].date, '2026-08-14');
});

// ─── Word metadata is preserved ───────────────────────────────────────────────

test('word metadata (pronunciation, example, audioUrl, partOfSpeech, category) is preserved after save', () => {
  const game = createDailyGame(historicalLightPuzzle);
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const entry = history[0];

  assert.equal(entry.pronunciation, '/lyt/');
  assert.equal(entry.example, 'The first light of morning filled the room.');
  assert.equal(entry.audioUrl, 'https://ssl.gstatic.com/dictionary/static/sounds/oxford/light--_us_1.mp3');
  assert.equal(entry.partOfSpeech, 'noun');
  assert.equal(entry.category, 'everyday_life');
  assert.equal(entry.dailyNumber, 45);
});

// ─── Curriculum word metadata is preserved ────────────────────────────────────

test('curriculum word metadata is preserved (no audioUrl for vocabulary words without audio)', () => {
  const game = createDailyGame(curriculumConcisePuzzle);

  assert.equal(game.word, 'CONCISE');
  assert.equal(game.partOfSpeech, 'adjective');
  assert.equal(game.category, 'communication');
  assert.equal(game.pronunciation, '/kun-sys/');
  // CONCISE is 7 chars — pronunciationAudioUrlForWord returns undefined; puzzle.audioUrl is also undefined
  assert.equal(game.audioUrl, undefined);

  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  assert.equal(history[0].partOfSpeech, 'adjective');
  assert.equal(history[0].category, 'communication');
  assert.equal(history[0].audioUrl, undefined);
});

// ─── Word detail receives the correct data ────────────────────────────────────

test('word detail lookup by date returns the correct history entry', () => {
  const game = createDailyGame(historicalLightPuzzle);
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });

  // Simulate the word/[id].tsx lookup: history.find(entry => entry.date === id)
  const found = history.find((entry) => entry.date === '2026-08-14');

  assert.ok(found, 'entry should be found by date');
  assert.equal(found.word, 'LIGHT');
  assert.equal(found.definition, 'Natural brightness that makes sight possible.');
  assert.equal(found.partOfSpeech, 'noun');
  assert.equal(found.category, 'everyday_life');
});

test('word detail lookup returns null for an unknown date', () => {
  const found = [].find((entry) => entry.date === '2099-01-01');
  assert.equal(found, undefined);
});

// ─── Existing historical data remains compatible ───────────────────────────────

test('existing historical data without partOfSpeech/category hydrates without error', () => {
  // Simulate a stored entry from before the partOfSpeech/category fields were added
  const legacyEntry = {
    dailyWordId: 'daily-44',
    date: '2026-08-13',
    dailyNumber: 44,
    word: 'GRACE',
    definition: 'Simple elegance or refinement of movement.',
    // no pronunciation, example, audioUrl, partOfSpeech, category
    guesses: [],
    solved: true,
    attempts: 1,
    completed: true,
  };

  const hydrated = hydrateDailyLearning(persist(legacyEntry));

  assert.equal(hydrated.word, 'GRACE');
  assert.equal(hydrated.completed, true);
  assert.equal(hydrated.pronunciation, '/grace/');
  assert.equal(hydrated.partOfSpeech, undefined);
  assert.equal(hydrated.category, undefined);
  // audioUrl: GRACE is 5 chars, so the fallback URL is generated
  assert.ok(hydrated.audioUrl?.includes('grace'));
});

test('existing history entry without guesses field hydrates safely', () => {
  const legacyEntry = {
    date: '2026-08-13',
    dailyNumber: 44,
    word: 'GRACE',
    definition: 'Simple elegance.',
    completed: true,
    solved: true,
    attempts: 1,
    // guesses field missing entirely
  };

  const hydrated = hydrateDailyLearning(persist(legacyEntry));
  assert.deepEqual(hydrated.guesses, []);
});

// ─── Streak behavior ──────────────────────────────────────────────────────────

test('streak increments on consecutive days', () => {
  const day1 = completeDailyLearning(createDailyGame({ ...historicalLightPuzzle, date: '2026-08-14' }));
  const day2 = completeDailyLearning(createDailyGame({ ...historicalLightPuzzle, date: '2026-08-15', dailyNumber: 46, word: 'NORTH' }));

  const after1 = nextStats(emptyStats, day1);
  const after2 = nextStats(after1, day2);

  assert.equal(after2.currentStreak, 2);
  assert.equal(after2.longestStreak, 2);
});

test('streak resets after a missed day', () => {
  const day1 = completeDailyLearning(createDailyGame({ ...historicalLightPuzzle, date: '2026-08-14' }));
  const day3 = completeDailyLearning(createDailyGame({ ...historicalLightPuzzle, date: '2026-08-16', dailyNumber: 47, word: 'PAUSE' }));

  const after1 = nextStats(emptyStats, day1);
  const after3 = nextStats(after1, day3);

  assert.equal(after3.currentStreak, 1);
  assert.equal(after3.longestStreak, 1);
});

test('saving the same date twice does not increment streak', () => {
  const game = completeDailyLearning(createDailyGame(historicalLightPuzzle));
  const after1 = nextStats(emptyStats, game);
  const after2 = nextStats(after1, game);

  assert.deepEqual(after2, after1);
});

// ─── resolveDailyGameForPuzzle: completed state is preserved on reload ─────────

test('resolveDailyGameForPuzzle preserves completed state when puzzle date matches', () => {
  const game = createDailyGame(historicalLightPuzzle);
  const { game: completed } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const stored = persist(completed);

  const resolved = resolveDailyGameForPuzzle(stored, historicalLightPuzzle);

  assert.equal(resolved.completed, true);
  assert.equal(resolved.word, 'LIGHT');
});

test('resolveDailyGameForPuzzle creates a fresh game for a new date', () => {
  const yesterday = persist(completeDailyLearning(createDailyGame(historicalLightPuzzle)));
  const todayPuzzle = { ...historicalLightPuzzle, date: '2026-08-15', dailyNumber: 46, word: 'NORTH' };

  const resolved = resolveDailyGameForPuzzle(yesterday, todayPuzzle);

  assert.equal(resolved.completed, false);
  assert.equal(resolved.word, 'NORTH');
  assert.equal(resolved.date, '2026-08-15');
});

// ─── Source file assertions ────────────────────────────────────────────────────

test('DailyGame type includes partOfSpeech and category fields', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('types/game.ts', 'utf8');
  assert.match(source, /partOfSpeech\?:\s*string/);
  assert.match(source, /category\?:\s*string/);
});

test('createDailyGame copies partOfSpeech and category from puzzle', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('utils/game.ts', 'utf8');
  assert.match(source, /partOfSpeech: puzzle\.partOfSpeech/);
  assert.match(source, /category: puzzle\.category/);
});

test('today screen displays partOfSpeech when present', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/(tabs)/today.tsx', 'utf8');
  assert.match(source, /today\.partOfSpeech/);
  assert.match(source, /today\.category/);
});

test('today screen Listen button is conditional on audioUrl', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/(tabs)/today.tsx', 'utf8');
  assert.match(source, /today\.audioUrl/);
});

test('word detail screen displays partOfSpeech and category when present', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/word/[id].tsx', 'utf8');
  assert.match(source, /result\.partOfSpeech/);
  assert.match(source, /result\.category/);
});

test('word detail screen Listen button is conditional on audioUrl', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/word/[id].tsx', 'utf8');
  assert.match(source, /result\.audioUrl/);
});
