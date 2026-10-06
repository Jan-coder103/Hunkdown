import { describe, expect, it } from 'vitest';
import { BotSkirmishMatch } from '../src/game/match/bot-skirmish-match';
import { generateMap } from '../src/game/world/map-generator';
import { createEmptyMap } from '../src/game/world/map-types';

describe('bot skirmish match start', () => {
  it('holds bots at their spawns during countdown, then advances the battle', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 44, cellSize: 4 }));
    const match = new BotSkirmishMatch(
      map,
      { friendlyCount: 1, enemyCount: 1, seed: 44 },
      { seed: 44 },
    );
    const initial = match.simulation.snapshots;

    const waitingStep = match.step(19.9);
    expect(match.matchState).toBe('countdown');
    expect(waitingStep.shots).toHaveLength(0);
    expect(match.simulation.snapshots.map((bot) => bot.position)).toEqual(initial.map((bot) => bot.position));
    expect(match.countdown.secondsRemaining).toBeCloseTo(0.1);

    match.step(0.1);
    expect(match.matchState).toBe('active');
    for (let step = 0; step < 60; step += 1) match.step(1 / 60);
    expect(match.simulation.snapshots.some((bot, index) => {
      const spawn = initial[index];
      return spawn && Math.hypot(bot.position.x - spawn.position.x, bot.position.z - spawn.position.z) > 0.1;
    })).toBe(true);
  });
});
