-- =============================================================================
-- Migration: enrich_word_bank_remaining_a_words_oxford
-- Purpose:   Apply the 9 A-word Oxford enrichment proposals that were
--            deliberately held back from the first enrichment migration
--            (20260909140000_enrich_word_bank_a_words_oxford.sql) pending a
--            human listen/read check, since automated checks alone weren't
--            enough to trust them:
--              - accurate, active, accurately, adequate, applicable, agile,
--                artistry, anchor: the plain-ASCII pronunciation conversion
--                lost all syllable breaks because Oxford's source respelling
--                only marked a single stress point for these words.
--              - analyze: audio filename ("annalize__us_1.mp3") and the
--                converted respelling both looked irregular.
--              - anchor also had its example sentence manually rewritten
--                (WordUp's definition is figurative; Oxford's only verb
--                sense and example are literal/nautical) in the prior
--                migration's proposal review — unchanged here.
--
-- All 9 audio files and pronunciations were listened to / read aloud on a
-- real device against these exact audio URLs and confirmed correct before
-- this migration was written. See data/word-bank-enrichment-proposals.json
-- for full per-word detail.
--
-- What this does NOT change: no definitions, no curriculum rows, no other
-- word_bank columns (status, category, difficulty_level, synonyms,
-- antonyms, scores).
--
-- Safety: identical pattern to the prior enrichment migration — every
-- statement targets exactly one word via normalized_word, and every WHERE
-- clause requires the current value to still match the pre-enrichment
-- value this migration was generated from, making it idempotent and safe
-- against clobbering any manual fix already made directly in the database.
-- =============================================================================

-- accurate
UPDATE public.word_bank
SET pronunciation = '/akyuhruht/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/accurate__us_1.mp3'
WHERE normalized_word = 'accurate' AND pronunciation = '/accurate/' AND pronunciation_audio_url IS NULL;

-- accurately
UPDATE public.word_bank
SET pronunciation = '/akyuhruhtlee/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/accurately__us_1.mp3'
WHERE normalized_word = 'accurately' AND pronunciation = '/accurately/' AND pronunciation_audio_url IS NULL;

-- active
UPDATE public.word_bank
SET pronunciation = '/aktiv/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/active__us_1.mp3'
WHERE normalized_word = 'active' AND pronunciation = '/active/' AND pronunciation_audio_url IS NULL;

-- adequate
UPDATE public.word_bank
SET pronunciation = '/aduhkwuht/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/adequate__us_1.mp3'
WHERE normalized_word = 'adequate' AND pronunciation = '/adequate/' AND pronunciation_audio_url IS NULL;

-- agile
UPDATE public.word_bank
SET pronunciation = '/ajuhl/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/agile__us_1.mp3'
WHERE normalized_word = 'agile' AND pronunciation = '/agile/' AND pronunciation_audio_url IS NULL;

-- analyze
UPDATE public.word_bank
SET pronunciation = '/anl-yz/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/annalize__us_1.mp3', example_sentence = 'we need to analyze our results more clearly'
WHERE normalized_word = 'analyze' AND pronunciation = '/analyze/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word analyze while explaining how to handle the situation.';

-- anchor
UPDATE public.word_bank
SET pronunciation = '/angkuhr/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/anker__us_1.mp3', example_sentence = 'The company''s mission statement anchors every decision the team makes.'
WHERE normalized_word = 'anchor' AND pronunciation = '/anchor/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word anchor while explaining how to handle the situation.';

-- applicable
UPDATE public.word_bank
SET pronunciation = '/apluhkuhbuhl/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/applicable__us_2_rr.mp3'
WHERE normalized_word = 'applicable' AND pronunciation = '/applicable/' AND pronunciation_audio_url IS NULL;

-- artistry
UPDATE public.word_bank
SET pronunciation = '/ahrduhstree/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/artistry__us_2.mp3'
WHERE normalized_word = 'artistry' AND pronunciation = '/artistry/' AND pronunciation_audio_url IS NULL;

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration.
-- =============================================================================

-- 1. Confirm all 9 words now have a non-null audio URL.
SELECT count(*) AS words_with_audio
FROM public.word_bank
WHERE normalized_word IN (
  'accurate','active','accurately','analyze','adequate','applicable','agile','anchor','artistry'
)
AND pronunciation_audio_url IS NOT NULL;
-- Expected: 9

-- 2. Spot-check anchor (the one with a manually-overridden example).
SELECT normalized_word, pronunciation, pronunciation_audio_url, example_sentence, definition
FROM public.word_bank
WHERE normalized_word = 'anchor';
-- Expected: pronunciation = '/angkuhr/'
--           pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/anker__us_1.mp3'
--           example_sentence = 'The company''s mission statement anchors every decision the team makes.'
--           definition unchanged: 'To hold an idea or plan steady.'

-- 3. Confirm no definitions were altered by this migration.
SELECT normalized_word, definition
FROM public.word_bank
WHERE normalized_word IN (
  'accurate','active','accurately','analyze','adequate','applicable','agile','anchor','artistry'
)
ORDER BY normalized_word;
