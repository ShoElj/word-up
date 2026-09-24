import { checkAudioAccessibility, compareWithWordUp } from './dictionary-shared.mjs';
import { fetchViaNodeHttp } from './node-fetch-compat.mjs';

export { checkAudioAccessibility, compareWithWordUp };

const REDACTION_PLACEHOLDER = '[redacted]';

export function buildEntriesUrl({ baseUrl, word, sourceLang = 'en-us' }) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const wordId = encodeURIComponent(String(word).trim().toLowerCase());
  return `${normalizedBase}/entries/${sourceLang}/${wordId}?strictMatch=false`;
}

function redact(text, secrets) {
  let result = String(text ?? '');
  for (const secret of secrets) {
    if (secret) {
      result = result.split(secret).join(REDACTION_PLACEHOLDER);
    }
  }
  return result;
}

export async function fetchOxfordEntry({
  word,
  appId,
  appKey,
  baseUrl,
  sourceLang = 'en-us',
  fetchImpl = fetchViaNodeHttp,
  timeoutMs = 10000,
}) {
  const url = buildEntriesUrl({ baseUrl, word, sourceLang });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        app_id: appId,
        app_key: appKey,
        Accept: 'application/json',
      },
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
      const message =
        (body && typeof body.error === 'string' && body.error) ||
        (bodyText && bodyText.slice(0, 300)) ||
        `HTTP ${status}`;
      return {
        ok: false,
        word,
        url,
        status,
        error: redact(message, [appId, appKey]),
      };
    }

    return { ok: true, word, url, status, data: body };
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    return {
      ok: false,
      word,
      url,
      status: null,
      error: redact(isAbort ? `Request timed out after ${timeoutMs}ms` : String(error?.message ?? error), [
        appId,
        appKey,
      ]),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function collectPronunciations(entry) {
  const fromEntry = Array.isArray(entry?.pronunciations) ? entry.pronunciations : [];
  const fromSenses = Array.isArray(entry?.senses)
    ? entry.senses.flatMap((sense) => (Array.isArray(sense?.pronunciations) ? sense.pronunciations : []))
    : [];

  const seen = new Set();
  const combined = [];
  for (const pronunciation of [...fromEntry, ...fromSenses]) {
    const key = `${pronunciation?.phoneticSpelling ?? ''}|${pronunciation?.audioFile ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push({
      phoneticSpelling: pronunciation?.phoneticSpelling ?? null,
      phoneticNotation: pronunciation?.phoneticNotation ?? null,
      dialects: Array.isArray(pronunciation?.dialects) ? pronunciation.dialects : [],
      audioFile: pronunciation?.audioFile ?? null,
    });
  }
  return combined;
}

function collectDefinitions(entry) {
  if (!Array.isArray(entry?.senses)) return [];
  return entry.senses.flatMap((sense) => (Array.isArray(sense?.definitions) ? sense.definitions : []));
}

function collectExamples(entry) {
  if (!Array.isArray(entry?.senses)) return [];
  return entry.senses.flatMap((sense) =>
    Array.isArray(sense?.examples) ? sense.examples.map((example) => example?.text).filter(Boolean) : []
  );
}

export function mapOxfordEntryToFields(oxfordJson) {
  const result = Array.isArray(oxfordJson?.results) ? oxfordJson.results[0] : null;
  const lexicalEntries = Array.isArray(result?.lexicalEntries) ? result.lexicalEntries : [];

  const partsOfSpeech = [];
  const definitions = [];
  const examples = [];
  const pronunciations = [];

  for (const lexicalEntry of lexicalEntries) {
    const category = lexicalEntry?.lexicalCategory?.text;
    if (category && !partsOfSpeech.includes(category)) {
      partsOfSpeech.push(category);
    }

    const lexicalEntryPronunciations = Array.isArray(lexicalEntry?.pronunciations)
      ? lexicalEntry.pronunciations
      : [];
    for (const pronunciation of lexicalEntryPronunciations) {
      pronunciations.push({
        phoneticSpelling: pronunciation?.phoneticSpelling ?? null,
        phoneticNotation: pronunciation?.phoneticNotation ?? null,
        dialects: Array.isArray(pronunciation?.dialects) ? pronunciation.dialects : [],
        audioFile: pronunciation?.audioFile ?? null,
      });
    }

    const entries = Array.isArray(lexicalEntry?.entries) ? lexicalEntry.entries : [];
    for (const entry of entries) {
      definitions.push(...collectDefinitions(entry));
      examples.push(...collectExamples(entry));
      pronunciations.push(...collectPronunciations(entry));
    }
  }

  const uniquePronunciations = [];
  const seenPronunciation = new Set();
  for (const pronunciation of pronunciations) {
    const key = `${pronunciation.phoneticSpelling ?? ''}|${pronunciation.audioFile ?? ''}`;
    if (seenPronunciation.has(key)) continue;
    seenPronunciation.add(key);
    uniquePronunciations.push(pronunciation);
  }

  const audioFiles = uniquePronunciations.map((p) => p.audioFile).filter(Boolean);

  const missingFields = [];
  if (definitions.length === 0) missingFields.push('definition');
  if (partsOfSpeech.length === 0) missingFields.push('partOfSpeech');
  if (uniquePronunciations.every((p) => !p.phoneticSpelling)) missingFields.push('phoneticSpelling');
  if (audioFiles.length === 0) missingFields.push('audio');

  return {
    entryInfo: {
      id: result?.id ?? null,
      word: result?.word ?? null,
      language: result?.language ?? null,
      lexicalEntryCount: lexicalEntries.length,
    },
    partsOfSpeech,
    definitions,
    examples,
    pronunciations: uniquePronunciations,
    audioFiles,
    missingFields,
  };
}

export function selectEntryForPartOfSpeech(oxfordJson, partOfSpeech) {
  const result = Array.isArray(oxfordJson?.results) ? oxfordJson.results[0] : null;
  const lexicalEntries = Array.isArray(result?.lexicalEntries) ? result.lexicalEntries : [];
  const normalizedTarget = String(partOfSpeech ?? '').toLowerCase();

  const lexicalEntry = lexicalEntries.find(
    (candidate) => candidate?.lexicalCategory?.text?.toLowerCase() === normalizedTarget
  );

  if (!lexicalEntry) {
    return { matched: false };
  }

  const entries = Array.isArray(lexicalEntry.entries) ? lexicalEntry.entries : [];
  const entry = entries[0];
  if (!entry) {
    return { matched: false };
  }

  const firstSense = Array.isArray(entry.senses) ? entry.senses[0] : null;
  const definition = firstSense?.definitions?.[0] ?? null;
  const example = firstSense?.examples?.[0]?.text ?? null;

  const pronunciations = Array.isArray(entry.pronunciations) ? entry.pronunciations : [];
  const respell = pronunciations.find((p) => p?.phoneticNotation === 'respell') ?? null;
  const ipa = pronunciations.find((p) => p?.phoneticNotation === 'IPA') ?? null;
  const audioFile = pronunciations.find((p) => p?.audioFile)?.audioFile ?? null;

  return {
    matched: true,
    definition,
    example,
    respellPronunciation: respell?.phoneticSpelling ?? null,
    ipaPronunciation: ipa?.phoneticSpelling ?? null,
    audioFile,
  };
}

