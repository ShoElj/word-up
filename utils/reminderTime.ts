import { ReminderTime } from '@/types/player';

export function formatReminderTime(time: ReminderTime) {
  const hour12 = time.hour % 12 || 12;
  const period = time.hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${`${time.minute}`.padStart(2, '0')} ${period}`;
}

export function toReminderKey(time: ReminderTime) {
  return `${`${time.hour}`.padStart(2, '0')}:${`${time.minute}`.padStart(2, '0')}`;
}

export function nextReminderDate(time: ReminderTime, now = new Date(), skipToday = false) {
  const candidate = new Date(now);
  candidate.setHours(time.hour, time.minute, 0, 0);

  if (skipToday || candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}
