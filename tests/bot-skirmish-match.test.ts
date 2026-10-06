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
    expect(match.simulation.snapshots.map((bot) => bot.position)).toEqual(initial.map((bot) => bot.position));
    for (let step = 0; step < 60; step += 1) match.step(1 / 60);
    expect(match.simulation.snapshots.some((bot, index) => {
      const spawn = initial[index];
      return spawn && Math.hypot(bot.position.x - spawn.position.x, bot.position.z - spawn.position.z) > 0.1;
    })).toBe(true);
  });

  it('awards a capture after one team controls the objective and freezes the result', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 19, cellSize: 4 }));
    const match = new BotSkirmishMatch(
      map,
      { friendlyCount: 1, enemyCount: 0, seed: 19 },
      { seed: 19 },
      0.01,
      { captureDurationSeconds: 0.5, captureRadius: 5, respawnDelaySeconds: 2 },
    );
    for (let step = 0; step < 400 && match.matchState !== 'complete'; step += 1) match.step(0.05);

    expect(match.outcome).toEqual({ winner: 'friendly', reason: 'capture' });
    expect(match.matchState).toBe('complete');
    const before = match.simulation.snapshots;
    match.step(10);
    expect(match.simulation.snapshots).toEqual(before);
  });

  it('revives before respawn without spending a ticket and removes the corpse immediately', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 44, cellSize: 4 }));
    const match = new BotSkirmishMatch(
      map,
      { friendlyCount: 2, enemyCount: 2, seed: 44 },
      { seed: 44 },
      0.01,
      { captureDurationSeconds: 100, captureRadius: 0.1, respawnDelaySeconds: 5, reviveDurationSeconds: 0.15, corpseLifetimeSeconds: 3 },
    );
    let targetId: string | null = null;
    let reviverId: string | null = null;
    for (let step = 0; step < 1200 && !targetId; step += 1) {
      match.step(1 / 60);
      const bots = match.simulation.snapshots;
      for (const bot of bots) {
        if (bot.status !== 'dead') continue;
        const teammate = bots.find((candidate) => candidate.team === bot.team && candidate.status === 'alive');
        if (teammate) {
          targetId = bot.id;
          reviverId = teammate.id;
          break;
        }
      }
    }
    expect(targetId).not.toBeNull();
    expect(reviverId).not.toBeNull();
    const targetTeam = match.simulation.snapshots.find((bot) => bot.id === targetId)?.team;
    const wrongTeamReviverId = match.simulation.snapshots.find((bot) => bot.team !== targetTeam && bot.status === 'alive')?.id;
    expect(match.beginRevive(targetId!, targetId!)).toBe(false);
    expect(match.beginRevive(targetId!, wrongTeamReviverId ?? '')).toBe(false);
    expect(match.beginRevive(targetId!, reviverId!)).toBe(true);
    expect(match.beginRevive(targetId!, reviverId!)).toBe(false);
    const tickets = match.tickets;
    const corpseId = match.corpseSnapshots.find((corpse) => corpse.botId === targetId)?.id;
    expect(corpseId).toBeDefined();

    match.step(0.1);
    expect(match.lifeSnapshots.find((life) => life.botId === targetId)?.reviveProgress).toBeCloseTo(2 / 3);
    expect(match.cancelRevive(targetId!)).toBe(true);
    expect(match.lifeSnapshots.find((life) => life.botId === targetId)?.reviveProgress).toBeNull();
    expect(match.beginRevive(targetId!, reviverId!)).toBe(true);
    match.step(0.16);

    const revived = match.simulation.snapshots.find((bot) => bot.id === targetId);
    expect(revived?.status).toBe('alive');
    expect(revived?.health).toBe(50);
    expect(match.tickets).toEqual(tickets);
    expect(match.corpseSnapshots.some((corpse) => corpse.id === corpseId)).toBe(false);
  });

  it('charges a respawn once and ends the round when that team reaches zero tickets', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 61, cellSize: 4 }));
    const match = new BotSkirmishMatch(
      map,
      { friendlyCount: 2, enemyCount: 2, seed: 61 },
      { seed: 61 },
      0.01,
      { captureDurationSeconds: 100, captureRadius: 0.1, respawnDelaySeconds: 0.2, corpseLifetimeSeconds: 3, initialTickets: 1 },
    );
    for (let step = 0; step < 1800 && match.matchState !== 'complete'; step += 1) match.step(1 / 60);

    expect(match.matchState).toBe('complete');
    expect(match.outcome?.reason).toBe('tickets');
    expect(match.tickets.friendly === 0 || match.tickets.enemy === 0).toBe(true);
    if (match.tickets.friendly === 0 && match.tickets.enemy === 0) {
      expect(match.outcome?.winner).toBe('draw');
    } else {
      expect(match.outcome?.winner).toBe(match.tickets.friendly === 0 ? 'enemy' : 'friendly');
    }
  });

  it('lets the living player revive a teammate and owns the player death, respawn, and ticket lifecycle', () => {
    const map = generateMap(createEmptyMap({ width: 5, height: 3, seed: 71, cellSize: 4 }));
    const match = new BotSkirmishMatch(
      map,
      { friendlyCount: 1, enemyCount: 0, seed: 71 },
      {
        seed: 71,
        humanPlayer: { id: 'player', team: 'friendly', spawn: { x: -8, y: 0, z: 0 } },
        thinkInterval: 100,
      },
      0.01,
      { captureDurationSeconds: 100, captureRadius: 0.1, respawnDelaySeconds: 0.2, reviveDurationSeconds: 0.1, initialTickets: 4 },
    );
    const player = match.simulation.playerCombatant;
    const teammate = match.simulation.getCombatant('friendly-001');
    expect(player).not.toBeNull();
    expect(teammate).not.toBeNull();
    teammate?.applyDamage(100);
    match.step(0.02);
    expect(match.corpseSnapshots.some((corpse) => corpse.botId === 'friendly-001')).toBe(true);
    expect(match.beginRevive('friendly-001', 'player')).toBe(true);
    match.step(0.1);
    expect(teammate?.status).toBe('alive');
    expect(match.corpseSnapshots.some((corpse) => corpse.botId === 'friendly-001')).toBe(false);

    player?.applyDamage(100);
    match.step(0.02);
    expect(match.lifeSnapshots.find((life) => life.botId === 'player')?.respawnSecondsRemaining).toBeCloseTo(0.2);
    match.step(0.2);
    expect(player?.status).toBe('alive');
    expect(player?.health).toBe(100);
    expect(match.tickets.friendly).toBe(3);
  });
});
