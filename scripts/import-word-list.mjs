#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { normalizeWordsFile } from './normalize-words.mjs';
import { validateWordBankRecords } from './word-bank-utils.mjs';

export async function importWordList(inputPath, outputPath = 'data/word-bank-candidates.json') {
  await mkdir(dirname(outputPath), { recursive: true });
  const normalized = await normalizeWordsFile(inputPath, outputPath);
  const validation = validateWordBankRecords(normalized.records);

  return {
    outputPath,
    inputCount: normalized.inputCount,
    acceptedCount: validation.accepted.length,
    rejectedCount: normalized.rejectedCount + validation.rejected.length,
    rejected: [...normalized.rejected, ...validation.rejected],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , inputPath, outputPath = 'data/word-bank-candidates.json'] = process.argv;

  if (!inputPath) {
    console.error('Usage: node scripts/import-word-list.mjs <input.txt|input.json> [output.json]');
    process.exit(1);
  }

  importWordList(inputPath, outputPath)
    .then((result) => {
      console.log(`Prepared ${result.acceptedCount}/${result.inputCount} candidate records.`);
      console.log(`Rejected ${result.rejectedCount} records.`);
      console.log(`Wrote ${result.outputPath}. Review this file before any database import.`);
      if (result.rejected.length > 0) {
        console.log(JSON.stringify(result.rejected, null, 2));
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
