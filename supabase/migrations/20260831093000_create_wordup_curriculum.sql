create table if not exists public.wordup_curriculum (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null unique,
  word_id uuid not null references public.word_bank(id),
  theme text not null,
  lesson_type text,
  difficulty_level text,
  status text not null default 'review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wordup_curriculum_day_number_range check (day_number between 1 and 365),
  constraint wordup_curriculum_status_check check (status in ('draft', 'review', 'approved', 'archived')),
  constraint wordup_curriculum_difficulty_check check (
    difficulty_level is null or difficulty_level in (
      'beginner',
      'elementary',
      'intermediate',
      'upper_intermediate',
      'advanced',
      'expert'
    )
  ),
  constraint wordup_curriculum_theme_check check (
    theme in (
      'communication',
      'personality',
      'emotions',
      'thinking',
      'relationships',
      'work',
      'education',
      'society',
      'descriptive_language',
      'professional_language',
      'academic_language',
      'culture',
      'science_and_technology',
      'everyday_expression',
      'nuance_and_precision',
      'interesting_words'
    )
  ),
  constraint wordup_curriculum_lesson_type_check check (
    lesson_type is null or lesson_type in (
      'learn',
      'communication',
      'descriptive',
      'professional',
      'emotional',
      'thinking',
      'review',
      'advanced'
    )
  ),
  constraint wordup_curriculum_unique_word unique (word_id)
);

create index if not exists wordup_curriculum_status_idx on public.wordup_curriculum (status);
create index if not exists wordup_curriculum_theme_idx on public.wordup_curriculum (theme);
create index if not exists wordup_curriculum_difficulty_level_idx on public.wordup_curriculum (difficulty_level);

create or replace function public.set_wordup_curriculum_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wordup_curriculum_set_updated_at on public.wordup_curriculum;
create trigger wordup_curriculum_set_updated_at
before insert or update on public.wordup_curriculum
for each row execute function public.set_wordup_curriculum_updated_at();

alter table public.wordup_curriculum enable row level security;

revoke all on table public.wordup_curriculum from anon;
revoke all on table public.wordup_curriculum from authenticated;

alter table public.daily_words
  add column if not exists curriculum_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_words_curriculum_id_fkey'
      and conrelid = 'public.daily_words'::regclass
  ) then
    alter table public.daily_words
      add constraint daily_words_curriculum_id_fkey foreign key (curriculum_id) references public.wordup_curriculum(id);
  end if;
end $$;

create index if not exists daily_words_curriculum_id_idx on public.daily_words (curriculum_id);

with curriculum_seed(day_number, normalized_word, theme, lesson_type, difficulty_level, status) as (
  values
    (1, 'concise', 'communication', 'communication', 'intermediate', 'approved'),
    (2, 'articulate', 'communication', 'communication', 'intermediate', 'approved'),
    (3, 'clarify', 'communication', 'review', 'elementary', 'approved'),
    (4, 'context', 'thinking', 'thinking', 'intermediate', 'approved'),
    (5, 'subtle', 'descriptive_language', 'descriptive', 'intermediate', 'approved'),
    (6, 'empathy', 'relationships', 'emotional', 'intermediate', 'approved'),
    (7, 'resilient', 'personality', 'learn', 'intermediate', 'approved'),
    (8, 'candid', 'communication', 'communication', 'intermediate', 'approved'),
    (9, 'assertive', 'personality', 'learn', 'intermediate', 'approved'),
    (10, 'perspective', 'thinking', 'thinking', 'intermediate', 'approved'),
    (11, 'coherent', 'academic_language', 'communication', 'intermediate', 'approved'),
    (12, 'evidence', 'academic_language', 'thinking', 'intermediate', 'approved'),
    (13, 'evaluate', 'academic_language', 'thinking', 'intermediate', 'approved'),
    (14, 'efficient', 'work', 'professional', 'intermediate', 'approved'),
    (15, 'prioritize', 'work', 'professional', 'intermediate', 'approved'),
    (16, 'collaborate', 'work', 'professional', 'intermediate', 'approved'),
    (17, 'constructive', 'relationships', 'review', 'intermediate', 'approved'),
    (18, 'pragmatic', 'nuance_and_precision', 'advanced', 'upper_intermediate', 'approved'),
    (19, 'ambiguous', 'nuance_and_precision', 'advanced', 'upper_intermediate', 'approved'),
    (20, 'meticulous', 'professional_language', 'advanced', 'upper_intermediate', 'approved')
),
inserted as (
  insert into public.wordup_curriculum (
    day_number,
    word_id,
    theme,
    lesson_type,
    difficulty_level,
    status
  )
  select
    seed.day_number,
    wb.id,
    seed.theme,
    seed.lesson_type,
    seed.difficulty_level,
    seed.status
  from curriculum_seed seed
  join public.word_bank wb
    on wb.normalized_word = seed.normalized_word
   and wb.status = 'approved'
  on conflict (day_number) do update set
    word_id = excluded.word_id,
    theme = excluded.theme,
    lesson_type = excluded.lesson_type,
    difficulty_level = excluded.difficulty_level,
    status = excluded.status
  returning day_number
)
select count(*) from inserted;

do $$
declare
  first_20_count integer;
begin
  select count(*)
  into first_20_count
  from public.wordup_curriculum wc
  join public.word_bank wb on wb.id = wc.word_id
  where wc.day_number between 1 and 20
    and wc.status = 'approved'
    and wb.status = 'approved';

  if first_20_count <> 20 then
    raise exception 'Expected 20 approved first-phase curriculum rows, found %', first_20_count;
  end if;
end $$;
