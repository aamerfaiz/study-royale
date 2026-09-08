import assert from 'node:assert/strict';
import { test } from 'node:test';
import { levelForXp, levelProgress, sessionXp, xpForLevel } from './gamification.ts';

// These must match public.session_xp() / public.level_for_xp() in the database,
// which are authoritative. Values from docs/03-gamification-engine.md.
test('sessionXp uses diminishing returns', () => {
  assert.equal(sessionXp(25), 50);
  assert.equal(sessionXp(100), 100); // 4x the time, only 2x the reward
  assert.equal(sessionXp(1), 10);
  assert.equal(sessionXp(0), 0);
});

test('levelForXp matches floor(sqrt(xp / 100))', () => {
  assert.equal(levelForXp(0), 0);
  assert.equal(levelForXp(99), 0);
  assert.equal(levelForXp(100), 1);
  assert.equal(levelForXp(170), 1);
  assert.equal(levelForXp(400), 2);
  assert.equal(levelForXp(10_000), 10);
});

test('xpForLevel inverts levelForXp', () => {
  for (let level = 0; level <= 20; level++) {
    assert.equal(levelForXp(xpForLevel(level)), level);
    if (level > 0) assert.equal(levelForXp(xpForLevel(level) - 1), level - 1);
  }
});

test('levelProgress reports the span to the next level', () => {
  const p = levelProgress(170);
  assert.equal(p.level, 1);
  assert.equal(p.intoLevel, 70); // 170 - 100
  assert.equal(p.levelSpan, 300); // 400 - 100
  assert.equal(p.xpToNext, 230);
  assert.ok(p.fraction > 0.23 && p.fraction < 0.24);
});
