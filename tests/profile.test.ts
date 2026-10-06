import { describe, expect, it } from 'vitest';
import {
  PROFILE_STORAGE_KEY,
  PROFILE_VERSION,
  calculateMatchReward,
  claimMatchReward,
  createDefaultProfile,
  loadProfile,
  purchaseSkill,
  saveProfile,
  updateProfileSettings,
  type ProfileStorage,
} from '../src/game/progression/profile';

class MemoryStorage implements ProfileStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('versioned local profile', () => {
  it('recovers missing, malformed, unsupported, and unavailable saves', () => {
    const storage = new MemoryStorage();
    expect(loadProfile(storage).recovery).toBe('missing');
    storage.values.set(PROFILE_STORAGE_KEY, '{bad json');
    expect(loadProfile(storage).recovery).toBe('invalid');
    storage.values.set(PROFILE_STORAGE_KEY, JSON.stringify({ version: PROFILE_VERSION + 1 }));
    expect(loadProfile(storage).recovery).toBe('unsupported');
    expect(loadProfile(null).recovery).toBe('unavailable');

    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadProfile(blocked).recovery).toBe('unavailable');
    expect(saveProfile(blocked, createDefaultProfile())).toBe(false);
  });

  it('round-trips validated settings and progression through storage', () => {
    const storage = new MemoryStorage();
    const profile = updateProfileSettings(createDefaultProfile(), {
      selectedMap: 'garden-district',
      lookSensitivity: 0.003,
    });
    expect(saveProfile(storage, profile)).toBe(true);
    expect(loadProfile(storage)).toEqual({ profile, recovery: 'loaded' });
    storage.values.set(PROFILE_STORAGE_KEY, JSON.stringify({ ...profile, credits: -1 }));
    expect(loadProfile(storage).recovery).toBe('invalid');
    expect(() => updateProfileSettings(profile, { lookSensitivity: 0.01 })).toThrow(RangeError);
  });

  it('uses the transparent placeholder formula and applies purchased progression bonuses', () => {
    const starting = createDefaultProfile();
    const performance = { damage: 137, kills: 2, healing: 50, deaths: 1, revives: 1 };
    expect(calculateMatchReward(starting, performance)).toEqual({ xp: 183, credits: 95 });

    const funded = { ...starting, credits: 700 };
    const xpPurchase = purchaseSkill(funded, 'field-notes');
    expect(xpPurchase.reason).toBe('purchased');
    expect(xpPurchase.profile.credits).toBe(450);
    expect(purchaseSkill(xpPurchase.profile, 'field-notes').reason).toBe('owned');
    expect(calculateMatchReward(xpPurchase.profile, performance)).toEqual({ xp: 228, credits: 95 });
    const economyPurchase = purchaseSkill(xpPurchase.profile, 'scrounger');
    expect(economyPurchase.reason).toBe('purchased');
    expect(calculateMatchReward(economyPurchase.profile, performance)).toEqual({ xp: 228, credits: 118 });
  });

  it('claims each match reward once and bounds its idempotency history', () => {
    const profile = createDefaultProfile();
    const performance = { damage: 0, kills: 1, healing: 0, deaths: 0, revives: 0 };
    const first = claimMatchReward(profile, 'match-001', performance);
    expect(first.alreadyClaimed).toBe(false);
    expect(first.profile.xp).toBe(125);
    expect(first.profile.credits).toBe(60);
    const duplicate = claimMatchReward(first.profile, 'match-001', performance);
    expect(duplicate.alreadyClaimed).toBe(true);
    expect(duplicate.profile).toBe(first.profile);
    expect(duplicate.reward).toEqual({ xp: 0, credits: 0 });
    expect(() => claimMatchReward(profile, '  ', performance)).toThrow('match ID');
  });
});
