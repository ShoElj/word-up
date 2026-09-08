import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  CURRICULUM_THEMES,
  selectCurriculumDay,
  validateCurriculumFile,
  validateCurriculumRecords,
} from '../scripts/validate-curriculum.mjs';

function word(normalizedWord, status = 'approved') {
  return {
    word: normalizedWord,
    normalized_word: normalizedWord,
    part_of_speech: 'adjective',
    definition: 'Useful for clear communication.',
    example_sentence: `A ${normalizedWord} response helped the group understand.`,
    pronunciation: `/${normalizedWord}/`,
    status,
  };
}

const approvedWordBank = [
  word('concise'),
  word('articulate'),
  word('clarify'),
  word('context'),
  word('subtle'),
  word('archived', 'archived'),
  word('draftword', 'draft'),
];

function record(overrides = {}) {
  return {
    day_number: 1,
    normalized_word: 'concise',
    theme: 'communication',
    lesson_type: 'communication',
    difficulty_level: 'intermediate',
    status: 'approved',
    ...overrides,
  };
}

test('curriculum validation enforces day range', () => {
  const result = validateCurriculumRecords([record({ day_number: 366 })], approvedWordBank);

  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].errors.includes('day-number-invalid'), true);
});

test('curriculum validation detects duplicate days', () => {
  const result = validateCurriculumRecords([
    record(),
    record({ normalized_word: 'articulate' }),
  ], approvedWordBank);

  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].errors.includes('day-number-duplicate'), true);
});

test('curriculum validation detects duplicate words', () => {
  const result = validateCurriculumRecords([
    record(),
    record({ day_number: 2 }),
  ], approvedWordBank);

  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].errors.includes('word-duplicate'), true);
});

test('curriculum validation requires valid approved word bank references', () => {
  const result = validateCurriculumRecords([
    record({ normalized_word: 'missing' }),
    record({ day_number: 2, normalized_word: 'draftword' }),
    record({ day_number: 3, normalized_word: 'archived' }),
  ], approvedWordBank);

  assert.equal(result.rejected[0].errors.includes('word-bank-reference-missing'), true);
  assert.equal(result.rejected[1].errors.includes('word-not-approved'), true);
  assert.equal(result.rejected[2].errors.includes('word-not-approved'), true);
  assert.equal(result.rejected[2].errors.includes('archived-word-active'), true);
});

test('curriculum validation enforces difficulty and theme lists', () => {
  assert.equal(CURRICULUM_THEMES.includes('nuance_and_precision'), true);

  const result = validateCurriculumRecords([
    record({ difficulty_level: 'casual', theme: 'random_theme' }),
  ], approvedWordBank);

  assert.equal(result.rejected[0].errors.includes('difficulty-invalid'), true);
  assert.equal(result.rejected[0].errors.includes('theme-invalid'), true);
});

test('first 20 curriculum records validate against the controlled word bank', async () => {
  const result = await validateCurriculumFile();

  assert.equal(result.accepted.length, 20);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.dayCount, 20);
  assert.equal(result.wordCount, 20);
});

test('full 365-day curriculum validates against expanded word bank', async () => {
  const result = await validateCurriculumFile({
    curriculumPath: 'data/wordup-curriculum-365.json',
    wordBankPath: 'data/word-bank-candidates.json',
    expectedDayCount: 365,
  });

  assert.equal(result.accepted.length, 365);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.dayCount, 365);
  assert.equal(result.wordCount, 365);
  assert.equal(result.report.missingDays.length, 0);
  assert.equal(result.report.duplicateCount, 0);
  assert.equal(result.report.missingWordCount, 0);
  assert.equal(result.report.invalidWordCount, 0);
  assert.equal(result.report.missingContentCount, 0);
});

test('full curriculum preserves the first 20 phase-two entries', async () => {
  const first20 = JSON.parse(await readFile('data/wordup-curriculum-first-20.json', 'utf8')).records;
  const full = JSON.parse(await readFile('data/wordup-curriculum-365.json', 'utf8')).records;

  assert.deepEqual(full.slice(0, 20), first20);
});

test('full curriculum follows the broad first-year progression', async () => {
  const full = JSON.parse(await readFile('data/wordup-curriculum-365.json', 'utf8')).records;
  const sliceThemes = (start, end) => new Set(
    full.filter((record) => record.day_number >= start && record.day_number <= end).map((record) => record.theme)
  );

  assert.equal(sliceThemes(31, 60).has('communication'), true);
  assert.equal(sliceThemes(61, 90).has('relationships'), true);
  assert.equal(sliceThemes(91, 120).has('emotions'), true);
  assert.equal(sliceThemes(151, 180).has('work'), true);
  assert.equal(sliceThemes(181, 210).has('academic_language'), true);
  assert.equal(sliceThemes(271, 300).has('science_and_technology'), true);
  assert.equal(full.slice(-35).some((record) => ['advanced', 'expert'].includes(record.difficulty_level)), true);
});

test('curriculum selection resolves a deliberate day entry', async () => {
  const payload = JSON.parse(await readFile('data/wordup-curriculum-first-20.json', 'utf8'));
  const day18 = selectCurriculumDay(payload.records, 18);

  assert.equal(day18.normalized_word, 'pragmatic');
  assert.equal(day18.theme, 'nuance_and_precision');
  assert.equal(selectCurriculumDay(payload.records, 365), null);
});

test('curriculum migration is additive and preserves existing daily-word path', async () => {
  const migration = await readFile('supabase/migrations/20260831093000_create_wordup_curriculum.sql', 'utf8');
  const dailyWordFunction = await readFile('supabase/functions/daily-word/index.ts', 'utf8');

  assert.match(migration, /create table if not exists public\.wordup_curriculum/);
  assert.match(migration, /word_id uuid not null references public\.word_bank\(id\)/);
  assert.match(migration, /add column if not exists curriculum_id uuid/);
  assert.match(migration, /daily_words_curriculum_id_fkey/);
  assert.match(migration, /alter table public\.wordup_curriculum enable row level security/);
  assert.match(migration, /revoke all on table public\.wordup_curriculum from anon/);
  assert.match(dailyWordFunction, /\.from\('daily_words'\)/);
  assert.match(dailyWordFunction, /\.from\('wordup_curriculum'\)/);
  assert.match(dailyWordFunction, /curriculumDay > curriculumLengthDays/);
  assert.match(dailyWordFunction, /CURRICULUM_COMPLETE/);
  assert.match(dailyWordFunction, /getCurriculumStartDate/);
});
