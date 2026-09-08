create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'word_bank_difficulty_level') then
    create type public.word_bank_difficulty_level as enum (
      'beginner',
      'elementary',
      'intermediate',
      'upper_intermediate',
      'advanced',
      'expert'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'word_bank_status') then
    create type public.word_bank_status as enum (
      'draft',
      'review',
      'approved',
      'archived'
    );
  end if;
end $$;

create table if not exists public.word_bank (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  normalized_word text not null unique,
  part_of_speech text,
  difficulty_level public.word_bank_difficulty_level not null,
  category text,
  frequency_score numeric,
  usefulness_score numeric,
  definition text,
  example_sentence text,
  pronunciation text,
  pronunciation_audio_url text,
  synonyms text[],
  antonyms text[],
  status public.word_bank_status not null default 'review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint word_bank_word_not_blank check (length(btrim(word)) > 0),
  constraint word_bank_normalized_word_format check (normalized_word ~ '^[a-z]+([ -][a-z]+)*$'),
  constraint word_bank_scores_range check (
    (frequency_score is null or (frequency_score >= 0 and frequency_score <= 100)) and
    (usefulness_score is null or (usefulness_score >= 0 and usefulness_score <= 100))
  ),
  constraint word_bank_category_check check (
    category is null or category in (
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
      'interesting_words'
    )
  )
);

create index if not exists word_bank_status_idx on public.word_bank (status);
create index if not exists word_bank_difficulty_level_idx on public.word_bank (difficulty_level);
create index if not exists word_bank_category_idx on public.word_bank (category);
create index if not exists word_bank_usefulness_score_idx on public.word_bank (usefulness_score desc nulls last);

create or replace function public.set_word_bank_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.word = initcap(btrim(new.word));
  new.normalized_word = lower(regexp_replace(btrim(new.normalized_word), '\s+', ' ', 'g'));
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists word_bank_set_updated_at on public.word_bank;
create trigger word_bank_set_updated_at
before insert or update on public.word_bank
for each row execute function public.set_word_bank_updated_at();

alter table public.word_bank enable row level security;

revoke all on table public.word_bank from anon;
revoke all on table public.word_bank from authenticated;

alter table public.daily_words
  add column if not exists word_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_words_word_id_fkey'
      and conrelid = 'public.daily_words'::regclass
  ) then
    alter table public.daily_words
      add constraint daily_words_word_id_fkey foreign key (word_id) references public.word_bank(id);
  end if;
end $$;

create index if not exists daily_words_word_id_idx on public.daily_words (word_id);

insert into public.word_bank (
  word,
  normalized_word,
  part_of_speech,
  difficulty_level,
  category,
  frequency_score,
  usefulness_score,
  definition,
  example_sentence,
  pronunciation,
  pronunciation_audio_url,
  synonyms,
  antonyms,
  status
) values
  ('Articulate', 'articulate', 'adjective', 'intermediate', 'communication', 67, 92, 'Able to express ideas clearly and effectively.', 'Her articulate summary helped the team understand the plan.', '/ar-tik-yuh-lit/', null, array['clear', 'expressive'], array['unclear'], 'approved'),
  ('Subtle', 'subtle', 'adjective', 'intermediate', 'descriptive', 72, 90, 'Not obvious, but still important or effective.', 'The speaker made a subtle point about trust.', '/sut-l/', null, array['delicate', 'understated'], array['obvious'], 'approved'),
  ('Reluctant', 'reluctant', 'adjective', 'intermediate', 'emotions', 66, 88, 'Unwilling or hesitant to do something.', 'He was reluctant to accept the offer without more details.', '/ri-luk-tunt/', null, array['hesitant', 'unwilling'], array['eager'], 'approved'),
  ('Inevitable', 'inevitable', 'adjective', 'intermediate', 'thinking', 70, 91, 'Certain to happen and difficult to avoid.', 'After weeks of delays, the decision felt inevitable.', '/in-ev-i-tuh-bul/', null, array['unavoidable', 'certain'], array['avoidable'], 'approved'),
  ('Concise', 'concise', 'adjective', 'intermediate', 'communication', 64, 93, 'Using few words while remaining clear.', 'Please keep the update concise and practical.', '/kun-sys/', null, array['brief', 'compact'], array['wordy'], 'approved'),
  ('Peculiar', 'peculiar', 'adjective', 'intermediate', 'interesting_words', 58, 78, 'Unusual in a noticeable or interesting way.', 'There was a peculiar silence after the announcement.', '/pi-kyool-yur/', null, array['odd', 'unusual'], array['ordinary'], 'approved'),
  ('Versatile', 'versatile', 'adjective', 'intermediate', 'professional', 61, 89, 'Able to adapt to many different uses or situations.', 'A versatile skill is useful across many roles.', '/vur-suh-tl/', null, array['adaptable', 'flexible'], array['limited'], 'approved'),
  ('Compelling', 'compelling', 'adjective', 'intermediate', 'communication', 69, 92, 'Powerful enough to hold attention or persuade.', 'The report made a compelling case for change.', '/kum-pel-ing/', null, array['persuasive', 'convincing'], array['weak'], 'approved'),
  ('Skeptical', 'skeptical', 'adjective', 'upper_intermediate', 'thinking', 62, 87, 'Not easily convinced without evidence.', 'She remained skeptical until the results were repeated.', '/skep-ti-kul/', null, array['doubtful', 'questioning'], array['convinced'], 'approved'),
  ('Resilient', 'resilient', 'adjective', 'intermediate', 'personality', 63, 91, 'Able to recover after difficulty or change.', 'The resilient team adjusted quickly after the setback.', '/ri-zil-yunt/', null, array['strong', 'adaptable'], array['fragile'], 'approved'),
  ('Meticulous', 'meticulous', 'adjective', 'upper_intermediate', 'professional', 54, 88, 'Showing very careful attention to detail.', 'Her meticulous notes made the handoff easier.', '/muh-tik-yuh-lus/', null, array['careful', 'precise'], array['careless'], 'approved'),
  ('Ambiguous', 'ambiguous', 'adjective', 'upper_intermediate', 'communication', 57, 86, 'Having more than one possible meaning.', 'The ambiguous message caused confusion.', '/am-big-yoo-us/', null, array['unclear', 'vague'], array['clear'], 'approved'),
  ('Pragmatic', 'pragmatic', 'adjective', 'upper_intermediate', 'thinking', 55, 90, 'Focused on practical results rather than theory.', 'They chose a pragmatic solution that could ship quickly.', '/prag-mat-ik/', null, array['practical', 'realistic'], array['idealistic'], 'approved'),
  ('Coherent', 'coherent', 'adjective', 'intermediate', 'communication', 60, 89, 'Logical and easy to understand.', 'The proposal became coherent after one more revision.', '/koh-heer-unt/', null, array['logical', 'clear'], array['confused'], 'approved'),
  ('Plausible', 'plausible', 'adjective', 'upper_intermediate', 'thinking', 58, 87, 'Seeming reasonable or likely to be true.', 'Her explanation was plausible, but we needed proof.', '/plaw-zuh-bul/', null, array['credible', 'believable'], array['unlikely'], 'approved'),
  ('Empathy', 'empathy', 'noun', 'intermediate', 'relationships', 66, 94, 'The ability to understand another person''s feelings.', 'Empathy helped the manager respond with care.', '/em-puh-thee/', null, array['understanding', 'compassion'], array['indifference'], 'approved'),
  ('Nuance', 'nuance', 'noun', 'upper_intermediate', 'communication', 52, 88, 'A small difference in meaning, feeling, or expression.', 'The translation missed an important nuance.', '/noo-ahns/', null, array['subtlety', 'distinction'], array['simplicity'], 'approved'),
  ('Diligent', 'diligent', 'adjective', 'intermediate', 'work', 53, 87, 'Working carefully and with steady effort.', 'The diligent researcher checked every source.', '/dil-i-junt/', null, array['careful', 'hardworking'], array['lazy'], 'approved'),
  ('Candid', 'candid', 'adjective', 'intermediate', 'communication', 57, 86, 'Honest and direct, especially in speech.', 'His candid feedback helped improve the design.', '/kan-did/', null, array['honest', 'direct'], array['guarded'], 'approved'),
  ('Viable', 'viable', 'adjective', 'upper_intermediate', 'work', 59, 89, 'Able to work successfully or continue existing.', 'The team tested whether the idea was viable.', '/vy-uh-bul/', null, array['workable', 'feasible'], array['impractical'], 'approved'),
  ('Adaptable', 'adaptable', 'adjective', 'intermediate', 'professional', 60, 90, 'Able to change in response to new conditions.', 'Adaptable people often learn new tools quickly.', '/uh-dap-tuh-bul/', null, array['flexible', 'versatile'], array['rigid'], 'approved'),
  ('Assertive', 'assertive', 'adjective', 'intermediate', 'personality', 56, 85, 'Confident in expressing needs or opinions.', 'She was assertive without being dismissive.', '/uh-sur-tiv/', null, array['confident', 'firm'], array['passive'], 'approved'),
  ('Credible', 'credible', 'adjective', 'intermediate', 'academic', 63, 89, 'Able to be believed or trusted.', 'Use credible evidence to support the claim.', '/kred-uh-bul/', null, array['trustworthy', 'reliable'], array['doubtful'], 'approved'),
  ('Insight', 'insight', 'noun', 'intermediate', 'thinking', 68, 92, 'A clear understanding of something important.', 'The interview gave us insight into user needs.', '/in-syt/', null, array['understanding', 'perception'], array['confusion'], 'approved'),
  ('Imply', 'imply', 'verb', 'intermediate', 'communication', 70, 88, 'To suggest something without saying it directly.', 'The data may imply a change in behavior.', '/im-ply/', null, array['suggest', 'indicate'], array['state'], 'approved'),
  ('Infer', 'infer', 'verb', 'intermediate', 'thinking', 63, 87, 'To reach a conclusion from evidence.', 'From the results, we can infer steady demand.', '/in-fur/', null, array['deduce', 'conclude'], array['guess'], 'approved'),
  ('Objective', 'objective', 'adjective', 'upper_intermediate', 'academic', 65, 88, 'Based on facts rather than personal feelings.', 'An objective review focuses on evidence.', '/ub-jek-tiv/', null, array['neutral', 'factual'], array['biased'], 'approved'),
  ('Subjective', 'subjective', 'adjective', 'upper_intermediate', 'thinking', 61, 84, 'Based on personal feelings or opinions.', 'Taste is often subjective, even with expert advice.', '/sub-jek-tiv/', null, array['personal', 'opinion-based'], array['objective'], 'approved'),
  ('Relevant', 'relevant', 'adjective', 'elementary', 'communication', 76, 92, 'Closely connected to what is being discussed.', 'Please share only the relevant details.', '/rel-uh-vunt/', null, array['related', 'applicable'], array['irrelevant'], 'approved'),
  ('Significant', 'significant', 'adjective', 'intermediate', 'academic', 74, 91, 'Important enough to be noticed or considered.', 'The update made a significant difference.', '/sig-nif-i-kunt/', null, array['important', 'meaningful'], array['minor'], 'approved'),
  ('Efficient', 'efficient', 'adjective', 'intermediate', 'work', 70, 91, 'Working well without wasting time or resources.', 'The new process is faster and more efficient.', '/ih-fish-unt/', null, array['effective', 'productive'], array['wasteful'], 'approved'),
  ('Allocate', 'allocate', 'verb', 'upper_intermediate', 'work', 51, 84, 'To assign resources or time for a purpose.', 'We need to allocate more time for testing.', '/al-uh-kayt/', null, array['assign', 'distribute'], array['withhold'], 'approved'),
  ('Prioritize', 'prioritize', 'verb', 'intermediate', 'work', 60, 90, 'To decide what is most important.', 'Prioritize the tasks that reduce the largest risk.', '/pry-or-uh-tyz/', null, array['rank', 'emphasize'], array['neglect'], 'approved'),
  ('Collaborate', 'collaborate', 'verb', 'intermediate', 'work', 62, 90, 'To work together toward a shared goal.', 'The teams collaborate on product decisions.', '/kuh-lab-uh-rayt/', null, array['cooperate', 'partner'], array['compete'], 'approved'),
  ('Initiative', 'initiative', 'noun', 'intermediate', 'professional', 64, 89, 'The ability to act without waiting to be told.', 'Taking initiative helped her grow into the role.', '/ih-nish-uh-tiv/', null, array['drive', 'enterprise'], array['inaction'], 'approved'),
  ('Perspective', 'perspective', 'noun', 'intermediate', 'thinking', 72, 92, 'A particular way of seeing or understanding something.', 'A different perspective changed the discussion.', '/pur-spek-tiv/', null, array['viewpoint', 'angle'], array['blindness'], 'approved'),
  ('Context', 'context', 'noun', 'intermediate', 'communication', 77, 91, 'Information that helps explain a situation or idea.', 'Without context, the number is misleading.', '/kon-tekst/', null, array['background', 'setting'], array[]::text[], 'approved'),
  ('Assumption', 'assumption', 'noun', 'upper_intermediate', 'thinking', 63, 87, 'Something accepted as true without complete proof.', 'The forecast depends on one risky assumption.', '/uh-sump-shun/', null, array['belief', 'premise'], array['proof'], 'approved'),
  ('Evidence', 'evidence', 'noun', 'intermediate', 'academic', 78, 93, 'Information that supports a belief or conclusion.', 'Strong evidence should guide the decision.', '/ev-i-duns/', null, array['proof', 'support'], array['speculation'], 'approved'),
  ('Evaluate', 'evaluate', 'verb', 'intermediate', 'academic', 67, 90, 'To judge the value or quality of something.', 'We evaluate each option against the same criteria.', '/ih-val-yoo-ayt/', null, array['assess', 'judge'], array['ignore'], 'approved'),
  ('Interpret', 'interpret', 'verb', 'intermediate', 'academic', 63, 88, 'To explain the meaning of something.', 'Analysts interpret the results with caution.', '/in-tur-prit/', null, array['explain', 'understand'], array['misread'], 'approved'),
  ('Consistent', 'consistent', 'adjective', 'intermediate', 'work', 73, 91, 'Staying the same in behavior, quality, or result.', 'Consistent practice improves vocabulary.', '/kun-sis-tunt/', null, array['steady', 'regular'], array['inconsistent'], 'approved'),
  ('Precise', 'precise', 'adjective', 'intermediate', 'communication', 64, 90, 'Exact and clearly expressed.', 'Use precise language when writing instructions.', '/pri-sys/', null, array['exact', 'specific'], array['vague'], 'approved'),
  ('Implicit', 'implicit', 'adjective', 'advanced', 'communication', 46, 80, 'Suggested without being stated directly.', 'The note carried an implicit request for help.', '/im-plis-it/', null, array['implied', 'unstated'], array['explicit'], 'approved'),
  ('Explicit', 'explicit', 'adjective', 'intermediate', 'communication', 59, 86, 'Stated clearly and directly.', 'The agreement needs explicit approval.', '/ik-splis-it/', null, array['clear', 'direct'], array['implicit'], 'approved'),
  ('Innovate', 'innovate', 'verb', 'intermediate', 'technology', 50, 83, 'To introduce a new method, idea, or product.', 'Small teams can innovate when they understand the problem.', '/in-uh-vayt/', null, array['create', 'improve'], array['imitate'], 'approved'),
  ('Sustainable', 'sustainable', 'adjective', 'upper_intermediate', 'society', 66, 90, 'Able to continue without causing serious harm or loss.', 'The city needs a sustainable transport plan.', '/suh-stay-nuh-bul/', null, array['durable', 'responsible'], array['wasteful'], 'approved'),
  ('Ethical', 'ethical', 'adjective', 'intermediate', 'society', 60, 88, 'Related to what is morally right or fair.', 'Ethical design respects people using the product.', '/eth-i-kul/', null, array['moral', 'principled'], array['unethical'], 'approved'),
  ('Transparent', 'transparent', 'adjective', 'intermediate', 'professional', 62, 87, 'Open and easy to understand or inspect.', 'Transparent communication builds trust.', '/trans-pair-unt/', null, array['open', 'clear'], array['secretive'], 'approved'),
  ('Accountable', 'accountable', 'adjective', 'upper_intermediate', 'professional', 54, 87, 'Expected to explain actions or accept responsibility.', 'Leaders should be accountable for their decisions.', '/uh-kown-tuh-bul/', null, array['responsible', 'answerable'], array['unaccountable'], 'approved'),
  ('Constructive', 'constructive', 'adjective', 'intermediate', 'relationships', 58, 88, 'Useful and intended to help improve something.', 'Constructive feedback focuses on what can improve.', '/kun-struk-tiv/', null, array['helpful', 'productive'], array['harmful'], 'approved'),
  ('Tactful', 'tactful', 'adjective', 'upper_intermediate', 'relationships', 43, 82, 'Careful not to offend or upset people.', 'A tactful reply can calm a difficult conversation.', '/takt-ful/', null, array['diplomatic', 'considerate'], array['blunt'], 'approved'),
  ('Diplomatic', 'diplomatic', 'adjective', 'upper_intermediate', 'communication', 49, 83, 'Skilled at handling people or situations sensitively.', 'She gave a diplomatic answer to a tense question.', '/dip-luh-mat-ik/', null, array['tactful', 'careful'], array['abrasive'], 'approved'),
  ('Genuine', 'genuine', 'adjective', 'intermediate', 'personality', 68, 89, 'Real, honest, and not pretending.', 'His genuine interest made the conversation easier.', '/jen-yoo-in/', null, array['authentic', 'sincere'], array['fake'], 'approved'),
  ('Sincere', 'sincere', 'adjective', 'intermediate', 'personality', 63, 88, 'Honest in feeling or intention.', 'She offered a sincere apology.', '/sin-seer/', null, array['honest', 'genuine'], array['insincere'], 'approved'),
  ('Composure', 'composure', 'noun', 'upper_intermediate', 'emotions', 42, 82, 'Calm control of emotions.', 'He kept his composure during the interview.', '/kum-poh-zhur/', null, array['calmness', 'poise'], array['panic'], 'approved'),
  ('Anxious', 'anxious', 'adjective', 'elementary', 'emotions', 70, 85, 'Worried or nervous about something.', 'She felt anxious before the presentation.', '/angk-shus/', null, array['worried', 'nervous'], array['calm'], 'approved'),
  ('Overwhelmed', 'overwhelmed', 'adjective', 'intermediate', 'emotions', 62, 86, 'Feeling unable to manage because there is too much.', 'He felt overwhelmed by the number of choices.', '/oh-vur-welmd/', null, array['burdened', 'swamped'], array['relaxed'], 'approved'),
  ('Motivated', 'motivated', 'adjective', 'elementary', 'personality', 68, 87, 'Having a strong reason or desire to act.', 'A motivated learner practices every day.', '/moh-tuh-vay-tid/', null, array['driven', 'eager'], array['unmotivated'], 'approved'),
  ('Curious', 'curious', 'adjective', 'elementary', 'personality', 72, 88, 'Wanting to know or learn more.', 'Curious readers often ask better questions.', '/kyoor-ee-us/', null, array['inquisitive', 'interested'], array['indifferent'], 'approved'),
  ('Discreet', 'discreet', 'adjective', 'upper_intermediate', 'relationships', 42, 81, 'Careful to avoid revealing private information.', 'Be discreet when discussing sensitive details.', '/dis-kreet/', null, array['careful', 'private'], array['careless'], 'approved'),
  ('Perceptive', 'perceptive', 'adjective', 'upper_intermediate', 'thinking', 45, 83, 'Good at noticing or understanding things.', 'Her perceptive question changed the meeting.', '/pur-sep-tiv/', null, array['insightful', 'observant'], array['unaware'], 'approved'),
  ('Resourceful', 'resourceful', 'adjective', 'upper_intermediate', 'professional', 44, 86, 'Good at finding ways to solve problems.', 'The resourceful assistant found a simple workaround.', '/ri-sors-ful/', null, array['inventive', 'capable'], array['helpless'], 'approved'),
  ('Thorough', 'thorough', 'adjective', 'intermediate', 'professional', 60, 87, 'Complete and careful.', 'A thorough review catches hidden problems.', '/thur-oh/', null, array['complete', 'careful'], array['superficial'], 'approved'),
  ('Conciliate', 'conciliate', 'verb', 'advanced', 'relationships', 24, 66, 'To reduce anger and help people reach agreement.', 'The mediator tried to conciliate both sides.', '/kun-sil-ee-ayt/', null, array['appease', 'reconcile'], array['provoke'], 'review'),
  ('Mitigate', 'mitigate', 'verb', 'advanced', 'professional', 42, 82, 'To make something less severe or harmful.', 'The backup plan helped mitigate the risk.', '/mit-i-gayt/', null, array['reduce', 'lessen'], array['worsen'], 'approved'),
  ('Scrutinize', 'scrutinize', 'verb', 'advanced', 'academic', 34, 78, 'To examine something very carefully.', 'Reviewers scrutinize the proposal before approval.', '/skroo-tuh-nyz/', null, array['inspect', 'examine'], array['ignore'], 'approved'),
  ('Synthesize', 'synthesize', 'verb', 'advanced', 'academic', 33, 79, 'To combine parts into a clear whole.', 'The article synthesizes findings from several studies.', '/sin-thuh-syz/', null, array['combine', 'integrate'], array['separate'], 'approved'),
  ('Elaborate', 'elaborate', 'verb', 'upper_intermediate', 'communication', 52, 84, 'To explain something in more detail.', 'Could you elaborate on the second point?', '/ih-lab-uh-rayt/', null, array['explain', 'expand'], array['summarize'], 'approved'),
  ('Summarize', 'summarize', 'verb', 'intermediate', 'communication', 61, 89, 'To state the main points briefly.', 'Summarize the article in three sentences.', '/sum-uh-ryz/', null, array['outline', 'condense'], array['expand'], 'approved'),
  ('Clarify', 'clarify', 'verb', 'elementary', 'communication', 68, 91, 'To make something easier to understand.', 'The diagram helped clarify the process.', '/klar-uh-fy/', null, array['explain', 'simplify'], array['confuse'], 'approved'),
  ('Refine', 'refine', 'verb', 'intermediate', 'work', 58, 88, 'To improve something by making small careful changes.', 'They refine the draft before sending it.', '/ri-fyn/', null, array['improve', 'polish'], array['worsen'], 'approved'),
  ('Assess', 'assess', 'verb', 'intermediate', 'academic', 64, 87, 'To judge or estimate the nature or value of something.', 'The teacher will assess each project fairly.', '/uh-ses/', null, array['evaluate', 'measure'], array['ignore'], 'approved'),
  ('Criteria', 'criteria', 'noun', 'upper_intermediate', 'academic', 54, 82, 'Standards used to judge or decide something.', 'The proposal meets all three criteria.', '/kry-teer-ee-uh/', null, array['standards', 'measures'], array[]::text[], 'approved'),
  ('Resonate', 'resonate', 'verb', 'upper_intermediate', 'communication', 41, 79, 'To feel meaningful or emotionally true to someone.', 'The story may resonate with many readers.', '/rez-uh-nayt/', null, array['connect', 'echo'], array['alienate'], 'approved'),
  ('Foster', 'foster', 'verb', 'intermediate', 'relationships', 53, 84, 'To encourage the growth or development of something.', 'Good mentors foster confidence in learners.', '/faw-stur/', null, array['encourage', 'nurture'], array['discourage'], 'approved'),
  ('Cultivate', 'cultivate', 'verb', 'upper_intermediate', 'education', 48, 84, 'To develop a skill, habit, or quality over time.', 'Daily reading can cultivate stronger vocabulary.', '/kul-tuh-vayt/', null, array['develop', 'nurture'], array['neglect'], 'approved'),
  ('Fluent', 'fluent', 'adjective', 'intermediate', 'communication', 61, 86, 'Able to express something smoothly and easily.', 'Practice helped her become fluent in formal writing.', '/floo-unt/', null, array['smooth', 'articulate'], array['halting'], 'approved'),
  ('Persuade', 'persuade', 'verb', 'intermediate', 'communication', 66, 88, 'To cause someone to believe or do something through reasons.', 'Clear evidence can persuade a cautious audience.', '/pur-swayd/', null, array['convince', 'influence'], array['dissuade'], 'approved'),
  ('Comprehend', 'comprehend', 'verb', 'intermediate', 'education', 57, 86, 'To understand something fully.', 'It took time to comprehend the whole argument.', '/kom-pri-hend/', null, array['understand', 'grasp'], array['misunderstand'], 'approved'),
  ('Retain', 'retain', 'verb', 'intermediate', 'education', 63, 85, 'To keep or remember something.', 'Short reviews help learners retain new words.', '/ri-tayn/', null, array['keep', 'preserve'], array['lose'], 'approved'),
  ('Apply', 'apply', 'verb', 'elementary', 'education', 80, 88, 'To use an idea, rule, or skill in a practical situation.', 'Try to apply the new word in a sentence.', '/uh-ply/', null, array['use', 'employ'], array['ignore'], 'approved'),
  ('Contrast', 'contrast', 'verb', 'intermediate', 'academic', 60, 84, 'To compare things by showing their differences.', 'Contrast the two examples before choosing one.', '/kun-trast/', null, array['compare', 'differentiate'], array['match'], 'approved'),
  ('Emphasize', 'emphasize', 'verb', 'intermediate', 'communication', 62, 87, 'To give special importance or attention to something.', 'The coach emphasized steady practice.', '/em-fuh-syz/', null, array['stress', 'highlight'], array['downplay'], 'approved'),
  ('Convey', 'convey', 'verb', 'intermediate', 'communication', 58, 87, 'To communicate an idea, feeling, or message.', 'Tone can convey respect even in a short note.', '/kun-vay/', null, array['communicate', 'express'], array['hide'], 'approved'),
  ('Appreciate', 'appreciate', 'verb', 'intermediate', 'emotions', 70, 87, 'To recognize the value or importance of something.', 'I appreciate the care you put into the work.', '/uh-pree-shee-ayt/', null, array['value', 'recognize'], array['dismiss'], 'approved'),
  ('Gratitude', 'gratitude', 'noun', 'intermediate', 'emotions', 52, 83, 'A feeling of thankfulness.', 'She expressed gratitude for the support.', '/grat-i-tood/', null, array['thanks', 'appreciation'], array['resentment'], 'approved'),
  ('Integrity', 'integrity', 'noun', 'upper_intermediate', 'personality', 56, 88, 'Honesty and strong moral principles.', 'Integrity matters most when no one is watching.', '/in-teg-ri-tee/', null, array['honesty', 'principle'], array['dishonesty'], 'approved'),
  ('Restraint', 'restraint', 'noun', 'upper_intermediate', 'emotions', 45, 78, 'Calm control over actions or feelings.', 'She showed restraint during the tense exchange.', '/ri-straynt/', null, array['control', 'moderation'], array['excess'], 'approved'),
  ('Inclusive', 'inclusive', 'adjective', 'intermediate', 'society', 56, 86, 'Welcoming and involving different kinds of people.', 'An inclusive classroom helps students feel respected.', '/in-kloo-siv/', null, array['welcoming', 'open'], array['exclusive'], 'approved'),
  ('Equitable', 'equitable', 'adjective', 'advanced', 'society', 35, 78, 'Fair and reasonable for everyone involved.', 'The policy aims for an equitable distribution of resources.', '/ek-wi-tuh-bul/', null, array['fair', 'just'], array['unfair'], 'approved'),
  ('Ecosystem', 'ecosystem', 'noun', 'intermediate', 'nature', 58, 82, 'A community of living things and their environment.', 'Pollution can damage an entire ecosystem.', '/ee-koh-sis-tum/', null, array['habitat', 'environment'], array[]::text[], 'approved'),
  ('Biodiversity', 'biodiversity', 'noun', 'advanced', 'science', 42, 80, 'The variety of living things in a place.', 'Biodiversity helps natural systems stay healthy.', '/by-oh-di-vur-si-tee/', null, array['variety', 'diversity'], array[]::text[], 'review'),
  ('Hypothesis', 'hypothesis', 'noun', 'advanced', 'science', 48, 82, 'An idea tested through evidence or experiment.', 'The scientist formed a hypothesis before collecting data.', '/hy-poth-uh-sis/', null, array['theory', 'proposal'], array['fact'], 'approved'),
  ('Prototype', 'prototype', 'noun', 'upper_intermediate', 'technology', 48, 83, 'An early model used to test an idea.', 'The prototype revealed a problem in the workflow.', '/proh-tuh-typ/', null, array['model', 'sample'], array[]::text[], 'approved'),
  ('Interface', 'interface', 'noun', 'intermediate', 'technology', 62, 85, 'The part of a system people use to interact with it.', 'A simple interface reduces user confusion.', '/in-tur-fays/', null, array['control', 'surface'], array[]::text[], 'approved'),
  ('Accessible', 'accessible', 'adjective', 'intermediate', 'technology', 62, 88, 'Easy for people to reach, use, or understand.', 'Accessible design benefits many kinds of users.', '/ak-ses-uh-bul/', null, array['usable', 'available'], array['inaccessible'], 'approved'),
  ('Itinerary', 'itinerary', 'noun', 'upper_intermediate', 'travel', 42, 76, 'A plan for a journey or series of activities.', 'The itinerary includes two museums and a walking tour.', '/eye-tin-uh-rair-ee/', null, array['schedule', 'route'], array[]::text[], 'approved'),
  ('Wellbeing', 'wellbeing', 'noun', 'intermediate', 'health', 54, 84, 'A person''s general health and happiness.', 'Sleep has a strong effect on wellbeing.', '/wel-bee-ing/', null, array['health', 'welfare'], array['distress'], 'approved'),
  ('Routine', 'routine', 'noun', 'elementary', 'everyday_life', 72, 86, 'A regular way of doing things.', 'A morning routine can make learning easier.', '/roo-teen/', null, array['habit', 'pattern'], array['change'], 'approved')
on conflict (normalized_word) do update set
  word = excluded.word,
  part_of_speech = excluded.part_of_speech,
  difficulty_level = excluded.difficulty_level,
  category = excluded.category,
  frequency_score = excluded.frequency_score,
  usefulness_score = excluded.usefulness_score,
  definition = excluded.definition,
  example_sentence = excluded.example_sentence,
  pronunciation = excluded.pronunciation,
  pronunciation_audio_url = excluded.pronunciation_audio_url,
  synonyms = excluded.synonyms,
  antonyms = excluded.antonyms,
  status = excluded.status;

insert into public.word_bank (
  word,
  normalized_word,
  difficulty_level,
  category,
  frequency_score,
  usefulness_score,
  definition,
  example_sentence,
  pronunciation,
  status
)
select
  initcap(dw.word),
  lower(dw.word),
  'elementary',
  'everyday_life',
  null,
  70,
  dw.definition,
  'Use this word in a clear sentence to make it part of your vocabulary.',
  '/' || lower(dw.word) || '/',
  'approved'
from public.daily_words dw
where dw.word is not null
on conflict (normalized_word) do nothing;

update public.daily_words dw
set word_id = wb.id
from public.word_bank wb
where dw.word_id is null
  and lower(dw.word) = wb.normalized_word;
