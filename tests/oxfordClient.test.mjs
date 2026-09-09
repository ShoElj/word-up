import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildEntriesUrl,
  checkAudioAccessibility,
  compareWithWordUp,
  fetchOxfordEntry,
  mapOxfordEntryToFields,
  selectEntryForPartOfSpeech,
} from '../scripts/oxford-client.mjs';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    headers: { get: () => null },
  };
}

const SAMPLE_OXFORD_RESPONSE = {
  id: 'concise',
  word: 'concise',
  results: [
    {
      id: 'concise',
      language: 'en-us',
      word: 'concise',
      lexicalEntries: [
        {
          language: 'en-us',
          lexicalCategory: { id: 'adjective', text: 'Adjective' },
          pronunciations: [
            {
              audioFile: 'https://audio.oxforddictionaries.com/en/mp3/concise_1_us_1.mp3',
              dialects: ['American English'],
              phoneticNotation: 'IPA',
              phoneticSpelling: 'kənˈsʌɪs',
            },
          ],
          entries: [
            {
              senses: [
                {
                  definitions: ['giving a lot of information clearly and in a few words'],
                  examples: [{ text: "a concise account of the country's history" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// Trimmed but structurally real: from the actual Oxford Sandbox response for "articulate",
// which has both an Adjective and a Verb lexical entry with distinct senses/pronunciations.
const MULTI_SENSE_RESPONSE = {
  results: [
    {
      id: 'articulate',
      word: 'articulate',
      lexicalEntries: [
        {
          lexicalCategory: { id: 'adjective', text: 'Adjective' },
          entries: [
            {
              pronunciations: [
                { phoneticNotation: 'respell', phoneticSpelling: 'ärˈtikyələt' },
                {
                  phoneticNotation: 'IPA',
                  phoneticSpelling: 'ɑrˈtɪkjələt',
                  audioFile: 'https://audio.oxforddictionaries.com/en/mp3/articulate__us_2.mp3',
                },
              ],
              senses: [
                {
                  definitions: [
                    "(of a person or a person's words) having or showing the ability to speak fluently and coherently",
                  ],
                  examples: [{ text: 'an articulate account of their experiences' }],
                },
              ],
            },
          ],
        },
        {
          lexicalCategory: { id: 'verb', text: 'Verb' },
          entries: [
            {
              pronunciations: [
                { phoneticNotation: 'respell', phoneticSpelling: 'ärˈtikyəˌlāt' },
                {
                  phoneticNotation: 'IPA',
                  phoneticSpelling: 'ɑrˈtɪkjəˌleɪt',
                  audioFile: 'https://audio.oxforddictionaries.com/en/mp3/articulate__us_1.mp3',
                },
              ],
              senses: [
                {
                  definitions: ['express (an idea or feeling) fluently and coherently'],
                  examples: [{ text: 'they were unable to articulate their emotions' }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test('selectEntryForPartOfSpeech picks the sense matching the requested part of speech', () => {
  const adjective = selectEntryForPartOfSpeech(MULTI_SENSE_RESPONSE, 'adjective');
  assert.equal(adjective.matched, true);
  assert.equal(
    adjective.definition,
    "(of a person or a person's words) having or showing the ability to speak fluently and coherently"
  );
  assert.equal(adjective.example, 'an articulate account of their experiences');
  assert.equal(adjective.respellPronunciation, 'ärˈtikyələt');
  assert.equal(adjective.ipaPronunciation, 'ɑrˈtɪkjələt');
  assert.equal(adjective.audioFile, 'https://audio.oxforddictionaries.com/en/mp3/articulate__us_2.mp3');

  const verb = selectEntryForPartOfSpeech(MULTI_SENSE_RESPONSE, 'verb');
  assert.equal(verb.matched, true);
  assert.equal(verb.definition, 'express (an idea or feeling) fluently and coherently');
  assert.equal(verb.audioFile, 'https://audio.oxforddictionaries.com/en/mp3/articulate__us_1.mp3');
});

test('selectEntryForPartOfSpeech is case-insensitive and reports no match instead of guessing', () => {
  const upperCase = selectEntryForPartOfSpeech(MULTI_SENSE_RESPONSE, 'ADJECTIVE');
  assert.equal(upperCase.matched, true);

  const noSuchPos = selectEntryForPartOfSpeech(MULTI_SENSE_RESPONSE, 'noun');
  assert.deepEqual(noSuchPos, { matched: false });

  const emptyResponse = selectEntryForPartOfSpeech({}, 'adjective');
  assert.deepEqual(emptyResponse, { matched: false });
});

test('buildEntriesUrl encodes the word and disables strict matching', () => {
  const url = buildEntriesUrl({ baseUrl: 'https://od-api-sandbox.oxforddictionaries.com/api/v2/', word: 'Well Being' });
  assert.equal(url, 'https://od-api-sandbox.oxforddictionaries.com/api/v2/entries/en-us/well%20being?strictMatch=false');
});

test('mapOxfordEntryToFields extracts definitions, part of speech, pronunciation, and audio', () => {
  const fields = mapOxfordEntryToFields(SAMPLE_OXFORD_RESPONSE);

  assert.deepEqual(fields.partsOfSpeech, ['Adjective']);
  assert.deepEqual(fields.definitions, ['giving a lot of information clearly and in a few words']);
  assert.equal(fields.pronunciations.length, 1);
  assert.equal(fields.pronunciations[0].phoneticSpelling, 'kənˈsʌɪs');
  assert.deepEqual(fields.audioFiles, ['https://audio.oxforddictionaries.com/en/mp3/concise_1_us_1.mp3']);
  assert.deepEqual(fields.missingFields, []);
});

test('mapOxfordEntryToFields reports missing fields when the entry is sparse', () => {
  const fields = mapOxfordEntryToFields({
    results: [{ id: 'foo', word: 'foo', lexicalEntries: [{ lexicalCategory: { text: 'Noun' }, entries: [{ senses: [] }] }] }],
  });

  assert.deepEqual(fields.partsOfSpeech, ['Noun']);
  assert.deepEqual(fields.definitions, []);
  assert.deepEqual(fields.audioFiles, []);
  assert.deepEqual(fields.missingFields, ['definition', 'phoneticSpelling', 'audio']);
});

test('mapOxfordEntryToFields does not throw on a malformed or empty response', () => {
  assert.doesNotThrow(() => mapOxfordEntryToFields({}));
  assert.doesNotThrow(() => mapOxfordEntryToFields(null));
  const fields = mapOxfordEntryToFields({});
  assert.deepEqual(fields.missingFields, ['definition', 'partOfSpeech', 'phoneticSpelling', 'audio']);
});

test('fetchOxfordEntry sends app_id/app_key headers and returns parsed data on success', async () => {
  let capturedHeaders = null;
  const fetchImpl = async (url, options) => {
    capturedHeaders = options.headers;
    assert.equal(url, 'https://example.test/entries/en-us/concise?strictMatch=false');
    return jsonResponse(200, SAMPLE_OXFORD_RESPONSE);
  };

  const result = await fetchOxfordEntry({
    word: 'concise',
    appId: 'test-app-id',
    appKey: 'test-app-key',
    baseUrl: 'https://example.test',
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, SAMPLE_OXFORD_RESPONSE);
  assert.equal(capturedHeaders.app_id, 'test-app-id');
  assert.equal(capturedHeaders.app_key, 'test-app-key');
});

test('fetchOxfordEntry returns a structured not-found result on 404 without throwing', async () => {
  const fetchImpl = async () => jsonResponse(404, { error: 'No entry found matching supplied source_lang and text' });

  const result = await fetchOxfordEntry({
    word: 'zzzznotaword',
    appId: 'test-app-id',
    appKey: 'test-app-key',
    baseUrl: 'https://example.test',
    fetchImpl,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.equal(result.error, 'No entry found matching supplied source_lang and text');
});

test('fetchOxfordEntry surfaces rate-limit (429) responses distinctly from other errors', async () => {
  const fetchImpl = async () => jsonResponse(429, { error: 'Too Many Requests' });

  const result = await fetchOxfordEntry({
    word: 'concise',
    appId: 'test-app-id',
    appKey: 'test-app-key',
    baseUrl: 'https://example.test',
    fetchImpl,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 429);
});

test('fetchOxfordEntry never leaks the app_id or app_key into an error message', async () => {
  const fetchImpl = async () =>
    jsonResponse(401, { error: 'Invalid credentials for app_id=test-app-id app_key=test-app-key' });

  const result = await fetchOxfordEntry({
    word: 'concise',
    appId: 'test-app-id',
    appKey: 'test-app-key',
    baseUrl: 'https://example.test',
    fetchImpl,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.includes('test-app-id'), false);
  assert.equal(result.error.includes('test-app-key'), false);
  assert.match(result.error, /\[redacted\]/);
});

test('fetchOxfordEntry handles network failure without crashing and does not leak secrets', async () => {
  const fetchImpl = async () => {
    throw new Error('getaddrinfo ENOTFOUND for app_key test-app-key');
  };

  const result = await fetchOxfordEntry({
    word: 'concise',
    appId: 'test-app-id',
    appKey: 'test-app-key',
    baseUrl: 'https://example.test',
    fetchImpl,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, null);
  assert.equal(result.error.includes('test-app-key'), false);
});

test('checkAudioAccessibility reports reachable audio via a HEAD request', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(options.method, 'HEAD');
    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => (name === 'content-type' ? 'audio/mpeg' : name === 'content-length' ? '12345' : null),
      },
    };
  };

  const result = await checkAudioAccessibility('https://audio.oxforddictionaries.com/en/mp3/concise_1_us_1.mp3', {
    fetchImpl,
  });

  assert.equal(result.reachable, true);
  assert.equal(result.status, 200);
  assert.equal(result.contentType, 'audio/mpeg');
  assert.equal(result.contentLengthBytes, 12345);
});

test('checkAudioAccessibility reports unreachable audio without throwing', async () => {
  const fetchImpl = async () => ({ ok: false, status: 403, headers: { get: () => null } });

  const result = await checkAudioAccessibility('https://audio.oxforddictionaries.com/en/mp3/missing.mp3', { fetchImpl });

  assert.equal(result.reachable, false);
  assert.equal(result.status, 403);
});

test('checkAudioAccessibility handles a missing url without making a request', async () => {
  const result = await checkAudioAccessibility(undefined);
  assert.equal(result.checked, false);
  assert.equal(result.reachable, false);
});

test('compareWithWordUp flags when WordUp has no audio but Oxford does', () => {
  const fields = mapOxfordEntryToFields(SAMPLE_OXFORD_RESPONSE);
  const comparison = compareWithWordUp(fields, {
    definition: 'Using few words while remaining clear.',
    part_of_speech: 'adjective',
    pronunciation: '/kun-sys/',
    pronunciation_audio_url: null,
    example_sentence: 'Please keep the update concise and practical.',
  });

  assert.equal(comparison.hasWordUpRecord, true);
  assert.equal(comparison.partOfSpeechMatches, true);
  assert.equal(
    comparison.notes.some((note) => note.includes('WordUp has no audio')),
    true
  );
});

test('compareWithWordUp reports partOfSpeechMatches as null (not false) when Oxford has no data to compare', () => {
  const emptyFields = { audioFiles: [], partsOfSpeech: [], pronunciations: [], definitions: [] };
  const comparison = compareWithWordUp(emptyFields, {
    definition: 'Able to recover after difficulty or change.',
    part_of_speech: 'adjective',
    pronunciation: '/ri-zil-yunt/',
    pronunciation_audio_url: null,
    example_sentence: 'The resilient team adjusted quickly after the setback.',
  });

  assert.equal(comparison.partOfSpeechMatches, null);
  assert.equal(
    comparison.notes.some((note) => note.includes('Part of speech differs')),
    false
  );
});

test('compareWithWordUp reports when the word has no existing WordUp record', () => {
  const fields = mapOxfordEntryToFields(SAMPLE_OXFORD_RESPONSE);
  const comparison = compareWithWordUp(fields, null);

  assert.equal(comparison.hasWordUpRecord, false);
  assert.equal(comparison.notes.length > 0, true);
});

test('compareWithWordUp flags a part-of-speech mismatch', () => {
  const fields = mapOxfordEntryToFields(SAMPLE_OXFORD_RESPONSE);
  const comparison = compareWithWordUp(fields, {
    definition: 'Something else.',
    part_of_speech: 'noun',
    pronunciation: null,
    pronunciation_audio_url: null,
    example_sentence: null,
  });

  assert.equal(comparison.partOfSpeechMatches, false);
  assert.equal(
    comparison.notes.some((note) => note.includes('Part of speech differs')),
    true
  );
});
