#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

import { selectEntryForPartOfSpeech } from './oxford-client.mjs';

const OXFORD_DATA_PATH = process.argv[2] || 'data/oxford-proof-of-concept-sample.json';
const WORD_BANK_PATH = 'data/word-bank-candidates.json';
const QUALITY_REPORT_PATH = 'data/word-bank-quality-assessment.json';
const OUTPUT_PATH = 'data/word-bank-enrichment-proposals.json';

async function main() {
  const [oxfordRaw, wordBankRaw, qualityRaw] = await Promise.all([
    readFile(OXFORD_DATA_PATH, 'utf8'),
    readFile(WORD_BANK_PATH, 'utf8'),
    readFile(QUALITY_REPORT_PATH, 'utf8'),
  ]);

  const oxfordData = JSON.parse(oxfordRaw);
  const wordBank = JSON.parse(wordBankRaw);
  const qualityReport = JSON.parse(qualityRaw);

  const wordBankByNormalizedWord = new Map(wordBank.records.map((r) => [r.normalized_word, r]));
  const flagsByWord = new Map(qualityReport.flagged.map((f) => [f.normalized_word, f.reasons]));

  const proposals = [];
  const skipped = [];

  for (const entry of oxfordData.results) {
    if (!entry.found) {
      skipped.push({ word: entry.word, reason: 'not_found_on_oxford' });
      continue;
    }

    const record = wordBankByNormalizedWord.get(entry.word);
    if (!record) {
      skipped.push({ word: entry.word, reason: 'not_in_word_bank' });
      continue;
    }

    const selection = selectEntryForPartOfSpeech(entry.raw, record.part_of_speech);
    if (!selection.matched) {
      skipped.push({ word: entry.word, reason: 'no_oxford_entry_for_part_of_speech', partOfSpeech: record.part_of_speech });
      continue;
    }

    const reasons = flagsByWord.get(entry.word) ?? [];
    const changes = {};

    if (selection.audioFile) {
      changes.pronunciation_audio_url = { from: record.pronunciation_audio_url, to: selection.audioFile };
    }

    if (reasons.includes('trivial_pronunciation') && selection.respellPronunciation) {
      changes.pronunciation = { from: record.pronunciation, to: `/${selection.respellPronunciation}/` };
    }

    if (reasons.includes('placeholder_example') && selection.example) {
      changes.example_sentence = { from: record.example_sentence, to: selection.example };
    }

    if (Object.keys(changes).length === 0) {
      skipped.push({ word: entry.word, reason: 'no_applicable_changes' });
      continue;
    }

    proposals.push({
      word: record.word,
      normalized_word: entry.word,
      part_of_speech: record.part_of_speech,
      currentDefinition: record.definition,
      changes,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    purpose:
      'Reviewable enrichment proposals for Sandbox-reachable A-words only. Definitions are never proposed for change. Nothing here is applied to word-bank-candidates.json, Supabase, or the curriculum automatically — review each entry before applying anything.',
    oxfordDataSource: OXFORD_DATA_PATH,
    proposalCount: proposals.length,
    skippedCount: skipped.length,
    proposals,
    skipped,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`[enrichment-proposals] Proposals: ${proposals.length}`);
  console.log(`[enrichment-proposals] Skipped: ${skipped.length}`);
  console.log(`[enrichment-proposals] Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error('[enrichment-proposals] Unexpected failure:', error?.message ?? error);
  process.exitCode = 1;
});
