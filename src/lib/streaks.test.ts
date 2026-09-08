import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentStreak } from './streaks.ts';

const day = (d: string, hit: boolean) => ({ date: d, hit_goal: hit });

test('counts back from the most recent evaluated day', () => {
  const rows = [
    day('2026-08-31', true),
    day('2026-08-30', true),
    day('2026-08-29', true),
    day('2026-08-28', false),
  ];
  assert.equal(currentStreak(rows, '2026-08-31'), 3);
});

test('a missed day ends the streak', () => {
  const rows = [day('2026-08-31', false), day('2026-08-30', true)];
  assert.equal(currentStreak(rows, '2026-08-31'), 0);
});

test('falls back to yesterday when today is not evaluated yet', () => {
  const rows = [day('2026-08-30', true), day('2026-08-29', true)];
  assert.equal(currentStreak(rows, '2026-08-31'), 2);
});

test('a gap in the record breaks the streak rather than being skipped', () => {
  // 08-30 was never evaluated. Trusting row order would report 3.
  const rows = [day('2026-08-31', true), day('2026-08-29', true), day('2026-08-28', true)];
  assert.equal(currentStreak(rows, '2026-08-31'), 1);
});

test('crosses a month boundary', () => {
  const rows = [day('2026-09-01', true), day('2026-08-31', true), day('2026-08-30', true)];
  assert.equal(currentStreak(rows, '2026-09-01'), 3);
});

test('no rows means no streak', () => {
  assert.equal(currentStreak([], '2026-08-31'), 0);
});
