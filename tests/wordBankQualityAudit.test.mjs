import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);

function record(overrides) {
  return {
    word: 'Word',
    normalized_word: 'word',
    part_of_speech: 'noun',
    definition: 'A definition.',
    example_sentence: 'A real example sentence.',
    pronunciation: '/wurd/',
    pronunciation_audio_url: 'https://audio.oxforddictionaries.com/en/mp3/word.mp3',
    status: 'approved',
    ...overrides,
  };
}

const FIXTURE_WORD_BANK = {
  records: [
    record({ word: 'Concise', normalized_word: 'concise' }),
    record({
      word: 'Advocate',
      normalized_word: 'advocate',
      example_sentence: 'They used the word advocate while explaining how to handle the situation.',
      pronunciation: '/advocate/',
      pronunciation_audio_url: null,
    }),
    record({ word: 'Draft', normalized_word: 'draft', status: 'review' }),
  ],
};

const FIXTURE_CURRICULUM = {
  records: [{ day_number: 1, normalized_word: 'concise' }],
};

test('word-bank-quality-audit flags placeholder examples, trivial pronunciations, and missing audio', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wordup-quality-audit-'));
  const wordBankPath = join(dir, 'word-bank.json');
  const curriculumPath = join(dir, 'curriculum.json');
  const outputPath = join(dir, 'report.json');

  await Promise.all([
    writeFile(wordBankPath, JSON.stringify(FIXTURE_WORD_BANK), 'utf8'),
    writeFile(curriculumPath, JSON.stringify(FIXTURE_CURRICULUM), 'utf8'),
  ]);

  await run('node', ['scripts/word-bank-quality-audit.mjs', wordBankPath, curriculumPath, outputPath]);

  const raw = await readFile(outputPath, 'utf8');
  const report = JSON.parse(raw);

  assert.equal(report.totalApproved, 2, 'the "review" status record must be excluded');
  assert.equal(report.summary.placeholderExampleCount, 1);
  assert.equal(report.summary.trivialPronunciationCount, 1);
  assert.equal(report.summary.noAudioCount, 1);

  const advocate = report.flagged.find((f) => f.normalized_word === 'advocate');
  assert.ok(advocate);
  assert.deepEqual(advocate.reasons.sort(), ['no_audio', 'placeholder_example', 'trivial_pronunciation']);
  assert.equal(advocate.curriculumDay, null, 'advocate is not in the fixture curriculum');

  const concise = report.flagged.find((f) => f.normalized_word === 'concise');
  assert.equal(concise, undefined, 'concise has no quality issues and a real audio URL, so should not be flagged');
});
