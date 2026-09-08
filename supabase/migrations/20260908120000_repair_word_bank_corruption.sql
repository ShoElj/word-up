-- =============================================================================
-- Migration: repair_word_bank_corruption
-- Purpose:   Remove confirmed newline/control-character corruption from 8 live
--            database records introduced during the original data import.
--            The local JSON source is clean. Only the live DB is affected.
--
-- Tables affected:
--   public.word_bank          (5 records)
--   public.wordup_curriculum  (3 records, identified via word_bank join)
--
-- Safety:
--   - Every UPDATE targets a single record via normalized_word or day_number.
--   - No broad updates without WHERE clauses.
--   - All statements are idempotent: re-running produces the same result.
--   - regexp_replace with E'\n' strips newlines regardless of surrounding text,
--     so re-running on an already-clean value is a no-op in effect.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. STRATEGIC (day 167)
--    Table:  public.word_bank
--    Field:  pronunciation
--    Stored: '/strate\ngic/'
--    Clean:  '/strate-jik/'
--    Note:   The newline split the word mid-syllable. The intended phonetic
--            guide is /strate-jik/ (standard respelling for "strategic").
-- ---------------------------------------------------------------------------
UPDATE public.word_bank
SET    pronunciation = '/strate-jik/'
WHERE  normalized_word = 'strategic'
  AND  pronunciation LIKE '%' || E'\n' || '%';


-- ---------------------------------------------------------------------------
-- 2. DIFFERENTIATE (day 198)
--    Table:  public.word_bank
--    Field:  example_sentence
--    Stored: 'diff\nerentiate...' (newline splits the word)
--    Clean:  'They used the word differentiate while explaining how to handle
--             the situation.'
--    Note:   The newline corrupted the opening word of the sentence. The
--            clean value matches the template used for this word in the source.
-- ---------------------------------------------------------------------------
UPDATE public.word_bank
SET    example_sentence = 'They used the word differentiate while explaining how to handle the situation.'
WHERE  normalized_word = 'differentiate'
  AND  example_sentence LIKE '%' || E'\n' || '%';


-- ---------------------------------------------------------------------------
-- 3. ENCOURAGE (day 103)
--    Table:  public.word_bank
--    Field:  example_sentence
--    Stored: '\nThey used the word encourage...' (leading newline)
--    Clean:  'They used the word encourage while explaining how to handle
--             the situation.'
--    Note:   A leading newline was prepended during import. Strip it.
-- ---------------------------------------------------------------------------
UPDATE public.word_bank
SET    example_sentence = regexp_replace(example_sentence, E'^\\n+', '')
WHERE  normalized_word = 'encourage'
  AND  example_sentence LIKE E'\n%';


-- ---------------------------------------------------------------------------
-- 4. CONSENSUS (day 229)
--    Table:  public.word_bank
--    Field:  pronunciation
--    Stored: '/consensus/\n' (trailing newline)
--    Clean:  '/consensus/'
--    Note:   A trailing newline was appended during import. Strip it.
-- ---------------------------------------------------------------------------
UPDATE public.word_bank
SET    pronunciation = regexp_replace(pronunciation, E'\\n+$', '')
WHERE  normalized_word = 'consensus'
  AND  pronunciation LIKE '%' || E'\n';


-- ---------------------------------------------------------------------------
-- 5. SCENARIO (day 320)
--    Table:  public.word_bank
--    Field:  pronunciation_audio_url
--    Stored: '\nio' (garbage string — should be NULL)
--    Clean:  NULL
--    Note:   The audio URL field received a corrupt value during import.
--            The correct state is NULL (no audio URL exists for this word).
-- ---------------------------------------------------------------------------
UPDATE public.word_bank
SET    pronunciation_audio_url = NULL
WHERE  normalized_word = 'scenario'
  AND  pronunciation_audio_url LIKE '%' || E'\n' || '%';


-- ---------------------------------------------------------------------------
-- 6. GENERATE (day 290)
--    Table:  public.wordup_curriculum
--    Field:  theme
--    Stored: 'sci\nce_and_technology'  (newline splits 'science')
--    Clean:  'science_and_technology'
--    Note:   Identified via day_number = 290 (the stable integer key).
--            The wordup_curriculum_theme_check constraint accepts
--            'science_and_technology' as a valid value.
-- ---------------------------------------------------------------------------
UPDATE public.wordup_curriculum
SET    theme = 'science_and_technology'
WHERE  day_number = 290
  AND  theme LIKE '%' || E'\n' || '%';


-- ---------------------------------------------------------------------------
-- 7. CONCEAL (day 260)
--    Table:  public.wordup_curriculum
--    Field:  theme  (most likely — day_number is an integer and cannot store \n)
--    Stored: corrupt text containing a newline in the theme field
--    Clean:  'nuance_and_precision'  (from canonical curriculum JSON source)
--    Note:   The Phase 8A audit identified this record as having a newline
--            in what was labelled the "day field". Since day_number is an
--            integer column, the corruption must reside in a text field on
--            this curriculum row. The theme value 'nuance_and_precision' is
--            confirmed from the local wordup-curriculum-365.json source.
--            This UPDATE targets day_number = 260 and fires only if theme
--            contains a newline, making it safe to re-run.
-- ---------------------------------------------------------------------------
UPDATE public.wordup_curriculum
SET    theme = 'nuance_and_precision'
WHERE  day_number = 260
  AND  theme LIKE '%' || E'\n' || '%';


-- ---------------------------------------------------------------------------
-- 8. INTUITIVE (day 351)
--    Table:  public.wordup_curriculum
--    Field:  theme
--    Stored: 'them\ne'  (newline splits the stored value — not a valid theme)
--    Clean:  'professional_language'  (from canonical curriculum JSON source)
--    Note:   'them\ne' with the newline removed yields 'theme', which is not
--            a valid wordup_curriculum theme value. The intended value is
--            'professional_language' as confirmed in wordup-curriculum-365.json.
--            A simple regexp_replace would produce 'theme' (invalid), so we
--            must set the correct value explicitly.
-- ---------------------------------------------------------------------------
UPDATE public.wordup_curriculum
SET    theme = 'professional_language'
WHERE  day_number = 351
  AND  theme LIKE '%' || E'\n' || '%';


-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to confirm all repairs succeeded.
-- =============================================================================

-- 1. Confirm strategic pronunciation is clean
SELECT
  normalized_word,
  pronunciation,
  CASE WHEN pronunciation NOT LIKE '%' || E'\n' || '%' THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.word_bank
WHERE normalized_word = 'strategic';

-- 2. Confirm differentiate example_sentence is clean
SELECT
  normalized_word,
  example_sentence,
  CASE WHEN example_sentence NOT LIKE '%' || E'\n' || '%' THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.word_bank
WHERE normalized_word = 'differentiate';

-- 3. Confirm encourage example_sentence is clean
SELECT
  normalized_word,
  example_sentence,
  CASE WHEN example_sentence NOT LIKE E'\n%' AND example_sentence NOT LIKE '%' || E'\n' || '%' THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.word_bank
WHERE normalized_word = 'encourage';

-- 4. Confirm consensus pronunciation is clean
SELECT
  normalized_word,
  pronunciation,
  CASE WHEN pronunciation NOT LIKE '%' || E'\n' THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.word_bank
WHERE normalized_word = 'consensus';

-- 5. Confirm scenario audio URL is clean (NULL)
SELECT
  normalized_word,
  pronunciation_audio_url,
  CASE WHEN pronunciation_audio_url IS NULL THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.word_bank
WHERE normalized_word = 'scenario';

-- 6. Confirm generate theme is clean
SELECT
  wc.day_number,
  wb.normalized_word,
  wc.theme,
  CASE WHEN wc.theme NOT LIKE '%' || E'\n' || '%' THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.wordup_curriculum wc
JOIN public.word_bank wb ON wb.id = wc.word_id
WHERE wc.day_number = 290;

-- 7. Confirm conceal theme is clean
SELECT
  wc.day_number,
  wb.normalized_word,
  wc.theme,
  CASE WHEN wc.theme NOT LIKE '%' || E'\n' || '%' THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.wordup_curriculum wc
JOIN public.word_bank wb ON wb.id = wc.word_id
WHERE wc.day_number = 260;

-- 8. Confirm intuitive theme is clean
SELECT
  wc.day_number,
  wb.normalized_word,
  wc.theme,
  CASE WHEN wc.theme NOT LIKE '%' || E'\n' || '%' THEN 'CLEAN' ELSE 'STILL CORRUPT' END AS status
FROM public.wordup_curriculum wc
JOIN public.word_bank wb ON wb.id = wc.word_id
WHERE wc.day_number = 351;

-- 9. Full sweep: any remaining newline corruption in word_bank text fields
SELECT
  normalized_word,
  CASE WHEN pronunciation            LIKE '%' || E'\n' || '%' THEN 'pronunciation '            ELSE '' END ||
  CASE WHEN example_sentence         LIKE '%' || E'\n' || '%' THEN 'example_sentence '         ELSE '' END ||
  CASE WHEN definition               LIKE '%' || E'\n' || '%' THEN 'definition '               ELSE '' END ||
  CASE WHEN pronunciation_audio_url  LIKE '%' || E'\n' || '%' THEN 'pronunciation_audio_url '  ELSE '' END ||
  CASE WHEN word                     LIKE '%' || E'\n' || '%' THEN 'word '                     ELSE '' END ||
  CASE WHEN category                 LIKE '%' || E'\n' || '%' THEN 'category '                 ELSE '' END
  AS corrupt_fields
FROM public.word_bank
WHERE
     pronunciation           LIKE '%' || E'\n' || '%'
  OR example_sentence        LIKE '%' || E'\n' || '%'
  OR definition              LIKE '%' || E'\n' || '%'
  OR pronunciation_audio_url LIKE '%' || E'\n' || '%'
  OR word                    LIKE '%' || E'\n' || '%'
  OR category                LIKE '%' || E'\n' || '%'
ORDER BY normalized_word;

-- 10. Full sweep: any remaining newline corruption in wordup_curriculum text fields
SELECT
  wc.day_number,
  wb.normalized_word,
  CASE WHEN wc.theme        LIKE '%' || E'\n' || '%' THEN 'theme '        ELSE '' END ||
  CASE WHEN wc.lesson_type  LIKE '%' || E'\n' || '%' THEN 'lesson_type '  ELSE '' END ||
  CASE WHEN wc.status       LIKE '%' || E'\n' || '%' THEN 'status '       ELSE '' END ||
  CASE WHEN wc.difficulty_level LIKE '%' || E'\n' || '%' THEN 'difficulty_level ' ELSE '' END
  AS corrupt_fields
FROM public.wordup_curriculum wc
JOIN public.word_bank wb ON wb.id = wc.word_id
WHERE
     wc.theme            LIKE '%' || E'\n' || '%'
  OR wc.lesson_type      LIKE '%' || E'\n' || '%'
  OR wc.status           LIKE '%' || E'\n' || '%'
  OR wc.difficulty_level LIKE '%' || E'\n' || '%'
ORDER BY wc.day_number;
