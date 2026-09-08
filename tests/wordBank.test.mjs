import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  DIFFICULTY_LEVELS,
  WORD_CATEGORIES,
  normalizeRecord,
  normalizeWord,
  validateWordBankRecord,
  validateWordBankRecords,
} from '../scripts/word-bank-utils.mjs';

test('word bank normalization trims and lowercases consistently', () => {
  assert.equal(normalizeWord('  Coherent  '), 'coherent');
  assert.deepEqual(normalizeRecord({ word: '  well-being ', category: 'health' }), {
    word: 'Well-Being',
    normalized_word: 'well-being',
    part_of_speech: null,
    difficulty_level: 'intermediate',
    category: 'health',
    frequency_score: null,
    usefulness_score: null,
    definition: null,
    example_sentence: null,
    pronunciation: null,
    pronunciation_audio_url: null,
    synonyms: [],
    antonyms: [],
    status: 'review',
  });
});

test('word bank validation prevents duplicates after normalization', () => {
  const result = validateWordBankRecords([
    { word: 'Concise', difficulty_level: 'intermediate', category: 'communication', status: 'approved' },
    { word: ' concise ', difficulty_level: 'intermediate', category: 'communication', status: 'approved' },
  ]);

  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.rejected[0].errors, ['word-duplicate']);
});

test('word bank validation enforces difficulty, category, and status lists', () => {
  assert.equal(DIFFICULTY_LEVELS.includes('upper_intermediate'), true);
  assert.equal(WORD_CATEGORIES.includes('interesting_words'), true);

  const invalid = validateWordBankRecord({
    word: 'useful',
    difficulty_level: 'casual',
    category: 'random',
    status: 'live',
  });

  assert.deepEqual(invalid.errors, ['difficulty-invalid', 'category-invalid', 'status-invalid']);
});

test('word bank validation rejects malformed and unsuitable word records', () => {
  const cases = [
    [{ word: '', difficulty_level: 'beginner', status: 'draft' }, 'word-empty'],
    [{ word: 'https://example.com', difficulty_level: 'beginner', status: 'draft' }, 'word-url'],
    [{ word: 'word2', difficulty_level: 'beginner', status: 'draft' }, 'word-number'],
    [{ word: 'bcdfgh', difficulty_level: 'beginner', status: 'draft' }, 'word-random-consonants'],
    [{ word: 'Daniel', proper_noun: true, difficulty_level: 'beginner', status: 'draft' }, 'word-possible-proper-noun'],
  ];

  for (const [record, error] of cases) {
    assert.equal(validateWordBankRecord(record).errors.includes(error), true);
  }
});

test('expanded word bank candidate dataset contains 500 approved learning records', async () => {
  const raw = await readFile('data/word-bank-candidates.json', 'utf8');
  const data = JSON.parse(raw);
  const validation = validateWordBankRecords(data.records, { requireLearningContent: true });
  const approved = data.records.filter((record) => record.status === 'approved');

  assert.equal(approved.length, 500);
  assert.equal(validation.rejected.length, 0);
  assert.equal(approved.every((record) => record.definition && record.example_sentence), true);
  assert.equal(new Set(approved.map((record) => record.normalized_word)).size, 500);
  for (const category of WORD_CATEGORIES) {
    assert.equal(approved.some((record) => record.category === category), true);
  }
});

test('word bank migration adds relationship and keeps word_bank closed to public clients', async () => {
  const migration = await readFile('supabase/migrations/20260831090000_create_word_bank.sql', 'utf8');

  assert.match(migration, /create table if not exists public\.word_bank/);
  assert.match(migration, /normalized_word text not null unique/);
  assert.match(migration, /add column if not exists word_id uuid/);
  assert.match(migration, /constraint daily_words_word_id_fkey foreign key \(word_id\) references public\.word_bank\(id\)/);
  assert.match(migration, /alter table public\.word_bank enable row level security/);
  assert.match(migration, /revoke all on table public\.word_bank from anon/);
  assert.match(migration, /revoke all on table public\.word_bank from authenticated/);
});

test('daily-word function fetches only today and returns selected vocabulary fields', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');

  assert.match(source, /\.eq\('puzzle_date',\s*(today|dateKey)\)/);
  assert.match(source, /word_bank:word_bank!daily_words_word_id_fkey/);
  assert.match(source, /wordBank\.status !== 'approved'/);
  assert.match(source, /dailyNumber: data\.daily_number/);
  assert.match(source, /example: wordBank\?\.example_sentence/);
  assert.match(source, /partOfSpeech: wordBank\?\.part_of_speech/);
  assert.doesNotMatch(source, /date:\s*body\.date/);
});
