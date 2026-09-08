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
