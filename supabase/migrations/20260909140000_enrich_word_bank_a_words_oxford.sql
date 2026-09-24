-- =============================================================================
-- Migration: enrich_word_bank_a_words_oxford
-- Purpose:   Add real audio, corrected pronunciation, and real usage examples
--            for 54 curriculum words starting with "a", sourced from the
--            Oxford Dictionaries API (Sandbox plan — the only tier reachable
--            during this content pass).
--
-- Scope and review history:
--   - Data was fetched via scripts/oxford-poc.mjs against 63 approved "a"
--     words (the full set reachable under a Sandbox key, which only serves
--     entries for words starting with "a").
--   - scripts/word-bank-enrichment-proposals.mjs matched each word's Oxford
--     entry to its existing part_of_speech and proposed field-level changes,
--     never touching definitions.
--   - A human reviewer read every proposal. One (anchor) had its example
--     replaced with a manually-written sentence because Oxford's only verb
--     sense is literal/nautical while WordUp's definition is figurative.
--   - 9 of the 63 words were held back entirely and are NOT included here:
--     accurate, active, accurately, adequate, applicable, agile, artistry,
--     anchor (pronunciation lost all syllable breaks in the plain-ASCII
--     conversion — Oxford only marked one stress point for these), and
--     analyze (irregular audio filename + pronunciation, needs a fresh look).
--   - The resulting 54-word diff was applied to and verified against the
--     local data/word-bank-candidates.json before this migration was
--     generated directly from that verified diff (see
--     data/word-bank-enrichment-proposals.json for full per-word detail,
--     including the held-back 9 and the reasoning for each).
--
-- What this does NOT change:
--   - No definitions are touched anywhere in this migration.
--   - No curriculum rows, no daily_words rows, no other word_bank columns
--     (status, category, difficulty_level, synonyms, antonyms, scores).
--   - The 9 held-back words above are absent from this file on purpose.
--
-- Safety:
--   - Every statement targets exactly one word via normalized_word.
--   - Every WHERE clause also requires the CURRENT value to still match the
--     pre-enrichment value this migration was generated from. This makes the
--     migration idempotent (safe to re-run) and safe against clobbering any
--     manual fix already made directly in the live database since this diff
--     was generated — such a row simply won't match and will be skipped.
--   - No audio file has been human-verified by ear. No pronunciation has
--     been read aloud by a human. Automated checks only confirmed: the
--     Oxford entry's part of speech matched WordUp's existing value, and
--     each audio URL returned HTTP 200 with content-type audio/mpeg on a
--     HEAD request at fetch time. Recommend spot-checking a handful before
--     or shortly after running this.
-- =============================================================================

-- ability
UPDATE public.word_bank
SET pronunciation = '/uh-biluhdee/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/ability__us_3.mp3'
WHERE normalized_word = 'ability' AND pronunciation = '/ability/' AND pronunciation_audio_url IS NULL;

-- abrupt
UPDATE public.word_bank
SET pronunciation = '/uh-bruhpt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/abrupt__us_1.mp3'
WHERE normalized_word = 'abrupt' AND pronunciation = '/abrupt/' AND pronunciation_audio_url IS NULL;

-- absorb
UPDATE public.word_bank
SET pronunciation = '/uhb-zawrb/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/absorb__us_2_rr.mp3', example_sentence = 'buildings can be designed to absorb and retain heat'
WHERE normalized_word = 'absorb' AND pronunciation = '/absorb/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word absorb while explaining how to handle the situation.';

-- abstract
UPDATE public.word_bank
SET pronunciation = '/ab-strakt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/abstract__us_4.mp3'
WHERE normalized_word = 'abstract' AND pronunciation = '/abstract/' AND pronunciation_audio_url IS NULL;

-- accelerate
UPDATE public.word_bank
SET pronunciation = '/uhk-seluh-rayt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/accelerate__us_1.mp3', example_sentence = 'the car accelerated toward her'
WHERE normalized_word = 'accelerate' AND pronunciation = '/accelerate/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word accelerate while explaining how to handle the situation.';

-- accessible
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/accessible__us_1.mp3'
WHERE normalized_word = 'accessible' AND pronunciation_audio_url IS NULL;

-- accommodate
UPDATE public.word_bank
SET pronunciation = '/uh-kahmuh-dayt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/accommodate__us_1.mp3', example_sentence = 'the cabins accommodate up to 6 people'
WHERE normalized_word = 'accommodate' AND pronunciation = '/accommodate/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word accommodate while explaining how to handle the situation.';

-- accountable
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/accountable__us_1.mp3'
WHERE normalized_word = 'accountable' AND pronunciation_audio_url IS NULL;

-- accumulate
UPDATE public.word_bank
SET pronunciation = '/uh-kyoomyuh-layt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/accumulate__us_1.mp3', example_sentence = 'investigators have yet to accumulate enough evidence'
WHERE normalized_word = 'accumulate' AND pronunciation = '/accumulate/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word accumulate while explaining how to handle the situation.';

-- acknowledge
UPDATE public.word_bank
SET pronunciation = '/uhk-nahluhj/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/acknowledge__us_1.mp3', example_sentence = 'the plight of the refugees was acknowledged by the authorities'
WHERE normalized_word = 'acknowledge' AND pronunciation = '/acknowledge/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word acknowledge while explaining how to handle the situation.';

-- adapt
UPDATE public.word_bank
SET pronunciation = '/uh-dapt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/adapt__us_1.mp3', example_sentence = 'hospitals have had to be adapted for modern medical practice'
WHERE normalized_word = 'adapt' AND pronunciation = '/adapt/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word adapt while explaining how to handle the situation.';

-- adaptable
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/adaptable__us_1.mp3'
WHERE normalized_word = 'adaptable' AND pronunciation_audio_url IS NULL;

-- adaptation
UPDATE public.word_bank
SET pronunciation = '/adap-tayshuhn/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/adaptation__us_1.mp3'
WHERE normalized_word = 'adaptation' AND pronunciation = '/adaptation/' AND pronunciation_audio_url IS NULL;

-- adjacent
UPDATE public.word_bank
SET pronunciation = '/uh-jaysuhnt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/adjacent__us_1.mp3'
WHERE normalized_word = 'adjacent' AND pronunciation = '/adjacent/' AND pronunciation_audio_url IS NULL;

-- adjust
UPDATE public.word_bank
SET pronunciation = '/uh-juhst/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/adjust__us_1.mp3', example_sentence = 'he smoothed his hair and adjusted his tie'
WHERE normalized_word = 'adjust' AND pronunciation = '/adjust/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word adjust while explaining how to handle the situation.';

-- advancement
UPDATE public.word_bank
SET pronunciation = '/uhd-vantsmuhnt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/advancement__us_2.mp3'
WHERE normalized_word = 'advancement' AND pronunciation = '/advancement/' AND pronunciation_audio_url IS NULL;

-- advantage
UPDATE public.word_bank
SET pronunciation = '/uhd-vantij/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/advantage__us_1.mp3'
WHERE normalized_word = 'advantage' AND pronunciation = '/advantage/' AND pronunciation_audio_url IS NULL;

-- adversity
UPDATE public.word_bank
SET pronunciation = '/ad-vuhrsuhdee/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/adversity__us_2.mp3'
WHERE normalized_word = 'adversity' AND pronunciation = '/adversity/' AND pronunciation_audio_url IS NULL;

-- advice
UPDATE public.word_bank
SET pronunciation = '/uhd-vys/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/advice__us_1.mp3'
WHERE normalized_word = 'advice' AND pronunciation = '/advice/' AND pronunciation_audio_url IS NULL;

-- advise
UPDATE public.word_bank
SET pronunciation = '/uhd-vyz/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/advise__us_1.mp3', example_sentence = 'I advised him to go home'
WHERE normalized_word = 'advise' AND pronunciation = '/advise/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word advise while explaining how to handle the situation.';

-- advocate
UPDATE public.word_bank
SET pronunciation = '/advuh-kayt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/advocate__us_1.mp3', example_sentence = 'they advocated an ethical foreign policy'
WHERE normalized_word = 'advocate' AND pronunciation = '/advocate/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word advocate while explaining how to handle the situation.';

-- aesthetic
UPDATE public.word_bank
SET pronunciation = '/es-thedik/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/aesthetic__us_1_rr.mp3'
WHERE normalized_word = 'aesthetic' AND pronunciation = '/aesthetic/' AND pronunciation_audio_url IS NULL;

-- affection
UPDATE public.word_bank
SET pronunciation = '/uh-fekshuhn/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/affection__us_1.mp3'
WHERE normalized_word = 'affection' AND pronunciation = '/affection/' AND pronunciation_audio_url IS NULL;

-- affirm
UPDATE public.word_bank
SET pronunciation = '/uh-fuhrm/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/affirm__us_1.mp3', example_sentence = 'he affirmed the country''s commitment to peace'
WHERE normalized_word = 'affirm' AND pronunciation = '/affirm/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word affirm while explaining how to handle the situation.';

-- agenda
UPDATE public.word_bank
SET pronunciation = '/uh-jenduh/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/agenda__us_1.mp3'
WHERE normalized_word = 'agenda' AND pronunciation = '/agenda/' AND pronunciation_audio_url IS NULL;

-- alignment
UPDATE public.word_bank
SET pronunciation = '/uh-lynmuhnt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/alignment__us_1.mp3'
WHERE normalized_word = 'alignment' AND pronunciation = '/alignment/' AND pronunciation_audio_url IS NULL;

-- alleviate
UPDATE public.word_bank
SET pronunciation = '/uh-leevee-ayt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/alleviate__us_1.mp3', example_sentence = 'he couldn''t prevent her pain, only alleviate it'
WHERE normalized_word = 'alleviate' AND pronunciation = '/alleviate/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word alleviate while explaining how to handle the situation.';

-- allocate
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/allocate__us_1.mp3'
WHERE normalized_word = 'allocate' AND pronunciation_audio_url IS NULL;

-- alternative
UPDATE public.word_bank
SET pronunciation = '/awl-tuhrnuhdiv/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/alternative__us_2.mp3'
WHERE normalized_word = 'alternative' AND pronunciation = '/alternative/' AND pronunciation_audio_url IS NULL;

-- ambiguous
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/ambiguous__us_2.mp3'
WHERE normalized_word = 'ambiguous' AND pronunciation_audio_url IS NULL;

-- ambition
UPDATE public.word_bank
SET pronunciation = '/am-bishuhn/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/ambition__us_3.mp3'
WHERE normalized_word = 'ambition' AND pronunciation = '/ambition/' AND pronunciation_audio_url IS NULL;

-- amplify
UPDATE public.word_bank
SET pronunciation = '/ampluh-fy/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/amplify__us_1.mp3', example_sentence = 'the accompanying chords have been amplified in our arrangement'
WHERE normalized_word = 'amplify' AND pronunciation = '/amplify/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word amplify while explaining how to handle the situation.';

-- analogy
UPDATE public.word_bank
SET pronunciation = '/uh-naluhjee/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/analogy__us_1.mp3'
WHERE normalized_word = 'analogy' AND pronunciation = '/analogy/' AND pronunciation_audio_url IS NULL;

-- analytical
UPDATE public.word_bank
SET pronunciation = '/anuh-liduhkuhl/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/analytical__us_3.mp3'
WHERE normalized_word = 'analytical' AND pronunciation = '/analytical/' AND pronunciation_audio_url IS NULL;

-- anticipate
UPDATE public.word_bank
SET pronunciation = '/an-tisuh-payt/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/anticipate__us_1.mp3', example_sentence = 'she anticipated scorn on her return to the theater'
WHERE normalized_word = 'anticipate' AND pronunciation = '/anticipate/' AND pronunciation_audio_url IS NULL AND example_sentence = 'They used the word anticipate while explaining how to handle the situation.';

-- anxious
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/anxious__us_1.mp3'
WHERE normalized_word = 'anxious' AND pronunciation_audio_url IS NULL;

-- apply
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/apply__us_1.mp3'
WHERE normalized_word = 'apply' AND pronunciation_audio_url IS NULL;

-- appreciate
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/appreciate__us_1.mp3'
WHERE normalized_word = 'appreciate' AND pronunciation_audio_url IS NULL;

-- appreciation
UPDATE public.word_bank
SET pronunciation = '/uh-preeshee-ayshuhn/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/appreciation__us_1.mp3'
WHERE normalized_word = 'appreciation' AND pronunciation = '/appreciation/' AND pronunciation_audio_url IS NULL;

-- approach
UPDATE public.word_bank
SET pronunciation = '/uh-prohch/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/approach__us_1.mp3'
WHERE normalized_word = 'approach' AND pronunciation = '/approach/' AND pronunciation_audio_url IS NULL;

-- appropriate
UPDATE public.word_bank
SET pronunciation = '/uh-prohpreeuht/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/appropriate__us_1.mp3'
WHERE normalized_word = 'appropriate' AND pronunciation = '/appropriate/' AND pronunciation_audio_url IS NULL;

-- arbitrary
UPDATE public.word_bank
SET pronunciation = '/ahrbuh-treree/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/arbitrary__us_1.mp3'
WHERE normalized_word = 'arbitrary' AND pronunciation = '/arbitrary/' AND pronunciation_audio_url IS NULL;

-- articulate
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/articulate__us_2.mp3'
WHERE normalized_word = 'articulate' AND pronunciation_audio_url IS NULL;

-- aspiration
UPDATE public.word_bank
SET pronunciation = '/aspuh-rayshuhn/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/aspiration__us_1.mp3'
WHERE normalized_word = 'aspiration' AND pronunciation = '/aspiration/' AND pronunciation_audio_url IS NULL;

-- assertive
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/assertive__us_2.mp3'
WHERE normalized_word = 'assertive' AND pronunciation_audio_url IS NULL;

-- assess
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/assess__us_1.mp3'
WHERE normalized_word = 'assess' AND pronunciation_audio_url IS NULL;

-- assumption
UPDATE public.word_bank
SET pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/assumption__us_1.mp3'
WHERE normalized_word = 'assumption' AND pronunciation_audio_url IS NULL;

-- assurance
UPDATE public.word_bank
SET pronunciation = '/uh-shooruhnts/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/assurance__us_1.mp3'
WHERE normalized_word = 'assurance' AND pronunciation = '/assurance/' AND pronunciation_audio_url IS NULL;

-- attentive
UPDATE public.word_bank
SET pronunciation = '/uh-tentiv/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/attentive__us_1.mp3'
WHERE normalized_word = 'attentive' AND pronunciation = '/attentive/' AND pronunciation_audio_url IS NULL;

-- authentic
UPDATE public.word_bank
SET pronunciation = '/aw-thentik/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/authentic__us_1.mp3'
WHERE normalized_word = 'authentic' AND pronunciation = '/authentic/' AND pronunciation_audio_url IS NULL;

-- authenticity
UPDATE public.word_bank
SET pronunciation = '/aw-then-tisuhdee/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/authenticity__us_1.mp3'
WHERE normalized_word = 'authenticity' AND pronunciation = '/authenticity/' AND pronunciation_audio_url IS NULL;

-- autonomy
UPDATE public.word_bank
SET pronunciation = '/aw-tahnuhmee/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/autonomy__us_1.mp3'
WHERE normalized_word = 'autonomy' AND pronunciation = '/autonomy/' AND pronunciation_audio_url IS NULL;

-- availability
UPDATE public.word_bank
SET pronunciation = '/uh-vayluh-biluhdee/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/availability__us_1.mp3'
WHERE normalized_word = 'availability' AND pronunciation = '/availability/' AND pronunciation_audio_url IS NULL;

-- aware
UPDATE public.word_bank
SET pronunciation = '/uh-wer/', pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/aware__us_1.mp3'
WHERE normalized_word = 'aware' AND pronunciation = '/aware/' AND pronunciation_audio_url IS NULL;


-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration.
-- =============================================================================

-- 1. Confirm exactly 54 of the target words now have a non-null audio URL.
SELECT count(*) AS words_with_audio
FROM public.word_bank
WHERE normalized_word IN (
  'ability','abrupt','absorb','abstract','accelerate','accessible','accommodate',
  'accountable','accumulate','acknowledge','adapt','adaptable','adaptation',
  'adjacent','adjust','advancement','advantage','adversity','advice','advise',
  'advocate','aesthetic','affection','affirm','agenda','alignment','alleviate',
  'allocate','alternative','ambiguous','ambition','amplify','analogy',
  'analytical','anticipate','anxious','apply','appreciate','appreciation',
  'approach','appropriate','arbitrary','articulate','aspiration','assertive',
  'assess','assumption','assurance','attentive','authentic','authenticity',
  'autonomy','availability','aware'
)
AND pronunciation_audio_url IS NOT NULL;
-- Expected: 54

-- 2. Confirm none of the 9 intentionally-held-back words were touched.
SELECT normalized_word, pronunciation, pronunciation_audio_url, example_sentence
FROM public.word_bank
WHERE normalized_word IN (
  'accurate','active','accurately','adequate','applicable','agile','artistry','anchor','analyze'
);
-- Expected: pronunciation_audio_url IS NULL for all 9, pronunciation/example_sentence unchanged
-- from their pre-migration values (anchor and analyze still carry the old
-- placeholder example sentence; the other 7 still have /word/-style pronunciation).

-- 3. Spot-check one multi-field update.
SELECT normalized_word, pronunciation, pronunciation_audio_url, example_sentence
FROM public.word_bank
WHERE normalized_word = 'advocate';
-- Expected: pronunciation = '/advuh-kayt/'
--           pronunciation_audio_url = 'https://audio.oxforddictionaries.com/en/mp3/advocate__us_1.mp3'
--           example_sentence = 'they advocated an ethical foreign policy'

-- 4. Confirm no definitions were altered by this migration (compare against
--    data/word-bank-candidates.json's "definition" field for the same words —
--    this migration never sets that column, so this should always pass).
SELECT normalized_word, definition
FROM public.word_bank
WHERE normalized_word IN ('advocate', 'anchor', 'articulate')
ORDER BY normalized_word;
