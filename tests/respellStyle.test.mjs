import assert from 'node:assert/strict';
import { test } from 'node:test';

import { respellToWordUpStyle } from '../scripts/respell-style.mjs';

test('respellToWordUpStyle converts stress marks to hyphens and lowercases digraphs', () => {
  assert.equal(respellToWordUpStyle('əˈdapt'), '/uh-dapt/');
  assert.equal(respellToWordUpStyle('əˈprōCH'), '/uh-prohch/');
  assert.equal(respellToWordUpStyle('amˈbiSHən'), '/am-bishuhn/');
  assert.equal(respellToWordUpStyle('ôˈTHen(t)ik'), '/aw-thentik/');
});

test('respellToWordUpStyle maps individual diacritic vowels correctly', () => {
  assert.equal(respellToWordUpStyle('ˈadvəˌkāt'), '/advuh-kayt/');
  assert.equal(respellToWordUpStyle('ˈärbəˌtrerē'), '/ahrbuh-treree/');
  assert.equal(respellToWordUpStyle('əˈkyo͞om(y)əˌlāt'), '/uh-kyoomyuh-layt/');
});

test('respellToWordUpStyle drops parentheses around optional sounds but keeps the sound', () => {
  assert.equal(respellToWordUpStyle('ədˈvan(t)ij'), '/uhd-vantij/');
  assert.equal(respellToWordUpStyle('əˈjās(ə)nt'), '/uh-jaysuhnt/');
});

test('respellToWordUpStyle returns null for missing input instead of throwing', () => {
  assert.equal(respellToWordUpStyle(null), null);
  assert.equal(respellToWordUpStyle(undefined), null);
  assert.equal(respellToWordUpStyle(''), null);
});

test('KNOWN LIMITATION: a single leading stress mark produces no internal hyphens at all', () => {
  // Oxford's respell only marks where stress falls, not every syllable boundary.
  // When the only stress mark is at the very start of the word, there is no
  // boundary information left to convert into a hyphen anywhere else — the
  // output is still phonetically sound-out-able but won't match the app's
  // hyphenated house style. This test documents the limitation so a future
  // change to the mapping can't silently regress without a test update.
  assert.equal(respellToWordUpStyle('ˈakyərət'), '/akyuhruht/');
  assert.equal(respellToWordUpStyle('ˈadəkwət'), '/aduhkwuht/');
  assert.equal(respellToWordUpStyle('ˈajəl'), '/ajuhl/');
});
