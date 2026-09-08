export type DailyPuzzle = {
  id: string;
  dailyNumber: number;
  date: string;
  word: string;
  definition: string;
  pronunciation?: string;
  example?: string;
  audioUrl?: string;
  partOfSpeech?: string;
  category?: string;
  curriculumDay?: number;
  curriculumTheme?: string;
  lessonType?: string;
  difficultyLevel?: string;
};

export type DailyWordErrorCode =
  | 'INVALID_TIMEZONE'
  | 'NO_DAILY_WORD'
  | 'SERVER_ERROR'
  | 'OFFLINE'
  | 'CONFIGURATION_ERROR'
  | 'CURRICULUM_COMPLETE';

export type DailyWordResult =
  | { ok: true; puzzle: DailyPuzzle; source: 'cache' | 'supabase' | 'development' }
  | { ok: false; error: DailyWordErrorCode };
