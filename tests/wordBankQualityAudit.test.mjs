import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

test('word-bank-quality-audit runs against the real dataset and writes a reviewable report', async () => {
  await run('node', ['scripts/word-bank-quality-audit.mjs']);

  const raw = await readFile('data/word-bank-quality-assessment.json', 'utf8');
  const report = JSON.parse(raw);

  assert.equal(report.totalApproved, 500);
  assert.equal(typeof report.summary.placeholderExampleCount, 'number');
  assert.equal(typeof report.summary.trivialPronunciationCount, 'number');
  assert.equal(report.summary.noAudioCount, 500, 'no word_bank record currently has real audio');
  assert.ok(report.summary.placeholderExampleCount > 0, 'expected at least some placeholder-example words');
  assert.ok(report.summary.trivialPronunciationCount > 0, 'expected at least some trivial pronunciations');

  for (const entry of report.flagged) {
    assert.ok(entry.reasons.length > 0);
    assert.ok(['placeholder_example', 'trivial_pronunciation', 'no_audio'].every((r) => typeof r === 'string'));
  }

  const concise = report.flagged.find((entry) => entry.normalized_word === 'concise');
  assert.ok(concise, 'concise should still be flagged for no_audio, since that applies to every word today');
  assert.deepEqual(
    concise.reasons,
    ['no_audio'],
    'the hand-curated Phase-1 words should not have placeholder examples or trivial pronunciations'
  );
});
