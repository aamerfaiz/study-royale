import { Card, Meter } from '@/components/ui';
import { levelProgress } from '@/lib/gamification';

export function StreakTile({
  days,
  freezes,
}: {
  days: number;
  freezes: number;
}) {
  return (
    <div className="rounded-[18px] bg-gradient-to-b from-flame-tint to-flame/15 p-4">
      <div className="flex items-center gap-1.5">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F5793A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2c1 4-3 5-3 9a4 4 0 0 0 8 0c0-2-1-3-1-3s2 1 2 5a6 6 0 0 1-12 0c0-6 6-7 6-11z" />
        </svg>
        <span className="text-[12px] font-bold text-gold-ink">GROUP STREAK</span>
      </div>
      <p className="font-display mt-1 text-[26px] leading-tight font-bold text-flame">
        {days} {days === 1 ? 'day' : 'days'}
      </p>
      <p className="text-[11px] text-ink-muted">
        {freezes > 0
          ? `${freezes} freeze available this week`
          : 'No freeze left this week'}
      </p>
    </div>
  );
}

export function LevelTile({ totalXp }: { totalXp: number }) {
  const progress = levelProgress(totalXp);

  return (
    <Card className="flex flex-col justify-center gap-1.5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-ink-muted">
          LEVEL {progress.level}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5A524">
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z" />
        </svg>
      </div>
      <Meter value={progress.fraction} />
      <p className="text-[11px] text-ink-muted">
        {progress.intoLevel.toLocaleString()}/{progress.levelSpan.toLocaleString()} XP
      </p>
    </Card>
  );
}
