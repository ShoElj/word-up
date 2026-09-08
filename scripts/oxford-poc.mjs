#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

import {
  checkAudioAccessibility,
  compareWithWordUp,
  fetchOxfordEntry,
  mapOxfordEntryToFields,
} from './oxford-client.mjs';

const POC_WORDS = [
  'concise',
  'articulate',
  'empathy',
  'resilient',
  'candid',
  'assertive',
  'perspective',
  'coherent',
  'evidence',
  'meticulous',
];

const OUTPUT_PATH = 'data/oxford-proof-of-concept.json';
const WORD_BANK_PATH = 'data/word-bank-candidates.json';
const DEFAULT_BASE_URL = 'https://od-api-sandbox.oxforddictionaries.com/api/v2';
const CALL_DELAY_MS = 350;

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
  const appId = process.env.OXFORD_APP_ID;
  const appKey = process.env.OXFORD_APP_KEY;
  const baseUrl = process.env.OXFORD_API_BASE_URL || DEFAULT_BASE_URL;
  const sourceLang = process.env.OXFORD_SOURCE_LANG || 'en-us';

  if (!appId || !appKey) {
    console.error(
      [
        'Missing Oxford credentials.',
        '',
        'This script reads OXFORD_APP_ID and OXFORD_APP_KEY from the environment only.',
        'Do NOT put these in .env, .env.example, or any EXPO_PUBLIC_* variable — they must',
        'never reach the Expo client bundle.',
        '',
        'Run it like:',
        '  OXFORD_APP_ID=xxx OXFORD_APP_KEY=yyy node scripts/oxford-poc.mjs',
        '',
        'Optional overrides:',
        `  OXFORD_API_BASE_URL (default: ${DEFAULT_BASE_URL})`,
        '  OXFORD_SOURCE_LANG (default: en-us)',
      ].join('\n')
    );
    process.exitCode = 1;
    return;
  }

  const wordUpLookup = await loadWordUpLookup();

  let apiCallCount = 0;
  let audioCheckCount = 0;
  const results = [];

  for (const word of POC_WORDS) {
    if (apiCallCount > 0) {
      await sleep(CALL_DELAY_MS);
    }

    const response = await fetchOxfordEntry({ word, appId, appKey, baseUrl, sourceLang });
    apiCallCount += 1;

    const wordUpRecord = wordUpLookup.get(word) ?? null;

    if (!response.ok) {
      results.push({
        word,
        requestUrl: response.url,
        found: false,
        status: response.status,
        error: response.error,
        wordUpComparison: compareWithWordUp({ audioFiles: [], partsOfSpeech: [], pronunciations: [], definitions: [] }, wordUpRecord),
      });
      console.log(`[oxford-poc] ${word}: NOT FOUND (status ${response.status ?? 'network error'})`);
      continue;
    }

    const fields = mapOxfordEntryToFields(response.data);

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
      oxford: fields,
      audioAccessibility: audioCheck,
      wordUpComparison: compareWithWordUp(fields, wordUpRecord),
      raw: response.data,
    });

    console.log(
      `[oxford-poc] ${word}: found (${fields.partsOfSpeech.join('/') || 'no part of speech'}, ` +
        `${fields.definitions.length} definition(s), ${fields.audioFiles.length} audio file(s), ` +
        `missing: ${fields.missingFields.join(', ') || 'none'})`
    );
  }

  const foundCount = results.filter((r) => r.found).length;
  const fieldsProvidedTally = { definition: 0, partOfSpeech: 0, phoneticSpelling: 0, audio: 0 };
  for (const entry of results) {
    if (!entry.found) continue;
    if (entry.oxford.definitions.length > 0) fieldsProvidedTally.definition += 1;
    if (entry.oxford.partsOfSpeech.length > 0) fieldsProvidedTally.partOfSpeech += 1;
    if (entry.oxford.pronunciations.some((p) => p.phoneticSpelling)) fieldsProvidedTally.phoneticSpelling += 1;
    if (entry.oxford.audioFiles.length > 0) fieldsProvidedTally.audio += 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    purpose: 'Oxford Dictionaries API proof of concept — evaluation only, not used for production content.',
    baseUrl,
    sourceLang,
    wordsRequested: POC_WORDS,
    apiCallsMade: apiCallCount,
    audioAccessibilityChecksMade: audioCheckCount,
    summary: {
      foundCount,
      notFoundCount: POC_WORDS.length - foundCount,
      fieldsProvidedCount: fieldsProvidedTally,
    },
    results,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`\n[oxford-poc] Wrote ${OUTPUT_PATH}`);
  console.log(`[oxford-poc] Oxford API calls made: ${apiCallCount}`);
  console.log(`[oxford-poc] Audio accessibility checks made: ${audioCheckCount}`);
  console.log(`[oxford-poc] Found ${foundCount}/${POC_WORDS.length} words.`);
}

main().catch((error) => {
  console.error('[oxford-poc] Unexpected failure:', error?.message ?? error);
  process.exitCode = 1;
});
