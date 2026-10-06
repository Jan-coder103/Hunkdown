import { describe, expect, it } from 'vitest';
import { buildMatchLeaderboards } from '../src/game/progression/leaderboards';
import type { CombatantScore } from '../src/game/match/bot-skirmish-match';

const scores: readonly CombatantScore[] = [
  { id: 'friendly-002', team: 'friendly', damage: 80, kills: 2, healing: 0, deaths: 1, revives: 0 },
  { id: 'player', team: 'friendly', damage: 120, kills: 2, healing: 50, deaths: 3, revives: 1 },
  { id: 'enemy-001', team: 'enemy', damage: 120, kills: 1, healing: 0, deaths: 2, revives: 0 },
  { id: 'enemy-002', team: 'enemy', damage: 25, kills: 0, healing: 0, deaths: 0, revives: 0 },
];

describe('match leaderboards', () => {
  it('ranks damage, kills, healing, and deaths with stable tie breaks', () => {
    const boards = buildMatchLeaderboards(scores);
    expect(boards.map((board) => board.label)).toEqual(['Most damage', 'Most kills', 'Most healing', 'Most deaths']);
    expect(boards[0]?.entries.map((entry) => entry.id)).toEqual(['player', 'enemy-001', 'friendly-002', 'enemy-002']);
    expect(boards[1]?.entries.map((entry) => entry.id)).toEqual(['friendly-002', 'player', 'enemy-001', 'enemy-002']);
    expect(boards[2]?.entries[0]?.id).toBe('player');
    expect(boards[3]?.entries.map((entry) => entry.id)).toEqual(['player', 'enemy-001', 'friendly-002', 'enemy-002']);
  });

  it('limits each board to five entries and rejects invalid limits', () => {
    expect(buildMatchLeaderboards(scores, 2).every((board) => board.entries.length === 2)).toBe(true);
    expect(() => buildMatchLeaderboards(scores, 0)).toThrow(RangeError);
  });
});
