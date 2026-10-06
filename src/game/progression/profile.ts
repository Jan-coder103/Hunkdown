export const PROFILE_STORAGE_KEY = 'operation-honkdown-profile';
export const PROFILE_VERSION = 1;
export const MAX_RECORDED_MATCHES = 100;

export type MapPresetId = 'midtown' | 'garden-district';
export type SkillId = 'field-notes' | 'scrounger';

export type MatchPerformance = Readonly<{
  damage: number;
  kills: number;
  healing: number;
  deaths: number;
  revives: number;
}>;

export type MatchReward = Readonly<{ xp: number; credits: number }>;

export type GameProfile = Readonly<{
  version: typeof PROFILE_VERSION;
  xp: number;
  credits: number;
  selectedMap: MapPresetId;
  lookSensitivity: number;
  skills: readonly SkillId[];
  rewardedMatchIds: readonly string[];
}>;

export type ProfileLoadResult = Readonly<{
  profile: GameProfile;
  recovery: 'loaded' | 'missing' | 'invalid' | 'unsupported' | 'unavailable';
}>;

export interface ProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SKILL_CATALOG: readonly Readonly<{
  id: SkillId;
  name: string;
  description: string;
  cost: number;
}>[] = Object.freeze([
  Object.freeze({ id: 'field-notes', name: 'Field Notes', description: '+25% XP from each match', cost: 250 }),
  Object.freeze({ id: 'scrounger', name: 'Scrounger', description: '+25% credits from each match', cost: 400 }),
]);

/** Placeholder economy values selected by the user for this implementation pass. */
export const PLACEHOLDER_REWARD_RULES = Object.freeze({
  participationXp: 100,
  xpPerKill: 25,
  xpPerTenDamage: 1,
  xpPerRevive: 20,
  participationCredits: 50,
  creditsPerKill: 10,
  creditsPerRevive: 25,
  skillMultiplier: 1.25,
});

export function createDefaultProfile(): GameProfile {
  return Object.freeze({
    version: PROFILE_VERSION,
    xp: 0,
    credits: 0,
    selectedMap: 'midtown',
    lookSensitivity: 0.002,
    skills: Object.freeze([]),
    rewardedMatchIds: Object.freeze([]),
  });
}

export function loadProfile(storage: ProfileStorage | null): ProfileLoadResult {
  if (!storage) return { profile: createDefaultProfile(), recovery: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return { profile: createDefaultProfile(), recovery: 'unavailable' };
  }
  if (raw === null) return { profile: createDefaultProfile(), recovery: 'missing' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { profile: createDefaultProfile(), recovery: 'invalid' };
  }
  if (!isRecord(parsed) || parsed.version !== PROFILE_VERSION) {
    return { profile: createDefaultProfile(), recovery: 'unsupported' };
  }
  if (!isValidProfile(parsed)) return { profile: createDefaultProfile(), recovery: 'invalid' };
  return { profile: freezeProfile(parsed), recovery: 'loaded' };
}

export function saveProfile(storage: ProfileStorage | null, profile: GameProfile): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function calculateMatchReward(profile: GameProfile, performance: MatchPerformance): MatchReward {
  const xpBase = PLACEHOLDER_REWARD_RULES.participationXp
    + whole(performance.kills) * PLACEHOLDER_REWARD_RULES.xpPerKill
    + Math.floor(whole(performance.damage) / 10) * PLACEHOLDER_REWARD_RULES.xpPerTenDamage
    + whole(performance.revives) * PLACEHOLDER_REWARD_RULES.xpPerRevive;
  const creditsBase = PLACEHOLDER_REWARD_RULES.participationCredits
    + whole(performance.kills) * PLACEHOLDER_REWARD_RULES.creditsPerKill
    + whole(performance.revives) * PLACEHOLDER_REWARD_RULES.creditsPerRevive;
  const multiplier = PLACEHOLDER_REWARD_RULES.skillMultiplier;
  return Object.freeze({
    xp: Math.floor(xpBase * (profile.skills.includes('field-notes') ? multiplier : 1)),
    credits: Math.floor(creditsBase * (profile.skills.includes('scrounger') ? multiplier : 1)),
  });
}

export function claimMatchReward(
  profile: GameProfile,
  matchId: string,
  performance: MatchPerformance,
): Readonly<{ profile: GameProfile; reward: MatchReward; alreadyClaimed: boolean }> {
  const id = matchId.trim();
  if (!id) throw new Error('A match ID is required to award a reward');
  if (profile.rewardedMatchIds.includes(id)) {
    return Object.freeze({ profile, reward: Object.freeze({ xp: 0, credits: 0 }), alreadyClaimed: true });
  }
  const reward = calculateMatchReward(profile, performance);
  const rewardedMatchIds = [...profile.rewardedMatchIds, id].slice(-MAX_RECORDED_MATCHES);
  const next = freezeProfile({
    ...profile,
    xp: profile.xp + reward.xp,
    credits: profile.credits + reward.credits,
    rewardedMatchIds,
  });
  return Object.freeze({ profile: next, reward, alreadyClaimed: false });
}

export function purchaseSkill(profile: GameProfile, skillId: SkillId): Readonly<{
  profile: GameProfile;
  purchased: boolean;
  reason: 'purchased' | 'owned' | 'insufficient-credits';
}> {
  if (profile.skills.includes(skillId)) return { profile, purchased: false, reason: 'owned' };
  const skill = SKILL_CATALOG.find((entry) => entry.id === skillId);
  if (!skill || profile.credits < skill.cost) return { profile, purchased: false, reason: 'insufficient-credits' };
  const next = freezeProfile({ ...profile, credits: profile.credits - skill.cost, skills: [...profile.skills, skillId] });
  return { profile: next, purchased: true, reason: 'purchased' };
}

export function updateProfileSettings(
  profile: GameProfile,
  updates: Readonly<{ selectedMap?: MapPresetId; lookSensitivity?: number }>,
): GameProfile {
  const selectedMap = updates.selectedMap ?? profile.selectedMap;
  const lookSensitivity = updates.lookSensitivity ?? profile.lookSensitivity;
  if (!isMapPresetId(selectedMap)) throw new RangeError('Unknown map preset');
  if (!Number.isFinite(lookSensitivity) || lookSensitivity < 0.0005 || lookSensitivity > 0.005) {
    throw new RangeError('Look sensitivity must be between 0.0005 and 0.005');
  }
  return freezeProfile({ ...profile, selectedMap, lookSensitivity });
}

function isValidProfile(value: Record<string, unknown>): value is Record<string, unknown> & GameProfile {
  return Number.isSafeInteger(value.xp) && (value.xp as number) >= 0
    && Number.isSafeInteger(value.credits) && (value.credits as number) >= 0
    && isMapPresetId(value.selectedMap)
    && typeof value.lookSensitivity === 'number' && Number.isFinite(value.lookSensitivity)
    && value.lookSensitivity >= 0.0005 && value.lookSensitivity <= 0.005
    && Array.isArray(value.skills) && value.skills.every(isSkillId)
    && new Set(value.skills).size === value.skills.length
    && Array.isArray(value.rewardedMatchIds)
    && value.rewardedMatchIds.length <= MAX_RECORDED_MATCHES
    && value.rewardedMatchIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 160)
    && new Set(value.rewardedMatchIds).size === value.rewardedMatchIds.length;
}

function freezeProfile(value: GameProfile | Record<string, unknown>): GameProfile {
  const record = value as Record<string, unknown>;
  return Object.freeze({
    version: PROFILE_VERSION,
    xp: record.xp as number,
    credits: record.credits as number,
    selectedMap: record.selectedMap as MapPresetId,
    lookSensitivity: record.lookSensitivity as number,
    skills: Object.freeze([...(record.skills as SkillId[])]),
    rewardedMatchIds: Object.freeze([...(record.rewardedMatchIds as string[])]),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMapPresetId(value: unknown): value is MapPresetId {
  return value === 'midtown' || value === 'garden-district';
}

function isSkillId(value: unknown): value is SkillId {
  return value === 'field-notes' || value === 'scrounger';
}

function whole(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
