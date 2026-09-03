import { Card, SectionTitle } from '@/components/ui';

export type AchievementView = {
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  earned: boolean;
};

export function AchievementGrid({ achievements }: { achievements: AchievementView[] }) {
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <SectionTitle>Achievements</SectionTitle>
        <span className="text-[12px] text-ink-muted">
          {earned} of {achievements.length}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {achievements.map((a) => (
          <li
            key={a.key}
            title={a.description ?? undefined}
            className={
              a.earned
                ? 'rounded-tile bg-sunken p-3 text-center'
                : 'rounded-tile border border-dashed border-hairline-strong p-3 text-center opacity-55'
            }
          >
            <span className="text-[22px]" aria-hidden>
              {a.earned ? (a.icon ?? '🏅') : '🔒'}
            </span>
            <p className="mt-1 text-[11.5px] leading-tight font-bold text-ink-strong">
              {a.name}
            </p>
            {a.description && (
              <p className="mt-0.5 text-[10.5px] leading-tight text-ink-faint">
                {a.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
