import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildEntryUrl,
  checkAudioAccessibility,
  compareWithWordUp,
  fetchFreeDictEntry,
  mapFreeDictEntryToFields,
  selectMeaningForPartOfSpeech,
} from '../scripts/free-dict-client.mjs';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    headers: { get: () => null },
  };
}

// Structurally real: this is the actual shape returned by
// https://api.dictionaryapi.dev/api/v2/entries/en/hello (trimmed).
const SAMPLE_FREE_DICT_RESPONSE = [
  {
    word: 'hello',
    phonetic: 'həˈloʊ',
    phonetics: [
      { text: 'həˈloʊ', audio: '' },
      {
        text: 'həˈloʊ',
        audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3',
        sourceUrl: 'https://commons.wikimedia.org/w/index.php?curid=75797336',
        license: { name: 'BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0' },
      },
    ],
    meanings: [
      {
        partOfSpeech: 'exclamation',
        definitions: [
          {
            definition: 'Used as a greeting or to begin a phone conversation.',
            synonyms: [],
            antonyms: [],
          },
        ],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: '"Hello!" or an equivalent greeting.',
            synonyms: [],
            antonyms: [],
            example: 'She was so busy that she barely had time to say hello to me.',
          },
        ],
      },
      {
        partOfSpeech: 'verb',
        definitions: [
          {
            definition: 'To greet with "hello".',
            synonyms: [],
            antonyms: [],
          },
        ],
      },
    ],
  },
];

test('buildEntryUrl encodes the word and lower-cases it', () => {
  const url = buildEntryUrl({ baseUrl: 'https://api.dictionaryapi.dev/api/v2/entries/en', word: 'Hello World' });
  assert.equal(url, 'https://api.dictionaryapi.dev/api/v2/entries/en/hello%20world');
});

test('mapFreeDictEntryToFields extracts definitions, parts of speech, pronunciation, and audio', () => {
  const fields = mapFreeDictEntryToFields(SAMPLE_FREE_DICT_RESPONSE);

  assert.deepEqual(fields.partsOfSpeech, ['exclamation', 'noun', 'verb']);
  assert.equal(fields.definitions.length, 3);
  assert.ok(fields.definitions.includes('Used as a greeting or to begin a phone conversation.'));
  assert.deepEqual(fields.examples, ['She was so busy that she barely had time to say hello to me.']);
  assert.deepEqual(fields.audioFiles, ['https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3']);
  assert.ok(fields.pronunciations.some((p) => p.text === 'həˈloʊ'));
  assert.deepEqual(fields.missingFields, []);
});

test('mapFreeDictEntryToFields de-duplicates identical phonetics entries', () => {
  const fields = mapFreeDictEntryToFields(SAMPLE_FREE_DICT_RESPONSE);
  const textOnly = fields.pronunciations.filter((p) => p.text === 'həˈloʊ' && !p.audio);
  // The top-level "phonetic" field duplicates the first phonetics[] entry's text
  // (empty audio) and should be collapsed rather than appearing twice.
  assert.equal(textOnly.length, 1);
});

test('mapFreeDictEntryToFields reports missing fields when the entry is sparse', () => {
  const fields = mapFreeDictEntryToFields([
    { word: 'foo', phonetics: [], meanings: [{ partOfSpeech: 'noun', definitions: [] }] },
  ]);

  assert.deepEqual(fields.partsOfSpeech, ['noun']);
  assert.deepEqual(fields.definitions, []);
  assert.deepEqual(fields.audioFiles, []);
  assert.deepEqual(fields.missingFields, ['definition', 'phoneticSpelling', 'audio']);
});

test('mapFreeDictEntryToFields does not throw on a malformed or empty response', () => {
  assert.doesNotThrow(() => mapFreeDictEntryToFields({}));
  assert.doesNotThrow(() => mapFreeDictEntryToFields(null));
  assert.doesNotThrow(() => mapFreeDictEntryToFields([]));
  const fields = mapFreeDictEntryToFields([]);
  assert.deepEqual(fields.missingFields, ['definition', 'partOfSpeech', 'phoneticSpelling', 'audio']);
});

test('selectMeaningForPartOfSpeech picks the sense matching the requested part of speech', () => {
  const noun = selectMeaningForPartOfSpeech(SAMPLE_FREE_DICT_RESPONSE, 'noun');
  assert.equal(noun.matched, true);
  assert.equal(noun.definition, '"Hello!" or an equivalent greeting.');
  assert.equal(noun.example, 'She was so busy that she barely had time to say hello to me.');
  assert.equal(noun.phoneticText, 'həˈloʊ');
  assert.equal(noun.audioFile, 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3');

  const exclamation = selectMeaningForPartOfSpeech(SAMPLE_FREE_DICT_RESPONSE, 'exclamation');
  assert.equal(exclamation.matched, true);
  assert.equal(exclamation.definition, 'Used as a greeting or to begin a phone conversation.');
});

test('selectMeaningForPartOfSpeech is case-insensitive and reports no match instead of guessing', () => {
  const upperCase = selectMeaningForPartOfSpeech(SAMPLE_FREE_DICT_RESPONSE, 'NOUN');
  assert.equal(upperCase.matched, true);

  const noSuchPos = selectMeaningForPartOfSpeech(SAMPLE_FREE_DICT_RESPONSE, 'adjective');
  assert.deepEqual(noSuchPos, { matched: false });

  const emptyResponse = selectMeaningForPartOfSpeech({}, 'noun');
  assert.deepEqual(emptyResponse, { matched: false });
});

test('fetchFreeDictEntry returns parsed data on success', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://example.test/hello');
    assert.equal(options.method, 'GET');
    return jsonResponse(200, SAMPLE_FREE_DICT_RESPONSE);
  };

  const result = await fetchFreeDictEntry({ word: 'hello', baseUrl: 'https://example.test', fetchImpl });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, SAMPLE_FREE_DICT_RESPONSE);
});

test('fetchFreeDictEntry returns a structured not-found result on 404 without throwing', async () => {
  const fetchImpl = async () =>
    jsonResponse(404, {
      title: 'No Definitions Found',
      message: "Sorry pal, we couldn't find definitions for the word you were looking for.",
      resolution: 'You can try the search again at later time or head to the web instead.',
    });

  const result = await fetchFreeDictEntry({ word: 'zzzznotaword', baseUrl: 'https://example.test', fetchImpl });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.equal(result.error, 'No Definitions Found');
});

test('fetchFreeDictEntry handles network failure without crashing', async () => {
  const fetchImpl = async () => {
    throw new Error('getaddrinfo ENOTFOUND');
  };

  const result = await fetchFreeDictEntry({ word: 'hello', baseUrl: 'https://example.test', fetchImpl });

  assert.equal(result.ok, false);
  assert.equal(result.status, null);
  assert.match(result.error, /ENOTFOUND/);
});

test('fetchFreeDictEntry surfaces a request timeout distinctly', async () => {
  const fetchImpl = async (url, options) =>
    new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });

  const result = await fetchFreeDictEntry({ word: 'hello', baseUrl: 'https://example.test', fetchImpl, timeoutMs: 5 });

  assert.equal(result.ok, false);
  assert.match(result.error, /timed out/);
});

test('checkAudioAccessibility and compareWithWordUp are re-exported from the shared module', () => {
  assert.equal(typeof checkAudioAccessibility, 'function');
  assert.equal(typeof compareWithWordUp, 'function');
});

test('compareWithWordUp uses "Free Dictionary API" as the source name in its notes', () => {
  const fields = mapFreeDictEntryToFields(SAMPLE_FREE_DICT_RESPONSE);
  const comparison = compareWithWordUp(fields, {
    definition: 'A greeting.',
    part_of_speech: 'noun',
    pronunciation: null,
    pronunciation_audio_url: null,
    example_sentence: 'Hello, how are you?',
  }, 'Free Dictionary API');

  assert.equal(comparison.hasWordUpRecord, true);
  assert.equal(
    comparison.notes.some((note) => note.includes('WordUp has no audio') && note.includes('Free Dictionary API')),
    true
  );
});
