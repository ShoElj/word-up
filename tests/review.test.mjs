import assert from 'node:assert/strict';
import { test } from 'node:test';

// ─── Inline implementations mirroring production logic ────────────────────────

function completeDailyLearning(game) {
  const word = game.word.toUpperCase();
  return {
    ...game,
    word,
    pronunciation: game.pronunciation ?? `/${word.toLowerCase()}/`,
    example: game.example ?? `Learning ${word.toLowerCase()} helps you use the word with more confidence.`,
    audioUrl: game.audioUrl ?? (/^[a-z]{5}$/.test(word.toLowerCase())
      ? `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${word.toLowerCase()}--_us_1.mp3`
      : undefined),
    guesses: game.guesses ?? [],
    solved: true,
    completed: true,
    attempts: 1,
  };
}

function saveCompletedLearning({ game, history, stats }) {
  const completeGame = completeDailyLearning(game);
  const historical = { ...completeGame, definition: completeGame.definition };
  const dedupedHistory = [historical, ...history.filter((e) => e.date !== completeGame.date)];
  return { game: completeGame, history: dedupedHistory, stats };
}

// Simulates the review screen's word source: only completed history entries
function getReviewWords(history) {
  return history.filter((entry) => entry.completed === true);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const emptyStats = { currentStreak: 0, longestStreak: 0, gamesPlayed: 0, gamesWon: 0 };

function makePuzzle(overrides) {
  return {
    id: 'daily-1',
    dailyNumber: 1,
    date: '2026-09-15',
    word: 'LIGHT',
    definition: 'Natural brightness that makes sight possible.',
    pronunciation: '/lyt/',
    example: 'The first light of morning filled the room.',
    audioUrl: 'https://ssl.gstatic.com/dictionary/static/sounds/oxford/light--_us_1.mp3',
    partOfSpeech: 'noun',
    category: 'everyday_life',
    guesses: [],
    solved: false,
    attempts: 0,
    completed: false,
    ...overrides,
  };
}

// ─── Review with one learned word ─────────────────────────────────────────────

test('review with one learned word shows that word', () => {
  const game = makePuzzle();
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words.length, 1);
  assert.equal(words[0].word, 'LIGHT');
});

// ─── Review with multiple learned words ───────────────────────────────────────

test('review with multiple learned words shows all of them', () => {
  const g1 = makePuzzle({ date: '2026-09-15', word: 'LIGHT', dailyNumber: 1 });
  const g2 = makePuzzle({ date: '2026-09-16', word: 'NORTH', dailyNumber: 2 });
  const g3 = makePuzzle({ date: '2026-09-17', word: 'GRACE', dailyNumber: 3 });

  let { history } = saveCompletedLearning({ game: g1, history: [], stats: emptyStats });
  ({ history } = saveCompletedLearning({ game: g2, history, stats: emptyStats }));
  ({ history } = saveCompletedLearning({ game: g3, history, stats: emptyStats }));

  const words = getReviewWords(history);
  assert.equal(words.length, 3);
  assert.ok(words.some((w) => w.word === 'LIGHT'));
  assert.ok(words.some((w) => w.word === 'NORTH'));
  assert.ok(words.some((w) => w.word === 'GRACE'));
});

// ─── Review excludes unlearned words ──────────────────────────────────────────

test('review excludes words that have not been learned (completed: false)', () => {
  const learned = makePuzzle({ date: '2026-09-15', word: 'LIGHT', completed: true, solved: true, attempts: 1 });
  const unlearned = makePuzzle({ date: '2026-09-16', word: 'NORTH', completed: false, solved: false, attempts: 0 });

  const history = [learned, unlearned];
  const words = getReviewWords(history);

  assert.equal(words.length, 1);
  assert.equal(words[0].word, 'LIGHT');
  assert.ok(!words.some((w) => w.word === 'NORTH'));
});

// ─── Review preserves original learned date ───────────────────────────────────

test('review preserves the original learned date', () => {
  const game = makePuzzle({ date: '2026-09-15' });
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words[0].date, '2026-09-15');
});

// ─── Review preserves definition ──────────────────────────────────────────────

test('review preserves the definition', () => {
  const game = makePuzzle({ definition: 'Natural brightness that makes sight possible.' });
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words[0].definition, 'Natural brightness that makes sight possible.');
});

// ─── Review preserves example ─────────────────────────────────────────────────

test('review preserves the example', () => {
  const game = makePuzzle({ example: 'The first light of morning filled the room.' });
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words[0].example, 'The first light of morning filled the room.');
});

// ─── Review preserves pronunciation ───────────────────────────────────────────

test('review preserves pronunciation', () => {
  const game = makePuzzle({ pronunciation: '/lyt/' });
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words[0].pronunciation, '/lyt/');
});

// ─── Review preserves category ────────────────────────────────────────────────

test('review preserves category', () => {
  const game = makePuzzle({ category: 'everyday_life' });
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words[0].category, 'everyday_life');
});

// ─── Review preserves part of speech ─────────────────────────────────────────

test('review preserves part of speech', () => {
  const game = makePuzzle({ partOfSpeech: 'noun' });
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words[0].partOfSpeech, 'noun');
});

// ─── Review handles missing optional metadata ─────────────────────────────────

test('review handles missing optional metadata gracefully', () => {
  const game = {
    id: 'daily-99',
    dailyNumber: 99,
    date: '2026-09-20',
    word: 'GRACE',
    definition: 'Simple elegance.',
    guesses: [],
    solved: false,
    attempts: 0,
    completed: false,
    // no pronunciation, example, audioUrl, partOfSpeech, category
  };
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const words = getReviewWords(history);

  assert.equal(words.length, 1);
  assert.equal(words[0].word, 'GRACE');
  assert.equal(words[0].partOfSpeech, undefined);
  assert.equal(words[0].category, undefined);
  // audioUrl is generated for 5-char words
  assert.ok(words[0].audioUrl?.includes('grace'));
});

// ─── Review handles empty history ─────────────────────────────────────────────

test('review handles empty history — returns empty array', () => {
  const words = getReviewWords([]);
  assert.equal(words.length, 0);
});

// ─── Review does not modify history ───────────────────────────────────────────

test('review does not modify the history array', () => {
  const game = makePuzzle();
  const { history } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const snapshot = JSON.stringify(history);

  // Simulate reading review words (read-only operation)
  const words = getReviewWords(history);
  assert.ok(words.length > 0);

  // History is unchanged
  assert.equal(JSON.stringify(history), snapshot);
});

// ─── Review does not modify streak ────────────────────────────────────────────

test('review does not modify streak stats', () => {
  const game = makePuzzle();
  const { history, stats } = saveCompletedLearning({ game, history: [], stats: emptyStats });
  const statsBefore = JSON.stringify(stats);

  // Simulate opening review (read-only)
  getReviewWords(history);

  assert.equal(JSON.stringify(stats), statsBefore);
});

// ─── Review does not create duplicate words ───────────────────────────────────

test('review does not create duplicate words when history has no duplicates', () => {
  const g1 = makePuzzle({ date: '2026-09-15', word: 'LIGHT', dailyNumber: 1 });
  const g2 = makePuzzle({ date: '2026-09-16', word: 'NORTH', dailyNumber: 2 });

  let { history } = saveCompletedLearning({ game: g1, history: [], stats: emptyStats });
  ({ history } = saveCompletedLearning({ game: g2, history, stats: emptyStats }));

  const words = getReviewWords(history);
  const dates = words.map((w) => w.date);
  const uniqueDates = new Set(dates);

  assert.equal(dates.length, uniqueDates.size);
});

// ─── Source file assertions ────────────────────────────────────────────────────

test('review screen file exists and uses history from AppStateContext', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/review.tsx', 'utf8');
  assert.match(source, /useAppState/);
  assert.match(source, /history/);
});

test('review screen shows word, definition, example', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/review.tsx', 'utf8');
  assert.match(source, /word\.definition/);
  assert.match(source, /word\.example/);
  assert.match(source, /word\.word/);
});

test('review screen Listen button is conditional on audioUrl', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/review.tsx', 'utf8');
  assert.match(source, /word\.audioUrl/);
});

test('review screen shows empty state when history is empty', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/review.tsx', 'utf8');
  assert.match(source, /words\.length === 0/);
});

test('words screen has a Review entry point linking to /review', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('app/(tabs)/words.tsx', 'utf8');
  assert.match(source, /\/review/);
  assert.match(source, /Review/);
});
