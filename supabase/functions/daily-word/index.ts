import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';

type DailyWordRequest = {
  timezone?: unknown;
};

const defaultCurriculumStartDate = '2026-09-15';
const curriculumLengthDays = 365;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function dateKeyForTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new RangeError('Invalid timezone date parts');
  }

  return `${year}-${month}-${day}`;
}

function isValidTimezone(timezone: string) {
  try {
    dateKeyForTimezone(timezone);
    return true;
  } catch {
    return false;
  }
}

function daysBetweenDateKeys(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function curriculumDayForDate(dateKey: string, startDate: string) {
  return daysBetweenDateKeys(startDate, dateKey) + 1;
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function getCurriculumStartDate(supabase: ReturnType<typeof createClient>) {
  const envStartDate = Deno.env.get('CURRICULUM_START_DATE');
  if (envStartDate && isDateKey(envStartDate)) {
    return envStartDate;
  }

  const { data } = await supabase
    .from('wordup_app_config')
    .select('value')
    .eq('key', 'CURRICULUM_START_DATE')
    .maybeSingle();

  return typeof data?.value === 'string' && isDateKey(data.value)
    ? data.value
    : defaultCurriculumStartDate;
}

function dailyWordSelect() {
  return `
    id,
    puzzle_date,
    daily_number,
    word_id,
    curriculum_id,
    word,
    definition,
    status,
    word_bank:word_bank!daily_words_word_id_fkey (
      id,
      word,
      normalized_word,
      part_of_speech,
      category,
      definition,
      example_sentence,
      pronunciation,
      pronunciation_audio_url,
      status
    ),
    curriculum:wordup_curriculum!daily_words_curriculum_id_fkey (
      id,
      day_number,
      theme,
      lesson_type,
      difficulty_level,
      status
    )
  `;
}

async function getDailyWordRow(supabase: ReturnType<typeof createClient>, dateKey: string) {
  return supabase
    .from('daily_words')
    .select(dailyWordSelect())
    .eq('puzzle_date', dateKey)
    .in('status', ['published', 'scheduled'])
    .maybeSingle();
}

function responseForDailyWord(data: Record<string, any>) {
  const wordBank = Array.isArray(data.word_bank) ? data.word_bank[0] : data.word_bank;
  const curriculum = Array.isArray(data.curriculum) ? data.curriculum[0] : data.curriculum;

  if (data.word_id && (!wordBank || wordBank.status !== 'approved')) {
    return null;
  }

  const word: string | undefined = wordBank?.word ?? data.word;
  const definition: string | undefined = wordBank?.definition ?? data.definition ?? undefined;

  if (!word || definition == null || definition === '') {
    return null;
  }

  return {
    id: data.id as string,
    dailyNumber: data.daily_number as number,
    date: data.puzzle_date as string,
    word: String(word).toUpperCase(),
    definition,
    example: wordBank?.example_sentence ?? undefined,
    pronunciation: wordBank?.pronunciation ?? undefined,
    audioUrl: wordBank?.pronunciation_audio_url ?? undefined,
    partOfSpeech: wordBank?.part_of_speech ?? undefined,
    category: wordBank?.category ?? undefined,
    curriculumDay: curriculum?.day_number ?? undefined,
    curriculumTheme: curriculum?.theme ?? undefined,
    lessonType: curriculum?.lesson_type ?? undefined,
    difficultyLevel: curriculum?.difficulty_level ?? undefined,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'SERVER_ERROR' }, 405);
  }

  try {
    const body = (await request.json().catch(() => ({}))) as DailyWordRequest;
    const timezone = typeof body.timezone === 'string' ? body.timezone : '';

    if (!timezone || !isValidTimezone(timezone)) {
      return json({ error: 'INVALID_TIMEZONE' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'SERVER_ERROR' }, 500);
    }

    const today = dateKeyForTimezone(timezone);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await getDailyWordRow(supabase, today);

    if (error) {
      return json({ error: 'SERVER_ERROR' }, 500);
    }

    if (data) {
      const response = responseForDailyWord(data);
      return response ? json(response) : json({ error: 'NO_DAILY_WORD' }, 404);
    }

    const curriculumStartDate = await getCurriculumStartDate(supabase);
    const curriculumDay = curriculumDayForDate(today, curriculumStartDate);

    if (curriculumDay < 1) {
      return json({ error: 'NO_DAILY_WORD' }, 404);
    }

    if (curriculumDay > curriculumLengthDays) {
      return json({ error: 'CURRICULUM_COMPLETE' }, 409);
    }

    const { data: curriculum, error: curriculumError } = await supabase
      .from('wordup_curriculum')
      .select(`
        id,
        day_number,
        theme,
        lesson_type,
        difficulty_level,
        status,
        word_bank:word_bank!wordup_curriculum_word_id_fkey (
          id,
          word,
          definition,
          example_sentence,
          pronunciation,
          pronunciation_audio_url,
          part_of_speech,
          category,
          status
        )
      `)
      .eq('day_number', curriculumDay)
      .eq('status', 'approved')
      .maybeSingle();

    if (curriculumError) {
      return json({ error: 'SERVER_ERROR' }, 500);
    }

    const curriculumWordBank = Array.isArray(curriculum?.word_bank) ? curriculum?.word_bank[0] : curriculum?.word_bank;
    if (!curriculum || !curriculumWordBank || curriculumWordBank.status !== 'approved') {
      return json({ error: 'NO_DAILY_WORD' }, 404);
    }

    const { error: insertError } = await supabase.from('daily_words').insert({
      puzzle_date: today,
      daily_number: curriculum.day_number,
      word_id: curriculumWordBank.id,
      curriculum_id: curriculum.id,
      word: String(curriculumWordBank.word).toUpperCase(),
      definition: null,
      status: 'scheduled',
    });

    if (insertError && insertError.code !== '23505') {
      return json({ error: 'SERVER_ERROR' }, 500);
    }

    const { data: created, error: createdError } = await getDailyWordRow(supabase, today);
    if (createdError || !created) {
      return json({ error: 'SERVER_ERROR' }, 500);
    }

    const response = responseForDailyWord(created);
    return response ? json(response) : json({ error: 'NO_DAILY_WORD' }, 404);
  } catch {
    return json({ error: 'SERVER_ERROR' }, 500);
  }
});
