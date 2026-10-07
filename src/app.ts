import { EngineRuntime } from './engine/engine-runtime';
import { Vector3 } from 'three';
import { SceneView } from './engine/scene-view';
import { createMovementPlayground, MOVEMENT_PLAYGROUND_CLASS } from './game/player/movement-playground';
import { PlayerController } from './game/player/player-controller';
import { ChickenCharacterView } from './game/player/chicken-character-view';
import { PointerLockControls } from './game/player/pointer-lock-controls';
import { createWeaponModel, getWeaponDefinition } from './content/weapons/registry';
import { CombatFeedback } from './game/combat/combat-feedback';
import { AudioManager } from './game/audio/audio-manager';
import { createCombatPracticeRange } from './game/combat/combat-practice-range';
import { CombatSession } from './game/combat/combat-session';
import { GrenadeView, WeaponView } from './game/combat/weapon-view';
import { generateMap, worldPosition } from './game/world/map-generator';
import { BotSkirmishView } from './game/bots/bot-skirmish-view';
import type { BotSimulationStep } from './game/bots/bot-simulation';
import { createSkirmishShowcaseMap } from './game/bots/skirmish-showcase';
import {
  claimMatchReward,
  loadProfile,
  purchaseSkill,
  saveProfile,
  SKILL_CATALOG,
  updateProfileSettings,
  type GameProfile,
  type MatchPerformance,
  type ProfileStorage,
  type SkillId,
} from './game/progression/profile';
import { buildMatchLeaderboards } from './game/progression/leaderboards';
import './style.css';

const BOTS_PER_TEAM = 50;
const TOTAL_MATCH_BOTS = BOTS_PER_TEAM * 2;

export function mountApp(root: HTMLElement) {
  root.innerHTML = `
    <main class="engine-shell">
      <div id="scene-viewport" class="scene-viewport" role="img" aria-label="First-person shooting and movement testing range">
        <span class="crosshair" aria-hidden="true"></span>
        <span id="hit-marker" class="hit-marker" aria-hidden="true"></span>
      </div>
      <div id="combat-flash" class="combat-flash" aria-hidden="true"></div>
      <section class="engine-hud" aria-label="Shooting range controls and status">
        <p class="eyebrow">OPERATION HONKDOWN · MATCH PREVIEW</p>
        <h1 id="mode-heading">Shooting range</h1>
        <div class="state-row"><span class="state-dot" aria-hidden="true"></span><output id="engine-state">Starting</output></div>
        <p id="pointer-state" class="hint" aria-live="polite">Click the scene to capture the mouse.</p>
        <button id="mode-toggle" class="mode-toggle" type="button">Watch ${TOTAL_MATCH_BOTS}-bot skirmish</button>
        <button id="reset-range-button" class="mode-toggle range-reset" type="button">Reset range</button>
        <button id="join-match-button" class="mode-toggle" type="button">Join ${TOTAL_MATCH_BOTS}-bot match</button>
        <output id="skirmish-readout" class="skirmish-readout" aria-live="polite" hidden></output>
        <output id="revive-readout" class="revive-readout" aria-live="polite" hidden></output>
        <div class="control-list" aria-label="Controls">
          <span><kbd>W A S D</kbd> Move</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>Left mouse</kbd> Fire / throw</span>
          <span><kbd>Right mouse</kbd> Aim</span>
          <span><kbd>R</kbd> Reload</span>
          <span><kbd>G</kbd> Equip grenade</span>
          <span><kbd>F</kbd> Hold to revive</span>
          <span><kbd>Shift</kbd> Sprint</span>
          <span><kbd>C</kbd> Crouch / slide</span>
        </div>
        <output id="class-state" class="class-state"></output>
        <output id="weapon-state" class="combat-state"></output>
        <output id="combat-readout" class="combat-readout"></output>
        <output id="engine-diagnostics" class="diagnostics">Waiting for first frame…</output>
        <output id="position-readout" class="position-readout"></output>
      </section>
      <section id="main-menu" class="menu-overlay" aria-labelledby="menu-title">
        <div class="menu-card">
          <div class="menu-header">
            <div><p class="eyebrow">OPERATION HONKDOWN</p><h2 id="menu-title">Pick your next bad idea.</h2></div>
            <div class="profile-balance"><span id="profile-level">Rookie · 0 XP</span><strong id="profile-credits">0 credits</strong></div>
          </div>
          <nav class="menu-tabs" aria-label="Main menu">
            <button type="button" data-menu-tab="loadout" aria-selected="true">Loadout</button>
            <button type="button" data-menu-tab="settings" aria-selected="false">Settings</button>
            <button type="button" data-menu-tab="maps" aria-selected="false">Maps</button>
            <button type="button" data-menu-tab="skills" aria-selected="false">Skill tree</button>
          </nav>
          <div class="menu-panels">
            <section data-menu-panel="loadout" aria-labelledby="loadout-title">
              <p class="menu-kicker">READY ROOM</p><h3 id="loadout-title">Loadout</h3>
              <div class="loadout-item"><span class="loadout-icon" aria-hidden="true">✦</span><div><strong>Honk-47</strong><span>Reliable, loud, and currently the whole armory.</span></div><b>PRIMARY</b></div>
              <p class="menu-footnote">Try every target distance, practice movement and cover, then reset the range whenever you want.</p>
            </section>
            <section data-menu-panel="settings" aria-labelledby="settings-title" hidden>
              <p class="menu-kicker">MAKE IT COMFORTABLE</p><h3 id="settings-title">Settings</h3>
              <label class="setting-row" for="sensitivity-setting"><span><strong>Look sensitivity</strong><small>Applies immediately · aiming still slows look by 20%</small></span><output id="sensitivity-value">0.0020</output></label>
              <input id="sensitivity-setting" type="range" min="0.0005" max="0.005" step="0.0001" value="0.002" aria-label="Look sensitivity">
              <label class="setting-row" for="master-volume-setting"><span><strong>Master volume</strong><small>Overall game audio level</small></span><output id="master-volume-value">80%</output></label>
              <input id="master-volume-setting" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Master volume">
              <label class="setting-row" for="effects-volume-setting"><span><strong>Effects volume</strong><small>Combat, chicken, and interface sounds</small></span><output id="effects-volume-value">80%</output></label>
              <input id="effects-volume-setting" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Effects volume">
              <p class="menu-footnote">Sound playback starts after your first input. Audio clips will play when they are added to this build.</p>
              <p class="menu-footnote">Settings are saved in this browser on this device.</p>
            </section>
            <section data-menu-panel="maps" aria-labelledby="maps-title" hidden>
              <p class="menu-kicker">CHOOSE THE BATTLEGROUND</p><h3 id="maps-title">Map selection</h3>
              <div class="map-options">
                <button type="button" data-map-option="midtown" aria-pressed="true"><span class="map-art map-art-midtown" aria-hidden="true"></span><strong>Midtown</strong><small>Compact city blocks · seeded layout</small></button>
                <button type="button" data-map-option="garden-district" aria-pressed="false"><span class="map-art map-art-garden" aria-hidden="true"></span><strong>Garden District</strong><small>Open side lanes · seeded layout</small></button>
              </div>
            </section>
            <section data-menu-panel="skills" aria-labelledby="skills-title" hidden>
              <p class="menu-kicker">SPEND MATCH EARNINGS</p><h3 id="skills-title">Skill tree</h3>
              <div class="skill-list">
                <article class="skill-card"><div><strong>Field Notes</strong><p>Earn 25% more XP after each match.</p></div><button type="button" data-buy-skill="field-notes">250 credits</button></article>
                <article class="skill-card"><div><strong>Scrounger</strong><p>Earn 25% more credits after each match.</p></div><button type="button" data-buy-skill="scrounger">400 credits</button></article>
              </div>
              <p class="menu-footnote">Provisional bonuses only; they do not change combat. Rewards start at 100 XP + 25 per kill + 1 per 10 damage + 20 per revive, and 50 credits + 10 per kill + 25 per revive.</p>
            </section>
          </div>
          <p id="profile-notice" class="profile-notice" role="status"></p>
          <div class="menu-footer"><span>${TOTAL_MATCH_BOTS}-bird battle · ${BOTS_PER_TEAM} on each side</span><div class="menu-actions"><button id="menu-range-button" type="button" class="range-button">Shooting range</button><button id="menu-join-button" type="button" class="join-button">Join round <span aria-hidden="true">→</span></button></div></div>
        </div>
      </section>
      <section id="pause-overlay" class="pause-overlay" aria-labelledby="pause-title" hidden>
        <div class="pause-card">
          <p class="eyebrow">SIMULATION PAUSED</p>
          <h2 id="pause-title">Take a breather.</h2>
          <p>The world stops while you are away.</p>
          <button id="resume-button" type="button">Resume</button>
          <button id="pause-settings-button" type="button" class="secondary-action">Settings</button>
          <a class="pause-link" href="/asset-viewer.html" target="_blank" rel="noreferrer">Open asset viewer ↗</a>
          <button id="return-menu-button" type="button" class="secondary-action">Return to main menu</button>
          <p class="hint">You can also press <kbd>Esc</kbd>.</p>
        </div>
      </section>
      <section id="results-overlay" class="results-overlay" aria-labelledby="results-title" hidden>
        <div class="results-card">
          <header class="results-header"><div><p class="eyebrow">FIELD REPORT · ROUND COMPLETE</p><h2 id="results-title">The dust settled.</h2></div><strong id="results-outcome"></strong></header>
          <div id="leaderboards-screen">
            <div id="leaderboard-content" class="leaderboard-grid"></div>
            <button id="continue-results-button" class="join-button results-next" type="button">See your rewards →</button>
          </div>
          <div id="reward-screen" hidden>
            <p class="menu-kicker">YOUR ROUND PAYOUT</p><h3>Good work, bird.</h3>
            <div id="reward-summary" class="reward-summary" aria-live="polite"></div>
            <button id="results-menu-button" class="join-button" type="button">Return to main menu</button>
          </div>
        </div>
      </section>
      <section id="death-overlay" class="pause-overlay death-overlay" aria-labelledby="death-title" hidden>
        <div class="pause-card death-card">
          <p class="eyebrow">FIELD REPORT</p>
          <h2 id="death-title">You’re down, chicken.</h2>
          <p id="death-readout" aria-live="polite">Switching to the live map view.</p>
          <p class="hint">Hold <kbd>F</kbd> near a fallen teammate for four seconds to revive them. Your spawn returns after 20 seconds.</p>
        </div>
      </section>
    </main>
  `;

  const viewport = root.querySelector<HTMLElement>('#scene-viewport');
  const hud = root.querySelector<HTMLElement>('.engine-hud');
  const stateOutput = root.querySelector<HTMLOutputElement>('#engine-state');
  const pointerOutput = root.querySelector<HTMLOutputElement>('#pointer-state');
  const modeToggle = root.querySelector<HTMLButtonElement>('#mode-toggle');
  const resetRangeButton = root.querySelector<HTMLButtonElement>('#reset-range-button');
  const joinMatchButton = root.querySelector<HTMLButtonElement>('#join-match-button');
  const skirmishReadout = root.querySelector<HTMLOutputElement>('#skirmish-readout');
  const reviveReadout = root.querySelector<HTMLOutputElement>('#revive-readout');
  const modeHeading = root.querySelector<HTMLHeadingElement>('#mode-heading');
  const classOutput = root.querySelector<HTMLOutputElement>('#class-state');
  const weaponOutput = root.querySelector<HTMLOutputElement>('#weapon-state');
  const combatReadout = root.querySelector<HTMLOutputElement>('#combat-readout');
  const diagnosticsOutput = root.querySelector<HTMLOutputElement>('#engine-diagnostics');
  const positionOutput = root.querySelector<HTMLOutputElement>('#position-readout');
  const hitMarker = root.querySelector<HTMLElement>('#hit-marker');
  const combatFlash = root.querySelector<HTMLElement>('#combat-flash');
  const pauseOverlay = root.querySelector<HTMLElement>('#pause-overlay');
  const resumeButton = root.querySelector<HTMLButtonElement>('#resume-button');
  const pauseSettingsButton = root.querySelector<HTMLButtonElement>('#pause-settings-button');
  const returnMenuButton = root.querySelector<HTMLButtonElement>('#return-menu-button');
  const mainMenu = root.querySelector<HTMLElement>('#main-menu');
  const menuJoinButton = root.querySelector<HTMLButtonElement>('#menu-join-button');
  const menuRangeButton = root.querySelector<HTMLButtonElement>('#menu-range-button');
  const profileNotice = root.querySelector<HTMLElement>('#profile-notice');
  const profileLevel = root.querySelector<HTMLElement>('#profile-level');
  const profileCredits = root.querySelector<HTMLElement>('#profile-credits');
  const sensitivitySetting = root.querySelector<HTMLInputElement>('#sensitivity-setting');
  const sensitivityValue = root.querySelector<HTMLOutputElement>('#sensitivity-value');
  const masterVolumeSetting = root.querySelector<HTMLInputElement>('#master-volume-setting');
  const masterVolumeValue = root.querySelector<HTMLOutputElement>('#master-volume-value');
  const effectsVolumeSetting = root.querySelector<HTMLInputElement>('#effects-volume-setting');
  const effectsVolumeValue = root.querySelector<HTMLOutputElement>('#effects-volume-value');
  const resultsOverlay = root.querySelector<HTMLElement>('#results-overlay');
  const resultsOutcome = root.querySelector<HTMLElement>('#results-outcome');
  const leaderboardContent = root.querySelector<HTMLElement>('#leaderboard-content');
  const leaderboardsScreen = root.querySelector<HTMLElement>('#leaderboards-screen');
  const continueResultsButton = root.querySelector<HTMLButtonElement>('#continue-results-button');
  const rewardScreen = root.querySelector<HTMLElement>('#reward-screen');
  const rewardSummary = root.querySelector<HTMLElement>('#reward-summary');
  const resultsMenuButton = root.querySelector<HTMLButtonElement>('#results-menu-button');
  const deathOverlay = root.querySelector<HTMLElement>('#death-overlay');
  const deathReadout = root.querySelector<HTMLElement>('#death-readout');
  if (
    !viewport || !hud || !stateOutput || !pointerOutput || !modeToggle || !resetRangeButton || !joinMatchButton || !skirmishReadout || !reviveReadout || !modeHeading || !classOutput || !weaponOutput || !combatReadout ||
    !diagnosticsOutput || !positionOutput || !hitMarker || !combatFlash || !pauseOverlay || !resumeButton || !pauseSettingsButton || !returnMenuButton ||
    !mainMenu || !menuJoinButton || !menuRangeButton || !profileNotice || !profileLevel || !profileCredits || !sensitivitySetting || !sensitivityValue ||
    !masterVolumeSetting || !masterVolumeValue || !effectsVolumeSetting || !effectsVolumeValue ||
    !resultsOverlay || !resultsOutcome || !leaderboardContent || !leaderboardsScreen || !continueResultsButton || !rewardScreen || !rewardSummary || !resultsMenuButton || !deathOverlay || !deathReadout
  ) {
    throw new Error('Missing combat practice element');
  }
  const menuEl = mainMenu!;
  const pauseEl = pauseOverlay!;
  const menuJoinEl = menuJoinButton!;
  const menuRangeEl = menuRangeButton!;
  const noticeEl = profileNotice!;
  const levelEl = profileLevel!;
  const creditsEl = profileCredits!;
  const sensitivityInput = sensitivitySetting!;
  const sensitivityOutput = sensitivityValue!;
  const masterVolumeInput = masterVolumeSetting!;
  const masterVolumeOutput = masterVolumeValue!;
  const effectsVolumeInput = effectsVolumeSetting!;
  const effectsVolumeOutput = effectsVolumeValue!;
  const resultsEl = resultsOverlay!;
  const outcomeEl = resultsOutcome!;
  const leaderboardEl = leaderboardContent!;
  const leaderboardsEl = leaderboardsScreen!;
  const rewardScreenEl = rewardScreen!;
  const rewardEl = rewardSummary!;

  let profileStorage: ProfileStorage | null = null;
  try { profileStorage = globalThis.localStorage; } catch { /* Browser storage can be disabled by the host. */ }
  const loadedProfile = loadProfile(profileStorage);
  let profile: GameProfile = loadedProfile.profile;
  const audioManager = new AudioManager();
  audioManager.setVolumes(profile.masterVolume, profile.effectsVolume);
  const handleAudioGesture = () => { void audioManager.unlock(); };
  const handleUiSound = (event: MouseEvent) => {
    if ((event.target as Element | null)?.closest('button')) audioManager.play('ui');
  };
  window.addEventListener('pointerdown', handleAudioGesture);
  window.addEventListener('keydown', handleAudioGesture);
  root.addEventListener('click', handleUiSound);
  if (loadedProfile.recovery === 'migrated') {
    profileNotice.textContent = saveProfile(profileStorage, profile)
      ? 'Saved profile updated with audio volume settings.'
      : 'Audio volume settings are ready but could not be saved in this browser.';
  }
  let menuOpenedFromPause = false;
  let currentMatchId: string | null = null;
  let resultsShown = false;

  classOutput.textContent = 'Three lanes · 10 m, 15 m, and 20 m targets · movement course';
  const weaponDefinition = getWeaponDefinition('honk-47');
  let player: PlayerController | null = null;
  let playerCharacter: ChickenCharacterView | null = null;
  let pointerControls: PointerLockControls | null = null;
  let combat: CombatSession | null = null;
  let practiceRange: ReturnType<typeof createCombatPracticeRange> | null = null;
  let playground: ReturnType<typeof createMovementPlayground> | null = null;
  let skirmishView: BotSkirmishView | null = null;
  let isSkirmishMode = false;
  let isPlayerMatchMode = false;
  let activeReviveTargetId: string | null = null;
  let playerWasAlive = true;
  let weaponView: WeaponView | null = null;
  let grenadeView: GrenadeView | null = null;
  let sceneView: SceneView | null = null;
  const feedback = new CombatFeedback();
  const aimDirection = new Vector3();
  const audioForward = new Vector3(0, 0, -1);
  const tabButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-menu-tab]')];
  const tabPanels = [...root.querySelectorAll<HTMLElement>('[data-menu-panel]')];
  const mapButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-map-option]')];
  const skillButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-buy-skill]')];

  const persistProfile = () => {
    const saved = saveProfile(profileStorage, profile);
    if (!saved) noticeEl.textContent = 'Browser storage is unavailable; changes last only until this page closes.';
    refreshProfileUi();
  };

  function refreshProfileUi(): void {
    const level = Math.floor(profile.xp / 1000) + 1;
    levelEl.textContent = `Rookie · level ${level} · ${profile.xp.toLocaleString()} XP`;
    creditsEl.textContent = `${profile.credits.toLocaleString()} credits`;
    sensitivityInput.value = String(profile.lookSensitivity);
    sensitivityOutput.value = profile.lookSensitivity.toFixed(4);
    masterVolumeInput.value = String(profile.masterVolume);
    masterVolumeOutput.value = `${Math.round(profile.masterVolume * 100)}%`;
    effectsVolumeInput.value = String(profile.effectsVolume);
    effectsVolumeOutput.value = `${Math.round(profile.effectsVolume * 100)}%`;
    audioManager.setVolumes(profile.masterVolume, profile.effectsVolume);
    for (const button of mapButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.mapOption === profile.selectedMap));
    }
    for (const button of skillButtons) {
      const id = button.dataset.buySkill as SkillId | undefined;
      if (!id) continue;
      const skill = SKILL_CATALOG.find((entry) => entry.id === id);
      const owned = profile.skills.includes(id);
      button.textContent = owned ? 'Owned' : `${skill?.cost ?? 0} credits`;
      button.disabled = owned || profile.credits < (skill?.cost ?? Number.MAX_SAFE_INTEGER);
    }
  }

  function openMenuTab(tab: 'loadout' | 'settings' | 'maps' | 'skills'): void {
    for (const button of tabButtons) button.setAttribute('aria-selected', String(button.dataset.menuTab === tab));
    for (const panel of tabPanels) panel.hidden = panel.dataset.menuPanel !== tab;
  }

  function openMainMenu(tab: 'loadout' | 'settings' | 'maps' | 'skills', fromPause = false): void {
    menuOpenedFromPause = fromPause;
    menuEl.hidden = false;
    menuRangeEl.hidden = fromPause;
    pauseEl.hidden = true;
    resultsEl.hidden = true;
    root.dataset.menuOpen = 'true';
    menuJoinEl.innerHTML = fromPause ? 'Resume round <span aria-hidden="true">→</span>' : 'Join round <span aria-hidden="true">→</span>';
    openMenuTab(tab);
    refreshProfileUi();
  }

  function closeMainMenu(): void {
    menuEl.hidden = true;
    root.dataset.menuOpen = 'false';
    menuOpenedFromPause = false;
  }

  function persistNewProfile(next: GameProfile, message = ''): void {
    profile = next;
    noticeEl.textContent = message;
    persistProfile();
    if (message) noticeEl.textContent = message;
  }

  function matchIdentifier(): string {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && 'randomUUID' in cryptoApi) return cryptoApi.randomUUID();
    return `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function showMatchResults(battle: BotSkirmishView): void {
    if (resultsShown) return;
    resultsShown = true;
    pointerControls?.releaseLock();
    pauseEl.hidden = true;
    resultsEl.hidden = false;
    leaderboardsEl.hidden = false;
    rewardScreenEl.hidden = true;
    const outcome = battle.match.outcome;
    outcomeEl.textContent = outcome?.winner === 'draw'
      ? 'Draw'
      : `${outcome?.winner === 'friendly' ? 'Squad victory' : 'Enemy victory'}`;
    const boards = buildMatchLeaderboards(battle.match.scoreSnapshots);
    leaderboardEl.replaceChildren();
    for (const board of boards) {
      const panel = document.createElement('section');
      panel.className = 'leaderboard-panel';
      const title = document.createElement('h3');
      title.textContent = board.label;
      const rows = document.createElement('ol');
      for (const score of board.entries) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = score.id === 'player'
          ? 'You'
          : `${score.team === 'friendly' ? 'Friendly' : 'Enemy'} ${score.id.replace(/^(friendly|enemy)-/, '')}`;
        const value = document.createElement('strong');
        value.textContent = board.metric === 'damage' || board.metric === 'healing'
          ? Math.round(score[board.metric]).toLocaleString()
          : score[board.metric].toLocaleString();
        if (score.id === 'player') item.classList.add('is-player');
        item.append(name, value);
        rows.append(item);
      }
      panel.append(title, rows);
      leaderboardEl.append(panel);
    }

    const playerScore = battle.match.scoreSnapshots.find((score) => score.id === 'player');
    const performance: MatchPerformance = {
      damage: playerScore?.damage ?? 0,
      kills: playerScore?.kills ?? 0,
      healing: playerScore?.healing ?? 0,
      deaths: playerScore?.deaths ?? 0,
      revives: playerScore?.revives ?? 0,
    };
    const claim = claimMatchReward(profile, currentMatchId ?? matchIdentifier(), performance);
    profile = claim.profile;
    const persisted = saveProfile(profileStorage, profile);
    refreshProfileUi();
    rewardEl.textContent = claim.alreadyClaimed
      ? 'Rewards for this match were already collected.'
      : `Match rewards · +${claim.reward.xp} XP · +${claim.reward.credits} credits  |  Wallet: ${profile.xp.toLocaleString()} XP · ${profile.credits.toLocaleString()} credits${persisted ? '' : ' · Browser storage unavailable; progress is temporary.'}`;
  }

  if (loadedProfile.recovery === 'invalid') profileNotice.textContent = 'Saved profile was unreadable; a fresh profile is ready.';
  else if (loadedProfile.recovery === 'unsupported') profileNotice.textContent = 'Saved profile version is newer; a fresh profile is ready for this build.';
  else if (loadedProfile.recovery === 'unavailable') profileNotice.textContent = 'Browser storage is unavailable; progress will last only until this page closes.';
  refreshProfileUi();

  const stepPlayerCombat = (
    stepSeconds: number,
    random: () => number,
    input: Readonly<{ wasPressed(code: string): boolean }>,
    allowPlayerActions = true,
  ) => {
    const activeCombat = combat;
    const camera = sceneView?.camera;
    const activePlayer = player;
    if (!activePlayer || !activeCombat || !camera) return;
    camera.getWorldDirection(aimDirection);
    const result = activeCombat.step(stepSeconds, {
      fireHeld: pointerControls?.isFireHeld ?? false,
      firePressed: pointerControls?.consumeFirePressed() ?? false,
      reloadPressed: input.wasPressed('KeyR'),
      grenadeTogglePressed: input.wasPressed('KeyG'),
      aiming: pointerControls?.isAiming ?? false,
    }, camera.position, aimDirection, random, allowPlayerActions);
    if (isPlayerMatchMode) skirmishView?.match.recordPlayerCombat('player', result.shots, result.explosions);
    else {
      practiceRange?.recordShots(result.weaponEvents.filter((event) => event.type === 'shot').length, result.shots);
      practiceRange?.recordExplosions(result.explosions);
    }
    const destroyedObstacleIds = [
      ...result.shots.flatMap((shot) => shot.destroyedObstacleId ? [shot.destroyedObstacleId] : []),
      ...result.explosions.flatMap((explosion) => explosion.destroyedObstacleIds),
    ];
    if (isPlayerMatchMode) skirmishView?.match.simulation.applyDestroyedObstacles(destroyedObstacleIds);
    skirmishView?.showDestruction(destroyedObstacleIds);
    for (const event of result.weaponEvents) {
      if (event.type === 'shot') {
        weaponView?.fire();
        audioManager.play('gunshot', { position: camera.position });
        activePlayer.applyImpulse({ x: -aimDirection.x, y: 0.45, z: -aimDirection.z }, 0.86);
        activePlayer.applyRecoil(
          weaponDefinition.recoilPitchRadians * (event.aimed ? 0.75 : 1),
          (random() * 2 - 1) * weaponDefinition.recoilYawRadians,
        );
      } else if (event.type === 'reload-started') {
        weaponView?.beginReload();
        playerCharacter?.beginReload(weaponDefinition.reloadSeconds);
        audioManager.play('reload', { position: activePlayer.position });
      }
    }
    for (const shot of result.shots) {
      if (!shot.targetId) continue;
      audioManager.play('hit');
      feedback.registerHit();
      hitMarker.classList.add('active');
      combatFlash.classList.add('active');
    }
    for (const explosion of result.explosions) {
      audioManager.play('explosion', { position: explosion.position });
      const distance = camera.position.distanceTo(explosion.position);
      feedback.registerExplosion(distance, CombatSession.grenadeBlastRadius);
      if (explosion.damagedIds.length > 0) {
        hitMarker.classList.add('active');
        combatFlash.classList.add('active');
      }
    }
    if (!feedback.freezeWeaponPose) weaponView?.update(stepSeconds);
    root.dataset.aiming = String(pointerControls?.isAiming ?? false);
    root.dataset.hitFlash = String(feedback.showHitFlash);
  };

  const playBotAudio = (battle: BotSkirmishView, events: BotSimulationStep): void => {
    const camera = sceneView?.camera;
    if (!camera) return;
    let nearestShooter = null as ReturnType<typeof battle.simulation.getCombatant>;
    let nearestDistanceSquared = 90 * 90;
    for (const shot of events.shots) {
      const shooter = battle.simulation.getCombatant(shot.shooterId);
      if (!shooter) continue;
      const dx = shooter.position.x - camera.position.x;
      const dy = shooter.position.y - camera.position.y;
      const dz = shooter.position.z - camera.position.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestShooter = shooter;
      }
    }
    if (nearestShooter) audioManager.play('gunshot', { position: nearestShooter.position, volume: 0.72 });

    const firstKillId = events.killedIds[0];
    if (firstKillId) {
      const chicken = battle.simulation.getCombatant(firstKillId);
      if (chicken) audioManager.play('honk', { position: chicken.position });
    }
    if (isPlayerMatchMode && events.shots.some((shot) => shot.result.targetId === 'player')) audioManager.play('hit');
  };

  let runtime: EngineRuntime;
  let runtimeHasStarted = false;
  runtime = new EngineRuntime({
    canResume: () => !resultsShown && (menuEl.hidden || menuOpenedFromPause),
    createView: () => {
      const view = new SceneView({ container: viewport });
      sceneView = view;
      playground = createMovementPlayground(view.scene);
      practiceRange = createCombatPracticeRange(view.scene);
      combat = new CombatSession(playground.world, practiceRange.combatants, weaponDefinition);
      weaponView = new WeaponView(view.camera, createWeaponModel(weaponDefinition.id), weaponDefinition.reloadSeconds);
      playerCharacter = new ChickenCharacterView(view.camera, 'player', 'first-person');
      grenadeView = new GrenadeView(view.scene);
      player = new PlayerController(view.camera, playground.world, {
        spawn: { x: 0, y: 0, z: 8 },
        crouchMode: MOVEMENT_PLAYGROUND_CLASS.crouchMode,
        capabilities: MOVEMENT_PLAYGROUND_CLASS.capabilities,
        lookSensitivity: profile.lookSensitivity,
      });
      pointerControls = new PointerLockControls(view.renderer.domElement as HTMLCanvasElement, {
        onLook: (movementX, movementY, aiming) => player?.handleMouseMove(movementX, movementY, aiming),
        onLockChange: (locked) => {
          pointerOutput.textContent = locked
            ? 'Mouse captured · press Esc to pause'
            : isPlayerMatchMode && skirmishView?.match.simulation.playerCombatant?.status === 'dead'
              ? 'Bird’s-eye map · battle continues while you are down'
              : isSkirmishMode
              ? 'Bird’s-eye spectator · press Esc to pause'
              : 'Click the scene to capture the mouse.';
          root.dataset.pointerLocked = String(locked);
        },
      });
      pointerControls.attach();

      return {
        render(interpolationAlpha: number) {
          view.camera.getWorldDirection(audioForward);
          audioManager.updateListener(view.camera.position, audioForward);
          if (!isSkirmishMode && (!isPlayerMatchMode || skirmishView?.match.simulation.playerCombatant?.status === 'alive')) {
            player?.render(interpolationAlpha);
          }
          if (!isSkirmishMode && combat && grenadeView && view.camera) {
            view.camera.getWorldDirection(aimDirection);
            grenadeView.updateTrajectory(
              combat.grenades.equipped && (!isPlayerMatchMode || skirmishView?.match.simulation.playerCombatant?.status === 'alive') ? combat.trajectory(view.camera.position, aimDirection) : [],
              combat.grenades.equipped && (!isPlayerMatchMode || skirmishView?.match.simulation.playerCombatant?.status === 'alive'),
            );
            grenadeView.updateProjectiles(combat.grenades.projectiles);
          }
          if (!isSkirmishMode) feedback.applyCameraShake(view.camera);
          skirmishView?.updatePresentation(view.camera);
          view.render(interpolationAlpha);
        },
        dispose() {
          skirmishView?.dispose();
          skirmishView = null;
          isSkirmishMode = false;
          pointerControls?.dispose();
          pointerControls = null;
          grenadeView?.dispose();
          grenadeView = null;
          playerCharacter?.dispose();
          playerCharacter = null;
          weaponView?.dispose();
          weaponView = null;
          practiceRange?.dispose();
          practiceRange = null;
          combat = null;
          sceneView = null;
          player = null;
          playground?.dispose();
          playground = null;
          view.dispose();
        },
      };
    },
    updateSimulation: (stepSeconds, random, input) => {
      feedback.update(stepSeconds);
      if (isSkirmishMode) {
        const battle = skirmishView;
        if (battle) playBotAudio(battle, battle.step(stepSeconds));
        return;
      }

      if (isPlayerMatchMode) {
        const battle = skirmishView;
        const activePlayer = player;
        const playerActor = battle?.match.simulation.playerCombatant;
        if (!battle || !activePlayer || !playerActor) return;
        const aliveBeforeStep = playerActor.status === 'alive';

        if (aliveBeforeStep && battle.match.matchState === 'active') {
          activePlayer.update(stepSeconds, input, pointerControls?.isAiming ?? false);
          if (activePlayer.isGrounded && activePlayer.horizontalSpeed > 0.8) {
            audioManager.play('footstep', { position: activePlayer.position });
          }
          playerActor.position.copy(activePlayer.position);
          playerCharacter?.setPose({
            movementSpeed: activePlayer.horizontalSpeed,
            sprinting: activePlayer.horizontalSpeed > 5.8,
            crouched: activePlayer.isCrouched,
            grounded: activePlayer.isGrounded,
            aiming: pointerControls?.isAiming ?? false,
          });
        }

        const lifeBeforeStep = battle.match.getLifeSnapshot(playerActor.id);
        if (aliveBeforeStep && lifeBeforeStep && activeReviveTargetId) {
          battle.match.cancelRevive(activeReviveTargetId);
          activeReviveTargetId = null;
        }
        if (aliveBeforeStep && battle.match.matchState === 'active' && input.isDown('KeyF')) {
          const nearest = battle.match.findReviveTarget(playerActor.id);
          const nextTargetId = nearest?.botId ?? null;
          if (activeReviveTargetId && activeReviveTargetId !== nextTargetId) {
            battle.match.cancelRevive(activeReviveTargetId);
            activeReviveTargetId = null;
          }
          if (nextTargetId && !activeReviveTargetId && battle.match.beginRevive(nextTargetId, playerActor.id)) {
            activeReviveTargetId = nextTargetId;
          }
        } else if (activeReviveTargetId) {
          battle.match.cancelRevive(activeReviveTargetId);
          activeReviveTargetId = null;
        }

        playBotAudio(battle, battle.step(stepSeconds));
        if (playerActor.status === 'alive' && playerActor.velocity.lengthSq() > 0) {
          const impactSpeed = playerActor.velocity.length();
          activePlayer.applyImpulse(playerActor.velocity, impactSpeed);
          playerActor.velocity.set(0, 0, 0);
        }
        if (!playerWasAlive && playerActor.status === 'alive') {
          combat?.resetForRespawn();
          weaponView?.resetForRespawn();
        }
        if (battle.match.matchState === 'active') {
          stepPlayerCombat(stepSeconds, random, input, playerActor.status === 'alive');
        }
        playerCharacter?.update(stepSeconds);

        const aliveAfterStep = playerActor.status === 'alive';
        if (playerWasAlive && !aliveAfterStep) {
          pointerControls?.releaseLock();
          playerCharacter?.setPose({ dead: true });
          playerCharacter && (playerCharacter.object.visible = false);
          weaponView?.setVisible(false);
          grenadeView?.updateTrajectory([], false);
          deathOverlay.hidden = false;
          const camera = sceneView?.camera;
          if (camera) {
            camera.position.set(0, 90, 0);
            camera.up.set(0, 0, -1);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
          }
        } else if (!playerWasAlive && aliveAfterStep) {
          sceneView?.camera.up.set(0, 1, 0);
          activePlayer.setSpawn({ x: playerActor.position.x, y: playerActor.position.y, z: playerActor.position.z });
          playerCharacter?.setPose({ dead: false });
          if (playerCharacter) playerCharacter.object.visible = true;
          weaponView?.setVisible(true);
          grenadeView?.setVisible(true);
          deathOverlay.hidden = true;
        }
        playerWasAlive = aliveAfterStep;
        root.dataset.aiming = String(aliveAfterStep && (pointerControls?.isAiming ?? false));
        if (battle.match.matchState === 'complete') {
          deathOverlay.hidden = true;
          showMatchResults(battle);
          runtime.pause();
        }
        return;
      }

      player?.update(stepSeconds, input, pointerControls?.isAiming ?? false);
      if (player) {
        if (player.isGrounded && player.horizontalSpeed > 0.8) {
          audioManager.play('footstep', { position: player.position });
        }
        playerCharacter?.setPose({
          movementSpeed: player.horizontalSpeed,
          sprinting: player.horizontalSpeed > 5.8,
          crouched: player.isCrouched,
          grounded: player.isGrounded,
          aiming: pointerControls?.isAiming ?? false,
        });
        playerCharacter?.update(stepSeconds);
      }
      practiceRange?.update(stepSeconds);
      stepPlayerCombat(stepSeconds, random, input);
    },
    onStateChange: (state) => {
      stateOutput.textContent = state === 'running' ? 'Running' : state === 'paused' ? 'Paused' : state;
      pauseOverlay.hidden = state !== 'paused' || resultsShown || !mainMenu.hidden;
      root.dataset.engineState = state;
      if (state === 'paused') pointerControls?.releaseLock();
      if (state === 'running' && runtimeHasStarted && !mainMenu.hidden) {
        const resumeMatch = menuOpenedFromPause && isPlayerMatchMode
          && skirmishView?.match.simulation.playerCombatant?.status === 'alive';
        closeMainMenu();
        if (resumeMatch) pointerControls?.requestLock();
      }
    },
    onDiagnostics: (snapshot) => {
      if (snapshot.frameCount % 10 !== 0) return;
      const rendererStats = sceneView?.rendererPerformanceStats;
      const rendererSummary = rendererStats
        ? ` · ${rendererStats.drawCalls} draws · ${(rendererStats.triangles / 1000).toFixed(1)}k tris · ${rendererStats.geometries} geometries`
        : '';
      diagnosticsOutput.textContent = `${snapshot.framesPerSecond.toFixed(0)} FPS · ${snapshot.frameTimeMs.toFixed(1)} ms frame · ${snapshot.frameWorkMs.toFixed(2)} ms work · ${snapshot.simulationTimeMs.toFixed(2)} ms sim · ${snapshot.fixedSteps} fixed steps${rendererSummary}`;
      if (player && !isSkirmishMode) {
        positionOutput.textContent = `Position ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
      }
      if (isSkirmishMode && skirmishView) {
        const bots = skirmishView.snapshots;
        if (skirmishView.match.matchState === 'countdown') {
          const remaining = Math.ceil(skirmishView.match.countdown.secondsRemaining);
          classOutput.textContent = 'Round countdown · bots are holding their starts';
          weaponOutput.textContent = 'ROUND STARTING';
          combatReadout.textContent = `Battle begins in ${remaining} ${remaining === 1 ? 'second' : 'seconds'} · ${BOTS_PER_TEAM} friendly · ${BOTS_PER_TEAM} enemy`;
        } else if (skirmishView.match.matchState === 'complete') {
          const outcome = skirmishView.match.outcome;
          const label = outcome?.winner === 'draw'
            ? 'Draw'
            : `${outcome?.winner === 'friendly' ? 'Friendly' : 'Enemy'} victory`;
          classOutput.textContent = 'Round complete';
          weaponOutput.textContent = 'Match complete';
          combatReadout.textContent = `${label} · ${outcome?.reason === 'capture' ? 'objective captured' : 'tickets exhausted'}`;
          const tickets = skirmishView.match.tickets;
          skirmishReadout.textContent = `Final tickets · Friendly ${tickets.friendly} · Enemy ${tickets.enemy}`;
        } else {
          const friendlies = bots.filter((bot) => bot.team === 'friendly');
          const enemies = bots.filter((bot) => bot.team === 'enemy');
          const friendlyAlive = friendlies.filter((bot) => bot.status === 'alive').length;
          const enemyAlive = enemies.filter((bot) => bot.status === 'alive').length;
          const firing = bots.filter((bot) => bot.shouldFire).length;
          const tickets = skirmishView.match.tickets;
          const capture = skirmishView.match.captureStatus;
          const captureReadout = capture.control === 'contested'
            ? 'Objective contested'
            : capture.control === 'neutral'
              ? 'Objective neutral'
              : `${capture.control === 'friendly' ? 'Friendly' : 'Enemy'} control · ${Math.round((capture.control === 'friendly' ? capture.friendlyProgress : capture.enemyProgress) * 100)}%`;
          classOutput.textContent = 'Round active · bot-only simulation preview';
          weaponOutput.textContent = 'Bird’s-eye spectator · fixed-step bot battle';
          combatReadout.textContent = `Friendly ${friendlyAlive}/${friendlies.length} · Enemy ${enemyAlive}/${enemies.length} · tickets ${tickets.friendly}/${tickets.enemy} · ${skirmishView.totalKills} eliminations · ${firing} engaging`;
          skirmishReadout.textContent = `${captureReadout} · capture requires 30 seconds of control; contest pauses progress · revives complete before the 20-second respawn`;
        }
        const rendered = skirmishView.botRenderDiagnostics;
        positionOutput.textContent = `Seeded Midtown · ${skirmishView.map.navigationNodes.length} cells · ${rendered.visibleCharacters}/${rendered.totalCharacters} characters visible (${rendered.closeLodCharacters} close, ${rendered.farLodCharacters} far) · ${skirmishView.tracerCount} tracers`;
      } else if (isPlayerMatchMode && skirmishView) {
        const battle = skirmishView;
        const match = battle.match;
        const playerActor = match.simulation.playerCombatant;
        const bots = battle.snapshots;
        const friendlies = bots.filter((bot) => bot.team === 'friendly' && bot.status === 'alive').length + Number(playerActor?.status === 'alive');
        const enemies = bots.filter((bot) => bot.team === 'enemy' && bot.status === 'alive').length;
        const tickets = match.tickets;
        const capture = match.captureStatus;
        const captureReadout = capture.control === 'contested'
          ? 'Objective contested'
          : capture.control === 'neutral'
            ? 'Objective neutral'
            : `${capture.control === 'friendly' ? 'Friendly' : 'Enemy'} control · ${Math.round((capture.control === 'friendly' ? capture.friendlyProgress : capture.enemyProgress) * 100)}%`;
        const playerLife = playerActor ? match.getLifeSnapshot(playerActor.id) : null;
        if (playerActor?.status === 'dead') {
          const remaining = Math.ceil(playerLife?.respawnSecondsRemaining ?? 0);
          classOutput.textContent = 'Down · live bird’s-eye view';
          weaponOutput.textContent = match.matchState === 'complete' ? 'Round complete' : `Spawn in ${remaining}s`;
          deathReadout.textContent = match.matchState === 'complete'
            ? `Round over · ${match.outcome?.winner === 'draw' ? 'draw' : `${match.outcome?.winner} victory`}`
            : `Your squad is still fighting · ${remaining} seconds until you return at the friendly spawn.`;
        } else if (match.matchState === 'countdown') {
          classOutput.textContent = 'Round countdown · move when ready';
          weaponOutput.textContent = 'ROUND STARTING';
          deathReadout.textContent = 'Back in the fight.';
        } else if (match.matchState === 'complete') {
          classOutput.textContent = 'Round complete';
          weaponOutput.textContent = 'Match complete';
          combatReadout.textContent = `${match.outcome?.winner === 'draw' ? 'Draw' : `${match.outcome?.winner} victory`} · ${match.outcome?.reason === 'capture' ? 'objective captured' : 'tickets exhausted'}`;
          deathReadout.textContent = `Round over · ${match.outcome?.winner === 'draw' ? 'draw' : `${match.outcome?.winner} victory`}`;
        } else {
          classOutput.textContent = `Friendly squad · ${Math.round(playerActor?.health ?? 0)} health`;
          const ammo = combat?.weapon.snapshot;
          weaponOutput.textContent = `${weaponDefinition.displayName} · ${ammo?.magazine ?? 0} / ${ammo?.reserve ?? 0}${ammo?.reloading ? ' · RELOADING' : ''}`;
          deathReadout.textContent = 'Back in the fight.';
        }
        combatReadout.textContent = match.matchState === 'complete'
          ? `${match.outcome?.winner === 'draw' ? 'Draw' : `${match.outcome?.winner === 'friendly' ? 'Friendly' : 'Enemy'} victory`} · ${match.outcome?.reason === 'capture' ? 'objective captured' : 'tickets exhausted'}`
          : `${captureReadout} · friendly ${friendlies} · enemy ${enemies} · tickets ${tickets.friendly}/${tickets.enemy}`;
        if (activeReviveTargetId) {
          const progress = match.getLifeSnapshot(activeReviveTargetId)?.reviveProgress ?? 0;
          reviveReadout.textContent = `Reviving teammate · ${Math.round(progress * 100)}% · keep holding F and stay close`;
          reviveReadout.hidden = false;
        } else if (playerActor?.status === 'alive' && match.matchState === 'active') {
          reviveReadout.textContent = 'Hold F within 2.5 m of a fallen friendly chicken to revive';
          reviveReadout.hidden = false;
        } else {
          reviveReadout.hidden = true;
        }
        deathOverlay.hidden = resultsShown || playerActor?.status !== 'dead';
        if (match.matchState === 'complete') {
          const winner = match.outcome?.winner === 'draw' ? 'Draw' : `${match.outcome?.winner === 'friendly' ? 'Friendly' : 'Enemy'} victory`;
          skirmishReadout.textContent = `${winner} · ${match.outcome?.reason === 'capture' ? 'objective captured' : 'tickets exhausted'}`;
        }
        const position = player?.position;
        const rendered = battle.botRenderDiagnostics;
        positionOutput.textContent = `Player ${position?.x.toFixed(1) ?? '—'}, ${position?.z.toFixed(1) ?? '—'} · ${battle.map.navigationNodes.length} cells · ${rendered.visibleCharacters}/${rendered.totalCharacters} characters visible (${rendered.closeLodCharacters} close, ${rendered.farLodCharacters} far) · ${battle.tracerCount} tracers`;
      } else if (combat) {
        const ammo = combat.weapon.snapshot;
        weaponOutput.textContent = `${weaponDefinition.displayName} · ${ammo.magazine} / ${ammo.reserve}${ammo.reloading ? ' · RELOADING' : ''}`;
        const rangeStats = practiceRange?.stats;
        const accuracy = rangeStats ? Math.round(rangeStats.accuracy * 100) : 0;
        combatReadout.textContent = `Targets ${practiceRange?.combatants.filter((target) => target.status === 'alive').length ?? 0}/${practiceRange?.combatants.length ?? 0} · ${rangeStats?.hits ?? 0}/${rangeStats?.shots ?? 0} hits (${accuracy}%) · ${Math.round(rangeStats?.damage ?? 0)} damage · ${rangeStats?.targetKills ?? 0} knockdowns · grenades ${combat.grenades.count}${combat.grenades.equipped ? ' · THROW READY' : ''}`;
      }
      hitMarker.classList.toggle('active', feedback.showHitFlash);
      combatFlash.classList.toggle('active', feedback.showHitFlash);
    },
  });

  const handleModeToggle = () => {
    const view = sceneView;
    const camera = view?.camera;
    if (!view || !camera || !playground || isPlayerMatchMode) return;
    if (!isSkirmishMode) {
      pointerControls?.releaseLock();
      const generated = generateMap(createSkirmishShowcaseMap());
      skirmishView = new BotSkirmishView(view.scene, generated, {
        friendlyCount: BOTS_PER_TEAM,
        enemyCount: BOTS_PER_TEAM,
        seed: generated.source.seed,
      });
      isSkirmishMode = true;
      playground.setVisible(false);
      practiceRange?.setVisible(false);
      if (playerCharacter) playerCharacter.object.visible = false;
      weaponView?.setVisible(false);
      grenadeView?.setVisible(false);
      camera.fov = 65;
      camera.position.set(0, 100, 70);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      modeToggle.textContent = 'Return to shooting range';
      modeHeading.textContent = 'Midtown skirmish';
      viewport.setAttribute('aria-label', 'Bird’s-eye view of a live bot skirmish');
      hud.setAttribute('aria-label', 'Live bot skirmish status');
      pointerOutput.textContent = 'Bird’s-eye spectator · press Esc to pause';
      classOutput.textContent = `Live seeded skirmish · ${BOTS_PER_TEAM} friendly bots vs ${BOTS_PER_TEAM} enemy bots`;
      weaponOutput.textContent = 'ROUND STARTING';
      const remaining = Math.ceil(skirmishView.match.countdown.secondsRemaining);
      combatReadout.textContent = `Battle begins in ${remaining} seconds · ${BOTS_PER_TEAM} friendly · ${BOTS_PER_TEAM} enemy`;
      skirmishReadout.hidden = false;
      root.dataset.viewMode = 'skirmish';
    } else {
      skirmishView?.dispose();
      skirmishView = null;
      isSkirmishMode = false;
      playground.setVisible(true);
      practiceRange?.setVisible(true);
      if (playerCharacter) playerCharacter.object.visible = true;
      weaponView?.setVisible(true);
      grenadeView?.setVisible(true);
      player?.render(1);
      modeToggle.textContent = `Watch ${TOTAL_MATCH_BOTS}-bot skirmish`;
      modeHeading.textContent = 'Shooting range';
      viewport.setAttribute('aria-label', 'First-person shooting and movement testing range');
      hud.setAttribute('aria-label', 'Shooting range status and controls');
      pointerOutput.textContent = 'Click the scene to capture the mouse.';
      classOutput.textContent = 'Three lanes · 10 m, 15 m, and 20 m targets · movement course';
      skirmishReadout.hidden = true;
      root.dataset.viewMode = 'practice';
    }
  };

  const handleResetRange = () => {
    if (isPlayerMatchMode || isSkirmishMode) return;
    practiceRange?.reset();
    combat?.resetForRespawn();
    weaponView?.resetForRespawn();
    player?.setSpawn({ x: 0, y: 0, z: 9 });
    player?.render(1);
  };

  const handleEnterRange = () => {
    const view = sceneView;
    const activePlayground = playground;
    const activeRange = practiceRange;
    if (!view || !activePlayground || !activeRange || menuOpenedFromPause || isPlayerMatchMode || isSkirmishMode) return;
    pointerControls?.releaseLock();
    activeRange.reset();
    combat = new CombatSession(activePlayground.world, activeRange.combatants, weaponDefinition);
    player = new PlayerController(view.camera, activePlayground.world, {
      spawn: { x: 0, y: 0, z: 9 },
      crouchMode: MOVEMENT_PLAYGROUND_CLASS.crouchMode,
      capabilities: MOVEMENT_PLAYGROUND_CLASS.capabilities,
      lookSensitivity: profile.lookSensitivity,
    });
    playerCharacter?.setPose({ dead: false, movementSpeed: 0, grounded: true, aiming: false });
    if (playerCharacter) playerCharacter.object.visible = true;
    weaponView?.resetForRespawn();
    weaponView?.setVisible(true);
    grenadeView?.setVisible(true);
    view.camera.up.set(0, 1, 0);
    player.render(1);
    modeHeading.textContent = 'Shooting range';
    viewport.setAttribute('aria-label', 'First-person shooting and movement testing range');
    hud.setAttribute('aria-label', 'Shooting range status and controls');
    classOutput.textContent = 'Three lanes · 10 m, 15 m, and 20 m targets · movement course';
    modeToggle.hidden = false;
    joinMatchButton.textContent = `Join ${TOTAL_MATCH_BOTS}-bot match`;
    pointerOutput.textContent = 'Click the scene to capture the mouse.';
    deathOverlay.hidden = true;
    reviveReadout.hidden = true;
    skirmishReadout.hidden = true;
    root.dataset.viewMode = 'practice';
    closeMainMenu();
    if (runtime.resume()) pointerControls?.requestLock();
  };

  const handleJoinMatch = () => {
    const view = sceneView;
    const camera = view?.camera;
    const activePlayground = playground;
    const activeRange = practiceRange;
    if (!view || !camera || !activePlayground || !activeRange) return;

    if (isPlayerMatchMode) {
      pointerControls?.releaseLock();
      skirmishView?.dispose();
      skirmishView = null;
      isPlayerMatchMode = false;
      activePlayground.setVisible(true);
      activeRange.setVisible(true);
      combat = new CombatSession(activePlayground.world, activeRange.combatants, weaponDefinition);
      player = new PlayerController(camera, activePlayground.world, {
        spawn: { x: 0, y: 0, z: 8 },
        crouchMode: MOVEMENT_PLAYGROUND_CLASS.crouchMode,
        capabilities: MOVEMENT_PLAYGROUND_CLASS.capabilities,
        lookSensitivity: profile.lookSensitivity,
      });
      if (playerCharacter) {
        playerCharacter.object.visible = true;
        playerCharacter.setPose({ dead: false });
      }
      weaponView?.setVisible(true);
      grenadeView?.setVisible(true);
      camera.up.set(0, 1, 0);
      player.render(1);
      modeHeading.textContent = 'Shooting range';
      viewport.setAttribute('aria-label', 'First-person shooting and movement testing range');
      hud.setAttribute('aria-label', 'Shooting range controls and status');
      modeToggle.hidden = false;
      joinMatchButton.textContent = `Join ${TOTAL_MATCH_BOTS}-bot match`;
      pointerOutput.textContent = 'Click the scene to capture the mouse.';
      deathOverlay.hidden = true;
      reviveReadout.hidden = true;
      skirmishReadout.hidden = true;
      root.dataset.viewMode = 'practice';
      return;
    }

    if (isSkirmishMode) handleModeToggle();
    pointerControls?.releaseLock();
    currentMatchId = matchIdentifier();
    resultsShown = false;
    resultsOverlay.hidden = true;
    const generated = generateMap(createSkirmishShowcaseMap(undefined, profile.selectedMap));
    const spawnCell = generated.navigationNodes
      .filter((cell) => cell.x === 0)
      .sort((a, b) => Math.abs(a.y - (generated.source.height - 1) / 2) - Math.abs(b.y - (generated.source.height - 1) / 2))[0]
      ?? generated.navigationNodes[0];
    if (!spawnCell) return;
    const mapSpawn = worldPosition(generated.source, spawnCell);
    const playerSpawn = { x: mapSpawn.x, y: 0, z: mapSpawn.z + generated.source.cellSize * 0.18 };
    skirmishView = new BotSkirmishView(view.scene, generated, {
      friendlyCount: BOTS_PER_TEAM,
      enemyCount: BOTS_PER_TEAM,
      seed: generated.source.seed,
      simulation: { seed: generated.source.seed, humanPlayer: { id: 'player', team: 'friendly', spawn: playerSpawn } },
    });
    isPlayerMatchMode = true;
    playerWasAlive = true;
    activeReviveTargetId = null;
    activePlayground.setVisible(false);
    activeRange.setVisible(false);
    combat = new CombatSession(skirmishView.match.simulation.world, skirmishView.match.simulation.combatants, weaponDefinition, 'friendly');
    player = new PlayerController(camera, skirmishView.match.simulation.world, {
      spawn: playerSpawn,
      crouchMode: MOVEMENT_PLAYGROUND_CLASS.crouchMode,
      capabilities: MOVEMENT_PLAYGROUND_CLASS.capabilities,
      lookSensitivity: profile.lookSensitivity,
    });
    if (playerCharacter) {
      playerCharacter.object.visible = true;
      playerCharacter.setPose({ dead: false });
    }
    weaponView?.setVisible(true);
    grenadeView?.setVisible(true);
    camera.up.set(0, 1, 0);
    player.render(1);
    const countdown = Math.ceil(skirmishView.match.countdown.secondsRemaining);
    modeHeading.textContent = `${generated.source.name} match`;
    viewport.setAttribute('aria-label', `First-person view of a live ${generated.source.name} match`);
    hud.setAttribute('aria-label', `Live ${generated.source.name} match status and controls`);
    modeToggle.hidden = true;
    joinMatchButton.textContent = 'Leave match';
    pointerOutput.textContent = 'Click the scene to capture the mouse.';
    classOutput.textContent = 'Round countdown · local player on the friendly squad';
    weaponOutput.textContent = 'ROUND STARTING';
    combatReadout.textContent = `Battle begins in ${countdown} seconds · ${BOTS_PER_TEAM} friendly · ${BOTS_PER_TEAM} enemy`;
    skirmishReadout.hidden = false;
    deathOverlay.hidden = true;
    root.dataset.viewMode = 'match';
    pointerControls?.requestLock();
  };
  modeToggle.addEventListener('click', handleModeToggle);
  resetRangeButton.addEventListener('click', handleResetRange);
  joinMatchButton.addEventListener('click', handleJoinMatch);
  root.dataset.viewMode = 'practice';
  root.dataset.menuOpen = 'true';

  const handleResume = () => {
    if (!runtime.resume()) return;
    if (isPlayerMatchMode && skirmishView?.match.simulation.playerCombatant?.status === 'dead') return;
    pointerControls?.requestLock();
  };
  resumeButton.addEventListener('click', handleResume);
  const handleMenuJoin = () => {
    if (menuOpenedFromPause) {
      closeMainMenu();
      const playerCanPlay = !isPlayerMatchMode || skirmishView?.match.simulation.playerCombatant?.status === 'alive';
      if (runtime.resume() && playerCanPlay) pointerControls?.requestLock();
      return;
    }
    closeMainMenu();
    handleJoinMatch();
    runtime.resume();
  };
  const handlePauseSettings = () => openMainMenu('settings', true);
  const handleContinueResults = () => {
    leaderboardsEl.hidden = true;
    rewardScreenEl.hidden = false;
  };
  const returnToMainMenu = () => {
    resultsShown = false;
    resultsOverlay.hidden = true;
    if (isPlayerMatchMode) handleJoinMatch();
    else if (isSkirmishMode) handleModeToggle();
    currentMatchId = null;
    if (runtime.state === 'running') runtime.pause();
    openMainMenu('loadout');
  };
  const handleSensitivity = () => {
    const value = Number(sensitivitySetting.value);
    profile = updateProfileSettings(profile, { lookSensitivity: value });
    player?.setLookSensitivity(value);
    persistNewProfile(profile, 'Sensitivity saved.');
  };
  const handleMasterVolume = () => {
    profile = updateProfileSettings(profile, { masterVolume: masterVolumeInput.valueAsNumber });
    audioManager.setVolumes(profile.masterVolume, profile.effectsVolume);
    persistNewProfile(profile, 'Audio settings saved.');
  };
  const handleEffectsVolume = () => {
    profile = updateProfileSettings(profile, { effectsVolume: effectsVolumeInput.valueAsNumber });
    audioManager.setVolumes(profile.masterVolume, profile.effectsVolume);
    persistNewProfile(profile, 'Audio settings saved.');
  };
  const handleMapSelect = (event: Event) => {
    const button = (event.currentTarget as HTMLButtonElement);
    const mapId = button.dataset.mapOption;
    if (mapId !== 'midtown' && mapId !== 'garden-district') return;
    profile = updateProfileSettings(profile, { selectedMap: mapId });
    persistNewProfile(profile, `${mapId === 'midtown' ? 'Midtown' : 'Garden District'} selected for the next round.`);
  };
  const handleSkillPurchase = (event: Event) => {
    const skillId = (event.currentTarget as HTMLButtonElement).dataset.buySkill as SkillId | undefined;
    if (skillId !== 'field-notes' && skillId !== 'scrounger') return;
    const result = purchaseSkill(profile, skillId);
    const message = result.reason === 'purchased'
      ? `${SKILL_CATALOG.find((skill) => skill.id === skillId)?.name} unlocked.`
      : result.reason === 'owned'
        ? 'This skill is already owned.'
        : 'Earn more credits before buying this skill.';
    persistNewProfile(result.profile, message);
  };
  const handleMenuTab = (event: Event) => {
    const tab = (event.currentTarget as HTMLButtonElement).dataset.menuTab;
    if (tab === 'loadout' || tab === 'settings' || tab === 'maps' || tab === 'skills') openMenuTab(tab);
  };
  for (const button of tabButtons) button.addEventListener('click', handleMenuTab);
  for (const button of mapButtons) button.addEventListener('click', handleMapSelect);
  for (const button of skillButtons) button.addEventListener('click', handleSkillPurchase);
  menuJoinButton.addEventListener('click', handleMenuJoin);
  menuRangeButton.addEventListener('click', handleEnterRange);
  pauseSettingsButton.addEventListener('click', handlePauseSettings);
  returnMenuButton.addEventListener('click', returnToMainMenu);
  resultsMenuButton.addEventListener('click', returnToMainMenu);
  continueResultsButton.addEventListener('click', handleContinueResults);
  sensitivitySetting.addEventListener('input', handleSensitivity);
  masterVolumeInput.addEventListener('input', handleMasterVolume);
  effectsVolumeInput.addEventListener('input', handleEffectsVolume);
  runtime.start();
  runtimeHasStarted = true;
  runtime.pause();

  let disposed = false;
  return {
    runtime,
    dispose() {
      if (disposed) return;
      disposed = true;
      resumeButton.removeEventListener('click', handleResume);
      pauseSettingsButton.removeEventListener('click', handlePauseSettings);
      returnMenuButton.removeEventListener('click', returnToMainMenu);
      resultsMenuButton.removeEventListener('click', returnToMainMenu);
      continueResultsButton.removeEventListener('click', handleContinueResults);
      menuJoinButton.removeEventListener('click', handleMenuJoin);
      menuRangeButton.removeEventListener('click', handleEnterRange);
      sensitivitySetting.removeEventListener('input', handleSensitivity);
      masterVolumeInput.removeEventListener('input', handleMasterVolume);
      effectsVolumeInput.removeEventListener('input', handleEffectsVolume);
      window.removeEventListener('pointerdown', handleAudioGesture);
      window.removeEventListener('keydown', handleAudioGesture);
      root.removeEventListener('click', handleUiSound);
      for (const button of tabButtons) button.removeEventListener('click', handleMenuTab);
      for (const button of mapButtons) button.removeEventListener('click', handleMapSelect);
      for (const button of skillButtons) button.removeEventListener('click', handleSkillPurchase);
      modeToggle.removeEventListener('click', handleModeToggle);
      resetRangeButton.removeEventListener('click', handleResetRange);
      joinMatchButton.removeEventListener('click', handleJoinMatch);
      runtime.dispose();
      audioManager.dispose();
      root.replaceChildren();
    },
  };
}
