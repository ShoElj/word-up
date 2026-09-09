#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const PROPOSALS_PATH = 'data/word-bank-enrichment-proposals.json';
const WORD_BANK_PATH = 'data/word-bank-candidates.json';

const APPLICABLE_FIELDS = ['pronunciation_audio_url', 'pronunciation', 'example_sentence'];

export function partitionProposals(proposals) {
  const applied = [];
  const heldBack = [];
  for (const proposal of proposals) {
    if (proposal.notes && proposal.notes.length > 0) {
      heldBack.push({ normalized_word: proposal.normalized_word, notes: proposal.notes });
    } else {
      applied.push(proposal);
    }
  }
  return { applied, heldBack };
}

export function applyProposalToRecord(record, proposal) {
  const updated = { ...record };
  for (const field of APPLICABLE_FIELDS) {
    if (proposal.changes[field]) {
      updated[field] = proposal.changes[field].to;
    }
  }
  return updated;
}

async function main() {
  const [proposalsRaw, wordBankRaw] = await Promise.all([
    readFile(PROPOSALS_PATH, 'utf8'),
    readFile(WORD_BANK_PATH, 'utf8'),
  ]);

  const proposalsData = JSON.parse(proposalsRaw);
  const wordBank = JSON.parse(wordBankRaw);

  const { applied, heldBack } = partitionProposals(proposalsData.proposals);
  const appliedByWord = new Map(applied.map((p) => [p.normalized_word, p]));

  let appliedCount = 0;
  wordBank.records = wordBank.records.map((record) => {
    const proposal = appliedByWord.get(record.normalized_word);
    if (!proposal) return record;
    appliedCount += 1;
    return applyProposalToRecord(record, proposal);
  });

  await writeFile(WORD_BANK_PATH, `${JSON.stringify(wordBank, null, 2)}\n`, 'utf8');

  console.log(`[apply-enrichment] Applied: ${appliedCount}`);
  console.log(`[apply-enrichment] Held back (needs manual review): ${heldBack.length}`);
  for (const entry of heldBack) {
    console.log(`  - ${entry.normalized_word}: ${entry.notes[0]}`);
  }
  console.log(`[apply-enrichment] Wrote ${WORD_BANK_PATH}`);
}

if (process.argv[1] && process.argv[1].endsWith('apply-word-bank-enrichment.mjs')) {
  main().catch((error) => {
    console.error('[apply-enrichment] Unexpected failure:', error?.message ?? error);
    process.exitCode = 1;
  });
}
