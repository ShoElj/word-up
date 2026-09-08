export type TileState = 'empty' | 'entered' | 'correct' | 'present' | 'absent';

export type GuessResult = {
  letter: string;
  state: Exclude<TileState, 'empty' | 'entered'>;
};

export type DailyGame = {
  dailyWordId?: string;
  date: string;
  dailyNumber: number;
  word: string;
  definition: string;
  pronunciation?: string;
  example?: string;
  audioUrl?: string;
  partOfSpeech?: string;
  category?: string;
  guesses: string[];
  solved: boolean;
  attempts: number;
  completed: boolean;
};

export type HistoricalResult = DailyGame & {
  definition: string;
};

export type DailyLearning = DailyGame;
export type WordCollectionEntry = HistoricalResult;

export type KeyboardState = Record<string, Exclude<TileState, 'empty' | 'entered'>>;
