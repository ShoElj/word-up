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
