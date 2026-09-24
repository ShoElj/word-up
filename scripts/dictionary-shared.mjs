// Logic shared across dictionary-source clients (Oxford, Free Dictionary API, etc.)
// so each vendor-specific client only needs to handle fetching and field mapping.

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

export function compareWithWordUp(sourceFields, wordUpRecord, sourceName = 'Oxford') {
  if (!wordUpRecord) {
    return {
      hasWordUpRecord: false,
      notes: ['This word does not exist in the current WordUp word_bank candidates.'],
    };
  }

  const wordUpAudioUrl = wordUpRecord.pronunciation_audio_url ?? null;
  const sourceAudioFiles = sourceFields.audioFiles;
  const wordUpPartOfSpeech = wordUpRecord.part_of_speech ?? null;
  const partOfSpeechMatches =
    wordUpPartOfSpeech && sourceFields.partsOfSpeech.length > 0
      ? sourceFields.partsOfSpeech.some((pos) => pos.toLowerCase() === wordUpPartOfSpeech.toLowerCase())
      : null;

  const notes = [];
  if (!wordUpAudioUrl && sourceAudioFiles.length > 0) {
    notes.push(`WordUp has no audio for this word; ${sourceName} provides ${sourceAudioFiles.length} audio file(s).`);
  }
  if (wordUpAudioUrl && sourceAudioFiles.length === 0) {
    notes.push(`WordUp has an audio URL on file but ${sourceName} did not return one for this entry.`);
  }
  if (wordUpRecord.pronunciation && sourceFields.pronunciations.length > 0) {
    notes.push(`WordUp pronunciation is a hand-written respelling; ${sourceName} pronunciation uses phonetic notation — formats are not directly comparable.`);
  }
  if (partOfSpeechMatches === false) {
    notes.push(`Part of speech differs: WordUp has "${wordUpPartOfSpeech}", ${sourceName} returned ${JSON.stringify(sourceFields.partsOfSpeech)}.`);
  }
  if (sourceFields.definitions.length > 1) {
    notes.push(`${sourceName} returned ${sourceFields.definitions.length} definitions/senses; WordUp stores exactly one.`);
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
