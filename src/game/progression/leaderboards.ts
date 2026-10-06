import type { CombatantScore } from '../match/bot-skirmish-match';

export type LeaderboardMetric = 'damage' | 'kills' | 'healing' | 'deaths';
export type MatchLeaderboard = Readonly<{
  metric: LeaderboardMetric;
  label: string;
  entries: readonly CombatantScore[];
}>;

const CATEGORIES: readonly Readonly<{ metric: LeaderboardMetric; label: string }>[] = Object.freeze([
  Object.freeze({ metric: 'damage', label: 'Most damage' }),
  Object.freeze({ metric: 'kills', label: 'Most kills' }),
  Object.freeze({ metric: 'healing', label: 'Most healing' }),
  Object.freeze({ metric: 'deaths', label: 'Most deaths' }),
]);

/** Produces stable top-five leaderboards; ties break on kills and then actor ID. */
export function buildMatchLeaderboards(scores: readonly CombatantScore[], limit = 5): readonly MatchLeaderboard[] {
  if (!Number.isInteger(limit) || limit <= 0) throw new RangeError('Leaderboard limit must be a positive integer');
  return Object.freeze(CATEGORIES.map(({ metric, label }) => Object.freeze({
    metric,
    label,
    entries: Object.freeze([...scores].sort((a, b) =>
      b[metric] - a[metric] || b.kills - a.kills || a.id.localeCompare(b.id),
    ).slice(0, limit)),
  })));
}
