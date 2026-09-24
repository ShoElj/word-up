#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

import { checkAudioAccessibility, compareWithWordUp, fetchFreeDictEntry, mapFreeDictEntryToFields } from './free-dict-client.mjs';

// Sample of real non-"a" curriculum words currently missing audio, used only
// as a proof-of-concept default. Free Dictionary API needs no credentials, so
// this can run against any word — pass your own list via CLI args or
// --words-file= to try more.
const DEFAULT_POC_WORDS = [
  'subtle',
  'reluctant',
  'inevitable',
  'peculiar',
  'versatile',
  'compelling',
  'skeptical',
  'pragmatic',
  'coherent',
  'plausible',
];

const cliArgs = process.argv.slice(2);
const wordsFileArg = cliArgs.find((arg) => arg.startsWith('--words-file='));
const CLI_WORDS = cliArgs.filter((arg) => !arg.startsWith('--'));

async function resolvePocWords() {
  if (wordsFileArg) {
    const filePath = wordsFileArg.slice('--words-file='.length);
    const raw = await readFile(filePath, 'utf8');
    return raw
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .flatMap((line) => line.split(','))
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);
  }
  if (CLI_WORDS.length > 0) {
    return CLI_WORDS.map((word) => word.trim().toLowerCase());
  }
  return DEFAULT_POC_WORDS;
}

const usingCustomWordSource = Boolean(wordsFileArg) || CLI_WORDS.length > 0;
const DEFAULT_OUTPUT_PATH = 'data/free-dict-proof-of-concept.json';
const OUTPUT_PATH =
  process.env.FREE_DICT_POC_OUTPUT ||
  (usingCustomWordSource ? 'data/free-dict-proof-of-concept-sample.json' : DEFAULT_OUTPUT_PATH);
const WORD_BANK_PATH = 'data/word-bank-candidates.json';
const DEFAULT_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const CALL_DELAY_MS = 150;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadWordUpLookup() {
  const raw = await readFile(WORD_BANK_PATH, 'utf8');
  const data = JSON.parse(raw);
  const lookup = new Map();
  for (const record of data.records ?? []) {
    lookup.set(record.normalized_word, record);
  }
  return lookup;
}

async function main() {
  const baseUrl = process.env.FREE_DICT_API_BASE_URL || DEFAULT_BASE_URL;

  const pocWords = await resolvePocWords();
  const wordUpLookup = await loadWordUpLookup();

  let apiCallCount = 0;
  let audioCheckCount = 0;
  const results = [];

  for (const word of pocWords) {
    if (apiCallCount > 0) {
      await sleep(CALL_DELAY_MS);
    }

    const response = await fetchFreeDictEntry({ word, baseUrl });
    apiCallCount += 1;

    const wordUpRecord = wordUpLookup.get(word) ?? null;

    if (!response.ok) {
      results.push({
        word,
        requestUrl: response.url,
        found: false,
        status: response.status,
        error: response.error,
        wordUpComparison: compareWithWordUp(
          { audioFiles: [], partsOfSpeech: [], pronunciations: [], definitions: [] },
          wordUpRecord,
          'Free Dictionary API'
        ),
      });
      console.log(`[free-dict-poc] ${word}: NOT FOUND (status ${response.status ?? 'network error'})`);
      continue;
    }

    const fields = mapFreeDictEntryToFields(response.data);

    let audioCheck = null;
    if (fields.audioFiles.length > 0) {
      audioCheck = await checkAudioAccessibility(fields.audioFiles[0]);
      audioCheckCount += 1;
    }

    results.push({
      word,
      requestUrl: response.url,
      found: true,
      status: response.status,
      freeDict: fields,
      audioAccessibility: audioCheck,
      wordUpComparison: compareWithWordUp(fields, wordUpRecord, 'Free Dictionary API'),
      raw: response.data,
    });

    console.log(
      `[free-dict-poc] ${word}: found (${fields.partsOfSpeech.join('/') || 'no part of speech'}, ` +
        `${fields.definitions.length} definition(s), ${fields.audioFiles.length} audio file(s), ` +
        `missing: ${fields.missingFields.join(', ') || 'none'})`
    );
  }

  const foundCount = results.filter((r) => r.found).length;
  const fieldsProvidedTally = { definition: 0, partOfSpeech: 0, phoneticSpelling: 0, audio: 0 };
  for (const entry of results) {
    if (!entry.found) continue;
    if (entry.freeDict.definitions.length > 0) fieldsProvidedTally.definition += 1;
    if (entry.freeDict.partsOfSpeech.length > 0) fieldsProvidedTally.partOfSpeech += 1;
    if (entry.freeDict.pronunciations.some((p) => p.text)) fieldsProvidedTally.phoneticSpelling += 1;
    if (entry.freeDict.audioFiles.length > 0) fieldsProvidedTally.audio += 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    purpose:
      'Free Dictionary API (dictionaryapi.dev) proof of concept — evaluation only, not used for production content. ' +
      'This source returns real IPA phonetic transcriptions, not the respell-style notation WordUp uses, so pronunciation ' +
      'text from this source needs a different conversion approach than the one built for Oxford (see scripts/respell-style.mjs, ' +
      'which does NOT apply here).',
    baseUrl,
    wordsRequested: pocWords,
    apiCallsMade: apiCallCount,
    audioAccessibilityChecksMade: audioCheckCount,
    summary: {
      foundCount,
      notFoundCount: pocWords.length - foundCount,
      fieldsProvidedCount: fieldsProvidedTally,
    },
    results,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`\n[free-dict-poc] Wrote ${OUTPUT_PATH}`);
  console.log(`[free-dict-poc] Free Dictionary API calls made: ${apiCallCount}`);
  console.log(`[free-dict-poc] Audio accessibility checks made: ${audioCheckCount}`);
  console.log(`[free-dict-poc] Found ${foundCount}/${pocWords.length} words.`);
}

main().catch((error) => {
  console.error('[free-dict-poc] Unexpected failure:', error?.message ?? error);
  process.exitCode = 1;
});
