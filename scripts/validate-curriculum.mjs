#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import { DIFFICULTY_LEVELS, WORD_STATUSES, normalizeWord } from './word-bank-utils.mjs';

export const CURRICULUM_THEMES = [
  'communication',
  'personality',
  'emotions',
  'thinking',
  'relationships',
  'work',
  'education',
  'society',
  'descriptive_language',
  'professional_language',
  'academic_language',
  'culture',
  'science_and_technology',
  'everyday_expression',
  'nuance_and_precision',
  'interesting_words',
];

export const LESSON_TYPES = [
  'learn',
  'communication',
  'descriptive',
  'professional',
  'emotional',
  'thinking',
  'review',
  'advanced',
];

function recordsFromPayload(payload) {
  return Array.isArray(payload) ? payload : payload.records ?? [];
}

export async function readJsonRecords(path) {
  const raw = await readFile(path, 'utf8');
  return recordsFromPayload(JSON.parse(raw));
}

export function selectCurriculumDay(records, dayNumber) {
  return records.find((record) => record.day_number === dayNumber) ?? null;
}

function increment(totals, key) {
  totals[key] = (totals[key] ?? 0) + 1;
}

export function validateCurriculumRecords(curriculumRecords, wordBankRecords, options = {}) {
  const expectedDayCount = options.expectedDayCount ?? null;
  const wordBank = new Map(
    wordBankRecords.map((record) => [normalizeWord(record.normalized_word ?? record.word), record])
  );
  const seenDays = new Set();
  const seenWords = new Set();
  const accepted = [];
  const rejected = [];
  const report = {
    totalDays: curriculumRecords.length,
    difficultyDistribution: {},
    themeDistribution: {},
    lessonTypeDistribution: {},
    duplicateCount: 0,
    missingWordCount: 0,
    invalidWordCount: 0,
    missingContentCount: 0,
    missingDays: [],
  };

  curriculumRecords.forEach((record, index) => {
    const errors = [];
    const dayNumber = Number(record.day_number);
    const normalizedWord = normalizeWord(record.normalized_word ?? record.word);
    const word = wordBank.get(normalizedWord);

    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 365) errors.push('day-number-invalid');
    if (seenDays.has(dayNumber)) {
      errors.push('day-number-duplicate');
      report.duplicateCount += 1;
    }
    if (!normalizedWord) errors.push('word-missing');
    if (normalizedWord && seenWords.has(normalizedWord)) {
      errors.push('word-duplicate');
      report.duplicateCount += 1;
    }
    if (!word) {
      errors.push('word-bank-reference-missing');
      report.missingWordCount += 1;
    }
    if (word && word.status !== 'approved') {
      errors.push('word-not-approved');
      report.invalidWordCount += 1;
    }
    if (word && word.status === 'archived' && record.status !== 'archived') {
      errors.push('archived-word-active');
      report.invalidWordCount += 1;
    }
    if (!record.theme || !CURRICULUM_THEMES.includes(record.theme)) errors.push('theme-invalid');
    if (record.lesson_type && !LESSON_TYPES.includes(record.lesson_type)) errors.push('lesson-type-invalid');
    if (!record.difficulty_level || !DIFFICULTY_LEVELS.includes(record.difficulty_level)) errors.push('difficulty-invalid');
    if (!record.status || !WORD_STATUSES.includes(record.status)) errors.push('status-invalid');
    if (record.status !== 'archived' && (!record.theme || !record.lesson_type || !record.difficulty_level)) {
      errors.push('metadata-missing');
    }
    if (word && word.status === 'approved') {
      for (const field of ['part_of_speech', 'definition', 'example_sentence', 'pronunciation']) {
        if (typeof word[field] !== 'string' || word[field].trim().length === 0) {
          errors.push(`${field}-missing`);
          report.missingContentCount += 1;
        }
      }
    }

    if (errors.length === 0) {
      seenDays.add(dayNumber);
      seenWords.add(normalizedWord);
      accepted.push({ ...record, normalized_word: normalizedWord });
      increment(report.difficultyDistribution, record.difficulty_level);
      increment(report.themeDistribution, record.theme);
      increment(report.lessonTypeDistribution, record.lesson_type);
    } else {
      rejected.push({ index, record, errors });
    }
  });

  if (expectedDayCount) {
    for (let day = 1; day <= expectedDayCount; day += 1) {
      if (!seenDays.has(day)) report.missingDays.push(day);
    }
  }

  return {
    accepted,
    rejected,
    dayCount: seenDays.size,
    wordCount: seenWords.size,
    report,
  };
}

export async function validateCurriculumFile({
  curriculumPath = 'data/wordup-curriculum-first-20.json',
  wordBankPath = 'data/word-bank-candidates.json',
  expectedDayCount = null,
} = {}) {
  const curriculumRecords = await readJsonRecords(curriculumPath);
  const wordBankRecords = await readJsonRecords(wordBankPath);
  return validateCurriculumRecords(curriculumRecords, wordBankRecords, { expectedDayCount });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , curriculumPath = 'data/wordup-curriculum-first-20.json', wordBankPath = 'data/word-bank-candidates.json'] = process.argv;
  const expectedDayCount = curriculumPath.includes('365') ? 365 : null;

  validateCurriculumFile({ curriculumPath, wordBankPath, expectedDayCount })
    .then((result) => {
      console.log(`Accepted: ${result.accepted.length}`);
      console.log(`Rejected: ${result.rejected.length}`);
      console.log(`Unique days: ${result.dayCount}`);
      console.log(`Unique words: ${result.wordCount}`);
      console.log(`Difficulty distribution: ${JSON.stringify(result.report.difficultyDistribution)}`);
      console.log(`Theme distribution: ${JSON.stringify(result.report.themeDistribution)}`);
      console.log(`Lesson type distribution: ${JSON.stringify(result.report.lessonTypeDistribution)}`);
      console.log(`Duplicate count: ${result.report.duplicateCount}`);
      console.log(`Missing word count: ${result.report.missingWordCount}`);
      console.log(`Invalid word count: ${result.report.invalidWordCount}`);
      console.log(`Missing content count: ${result.report.missingContentCount}`);
      console.log(`Missing days: ${result.report.missingDays.length}`);
      if (result.rejected.length > 0) {
        console.log(JSON.stringify(result.rejected, null, 2));
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
