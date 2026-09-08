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
  fetchImpl = fetch,
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

export async function checkAudioAccessibility(url, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (!url) {
    return { url: null, checked: false, reachable: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, { method: 'HEAD', signal: controller.signal });
    return {
      url,
      checked: true,
      reachable: response.ok,
      status: response.status,
      contentType: response.headers?.get?.('content-type') ?? null,
      contentLengthBytes: response.headers?.get?.('content-length')
        ? Number(response.headers.get('content-length'))
        : null,
    };
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    return {
      url,
      checked: true,
      reachable: false,
      error: isAbort ? `Request timed out after ${timeoutMs}ms` : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function compareWithWordUp(oxfordFields, wordUpRecord) {
  if (!wordUpRecord) {
    return {
      hasWordUpRecord: false,
      notes: ['This word does not exist in the current WordUp word_bank candidates.'],
    };
  }

  const wordUpAudioUrl = wordUpRecord.pronunciation_audio_url ?? null;
  const oxfordAudioFiles = oxfordFields.audioFiles;
  const wordUpPartOfSpeech = wordUpRecord.part_of_speech ?? null;
  const partOfSpeechMatches = Boolean(
    wordUpPartOfSpeech && oxfordFields.partsOfSpeech.some((pos) => pos.toLowerCase() === wordUpPartOfSpeech.toLowerCase())
  );

  const notes = [];
  if (!wordUpAudioUrl && oxfordAudioFiles.length > 0) {
    notes.push(`WordUp has no audio for this word; Oxford provides ${oxfordAudioFiles.length} audio file(s).`);
  }
  if (wordUpAudioUrl && oxfordAudioFiles.length === 0) {
    notes.push('WordUp has an audio URL on file but Oxford did not return one for this entry.');
  }
  if (wordUpRecord.pronunciation && oxfordFields.pronunciations.length > 0) {
    notes.push('WordUp pronunciation is a hand-written respelling; Oxford pronunciation uses phonetic notation (see phoneticNotation/phoneticSpelling) — formats are not directly comparable.');
  }
  if (wordUpPartOfSpeech && oxfordFields.partsOfSpeech.length > 0 && !partOfSpeechMatches) {
    notes.push(`Part of speech differs: WordUp has "${wordUpPartOfSpeech}", Oxford returned ${JSON.stringify(oxfordFields.partsOfSpeech)}.`);
  }
  if (oxfordFields.definitions.length > 1) {
    notes.push(`Oxford returned ${oxfordFields.definitions.length} definitions/senses; WordUp stores exactly one.`);
  }

  return {
    hasWordUpRecord: true,
    wordUp: {
      definition: wordUpRecord.definition ?? null,
      partOfSpeech: wordUpPartOfSpeech,
      pronunciation: wordUpRecord.pronunciation ?? null,
      audioUrl: wordUpAudioUrl,
      exampleSentence: wordUpRecord.example_sentence ?? null,
    },
    partOfSpeechMatches,
    notes,
  };
}
