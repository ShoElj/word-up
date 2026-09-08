export const DIFFICULTY_LEVELS = [
  'beginner',
  'elementary',
  'intermediate',
  'upper_intermediate',
  'advanced',
  'expert',
];

export const WORD_CATEGORIES = [
  'communication',
  'personality',
  'emotions',
  'thinking',
  'work',
  'education',
  'relationships',
  'society',
  'nature',
  'science',
  'technology',
  'culture',
  'travel',
  'health',
  'everyday_life',
  'descriptive',
  'academic',
  'professional',
  'interesting_words',
];

export const WORD_STATUSES = ['draft', 'review', 'approved', 'archived'];

const offensiveTerms = new Set([
  'slur',
  'idiot',
]);

export function normalizeWord(value) {
  return String(value ?? '')
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function displayWordFor(normalizedWord) {
  return normalizedWord
    .split(/([ -])/)
    .map((part) => (part === ' ' || part === '-' ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join('');
}

export function normalizeRecord(input) {
  const normalizedWord = normalizeWord(input.normalized_word ?? input.normalizedWord ?? input.word);
  return {
    word: input.word ? displayWordFor(normalizeWord(input.word)) : displayWordFor(normalizedWord),
    normalized_word: normalizedWord,
    part_of_speech: input.part_of_speech ?? input.partOfSpeech ?? null,
    difficulty_level: input.difficulty_level ?? input.difficultyLevel ?? 'intermediate',
    category: input.category ?? null,
    frequency_score: input.frequency_score ?? input.frequencyScore ?? null,
    usefulness_score: input.usefulness_score ?? input.usefulnessScore ?? null,
    definition: input.definition ?? null,
    example_sentence: input.example_sentence ?? input.exampleSentence ?? null,
    pronunciation: input.pronunciation ?? null,
    pronunciation_audio_url: input.pronunciation_audio_url ?? input.pronunciationAudioUrl ?? null,
    synonyms: Array.isArray(input.synonyms) ? input.synonyms.map(normalizeWord).filter(Boolean) : [],
    antonyms: Array.isArray(input.antonyms) ? input.antonyms.map(normalizeWord).filter(Boolean) : [],
    status: input.status ?? 'review',
  };
}

export function validateWordBankRecord(record, seen = new Set(), options = {}) {
  const errors = [];
  const normalized = normalizeWord(record.normalized_word ?? record.word);
  const originalWord = String(record.word ?? '').trim();

  if (!normalized) errors.push('word-empty');
  if (seen.has(normalized)) errors.push('word-duplicate');
  if (/https?:\/\//i.test(originalWord) || /www\./i.test(originalWord)) errors.push('word-url');
  if (/\d/.test(originalWord)) errors.push('word-number');
  if (!/^[a-z]+([ -][a-z]+)*$/.test(normalized)) errors.push('word-unsupported-characters');
  if (/^[bcdfghjklmnpqrstvwxyz]{5,}$/i.test(normalized.replace(/[ -]/g, ''))) errors.push('word-random-consonants');
  if ((record.proper_noun === true || record.properNoun === true) && record.allow_proper_noun !== true && record.allowProperNoun !== true) {
    errors.push('word-possible-proper-noun');
  }
  if (offensiveTerms.has(normalized) && record.status !== 'approved') errors.push('word-unwanted');
  if (!DIFFICULTY_LEVELS.includes(record.difficulty_level)) errors.push('difficulty-invalid');
  if (record.category && !WORD_CATEGORIES.includes(record.category)) errors.push('category-invalid');
  if (!WORD_STATUSES.includes(record.status)) errors.push('status-invalid');

  for (const field of ['frequency_score', 'usefulness_score']) {
    const value = record[field];
    if (value !== null && value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
      errors.push(`${field}-invalid`);
    }
  }

  if (record.pronunciation_audio_url && !/^https:\/\//.test(record.pronunciation_audio_url)) {
    errors.push('pronunciation-audio-url-invalid');
  }

  if (options.requireLearningContent && record.status === 'approved') {
    for (const field of ['word', 'part_of_speech', 'definition', 'example_sentence', 'pronunciation']) {
      if (typeof record[field] !== 'string' || record[field].trim().length === 0) {
        errors.push(`${field}-missing`);
      }
    }
    for (const field of ['frequency_score', 'usefulness_score']) {
      if (record[field] === null || record[field] === undefined) {
        errors.push(`${field}-missing`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized_word: normalized,
  };
}

export function validateWordBankRecords(records, options = {}) {
  const seen = new Set();
  const accepted = [];
  const rejected = [];

  records.map(normalizeRecord).forEach((record, index) => {
    const result = validateWordBankRecord(record, seen, options);
    if (result.valid) {
      seen.add(result.normalized_word);
      accepted.push(record);
    } else {
      rejected.push({ index, record, errors: result.errors });
    }
  });

  return { accepted, rejected };
}
