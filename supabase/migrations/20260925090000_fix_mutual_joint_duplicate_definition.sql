-- =============================================================================
-- Migration: fix_mutual_joint_duplicate_definition
-- Purpose:   "mutual" and "joint" (neither touched by the Oxford A-word
--            enrichment work) shared the exact same generated placeholder
--            definition and templated example sentence:
--              definition:       "Shared by two or more people."
--              example_sentence: "The <word> response made the conversation
--                                  easier to understand."
--            Replaces both with distinct, accurate content for each word.
--
-- What this does NOT change: pronunciation, audio, curriculum rows, or any
-- other word_bank column (status, category, difficulty_level, synonyms,
-- antonyms, scores).
--
-- Safety: identical idempotent pattern to the prior enrichment migrations —
-- every statement targets exactly one word via normalized_word, and every
-- WHERE clause requires the current value to still match the known
-- pre-fix placeholder value, so this is safe to re-run and won't clobber
-- any manual fix already made directly in the database.
-- =============================================================================

-- mutual
UPDATE public.word_bank
SET definition = 'Felt or done in equal measure by two or more people toward each other.',
    example_sentence = 'Their mutual respect made the negotiation go smoothly.'
WHERE normalized_word = 'mutual'
  AND definition = 'Shared by two or more people.'
  AND example_sentence = 'The mutual response made the conversation easier to understand.';

-- joint
UPDATE public.word_bank
SET definition = 'Held, made, or done together by two or more people.',
    example_sentence = 'They opened a joint bank account after getting married.'
WHERE normalized_word = 'joint'
  AND definition = 'Shared by two or more people.'
  AND example_sentence = 'The joint response made the conversation easier to understand.';

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration.
-- =============================================================================

-- 1. Confirm both words now have distinct definitions and examples.
SELECT normalized_word, definition, example_sentence
FROM public.word_bank
WHERE normalized_word IN ('mutual', 'joint')
ORDER BY normalized_word;
-- Expected:
--   joint  | Held, made, or done together by two or more people. | They opened a joint bank account after getting married.
--   mutual | Felt or done in equal measure by two or more people toward each other. | Their mutual respect made the negotiation go smoothly.

-- 2. Confirm no other columns changed (pronunciation/audio untouched).
SELECT normalized_word, pronunciation, pronunciation_audio_url, part_of_speech, status
FROM public.word_bank
WHERE normalized_word IN ('mutual', 'joint')
ORDER BY normalized_word;
-- Expected: pronunciation_audio_url IS NULL for both (unchanged from before this migration).
