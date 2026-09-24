import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { applyProposalToRecord, partitionProposals } from '../scripts/apply-word-bank-enrichment.mjs';

test('partitionProposals holds back every proposal with a note and applies the rest', async () => {
  const raw = await readFile('data/word-bank-enrichment-proposals.json', 'utf8');
  const data = JSON.parse(raw);

  const { applied, heldBack } = partitionProposals(data.proposals);

  assert.equal(applied.length + heldBack.length, data.proposals.length);
  assert.equal(heldBack.length, 9, 'expected exactly the 9 flagged words: analyze + 8 no-hyphen pronunciations');

  const heldBackWords = heldBack.map((h) => h.normalized_word).sort();
  assert.deepEqual(heldBackWords, [
    'accurate',
    'accurately',
    'active',
    'adequate',
    'agile',
    'analyze',
    'anchor',
    'applicable',
    'artistry',
  ]);

  assert.equal(applied.some((p) => p.normalized_word === 'advocate'), true);
  assert.equal(applied.some((p) => p.normalized_word === 'anchor'), false);
});

test('applyProposalToRecord only touches fields present in changes, never definition', () => {
  const record = {
    word: 'Advocate',
    normalized_word: 'advocate',
    definition: 'To publicly support an idea or cause.',
    example_sentence: 'They used the word advocate while explaining how to handle the situation.',
    pronunciation: '/advocate/',
    pronunciation_audio_url: null,
  };

  const proposal = {
    normalized_word: 'advocate',
    changes: {
      pronunciation_audio_url: { from: null, to: 'https://audio.oxforddictionaries.com/en/mp3/advocate__us_1.mp3' },
      pronunciation: { from: '/advocate/', to: '/advuh-kayt/' },
      example_sentence: { from: record.example_sentence, to: 'they advocated an ethical foreign policy' },
    },
  };

  const updated = applyProposalToRecord(record, proposal);

  assert.equal(updated.pronunciation_audio_url, 'https://audio.oxforddictionaries.com/en/mp3/advocate__us_1.mp3');
  assert.equal(updated.pronunciation, '/advuh-kayt/');
  assert.equal(updated.example_sentence, 'they advocated an ethical foreign policy');
  assert.equal(updated.definition, 'To publicly support an idea or cause.', 'definition must never change');
  assert.equal(updated.word, 'Advocate');
});

test('applyProposalToRecord leaves fields untouched when a proposal has no change for them', () => {
  const record = {
    word: 'Articulate',
    normalized_word: 'articulate',
    pronunciation: '/ar-tik-yuh-lit/',
    pronunciation_audio_url: null,
    example_sentence: 'Her articulate summary helped the team understand the plan.',
  };

  const proposal = {
    normalized_word: 'articulate',
    changes: {
      pronunciation_audio_url: { from: null, to: 'https://audio.oxforddictionaries.com/en/mp3/articulate__us_2.mp3' },
    },
  };

  const updated = applyProposalToRecord(record, proposal);

  assert.equal(updated.pronunciation_audio_url, 'https://audio.oxforddictionaries.com/en/mp3/articulate__us_2.mp3');
  assert.equal(updated.pronunciation, '/ar-tik-yuh-lit/', 'unflagged pronunciation should not be touched');
  assert.equal(updated.example_sentence, 'Her articulate summary helped the team understand the plan.');
});
