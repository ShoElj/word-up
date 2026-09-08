export const DEFAULT_CURRICULUM_START_DATE = '2026-09-15';
export const CURRICULUM_LENGTH_DAYS = 365;

export function dateKeyForTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new RangeError('Invalid timezone date parts');
  }

  return `${year}-${month}-${day}`;
}

export function daysBetweenDateKeys(startKey, endKey) {
  const start = new Date(`${startKey}T00:00:00Z`);
  const end = new Date(`${endKey}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

export function curriculumDayForDate(dateKey, startDate = DEFAULT_CURRICULUM_START_DATE) {
  return daysBetweenDateKeys(startDate, dateKey) + 1;
}

export function curriculumStateForDate(dateKey, startDate = DEFAULT_CURRICULUM_START_DATE) {
  const curriculumDay = curriculumDayForDate(dateKey, startDate);
  if (curriculumDay < 1) {
    return { state: 'not_started', curriculumDay };
  }
  if (curriculumDay > CURRICULUM_LENGTH_DAYS) {
    return { state: 'complete', curriculumDay };
  }
  return { state: 'active', curriculumDay };
}
