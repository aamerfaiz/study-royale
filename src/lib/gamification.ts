// XP and level formulas (docs/03-gamification-engine.md).
//
// These mirror public.session_xp() / public.level_for_xp() in the database.
// The database is authoritative — XP is only ever written by the
// log_study_session() and submit_quiz_attempt() RPCs. These exist so the UI can
// preview a reward ("this 25-min session earns ~50 XP") without a round trip.

/** Diminishing returns: 4x the minutes is only 2x the XP. */
export function sessionXp(minutes: number): number {
  return Math.round(10 * Math.sqrt(Math.max(minutes, 0)));
}

export function levelForXp(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(totalXp, 0) / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

/** Progress through the current level, 0..1, for the dashboard XP bar. */
export function levelProgress(totalXp: number): {
  level: number;
  intoLevel: number;
  levelSpan: number;
  fraction: number;
  xpToNext: number;
} {
  const level = levelForXp(totalXp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const levelSpan = ceiling - floor;
  const intoLevel = totalXp - floor;
  return {
    level,
    intoLevel,
    levelSpan,
    fraction: levelSpan > 0 ? intoLevel / levelSpan : 0,
    xpToNext: ceiling - totalXp,
  };
}

export const GROUP_TYPE_BY_SIZE = ['solo', 'solo', 'duo', 'trio', 'squad'] as const;
export const MAX_GROUP_MEMBERS = 4;
