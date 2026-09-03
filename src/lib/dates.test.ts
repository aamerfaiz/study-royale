// Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localDateInTz, startOfLocalDay } from './dates.ts';

// Each case is a zone and an instant; the invariant is that startOfLocalDay
// lands on the first millisecond of that zone's local day.
const CASES: Array<[string, string]> = [
  ['Asia/Karachi', '2026-09-03T10:00:00Z'],
  ['America/Los_Angeles', '2026-09-03T10:00:00Z'],
  ['Pacific/Kiritimati', '2026-09-03T10:00:00Z'], // UTC+14
  ['Pacific/Midway', '2026-09-03T10:00:00Z'], // UTC-11
  ['Asia/Kolkata', '2026-09-03T10:00:00Z'], // half-hour offset
  ['Australia/Adelaide', '2026-09-03T10:00:00Z'], // half-hour offset
  ['Asia/Kathmandu', '2026-09-03T10:00:00Z'], // 45-minute offset
  ['America/New_York', '2026-03-08T12:00:00Z'], // spring forward
  ['America/New_York', '2026-11-01T12:00:00Z'], // fall back
  ['Australia/Lord_Howe', '2026-09-03T10:00:00Z'], // 30-minute DST shift
  ['Europe/London', '2026-03-29T12:00:00Z'],
  ['Asia/Tokyo', '2026-09-03T15:30:00Z'], // already tomorrow locally
  ['UTC', '2026-09-03T00:00:00Z'],
];

for (const [zone, iso] of CASES) {
  test(`startOfLocalDay: ${zone} at ${iso}`, () => {
    const at = new Date(iso);
    const start = startOfLocalDay(at, zone);
    const justBefore = new Date(start.getTime() - 1000);

    assert.equal(localDateInTz(start, zone), localDateInTz(at, zone));
    assert.notEqual(localDateInTz(justBefore, zone), localDateInTz(at, zone));
    assert.ok(start.getTime() <= at.getTime());
  });
}

test('startOfLocalDay falls back to UTC for an unknown zone', () => {
  const at = new Date('2026-09-03T10:00:00Z');
  assert.equal(startOfLocalDay(at, 'Bogus/Zone').toISOString(), '2026-09-03T00:00:00.000Z');
});
