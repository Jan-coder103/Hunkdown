import type { ChickenColor } from '../../content/assets/tactical-chicken.asset';

export type RoundTeamColors = Readonly<{ friendly: ChickenColor; enemy: ChickenColor }>;

/** Choose once per round, independently of the map and simulation seed. */
export function chooseRoundTeamColors(random: () => number = Math.random): RoundTeamColors {
  const colors = ['green', 'red', 'blue'] as const;
  const sample = random();
  const index = Math.max(0, Math.min(2, Math.floor((Number.isFinite(sample) ? sample : 0) * 3)));
  return Object.freeze({ friendly: 'yellow', enemy: colors[index]! });
}
