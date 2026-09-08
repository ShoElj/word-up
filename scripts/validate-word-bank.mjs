#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import {
  DIFFICULTY_LEVELS,
  WORD_CATEGORIES,
  validateWordBankRecords,
  validateWordBankRecord,
} from './word-bank-utils.mjs';

export { DIFFICULTY_LEVELS, WORD_CATEGORIES, validateWordBankRecords, validateWordBankRecord };

export async function validateWordBankFile(path, options = {}) {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed) ? parsed : parsed.records ?? [];
  return validateWordBankRecords(records, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , inputPath = 'data/word-bank-candidates.json'] = process.argv;
  validateWordBankFile(inputPath, { requireLearningContent: true })
    .then(({ accepted, rejected }) => {
      console.log(`Accepted: ${accepted.length}`);
      console.log(`Rejected: ${rejected.length}`);
      if (rejected.length > 0) {
        console.log(JSON.stringify(rejected, null, 2));
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
