import assert from 'node:assert/strict';
import { test } from 'node:test';

function formatReminderTime(time) {
  const hour12 = time.hour % 12 || 12;
  const period = time.hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${`${time.minute}`.padStart(2, '0')} ${period}`;
}

function toReminderKey(time) {
  return `${`${time.hour}`.padStart(2, '0')}:${`${time.minute}`.padStart(2, '0')}`;
}

function nextReminderDate(time, now = new Date(), skipToday = false) {
  const candidate = new Date(now);
  candidate.setHours(time.hour, time.minute, 0, 0);
  if (skipToday || candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

test('default reminder time displays as 8:00 PM', () => {
  assert.equal(formatReminderTime({ hour: 20, minute: 0 }), '8:00 PM');
});

test('reminder time key is stable for schedule metadata', () => {
  assert.equal(toReminderKey({ hour: 8, minute: 5 }), '08:05');
});

test('next reminder uses today when scheduled time is still ahead', () => {
  const next = nextReminderDate({ hour: 20, minute: 0 }, new Date('2026-08-13T18:00:00'));
  assert.equal(next.getDate(), 13);
  assert.equal(next.getHours(), 20);
  assert.equal(next.getMinutes(), 0);
});

test('next reminder rolls to tomorrow when scheduled time has passed', () => {
  const next = nextReminderDate({ hour: 20, minute: 0 }, new Date('2026-08-13T21:00:00'));
  assert.equal(next.getDate(), 14);
  assert.equal(next.getHours(), 20);
});

test('completed today skips to tomorrow even before reminder time', () => {
  const next = nextReminderDate({ hour: 20, minute: 0 }, new Date('2026-08-13T12:00:00'), true);
  assert.equal(next.getDate(), 14);
  assert.equal(next.getHours(), 20);
});
