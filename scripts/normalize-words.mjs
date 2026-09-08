#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

import { normalizeRecord, validateWordBankRecords } from './word-bank-utils.mjs';

async function readInput(path) {
  const raw = await readFile(path, 'utf8');
  if (path.endsWith('.json')) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.records ?? [];
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((word) => ({ word }));
}

export async function normalizeWordsFile(inputPath, outputPath) {
  const records = await readInput(inputPath);
  const normalized = records.map(normalizeRecord);
  const { accepted, rejected } = validateWordBankRecords(normalized);
  const payload = {
    generatedAt: new Date().toISOString(),
    inputCount: records.length,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    records: accepted,
    rejected,
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , inputPath, outputPath = 'data/word-bank-candidates.json'] = process.argv;
  if (!inputPath) {
    console.error('Usage: node scripts/normalize-words.mjs <input.txt|input.json> [output.json]');
    process.exit(1);
  }

  normalizeWordsFile(inputPath, outputPath)
    .then((result) => {
      console.log(`Normalized ${result.acceptedCount}/${result.inputCount} records. Rejected ${result.rejectedCount}.`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
