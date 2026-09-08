import { DAILY_EPOCH } from '@/constants/game';

export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetween(startKey: string, endKey: string) {
  const start = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

export function getDailyNumber(date = new Date()) {
  return daysBetween(DAILY_EPOCH, toDateKey(date)) + 1;
}

export function getNextMidnight(date = new Date()) {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return next;
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => `${value}`.padStart(2, '0')).join(':');
}

export function longDate(dateKey: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function shortDate(dateKey: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
  })
    .format(new Date(`${dateKey}T12:00:00`))
    .toUpperCase();
}
