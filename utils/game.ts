import { MAX_ATTEMPTS, WORD_LENGTH } from '@/constants/game';
import { dailyWords, WORD_EXAMPLES } from '@/data/words';
import { DailyPuzzle } from '@/types/dailyPuzzle';
import { DailyGame, GuessResult, KeyboardState, TileState } from '@/types/game';
import { daysBetween, getDailyNumber, toDateKey } from '@/utils/date';

export function getTodayWord(date = new Date()) {
  const index = daysBetween('2026-07-01', toDateKey(date)) % dailyWords.length;
  return dailyWords[(index + dailyWords.length) % dailyWords.length];
}

export function createDailyGame(puzzle: DailyPuzzle) {
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

export function pronunciationForWord(word: string) {
  return `/${word.trim().toLowerCase()}/`;
}

export function pronunciationAudioUrlForWord(word: string) {
  const normalized = word.trim().toLowerCase();
  if (!/^[a-z]{5}$/.test(normalized)) {
    return undefined;
  }

  return `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${normalized}--_us_1.mp3`;
}

export function exampleForWord(word: string) {
  const normalized = word.trim().toUpperCase();
  return WORD_EXAMPLES[normalized] ?? `Learning ${normalized.toLowerCase()} helps you use the word with more confidence.`;
}

export function completeDailyLearning(game: DailyGame) {
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

export function hydrateDailyLearning<T extends DailyGame>(game: T): T {
  const word = game.word.toUpperCase();
  return {
    ...game,
    word,
    pronunciation: game.pronunciation ?? pronunciationForWord(word),
    example: game.example ?? exampleForWord(word),
    audioUrl: game.audioUrl ?? pronunciationAudioUrlForWord(word),
    guesses: game.guesses ?? [],
  } as T;
}

export function resolveDailyGameForPuzzle(storedToday: DailyGame | null | undefined, puzzle: DailyPuzzle) {
  if (storedToday?.date === puzzle.date && (storedToday.completed || storedToday.dailyWordId === puzzle.id)) {
    return hydrateDailyLearning(storedToday);
  }

  return createDailyGame(puzzle);
}

export function createDevelopmentDailyGame(date = new Date()) {
  const entry = getTodayWord(date);
  return createDailyGame({
    id: `development-${toDateKey(date)}`,
    date: toDateKey(date),
    dailyNumber: getDailyNumber(date),
    word: entry.word,
    definition: entry.definition,
  });
}

export function evaluateGuess(guess: string, answer: string): GuessResult[] {
  const result: GuessResult[] = guess.split('').map((letter) => ({ letter, state: 'absent' }));
  const remaining = answer.split('');

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (guess[index] === answer[index]) {
      result[index].state = 'correct';
      remaining[index] = '';
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (result[index].state === 'correct') {
      continue;
    }
    const foundIndex = remaining.indexOf(guess[index]);
    if (foundIndex >= 0) {
      result[index].state = 'present';
      remaining[foundIndex] = '';
    }
  }

  return result;
}

export type GuessSubmissionResult =
  | { ok: false; reason: 'not-enough-letters' | 'invalid-word' }
  | { ok: true; game: DailyGame; solved: boolean; completed: boolean };

export function normalizeGuess(guess: string) {
  return guess.trim().toUpperCase();
}

export function isValidGuessForAnswer({
  guess,
  answer,
  acceptedWords,
}: {
  guess: string;
  answer: string;
  acceptedWords: ReadonlySet<string>;
}) {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedAnswer = normalizeGuess(answer);

  if (!/^[A-Z]{5}$/.test(normalizedGuess)) {
    return false;
  }

  return normalizedGuess === normalizedAnswer || acceptedWords.has(normalizedGuess);
}

export function shouldPlaySuccessSound({ solved, soundEnabled }: { solved: boolean; soundEnabled: boolean }) {
  return solved && soundEnabled;
}

export function shouldPlayPronunciation({ soundEnabled, audioUrl }: { soundEnabled: boolean; audioUrl?: string }) {
  return soundEnabled && Boolean(audioUrl);
}

export function learningShareText(word: string, definition: string, dailyNumber: number) {
  return `WordUp #${`${dailyNumber}`.padStart(3, '0')}\n${word.toUpperCase()}\n\n${definition}`;
}

export function submitGuessState({
  game,
  guess,
  acceptedWords,
}: {
  game: DailyGame;
  guess: string;
  acceptedWords: ReadonlySet<string>;
}): GuessSubmissionResult {
  const normalizedGuess = normalizeGuess(guess);
  if (normalizedGuess.length < WORD_LENGTH) {
    return { ok: false, reason: 'not-enough-letters' };
  }
  if (!isValidGuessForAnswer({ guess: normalizedGuess, answer: game.word, acceptedWords })) {
    return { ok: false, reason: 'invalid-word' };
  }

  const nextGuesses = [...game.guesses, normalizedGuess];
  const solved = normalizedGuess === normalizeGuess(game.word);
  const completed = solved || nextGuesses.length === MAX_ATTEMPTS;

  return {
    ok: true,
    solved,
    completed,
    game: {
      ...game,
      guesses: nextGuesses,
      solved,
      completed,
      attempts: nextGuesses.length,
    },
  };
}

const rank: Record<Exclude<TileState, 'empty' | 'entered'>, number> = {
  absent: 1,
  present: 2,
  correct: 3,
};

export function buildKeyboardState(guesses: string[], answer: string) {
  return guesses.reduce<KeyboardState>((state, guess) => {
    evaluateGuess(guess, answer).forEach((tile) => {
      const current = state[tile.letter];
      if (!current || rank[tile.state] > rank[current]) {
        state[tile.letter] = tile.state;
      }
    });
    return state;
  }, {});
}

export function getTileRows(guesses: string[], currentGuess: string, answer: string, completed: boolean) {
  return Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
    const submitted = guesses[rowIndex];
    const letters = submitted ?? (!completed && rowIndex === guesses.length ? currentGuess : '');
    const evaluation = submitted ? evaluateGuess(submitted, answer) : undefined;

    return Array.from({ length: WORD_LENGTH }, (_, colIndex) => {
      const letter = letters[colIndex] ?? '';
      const state: TileState = evaluation?.[colIndex]?.state ?? (letter ? 'entered' : 'empty');
      return { letter, state };
    });
  });
}

export function resultShareText(dailyNumber: number, guesses: string[], answer: string, solved: boolean) {
  const score = solved ? `${guesses.length}/6` : 'X/6';
  const rows = guesses
    .map((guess) =>
      evaluateGuess(guess, answer)
        .map((tile) => {
          if (tile.state === 'correct') return '🟩';
          if (tile.state === 'present') return '🟨';
          return '⬜';
        })
        .join('')
    )
    .join('\n');

  return `WordUp #${`${dailyNumber}`.padStart(3, '0')}\n${score}\n\n${rows}`;
}
