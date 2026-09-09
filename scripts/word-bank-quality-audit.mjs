#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const WORD_BANK_PATH = 'data/word-bank-candidates.json';
const CURRICULUM_PATH = 'data/wordup-curriculum-365.json';
const OUTPUT_PATH = 'data/word-bank-quality-assessment.json';

const PLACEHOLDER_EXAMPLE_PATTERN = /^they used the word .+ while explaining how to handle the situation\.$/i;

function isTrivialPronunciation(record) {
  const pronunciation = (record.pronunciation || '').trim().toLowerCase();
  return pronunciation === `/${record.normalized_word}/`;
}

function isPlaceholderExample(record) {
  return PLACEHOLDER_EXAMPLE_PATTERN.test((record.example_sentence || '').trim());
}

async function main() {
  const [wordBankRaw, curriculumRaw] = await Promise.all([
    readFile(WORD_BANK_PATH, 'utf8'),
    readFile(CURRICULUM_PATH, 'utf8'),
  ]);

  const wordBank = JSON.parse(wordBankRaw);
  const curriculum = JSON.parse(curriculumRaw);

  const curriculumDayByWord = new Map(curriculum.records.map((r) => [r.normalized_word, r.day_number]));
  const approved = wordBank.records.filter((r) => r.status === 'approved');

  const flagged = [];
  for (const record of approved) {
    const reasons = [];
    if (isPlaceholderExample(record)) reasons.push('placeholder_example');
    if (isTrivialPronunciation(record)) reasons.push('trivial_pronunciation');
    if (!record.pronunciation_audio_url) reasons.push('no_audio');

    if (reasons.length > 0) {
      flagged.push({
        word: record.word,
        normalized_word: record.normalized_word,
        curriculumDay: curriculumDayByWord.get(record.normalized_word) ?? null,
        reasons,
        example_sentence: record.example_sentence,
        pronunciation: record.pronunciation,
      });
    }
  }

  const placeholderExampleCount = flagged.filter((f) => f.reasons.includes('placeholder_example')).length;
  const trivialPronunciationCount = flagged.filter((f) => f.reasons.includes('trivial_pronunciation')).length;
  const noAudioCount = flagged.filter((f) => f.reasons.includes('no_audio')).length;
  const inCurriculumCount = flagged.filter((f) => f.curriculumDay !== null).length;

  const output = {
    generatedAt: new Date().toISOString(),
    purpose: 'Local content-quality audit of existing WordUp word_bank candidates — no Oxford API calls, no writes to Supabase.',
    totalApproved: approved.length,
    summary: {
      placeholderExampleCount,
      trivialPronunciationCount,
      noAudioCount,
      flaggedTotal: flagged.length,
      flaggedInLiveCurriculum: inCurriculumCount,
    },
    flagged: flagged.sort((a, b) => (a.curriculumDay ?? Infinity) - (b.curriculumDay ?? Infinity)),
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`[quality-audit] Approved words scanned: ${approved.length}`);
  console.log(`[quality-audit] Placeholder example sentences: ${placeholderExampleCount}`);
  console.log(`[quality-audit] Trivial (no syllable breakdown) pronunciations: ${trivialPronunciationCount}`);
  console.log(`[quality-audit] Missing audio: ${noAudioCount}`);
  console.log(`[quality-audit] Flagged words in the live 365-day curriculum: ${inCurriculumCount}`);
  console.log(`[quality-audit] Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('[quality-audit] Unexpected failure:', error?.message ?? error);
  process.exitCode = 1;
});
