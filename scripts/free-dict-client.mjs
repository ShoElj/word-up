// Client for the free, keyless, unlimited "Free Dictionary API"
// (https://dictionaryapi.dev — wraps Wiktionary data). No credentials involved
// at all, unlike the Oxford client — nothing here needs redaction.

import { checkAudioAccessibility, compareWithWordUp } from './dictionary-shared.mjs';
import { fetchViaNodeHttp } from './node-fetch-compat.mjs';

export { checkAudioAccessibility, compareWithWordUp };

const DEFAULT_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export function buildEntryUrl({ baseUrl = DEFAULT_BASE_URL, word }) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const wordId = encodeURIComponent(String(word).trim().toLowerCase());
  return `${normalizedBase}/${wordId}`;
}

export async function fetchFreeDictEntry({ word, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetchViaNodeHttp, timeoutMs = 10000 }) {
  const url = buildEntryUrl({ baseUrl, word });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    const status = response.status;
    const bodyText = await response.text();
    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message = (body && typeof body.title === 'string' && body.title) || `HTTP ${status}`;
      return { ok: false, word, url, status, error: message };
    }

    return { ok: true, word, url, status, data: body };
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    return {
      ok: false,
      word,
      url,
      status: null,
      error: isAbort ? `Request timed out after ${timeoutMs}ms` : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function collectFromMeaning(meaning) {
  const defs = Array.isArray(meaning?.definitions) ? meaning.definitions : [];
  return {
    definitions: defs.map((d) => d?.definition).filter(Boolean),
    examples: defs.map((d) => d?.example).filter(Boolean),
  };
}

export function mapFreeDictEntryToFields(freeDictJson) {
  const entries = Array.isArray(freeDictJson) ? freeDictJson : [];

  const partsOfSpeech = [];
  const definitions = [];
  const examples = [];
  const pronunciations = [];

  for (const entry of entries) {
    const phonetics = Array.isArray(entry?.phonetics) ? entry.phonetics : [];
    for (const p of phonetics) {
      if (!p?.text && !p?.audio) continue;
      pronunciations.push({ text: p?.text || null, audio: p?.audio || null });
    }
    if (entry?.phonetic && !pronunciations.some((p) => p.text === entry.phonetic)) {
      pronunciations.push({ text: entry.phonetic, audio: null });
    }

    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    for (const meaning of meanings) {
      const pos = meaning?.partOfSpeech;
      if (pos && !partsOfSpeech.includes(pos)) partsOfSpeech.push(pos);
      const collected = collectFromMeaning(meaning);
      definitions.push(...collected.definitions);
      examples.push(...collected.examples);
    }
  }

  const uniquePronunciations = [];
  const seen = new Set();
  for (const p of pronunciations) {
    const key = `${p.text ?? ''}|${p.audio ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePronunciations.push(p);
  }

  const audioFiles = uniquePronunciations.map((p) => p.audio).filter(Boolean);

  const missingFields = [];
  if (definitions.length === 0) missingFields.push('definition');
  if (partsOfSpeech.length === 0) missingFields.push('partOfSpeech');
  if (uniquePronunciations.every((p) => !p.text)) missingFields.push('phoneticSpelling');
  if (audioFiles.length === 0) missingFields.push('audio');

  return {
    entryInfo: {
      word: entries[0]?.word ?? null,
      entryCount: entries.length,
    },
    partsOfSpeech,
    definitions,
    examples,
    pronunciations: uniquePronunciations,
    audioFiles,
    missingFields,
  };
}

export function selectMeaningForPartOfSpeech(freeDictJson, partOfSpeech) {
  const entries = Array.isArray(freeDictJson) ? freeDictJson : [];
  const normalizedTarget = String(partOfSpeech ?? '').toLowerCase();

  for (const entry of entries) {
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    const meaning = meanings.find((m) => m?.partOfSpeech?.toLowerCase() === normalizedTarget);
    if (!meaning) continue;

    const definitionEntry = Array.isArray(meaning.definitions) ? meaning.definitions[0] : null;
    if (!definitionEntry) continue;

    const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
    const withAudio = phonetics.find((p) => p?.audio);
    const anyPhonetic = phonetics.find((p) => p?.text) ?? null;

    return {
      matched: true,
      definition: definitionEntry.definition ?? null,
      example: definitionEntry.example ?? null,
      phoneticText: withAudio?.text || anyPhonetic?.text || entry.phonetic || null,
      audioFile: withAudio?.audio || null,
    };
  }

  return { matched: false };
}
