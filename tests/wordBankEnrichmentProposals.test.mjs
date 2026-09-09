import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);

// "advocate" and "anchor" mirror real production word_bank shapes: advocate has a
// placeholder example and trivial pronunciation; anchor's definition is figurative
// but its only Oxford verb sense is literal/nautical.
const FIXTURE_WORD_BANK = {
  records: [
    {
      word: 'Advocate',
      normalized_word: 'advocate',
      part_of_speech: 'verb',
      definition: 'To publicly support an idea or cause.',
      example_sentence: 'They used the word advocate while explaining how to handle the situation.',
      pronunciation: '/advocate/',
      pronunciation_audio_url: null,
      status: 'approved',
    },
    {
      word: 'Anchor',
      normalized_word: 'anchor',
      part_of_speech: 'verb',
      definition: 'To hold an idea or plan steady.',
      example_sentence: 'They used the word anchor while explaining how to handle the situation.',
      pronunciation: '/anchor/',
      pronunciation_audio_url: null,
      status: 'approved',
    },
  ],
};

const FIXTURE_QUALITY_REPORT = {
  flagged: [
    { normalized_word: 'advocate', reasons: ['placeholder_example', 'trivial_pronunciation', 'no_audio'] },
    { normalized_word: 'anchor', reasons: ['placeholder_example', 'trivial_pronunciation', 'no_audio'] },
  ],
};

const FIXTURE_OXFORD_DATA = {
  results: [
    {
      word: 'advocate',
      found: true,
      raw: {
        results: [
          {
            lexicalEntries: [
              {
                lexicalCategory: { text: 'Verb' },
                entries: [
                  {
                    pronunciations: [
                      { phoneticNotation: 'respell', phoneticSpelling: 'ˈadvəˌkāt' },
                      {
                        phoneticNotation: 'IPA',
                        phoneticSpelling: 'ˈædvəˌkeɪt',
                        audioFile: 'https://audio.oxforddictionaries.com/en/mp3/advocate__us_1.mp3',
                      },
                    ],
                    senses: [
                      {
                        definitions: ['publicly recommend or support'],
                        examples: [{ text: 'a group that advocates the rights of prisoners' }],
                      },
                    ],
                  },
                ],
              },
              {
                lexicalCategory: { text: 'Noun' },
                entries: [
                  {
                    pronunciations: [
                      {
                        phoneticNotation: 'IPA',
                        phoneticSpelling: 'ˈædvəkət',
                        audioFile: 'https://audio.oxforddictionaries.com/en/mp3/advocate__us_2.mp3',
                      },
                    ],
                    senses: [{ definitions: ['a person who publicly supports a policy or cause'] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    // Real production data: part_of_speech "verb", definition is the figurative sense
    // ("To hold an idea or plan steady"), but Oxford's only verb sense is literal/nautical.
    {
      word: 'anchor',
      found: true,
      raw: {
        results: [
          {
            lexicalEntries: [
              {
                lexicalCategory: { text: 'Verb' },
                entries: [
                  {
                    pronunciations: [
                      { phoneticNotation: 'respell', phoneticSpelling: 'ˈaNGkər' },
                      {
                        phoneticNotation: 'IPA',
                        phoneticSpelling: 'ˈæŋkər',
                        audioFile: 'https://audio.oxforddictionaries.com/en/mp3/anker__us_1.mp3',
                      },
                    ],
                    senses: [
                      {
                        definitions: ['moor (a ship) to the sea bottom with an anchor'],
                        examples: [{ text: 'the ship was anchored in the lee of the island' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    { word: 'zzznotfound', found: false },
  ],
};

async function writeFixtures(dir) {
  const oxfordPath = join(dir, 'oxford.json');
  const wordBankPath = join(dir, 'word-bank.json');
  const qualityReportPath = join(dir, 'quality-report.json');
  const outputPath = join(dir, 'proposals.json');

  await Promise.all([
    writeFile(oxfordPath, JSON.stringify(FIXTURE_OXFORD_DATA), 'utf8'),
    writeFile(wordBankPath, JSON.stringify(FIXTURE_WORD_BANK), 'utf8'),
    writeFile(qualityReportPath, JSON.stringify(FIXTURE_QUALITY_REPORT), 'utf8'),
  ]);

  await run('node', [
    'scripts/word-bank-enrichment-proposals.mjs',
    oxfordPath,
    wordBankPath,
    qualityReportPath,
    outputPath,
  ]);

  return JSON.parse(await readFile(outputPath, 'utf8'));
}

test('word-bank-enrichment-proposals selects the verb sense for advocate and never touches its definition', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wordup-enrichment-'));
  const report = await writeFixtures(dir);

  const advocate = report.proposals.find((p) => p.normalized_word === 'advocate');
  assert.ok(advocate, 'expected a proposal for advocate');
  assert.equal(advocate.part_of_speech, 'verb');
  assert.equal(advocate.currentDefinition, 'To publicly support an idea or cause.');
  assert.equal(advocate.changes.definition, undefined, 'definitions must never be proposed for change');

  assert.equal(advocate.changes.pronunciation.from, '/advocate/');
  assert.equal(advocate.changes.pronunciation.to, '/advuh-kayt/', 'pronunciation should be converted to WordUp house style, not raw Oxford respell');

  assert.equal(advocate.changes.example_sentence.from, 'They used the word advocate while explaining how to handle the situation.');
  assert.equal(advocate.changes.example_sentence.to, 'a group that advocates the rights of prisoners');

  assert.equal(advocate.changes.pronunciation_audio_url.from, null);
  assert.equal(advocate.changes.pronunciation_audio_url.to, 'https://audio.oxforddictionaries.com/en/mp3/advocate__us_1.mp3');

  const notFound = report.skipped.find((s) => s.word === 'zzznotfound');
  assert.deepEqual(notFound, { word: 'zzznotfound', reason: 'not_found_on_oxford' });
});

test('word-bank-enrichment-proposals overrides the anchor example instead of using Oxford\'s literal/nautical one', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wordup-enrichment-'));
  const report = await writeFixtures(dir);

  const anchor = report.proposals.find((p) => p.normalized_word === 'anchor');
  assert.ok(anchor, 'expected a proposal for anchor');
  assert.equal(anchor.currentDefinition, 'To hold an idea or plan steady.');
  assert.equal(
    anchor.changes.example_sentence.to,
    "The company's mission statement anchors every decision the team makes.",
    'must use the manual override, never Oxford\'s literal nautical example'
  );
  assert.notEqual(anchor.changes.example_sentence.to, 'the ship was anchored in the lee of the island');
  assert.ok(anchor.notes?.some((n) => n.includes('manually overridden')));
  assert.ok(anchor.notes?.some((n) => n.includes('no syllable breaks')), 'anchor\'s pronunciation also has no hyphens');
});
