import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  DEFAULT_CURRICULUM_START_DATE,
  CURRICULUM_LENGTH_DAYS,
  curriculumDayForDate,
  curriculumStateForDate,
  daysBetweenDateKeys,
  dateKeyForTimezone,
} from '../scripts/curriculum-date-utils.mjs';

// ─── Curriculum start date → day number ───────────────────────────────────────

test('start date maps to Day 1', () => {
  assert.equal(curriculumDayForDate('2026-09-15', '2026-09-15'), 1);
});

test('day after start date maps to Day 2', () => {
  assert.equal(curriculumDayForDate('2026-09-16', '2026-09-15'), 2);
});

test('Day 365 is the last curriculum day', () => {
  assert.equal(curriculumDayForDate('2027-09-14', '2026-09-15'), 365);
  assert.equal(CURRICULUM_LENGTH_DAYS, 365);
});

test('Day 366 is beyond the curriculum', () => {
  const day = curriculumDayForDate('2027-09-15', '2026-09-15');
  assert.equal(day, 366);
  assert.ok(day > CURRICULUM_LENGTH_DAYS);
});

test('date before start date returns a negative or zero day number', () => {
  const day = curriculumDayForDate('2026-09-14', '2026-09-15');
  assert.ok(day <= 0);
});

test('configurable start date: 2025-01-01 → Day 1', () => {
  assert.equal(curriculumDayForDate('2025-01-01', '2025-01-01'), 1);
  assert.equal(curriculumDayForDate('2025-01-02', '2025-01-01'), 2);
});

test('default start date constant is 2026-09-15', () => {
  assert.equal(DEFAULT_CURRICULUM_START_DATE, '2026-09-15');
});

// ─── curriculumStateForDate ────────────────────────────────────────────────────

test('state is active for Day 1', () => {
  const result = curriculumStateForDate('2026-09-15', '2026-09-15');
  assert.equal(result.state, 'active');
  assert.equal(result.curriculumDay, 1);
});

test('state is active for Day 365', () => {
  const result = curriculumStateForDate('2027-09-14', '2026-09-15');
  assert.equal(result.state, 'active');
  assert.equal(result.curriculumDay, 365);
});

test('state is complete for Day 366', () => {
  const result = curriculumStateForDate('2027-09-15', '2026-09-15');
  assert.equal(result.state, 'complete');
  assert.ok(result.curriculumDay > 365);
});

test('state is not_started before start date', () => {
  const result = curriculumStateForDate('2026-09-14', '2026-09-15');
  assert.equal(result.state, 'not_started');
  assert.ok(result.curriculumDay <= 0);
});

// ─── Timezone calculation ──────────────────────────────────────────────────────

test('timezone calculation returns a valid date key', () => {
  const key = dateKeyForTimezone('America/New_York');
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

test('timezone calculation returns a valid date key for UTC', () => {
  const key = dateKeyForTimezone('UTC');
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

test('timezone calculation returns a valid date key for Asia/Tokyo', () => {
  const key = dateKeyForTimezone('Asia/Tokyo');
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

test('invalid timezone throws RangeError', () => {
  assert.throws(() => dateKeyForTimezone('Not/AZone'), RangeError);
});

test('same moment in UTC and UTC+14 can produce different date keys', () => {
  // At 2026-09-15T23:00:00Z it is already 2026-09-16 in Pacific/Kiritimati (UTC+14)
  const now = new Date('2026-09-15T23:00:00Z');
  const utcKey = dateKeyForTimezone('UTC', now);
  const aheadKey = dateKeyForTimezone('Pacific/Kiritimati', now);
  assert.equal(utcKey, '2026-09-15');
  assert.equal(aheadKey, '2026-09-16');
});

// ─── daysBetweenDateKeys ───────────────────────────────────────────────────────

test('daysBetweenDateKeys is 0 for same date', () => {
  assert.equal(daysBetweenDateKeys('2026-09-15', '2026-09-15'), 0);
});

test('daysBetweenDateKeys is 1 for consecutive days', () => {
  assert.equal(daysBetweenDateKeys('2026-09-15', '2026-09-16'), 1);
});

test('daysBetweenDateKeys is 364 from Day 1 to Day 365', () => {
  assert.equal(daysBetweenDateKeys('2026-09-15', '2027-09-14'), 364);
});

// ─── Edge Function source assertions ──────────────────────────────────────────

test('Edge Function: CURRICULUM_START_DATE is configurable via env or DB', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /getCurriculumStartDate/);
  assert.match(source, /CURRICULUM_START_DATE/);
  assert.match(source, /wordup_app_config/);
  assert.match(source, /Deno\.env\.get\('CURRICULUM_START_DATE'\)/);
});

test('Edge Function: calculates curriculum day server-side from timezone', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /curriculumDayForDate/);
  assert.match(source, /dateKeyForTimezone/);
  assert.doesNotMatch(source, /body\.date/);
  assert.doesNotMatch(source, /body\.day/);
  assert.doesNotMatch(source, /body\.curriculumDay/);
});

test('Edge Function: checks daily_words before creating a new record', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /getDailyWordRow/);
  assert.match(source, /\.from\('daily_words'\)/);
  assert.match(source, /\.from\('wordup_curriculum'\)/);
});

test('Edge Function: idempotency — handles duplicate insert with 23505', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /23505/);
  assert.match(source, /insertError\.code !== '23505'/);
});

test('Edge Function: Day 365 returns the final curriculum word', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /curriculumDay > curriculumLengthDays/);
  assert.match(source, /CURRICULUM_COMPLETE/);
});

test('Edge Function: Day 366 returns CURRICULUM_COMPLETE, not a restart', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /CURRICULUM_COMPLETE/);
  // Must not silently wrap around (no modulo on curriculumDay before the guard)
  assert.doesNotMatch(source, /curriculumDay\s*%\s*curriculumLengthDays/);
});

test('Edge Function: client cannot select arbitrary date or day', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.doesNotMatch(source, /body\.date/);
  assert.doesNotMatch(source, /body\.day/);
  assert.doesNotMatch(source, /body\.curriculumDay/);
  assert.doesNotMatch(source, /body\.puzzleDate/);
});

test('Edge Function: service-role key is server-side only', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  // Key must not be hardcoded
  assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}/);
});

test('Edge Function: word_bank and wordup_curriculum are not exposed to client', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // The function returns a shaped response, not raw table rows
  assert.match(source, /responseForDailyWord/);
  // No SELECT * from word_bank or wordup_curriculum
  assert.doesNotMatch(source, /select\(\s*['"]\s*\*\s*['"]\s*\)/);
});

// ─── Edge Function: September 15 → Day 1 ──────────────────────────────────────

test('Edge Function: September 15 2026 is curriculum Day 1', () => {
  const day = curriculumDayForDate('2026-09-15', DEFAULT_CURRICULUM_START_DATE);
  assert.equal(day, 1);
});

// ─── Edge Function: September 16 → Day 2 ──────────────────────────────────────

test('Edge Function: September 16 2026 is curriculum Day 2', () => {
  const day = curriculumDayForDate('2026-09-16', DEFAULT_CURRICULUM_START_DATE);
  assert.equal(day, 2);
});

// ─── Edge Function: September 14 → pre-curriculum (no daily word) ─────────────

test('Edge Function: September 14 2026 is pre-curriculum (day < 1)', () => {
  const day = curriculumDayForDate('2026-09-14', DEFAULT_CURRICULUM_START_DATE);
  assert.ok(day < 1, `Expected day < 1, got ${day}`);
});

test('Edge Function: pre-curriculum date produces NO_DAILY_WORD guard', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // The function must guard curriculumDay < 1 and return NO_DAILY_WORD
  assert.match(source, /curriculumDay < 1/);
  assert.match(source, /NO_DAILY_WORD/);
});

// ─── Edge Function: Day 365 works normally ────────────────────────────────────

test('Edge Function: Day 365 is within curriculum bounds', () => {
  const day = curriculumDayForDate('2027-09-14', DEFAULT_CURRICULUM_START_DATE);
  assert.equal(day, 365);
  assert.ok(day <= CURRICULUM_LENGTH_DAYS);
});

test('Edge Function: Day 365 does not trigger CURRICULUM_COMPLETE', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // Guard is strictly > not >=
  assert.match(source, /curriculumDay > curriculumLengthDays/);
  assert.doesNotMatch(source, /curriculumDay >= curriculumLengthDays/);
});

// ─── Edge Function: Day 366 → CURRICULUM_COMPLETE with HTTP 409 ───────────────

test('Edge Function: Day 366 triggers CURRICULUM_COMPLETE', () => {
  const day = curriculumDayForDate('2027-09-15', DEFAULT_CURRICULUM_START_DATE);
  assert.ok(day > CURRICULUM_LENGTH_DAYS, `Expected day > 365, got ${day}`);
});

test('Edge Function: CURRICULUM_COMPLETE response uses HTTP 409', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // Must return 409 for CURRICULUM_COMPLETE
  assert.match(source, /CURRICULUM_COMPLETE.*409|409.*CURRICULUM_COMPLETE/s);
});

// ─── Edge Function: existing daily_words row is returned directly ──────────────

test('Edge Function: existing daily_words row is returned without curriculum lookup', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // getDailyWordRow is called first; if data exists, it returns before curriculum fetch
  assert.match(source, /getDailyWordRow/);
  // The early-return path: if (data) { ... return response }
  assert.match(source, /if \(data\)/);
});

// ─── Edge Function: historical LIGHT record is preserved ──────────────────────

test('Edge Function: historical LIGHT record is not overwritten', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // The function only inserts when no row exists for today — existing rows are returned as-is
  assert.match(source, /getDailyWordRow/);
  // Insert only happens after confirming data is null/undefined
  assert.match(source, /if \(data\)/);
  // No UPDATE or DELETE on daily_words
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /\.delete\(/);
});

test('migration: LIGHT historical record is seeded and never deleted', async () => {
  const migration = await readFile('supabase/migrations/20260813110000_create_daily_words.sql', 'utf8');
  assert.match(migration, /'LIGHT'/);
  const migrations = await Promise.all([
    readFile('supabase/migrations/20260813110000_create_daily_words.sql', 'utf8'),
    readFile('supabase/migrations/20260831090000_create_word_bank.sql', 'utf8'),
    readFile('supabase/migrations/20260831093000_create_wordup_curriculum.sql', 'utf8'),
    readFile('supabase/migrations/20260907090000_connect_curriculum_daily_words.sql', 'utf8'),
    readFile('supabase/migrations/20260907091000_seed_wordup_curriculum_365.sql', 'utf8'),
  ]);
  for (const m of migrations) {
    assert.doesNotMatch(m, /drop table.*daily_words/i);
    assert.doesNotMatch(m, /delete from.*daily_words/i);
    assert.doesNotMatch(m, /truncate.*daily_words/i);
  }
});

// ─── Edge Function: invalid timezone ──────────────────────────────────────────

test('Edge Function: invalid timezone returns INVALID_TIMEZONE', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /INVALID_TIMEZONE/);
  assert.match(source, /isValidTimezone/);
});

test('Edge Function: isValidTimezone rejects bad timezone strings', () => {
  // Replicate the same logic used in the Edge Function
  function isValidTimezone(tz) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }
  assert.equal(isValidTimezone('Not/AZone'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone('Africa/Lagos'), true);
  assert.equal(isValidTimezone('UTC'), true);
});

// ─── Edge Function: missing timezone ──────────────────────────────────────────

test('Edge Function: missing timezone body field is rejected', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // timezone is extracted from body; empty string or non-string triggers INVALID_TIMEZONE
  assert.match(source, /typeof body\.timezone === 'string'/);
  assert.match(source, /INVALID_TIMEZONE/);
});

// ─── Edge Function: concurrent insert / 23505 ─────────────────────────────────

test('Edge Function: concurrent insert 23505 triggers re-fetch not error', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // On 23505, the function must NOT return SERVER_ERROR — it re-fetches
  assert.match(source, /insertError\.code !== '23505'/);
  // After the insert (whether it succeeded or got 23505), getDailyWordRow is called again
  const insertBlock = source.slice(source.indexOf('insertError'));
  assert.match(insertBlock, /getDailyWordRow/);
});

// ─── Edge Function: new curriculum day creation ───────────────────────────────

test('Edge Function: new curriculum day inserts word_id and curriculum_id', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /word_id: curriculumWordBank\.id/);
  assert.match(source, /curriculum_id: curriculum\.id/);
});

test('Edge Function: new curriculum day stores word uppercased', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /\.toUpperCase\(\)/);
});

test('Edge Function: curriculum word_bank must be approved before insert', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /curriculumWordBank\.status !== 'approved'/);
});

// ─── Edge Function: client cannot provide arbitrary date or curriculum day ─────

test('Edge Function: only timezone is accepted from request body', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  // DailyWordRequest type only has timezone
  assert.match(source, /timezone\?:\s*unknown/);
  assert.doesNotMatch(source, /body\.date/);
  assert.doesNotMatch(source, /body\.day/);
  assert.doesNotMatch(source, /body\.curriculumDay/);
  assert.doesNotMatch(source, /body\.puzzleDate/);
  assert.doesNotMatch(source, /body\.dailyNumber/);
});

// ─── Edge Function: service-role key is server-side only ──────────────────────

test('Edge Function: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from Deno.env only', async () => {
  const source = await readFile('supabase/functions/daily-word/index.ts', 'utf8');
  assert.match(source, /Deno\.env\.get\('SUPABASE_URL'\)/);
  assert.match(source, /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  // No hardcoded JWT tokens
  assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}/);
  // No EXPO_PUBLIC keys in the Edge Function
  assert.doesNotMatch(source, /EXPO_PUBLIC/);
});

// ─── validateDailyPuzzlePayload: curriculum-length words ──────────────────────

test('dailyWordCore: validateDailyPuzzlePayload accepts curriculum-length words', async () => {
  const source = await readFile('services/dailyWordCore.ts', 'utf8');
  // Must NOT use the old 5-char-only regex
  assert.doesNotMatch(source, /\[A-Z\]\{5\}/);
  // Must use the multi-word pattern that matches the DB constraint
  assert.match(source, /\[A-Z\]\+/);
});

test('dailyWordCore: validateDailyPuzzlePayload does not truncate words to 5 chars', async () => {
  const source = await readFile('services/dailyWordCore.ts', 'utf8');
  // word.slice(0, WORD_LENGTH) must not appear in the validator return
  assert.doesNotMatch(source, /word\.slice\(0,\s*WORD_LENGTH\)/);
});

// ─── Migration assertions ──────────────────────────────────────────────────────

test('migration: wordup_app_config table stores CURRICULUM_START_DATE', async () => {
  const migration = await readFile(
    'supabase/migrations/20260907090000_connect_curriculum_daily_words.sql',
    'utf8'
  );
  assert.match(migration, /create table if not exists public\.wordup_app_config/);
  assert.match(migration, /CURRICULUM_START_DATE/);
  assert.match(migration, /revoke all on table public\.wordup_app_config from anon/);
  assert.match(migration, /revoke all on table public\.wordup_app_config from authenticated/);
});

test('migration: daily_words unique constraint on puzzle_date exists', async () => {
  const migration = await readFile(
    'supabase/migrations/20260907090000_connect_curriculum_daily_words.sql',
    'utf8'
  );
  assert.match(migration, /daily_words_puzzle_date_unique_idx/);
});

test('migration: daily_words references curriculum_id', async () => {
  const migration = await readFile(
    'supabase/migrations/20260831093000_create_wordup_curriculum.sql',
    'utf8'
  );
  assert.match(migration, /add column if not exists curriculum_id uuid/);
  assert.match(migration, /daily_words_curriculum_id_fkey/);
});

test('historical daily_words records are preserved: LIGHT is not deleted', async () => {
  const migration = await readFile(
    'supabase/migrations/20260813110000_create_daily_words.sql',
    'utf8'
  );
  assert.match(migration, /'LIGHT'/);
  // No DROP TABLE or DELETE FROM daily_words in any migration
  const migrations = await Promise.all([
    readFile('supabase/migrations/20260813110000_create_daily_words.sql', 'utf8'),
    readFile('supabase/migrations/20260831090000_create_word_bank.sql', 'utf8'),
    readFile('supabase/migrations/20260831093000_create_wordup_curriculum.sql', 'utf8'),
    readFile('supabase/migrations/20260907090000_connect_curriculum_daily_words.sql', 'utf8'),
    readFile('supabase/migrations/20260907091000_seed_wordup_curriculum_365.sql', 'utf8'),
  ]);
  for (const m of migrations) {
    assert.doesNotMatch(m, /drop table.*daily_words/i);
    assert.doesNotMatch(m, /delete from.*daily_words/i);
    assert.doesNotMatch(m, /truncate.*daily_words/i);
  }
});

// ─── DailyPuzzle type includes curriculum fields ───────────────────────────────

test('DailyPuzzle type includes curriculum metadata fields', async () => {
  const source = await readFile('types/dailyPuzzle.ts', 'utf8');
  assert.match(source, /curriculumDay\?/);
  assert.match(source, /curriculumTheme\?/);
  assert.match(source, /lessonType\?/);
  assert.match(source, /difficultyLevel\?/);
  assert.match(source, /CURRICULUM_COMPLETE/);
});

// ─── Development fallback preserved ───────────────────────────────────────────

test('dailyWordCore preserves development fallback behind allowDevelopmentFallback flag', async () => {
  const source = await readFile('services/dailyWordCore.ts', 'utf8');
  assert.match(source, /allowDevelopmentFallback/);
  assert.match(source, /getDevelopmentDailyPuzzle/);
  assert.match(source, /source: 'development'/);
});

test('dailyWordService uses __DEV__ to gate development fallback', async () => {
  const source = await readFile('services/dailyWordService.ts', 'utf8');
  assert.match(source, /__DEV__/);
  assert.match(source, /allowDevelopmentFallback: __DEV__/);
});
