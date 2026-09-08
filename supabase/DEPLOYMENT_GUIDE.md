# WordUp Production Deployment Guide

**Target**: Supabase Dashboard → SQL Editor  
**Production state at time of writing**: `public.daily_words` only, 30 rows (2026-08-13 through 2026-09-11, daily_numbers 44–73). No other tables, enums, functions, or indexes beyond what was created with that table.  
**CLI status**: Supabase CLI cannot run on macOS 11.7.11 (`libicucore` / `dyld` incompatibility). All migrations must be executed manually.

---

## Pre-Deployment Checklist

- [ ] You are logged into the correct Supabase project (production)
- [ ] You are in **SQL Editor** (not Table Editor)
- [ ] You have confirmed `public.daily_words` exists with 30 rows
- [ ] You will execute migrations in the exact order listed below
- [ ] You will run the verification query after each migration before proceeding

---

## Critical Operational Note: Migration Tracking

Manual execution through the SQL Editor does **not** write records to `supabase_migrations.schema_migrations`. If the Supabase CLI is ever used in the future (on a compatible machine), it will not know these migrations have already run and will attempt to re-execute them.

Before any future CLI use, you must manually insert the five migration filenames into that table. That step is **not** part of this guide and must be handled separately at that time.

---

## Migration Execution Order

| # | Filename | Must run after |
|---|----------|---------------|
| 1 | `20260813110000_create_daily_words.sql` | — |
| 2 | `20260831090000_create_word_bank.sql` | Migration 1 |
| 3 | `20260831093000_create_wordup_curriculum.sql` | Migration 2 |
| 4 | `20260907090000_connect_curriculum_daily_words.sql` | Migration 3 |
| 5 | `20260907091000_seed_wordup_curriculum_365.sql` | Migration 4 |

Do not skip steps. Do not reverse order. Each migration has FK or data dependencies on the one before it.

---

## Migration 1 — `20260813110000_create_daily_words.sql`

### What it does
- Enables the `pgcrypto` extension (idempotent)
- Creates `public.daily_words` with `IF NOT EXISTS` — skips silently if the table already exists in production
- Creates three indexes with `IF NOT EXISTS`
- Creates or replaces the `set_daily_words_updated_at` trigger function (uppercases `word`, sets `updated_at`)
- Drops and recreates the `daily_words_set_updated_at` trigger
- Enables RLS and revokes all access from `anon` and `authenticated`
- Upserts 30 historical records (2026-08-13 GRACE through 2026-09-11 QUIET, daily_numbers 44–73) using `ON CONFLICT (puzzle_date) DO UPDATE`

### Effect on existing production data
The 30 existing rows are preserved. The upsert writes identical values back to each row — only `updated_at` is refreshed by the trigger. No data is lost or changed.

### Can it be pasted directly into SQL Editor?
**Yes.** Paste the entire file contents as a single block and click Run.

### Is it safe to execute as one transaction?
**Yes.** All DDL and DML is idempotent. No destructive operations.

### Paste this SQL

```sql
create extension if not exists pgcrypto;

create table if not exists public.daily_words (
  id uuid primary key default gen_random_uuid(),
  puzzle_date date not null unique,
  daily_number integer not null unique,
  word text not null,
  definition text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_words_word_format check (word ~ '^[A-Z]{5}$'),
  constraint daily_words_status_check check (status in ('draft', 'scheduled', 'published', 'disabled'))
);

create index if not exists daily_words_puzzle_date_idx on public.daily_words (puzzle_date);
create index if not exists daily_words_daily_number_idx on public.daily_words (daily_number);
create index if not exists daily_words_status_idx on public.daily_words (status);

create or replace function public.set_daily_words_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.word = upper(new.word);
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_words_set_updated_at on public.daily_words;
create trigger daily_words_set_updated_at
before insert or update on public.daily_words
for each row execute function public.set_daily_words_updated_at();

alter table public.daily_words enable row level security;

revoke all on table public.daily_words from anon;
revoke all on table public.daily_words from authenticated;

insert into public.daily_words (puzzle_date, daily_number, word, definition, status) values
  ('2026-08-13', 44, 'GRACE', 'Simple elegance or refinement of movement.', 'scheduled'),
  ('2026-08-14', 45, 'LIGHT', 'Natural brightness that makes sight possible.', 'scheduled'),
  ('2026-08-15', 46, 'NORTH', 'The direction toward the top of a map.', 'scheduled'),
  ('2026-08-16', 47, 'PAUSE', 'A temporary stop in action or speech.', 'scheduled'),
  ('2026-08-17', 48, 'SCALE', 'A system of ordered marks or values.', 'scheduled'),
  ('2026-08-18', 49, 'TRACE', 'A small sign or mark left behind.', 'scheduled'),
  ('2026-08-19', 50, 'FLOUR', 'Powder made by grinding grain.', 'scheduled'),
  ('2026-08-20', 51, 'GLASS', 'A hard, brittle transparent material.', 'scheduled'),
  ('2026-08-21', 52, 'HEART', 'The organ that pumps blood through the body.', 'scheduled'),
  ('2026-08-22', 53, 'MIRTH', 'Amusement, especially as expressed in laughter.', 'scheduled'),
  ('2026-08-23', 54, 'PRIDE', 'A feeling of deep satisfaction in an achievement.', 'scheduled'),
  ('2026-08-24', 55, 'RIVER', 'A large natural stream of water.', 'scheduled'),
  ('2026-08-25', 56, 'STONE', 'Hard solid nonmetallic mineral matter.', 'scheduled'),
  ('2026-08-26', 57, 'WOVEN', 'Made by interlacing threads.', 'scheduled'),
  ('2026-08-27', 58, 'YEARN', 'To have an intense feeling of longing.', 'scheduled'),
  ('2026-08-28', 59, 'BLOOM', 'A flower, especially one cultivated for beauty.', 'scheduled'),
  ('2026-08-29', 60, 'CHAIR', 'A seat with a back for one person.', 'scheduled'),
  ('2026-08-30', 61, 'DREAM', 'A series of thoughts or images during sleep.', 'scheduled'),
  ('2026-08-31', 62, 'FIELD', 'An open area of land.', 'scheduled'),
  ('2026-09-01', 63, 'PLANE', 'A flat surface or an aircraft with wings.', 'scheduled'),
  ('2026-09-02', 64, 'HOUSE', 'A building where people live.', 'scheduled'),
  ('2026-09-03', 65, 'OCEAN', 'A very large body of salt water.', 'scheduled'),
  ('2026-09-04', 66, 'MUSIC', 'Vocal or instrumental sounds arranged in time.', 'scheduled'),
  ('2026-09-05', 67, 'BREAD', 'Food made from flour, water, and yeast.', 'scheduled'),
  ('2026-09-06', 68, 'TRAIN', 'A connected series of railway cars.', 'scheduled'),
  ('2026-09-07', 69, 'SMILE', 'A pleased or kind facial expression.', 'scheduled'),
  ('2026-09-08', 70, 'CLEAN', 'Free from dirt, marks, or unwanted matter.', 'scheduled'),
  ('2026-09-09', 71, 'ROUND', 'Shaped like a circle or sphere.', 'scheduled'),
  ('2026-09-10', 72, 'GREEN', 'The color between blue and yellow.', 'scheduled'),
  ('2026-09-11', 73, 'QUIET', 'Making little or no noise.', 'scheduled')
on conflict (puzzle_date) do update set
  daily_number = excluded.daily_number,
  word = excluded.word,
  definition = excluded.definition,
  status = excluded.status;
```

### Verification query (run immediately after)

```sql
select count(*) as total_rows from public.daily_words;
-- Expected: 30

select puzzle_date, daily_number, word
from public.daily_words
order by puzzle_date
limit 5;
-- Expected: first row is 2026-08-13 / 44 / GRACE

select puzzle_date, daily_number, word
from public.daily_words
order by puzzle_date desc
limit 1;
-- Expected: 2026-09-11 / 73 / QUIET
```

---

## Migration 2 — `20260831090000_create_word_bank.sql`

### What it does
- Enables `pgcrypto` (idempotent)
- Creates two custom enums inside a `DO $$` guard — only creates them if they do not already exist:
  - `public.word_bank_difficulty_level` (`beginner`, `elementary`, `intermediate`, `upper_intermediate`, `advanced`, `expert`)
  - `public.word_bank_status` (`draft`, `review`, `approved`, `archived`)
- Creates `public.word_bank` with `IF NOT EXISTS` — full schema including constraints, check constraints for scores and category
- Creates four indexes with `IF NOT EXISTS`
- Creates or replaces the `set_word_bank_updated_at` trigger function (normalizes `word` to initcap, lowercases `normalized_word`, sets `updated_at`)
- Drops and recreates the `word_bank_set_updated_at` trigger
- Enables RLS and revokes all access from `anon` and `authenticated`
- Adds `word_id uuid` column to `public.daily_words` with `IF NOT EXISTS`
- Adds FK constraint `daily_words_word_id_fkey` inside a `DO $$` guard — only adds if it does not already exist
- Creates index `daily_words_word_id_idx` with `IF NOT EXISTS`
- Upserts ~100 core vocabulary words into `word_bank` using `ON CONFLICT (normalized_word) DO UPDATE`
- Inserts all 30 historical `daily_words` words into `word_bank` as `elementary` / `everyday_life` entries using `ON CONFLICT (normalized_word) DO NOTHING`
- Back-fills `word_id` on all `daily_words` rows where `word_id IS NULL` by joining on `lower(word) = normalized_word`

### Effect on existing production data
Adds `word_id` column to `daily_words`. All 30 historical rows get their `word_id` populated by the back-fill at the end. No existing column values are changed.

### Can it be pasted directly into SQL Editor?
**Yes.** Paste the entire file contents as a single block and click Run.

### Is it safe to execute as one transaction?
**Yes.** All DDL uses `IF NOT EXISTS` or `DO $$` guards. All DML uses upsert or `DO NOTHING` conflict handling.

### Paste this SQL

Paste the full contents of `supabase/migrations/20260831090000_create_word_bank.sql` verbatim.

> The file is ~350 lines. Do not truncate or modify it. Copy from the file directly.

### Verification query (run immediately after)

```sql
select count(*) as total_word_bank from public.word_bank;
-- Expected: >= 130 (100 core words + 30 historical daily_words words, minus any overlaps resolved by DO NOTHING)

select count(*) as approved_count from public.word_bank where status = 'approved';
-- Expected: >= 125

select count(*) as words_with_word_id
from public.daily_words
where word_id is not null;
-- Expected: 30

select dw.puzzle_date, dw.word, wb.normalized_word
from public.daily_words dw
join public.word_bank wb on wb.id = dw.word_id
where dw.puzzle_date = '2026-08-14';
-- Expected: one row, word = LIGHT, normalized_word = light
```

---

## Migration 3 — `20260831093000_create_wordup_curriculum.sql`

### What it does
- Creates `public.wordup_curriculum` with `IF NOT EXISTS` — full schema including:
  - `day_number` UNIQUE, constrained to 1–365
  - `word_id` FK to `word_bank(id)` (NOT NULL)
  - `theme`, `lesson_type`, `difficulty_level` with check constraints
  - `wordup_curriculum_unique_word` UNIQUE constraint on `word_id`
- Creates three indexes with `IF NOT EXISTS`
- Creates or replaces the `set_wordup_curriculum_updated_at` trigger function
- Drops and recreates the `wordup_curriculum_set_updated_at` trigger
- Enables RLS and revokes all access from `anon` and `authenticated`
- Adds `curriculum_id uuid` column to `public.daily_words` with `IF NOT EXISTS`
- Adds FK constraint `daily_words_curriculum_id_fkey` inside a `DO $$` guard
- Creates index `daily_words_curriculum_id_idx` with `IF NOT EXISTS`
- Seeds Days 1–20 of the curriculum via a CTE that joins `word_bank` on `normalized_word` and `status = 'approved'`, using `ON CONFLICT (day_number) DO UPDATE`
- Runs a verification guard: raises an exception if the count of approved curriculum rows for days 1–20 is not exactly 20

### Effect on existing production data
Adds `curriculum_id` column to `daily_words`. All 30 historical rows retain `curriculum_id = NULL` — this is correct and expected. The curriculum seed does not touch `daily_words`.

### Dependency on Migration 2
The CTE joins `word_bank` on `normalized_word` for: `concise`, `articulate`, `clarify`, `context`, `subtle`, `empathy`, `resilient`, `candid`, `assertive`, `perspective`, `coherent`, `evidence`, `evaluate`, `efficient`, `prioritize`, `collaborate`, `constructive`, `pragmatic`, `ambiguous`, `meticulous`. All 20 must exist in `word_bank` with `status = 'approved'`. Migration 2 seeds all of them. The verification guard at the end will abort the migration if any are missing.

### Can it be pasted directly into SQL Editor?
**Yes.** Paste the entire file contents as a single block and click Run.

### Is it safe to execute as one transaction?
**Yes.** The verification guard at the end will raise an exception and roll back the entire block if the 20-row check fails, leaving the database unchanged.

### Paste this SQL

Paste the full contents of `supabase/migrations/20260831093000_create_wordup_curriculum.sql` verbatim.

### Verification query (run immediately after)

```sql
select count(*) as curriculum_count from public.wordup_curriculum;
-- Expected: 20

select wc.day_number, wb.word, wc.theme, wc.lesson_type, wc.status
from public.wordup_curriculum wc
join public.word_bank wb on wb.id = wc.word_id
order by wc.day_number
limit 5;
-- Expected: Day 1 = Concise / communication / communication / approved
--           Day 2 = Articulate / communication / communication / approved

select count(*) as daily_words_with_curriculum_id
from public.daily_words
where curriculum_id is not null;
-- Expected: 0 (historical rows are not linked to curriculum)
```

---

## Migration 4 — `20260907090000_connect_curriculum_daily_words.sql`

### What it does
- Creates `public.wordup_app_config` key/value table with check constraints and `IF NOT EXISTS`
- Creates or replaces the `set_wordup_app_config_updated_at` trigger function
- Drops and recreates the `wordup_app_config_set_updated_at` trigger
- Enables RLS and revokes all access from `anon` and `authenticated`
- Upserts `CURRICULUM_START_DATE = '2026-09-15'` using `ON CONFLICT (key) DO UPDATE`
- Drops the old 5-character word constraint `daily_words_word_format` (which required `^[A-Z]{5}$`)
- Adds a new multi-word pattern constraint `daily_words_word_format` (which allows `^[A-Z]+([ -][A-Z]+)*$`)
- Drops the `UNIQUE` constraint `daily_words_daily_number_key` from `daily_words`
- Creates a non-unique index `daily_words_daily_number_idx` with `IF NOT EXISTS` (replaces the unique constraint for query performance)
- Creates a unique index `daily_words_puzzle_date_unique_idx` with `IF NOT EXISTS`
- Adds table and column comments

### Effect on existing production data
No data rows are touched. The constraint change on `word_format` is backward-compatible — all existing 5-letter uppercase words still satisfy the new pattern. Dropping the `UNIQUE` constraint on `daily_number` does not affect existing values.

### Can it be pasted directly into SQL Editor?
**Yes.** Paste the entire file contents as a single block and click Run.

### Is it safe to execute as one transaction?
**Yes.** All DDL is either `IF NOT EXISTS`, `DROP ... IF EXISTS`, or `CREATE OR REPLACE`. No data is modified.

### Paste this SQL

```sql
create table if not exists public.wordup_app_config (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wordup_app_config_key_not_blank check (length(btrim(key)) > 0),
  constraint wordup_app_config_value_not_blank check (length(btrim(value)) > 0)
);

create or replace function public.set_wordup_app_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wordup_app_config_set_updated_at on public.wordup_app_config;
create trigger wordup_app_config_set_updated_at
before insert or update on public.wordup_app_config
for each row execute function public.set_wordup_app_config_updated_at();

alter table public.wordup_app_config enable row level security;

revoke all on table public.wordup_app_config from anon;
revoke all on table public.wordup_app_config from authenticated;

insert into public.wordup_app_config (key, value)
values ('CURRICULUM_START_DATE', '2026-09-15')
on conflict (key) do update set value = excluded.value;

alter table public.daily_words
  drop constraint if exists daily_words_word_format;

alter table public.daily_words
  add constraint daily_words_word_format check (word ~ '^[A-Z]+([ -][A-Z]+)*$');

alter table public.daily_words
  drop constraint if exists daily_words_daily_number_key;

create index if not exists daily_words_daily_number_idx on public.daily_words (daily_number);

create unique index if not exists daily_words_puzzle_date_unique_idx on public.daily_words (puzzle_date);

comment on table public.wordup_app_config is
  'Server-side WordUp configuration used by Edge Functions. Mobile clients do not read this table directly.';

comment on column public.wordup_app_config.value is
  'CURRICULUM_START_DATE stores the local calendar date that maps to curriculum day 1.';

comment on column public.daily_words.curriculum_id is
  'Optional link to the curriculum row used to create this date-specific daily word.';
```

### Verification query (run immediately after)

```sql
select key, value from public.wordup_app_config;
-- Expected: one row — key = CURRICULUM_START_DATE, value = 2026-09-15

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.daily_words'::regclass
  and conname = 'daily_words_word_format';
-- Expected: constraint definition contains ^[A-Z]+([ -][A-Z]+)*$

select count(*) from public.daily_words;
-- Expected: 30 (no rows changed)
```

---

## Migration 5 — `20260907091000_seed_wordup_curriculum_365.sql`

### What it does
- Upserts the full 500-word bank via an embedded JSON payload using `jsonb_to_recordset`, with `ON CONFLICT (normalized_word) DO UPDATE` — updates all fields for existing words, inserts new ones
- Upserts all 365 curriculum days via a second embedded JSON payload, joining to `word_bank` on `normalized_word` and `status = 'approved'`, with `ON CONFLICT (day_number) DO UPDATE`
- Runs a two-part verification guard that raises an exception and aborts if:
  - `word_bank` does not have at least 500 approved rows
  - `wordup_curriculum` does not have exactly 365 rows

### Effect on existing production data
No `daily_words` rows are touched. The word bank upsert updates existing words (including the 30 historical words inserted by Migration 2) with the canonical values from the full seed. The curriculum upsert extends days 1–20 (already seeded by Migration 3) with the full 365-day set.

### Size note
This migration file is approximately 285KB. The SQL Editor accepts it as a single paste. Do not split it.

### Can it be pasted directly into SQL Editor?
**Yes.** Paste the entire file contents as a single block and click Run. Execution will take longer than the previous migrations — allow up to 30 seconds.

### Is it safe to execute as one transaction?
**Yes.** The verification guard at the end will raise an exception and roll back the entire block if either count check fails.

### Paste this SQL

Paste the full contents of `supabase/migrations/20260907091000_seed_wordup_curriculum_365.sql` verbatim.

> This file is ~285KB. Copy it directly from the file. Do not truncate or modify it.

### Verification query (run immediately after)

```sql
select count(*) as total_word_bank from public.word_bank;
-- Expected: >= 500

select count(*) as approved_word_bank from public.word_bank where status = 'approved';
-- Expected: >= 500

select count(*) as curriculum_days from public.wordup_curriculum;
-- Expected: 365
```

---

## Post-Deployment Verification Queries

Run all of these after all 5 migrations have completed successfully.

### 1. word_bank total count

```sql
select count(*) as word_bank_total from public.word_bank;
-- Expected: >= 500
```

### 2. word_bank approved count

```sql
select count(*) as word_bank_approved
from public.word_bank
where status = 'approved';
-- Expected: >= 500
```

### 3. wordup_curriculum total count

```sql
select count(*) as curriculum_total from public.wordup_curriculum;
-- Expected: 365
```

### 4. Curriculum days 1–20

```sql
select wc.day_number, wb.word, wc.theme, wc.lesson_type, wc.difficulty_level, wc.status
from public.wordup_curriculum wc
join public.word_bank wb on wb.id = wc.word_id
where wc.day_number between 1 and 20
order by wc.day_number;
-- Expected: 20 rows
-- Day 1  = Concise     / communication        / communication / intermediate       / approved
-- Day 2  = Articulate  / communication        / communication / intermediate       / approved
-- Day 3  = Clarify     / communication        / review        / elementary         / approved
-- Day 4  = Context     / thinking             / thinking      / intermediate       / approved
-- Day 5  = Subtle      / descriptive_language / descriptive   / intermediate       / approved
-- Day 6  = Empathy     / relationships        / emotional     / intermediate       / approved
-- Day 7  = Resilient   / personality          / learn         / intermediate       / approved
-- Day 8  = Candid      / communication        / communication / intermediate       / approved
-- Day 9  = Assertive   / personality          / learn         / intermediate       / approved
-- Day 10 = Perspective / thinking             / thinking      / intermediate       / approved
-- Day 11 = Coherent    / academic_language    / communication / intermediate       / approved
-- Day 12 = Evidence    / academic_language    / thinking      / intermediate       / approved
-- Day 13 = Evaluate    / academic_language    / thinking      / intermediate       / approved
-- Day 14 = Efficient   / work                 / professional  / intermediate       / approved
-- Day 15 = Prioritize  / work                 / professional  / intermediate       / approved
-- Day 16 = Collaborate / work                 / professional  / intermediate       / approved
-- Day 17 = Constructive/ relationships        / review        / intermediate       / approved
-- Day 18 = Pragmatic   / nuance_and_precision / advanced      / upper_intermediate / approved
-- Day 19 = Ambiguous   / nuance_and_precision / advanced      / upper_intermediate / approved
-- Day 20 = Meticulous  / professional_language/ advanced      / upper_intermediate / approved
```

### 5. Curriculum day 365

```sql
select wc.day_number, wb.word, wc.theme, wc.lesson_type, wc.status
from public.wordup_curriculum wc
join public.word_bank wb on wb.id = wc.word_id
where wc.day_number = 365;
-- Expected: 1 row with day_number = 365, status = approved
```

### 6. daily_words total count

```sql
select count(*) as daily_words_total from public.daily_words;
-- Expected: 30
```

### 7. Historical LIGHT record

```sql
select puzzle_date, daily_number, word, definition, status, word_id, curriculum_id
from public.daily_words
where puzzle_date = '2026-08-14';
-- Expected:
--   puzzle_date   = 2026-08-14
--   daily_number  = 45
--   word          = LIGHT
--   definition    = Natural brightness that makes sight possible.
--   status        = scheduled
--   word_id       = (a UUID — not null)
--   curriculum_id = NULL
```

### 8. daily_words word_id population

```sql
select
  count(*) as total,
  count(word_id) as with_word_id,
  count(*) - count(word_id) as missing_word_id
from public.daily_words;
-- Expected: total = 30, with_word_id = 30, missing_word_id = 0
```

### 9. daily_words curriculum_id population

```sql
select
  count(*) as total,
  count(curriculum_id) as with_curriculum_id,
  count(*) - count(curriculum_id) as null_curriculum_id
from public.daily_words;
-- Expected: total = 30, with_curriculum_id = 0, null_curriculum_id = 30
-- (Historical rows are not linked to curriculum — this is correct)
```

### 10. CURRICULUM_START_DATE

```sql
select key, value from public.wordup_app_config where key = 'CURRICULUM_START_DATE';
-- Expected: value = 2026-09-15
```

---

## Summary of Tables Created

| Table | Created by | Purpose |
|-------|-----------|---------|
| `public.daily_words` | Migration 1 | One row per calendar date — the daily puzzle |
| `public.word_bank` | Migration 2 | Master vocabulary list with metadata |
| `public.wordup_curriculum` | Migration 3 | 365-day ordered curriculum |
| `public.wordup_app_config` | Migration 4 | Server-side key/value config for Edge Functions |

## Summary of Columns Added to daily_words

| Column | Added by | Type | Notes |
|--------|---------|------|-------|
| `word_id` | Migration 2 | `uuid FK → word_bank(id)` | Populated for all 30 historical rows |
| `curriculum_id` | Migration 3 | `uuid FK → wordup_curriculum(id)` | NULL for all historical rows — correct |

## Summary of Constraint Changes on daily_words

| Change | Migration | Detail |
|--------|----------|--------|
| `daily_words_word_format` replaced | Migration 4 | Old: `^[A-Z]{5}$` → New: `^[A-Z]+([ -][A-Z]+)*$` |
| `daily_words_daily_number_key` UNIQUE dropped | Migration 4 | Replaced by non-unique index; `puzzle_date` is the unique key going forward |
