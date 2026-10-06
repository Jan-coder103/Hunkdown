import { EngineRuntime } from './engine/engine-runtime';
import { Vector3 } from 'three';
import { SceneView } from './engine/scene-view';
import { createMovementPlayground, MOVEMENT_PLAYGROUND_CLASS } from './game/player/movement-playground';
import { PlayerController } from './game/player/player-controller';
import { ChickenCharacterView } from './game/player/chicken-character-view';
import { PointerLockControls } from './game/player/pointer-lock-controls';
import { createWeaponModel, getWeaponDefinition } from './content/weapons/registry';
import { CombatFeedback } from './game/combat/combat-feedback';
import { createCombatPracticeRange } from './game/combat/combat-practice-range';
import { CombatSession } from './game/combat/combat-session';
import { GrenadeView, WeaponView } from './game/combat/weapon-view';
import { generateMap, worldPosition } from './game/world/map-generator';
import { BotSkirmishView } from './game/bots/bot-skirmish-view';
import { createSkirmishShowcaseMap } from './game/bots/skirmish-showcase';
import './style.css';

export function mountApp(root: HTMLElement) {
  root.innerHTML = `
    <main class="engine-shell">
      <div id="scene-viewport" class="scene-viewport" role="img" aria-label="First-person combat practice range">
        <span class="crosshair" aria-hidden="true"></span>
        <span id="hit-marker" class="hit-marker" aria-hidden="true"></span>
      </div>
      <div id="combat-flash" class="combat-flash" aria-hidden="true"></div>
      <section class="engine-hud" aria-label="Combat practice controls and status">
        <p class="eyebrow">OPERATION HONKDOWN · MATCH PREVIEW</p>
        <h1 id="mode-heading">Combat practice</h1>
        <div class="state-row"><span class="state-dot" aria-hidden="true"></span><output id="engine-state">Starting</output></div>
        <p id="pointer-state" class="hint" aria-live="polite">Click the scene to capture the mouse.</p>
        <button id="mode-toggle" class="mode-toggle" type="button">Watch 16-bot skirmish</button>
        <button id="join-match-button" class="mode-toggle" type="button">Join 16-bot match</button>
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
      <section id="pause-overlay" class="pause-overlay" aria-labelledby="pause-title" hidden>
        <div class="pause-card">
          <p class="eyebrow">SIMULATION PAUSED</p>
          <h2 id="pause-title">Take a breather.</h2>
          <p>The world stops while you are away.</p>
          <button id="resume-button" type="button">Resume</button>
          <p class="hint">You can also press <kbd>Esc</kbd>.</p>
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
  const deathOverlay = root.querySelector<HTMLElement>('#death-overlay');
  const deathReadout = root.querySelector<HTMLElement>('#death-readout');
  if (
    !viewport || !hud || !stateOutput || !pointerOutput || !modeToggle || !joinMatchButton || !skirmishReadout || !reviveReadout || !modeHeading || !classOutput || !weaponOutput || !combatReadout ||
    !diagnosticsOutput || !positionOutput || !hitMarker || !combatFlash || !pauseOverlay || !resumeButton || !deathOverlay || !deathReadout
  ) {
    throw new Error('Missing combat practice element');
  }

  classOutput.textContent = `${MOVEMENT_PLAYGROUND_CLASS.name} · double jump and wall jump enabled`;
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

  const stepPlayerCombat = (
    stepSeconds: number,
    random: () => number,
    input: Readonly<{ wasPressed(code: string): boolean }>,
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
    }, camera.position, aimDirection, random);
    for (const event of result.weaponEvents) {
      if (event.type === 'shot') {
        weaponView?.fire();
        activePlayer.applyRecoil(
          weaponDefinition.recoilPitchRadians * (event.aimed ? 0.75 : 1),
          (random() * 2 - 1) * weaponDefinition.recoilYawRadians,
        );
      } else if (event.type === 'reload-started') {
        weaponView?.beginReload();
        playerCharacter?.beginReload(weaponDefinition.reloadSeconds);
      }
    }
    for (const shot of result.shots) {
      if (!shot.targetId) continue;
      feedback.registerHit();
      hitMarker.classList.add('active');
      combatFlash.classList.add('active');
    }
    for (const explosion of result.explosions) {
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

  const runtime = new EngineRuntime({
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
          if (!isSkirmishMode && (!isPlayerMatchMode || skirmishView?.match.simulation.playerCombatant?.status === 'alive')) {
            player?.render(interpolationAlpha);
          }
          if (!isSkirmishMode && (!isPlayerMatchMode || skirmishView?.match.simulation.playerCombatant?.status === 'alive') && combat && grenadeView && view.camera) {
            view.camera.getWorldDirection(aimDirection);
            const previewOrigin = view.camera.position.clone().addScaledVector(aimDirection, 0.45);
            grenadeView.updateTrajectory(
              combat.grenades.equipped ? combat.trajectory(previewOrigin, aimDirection) : [],
              combat.grenades.equipped,
            );
            grenadeView.updateProjectiles(combat.grenades.projectiles);
          }
          if (!isSkirmishMode) feedback.applyCameraShake(view.camera);
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
        skirmishView?.step(stepSeconds);
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
          playerActor.position.copy(activePlayer.position);
          playerCharacter?.setPose({
            movementSpeed: activePlayer.horizontalSpeed,
            sprinting: activePlayer.horizontalSpeed > 5.8,
            crouched: activePlayer.isCrouched,
            grounded: activePlayer.isGrounded,
            aiming: pointerControls?.isAiming ?? false,
          });
        }

        const lifeBeforeStep = battle.match.lifeSnapshots.find((life) => life.botId === playerActor.id);
        if (aliveBeforeStep && lifeBeforeStep && activeReviveTargetId) {
          battle.match.cancelRevive(activeReviveTargetId);
          activeReviveTargetId = null;
        }
        if (aliveBeforeStep && battle.match.matchState === 'active' && input.isDown('KeyF')) {
          const nearest = battle.match.corpseSnapshots
            .filter((corpse) => corpse.team === 'friendly' && corpse.botId !== playerActor.id)
            .map((corpse) => ({ corpse, distance: Math.hypot(corpse.position.x - playerActor.position.x, corpse.position.z - playerActor.position.z) }))
            .filter(({ distance }) => distance <= 2.5)
            .sort((a, b) => a.distance - b.distance || a.corpse.botId.localeCompare(b.corpse.botId))[0]?.corpse;
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

        battle.step(stepSeconds);
        if (playerActor.status === 'alive' && battle.match.matchState === 'active') {
          stepPlayerCombat(stepSeconds, random, input);
        }
        playerCharacter?.update(stepSeconds);

        const aliveAfterStep = playerActor.status === 'alive';
        if (playerWasAlive && !aliveAfterStep) {
          pointerControls?.releaseLock();
          playerCharacter?.setPose({ dead: true });
          playerCharacter && (playerCharacter.object.visible = false);
          weaponView?.setVisible(false);
          grenadeView?.setVisible(false);
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
        return;
      }

      player?.update(stepSeconds, input, pointerControls?.isAiming ?? false);
      if (player) {
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
      pauseOverlay.hidden = state !== 'paused';
      root.dataset.engineState = state;
      if (state === 'paused') pointerControls?.releaseLock();
    },
    onDiagnostics: (snapshot) => {
      if (snapshot.frameCount % 10 !== 0) return;
      diagnosticsOutput.textContent = `${snapshot.framesPerSecond.toFixed(0)} FPS · ${snapshot.frameTimeMs.toFixed(1)} ms frame · ${snapshot.frameWorkMs.toFixed(2)} ms work · ${snapshot.fixedSteps} fixed steps`;
      if (player && !isSkirmishMode) {
        positionOutput.textContent = `Position ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
      }
      if (isSkirmishMode && skirmishView) {
        const bots = skirmishView.snapshots;
        if (skirmishView.match.matchState === 'countdown') {
          const remaining = Math.ceil(skirmishView.match.countdown.secondsRemaining);
          classOutput.textContent = 'Round countdown · bots are holding their starts';
          weaponOutput.textContent = 'ROUND STARTING';
          combatReadout.textContent = `Battle begins in ${remaining} ${remaining === 1 ? 'second' : 'seconds'} · 8 friendly · 8 enemy`;
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
        positionOutput.textContent = `Seeded Midtown · ${skirmishView.map.navigationNodes.length} reachable city cells · ${skirmishView.tracerCount} active tracers`;
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
        const playerLife = match.lifeSnapshots.find((life) => life.botId === playerActor?.id);
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
          const progress = match.lifeSnapshots.find((life) => life.botId === activeReviveTargetId)?.reviveProgress ?? 0;
          reviveReadout.textContent = `Reviving teammate · ${Math.round(progress * 100)}% · keep holding F and stay close`;
          reviveReadout.hidden = false;
        } else if (playerActor?.status === 'alive' && match.matchState === 'active') {
          reviveReadout.textContent = 'Hold F within 2.5 m of a fallen friendly chicken to revive';
          reviveReadout.hidden = false;
        } else {
          reviveReadout.hidden = true;
        }
        deathOverlay.hidden = playerActor?.status !== 'dead';
        if (match.matchState === 'complete') {
          const winner = match.outcome?.winner === 'draw' ? 'Draw' : `${match.outcome?.winner === 'friendly' ? 'Friendly' : 'Enemy'} victory`;
          skirmishReadout.textContent = `${winner} · ${match.outcome?.reason === 'capture' ? 'objective captured' : 'tickets exhausted'}`;
        }
        const position = player?.position;
        positionOutput.textContent = `Player ${position?.x.toFixed(1) ?? '—'}, ${position?.z.toFixed(1) ?? '—'} · ${battle.map.navigationNodes.length} reachable city cells · ${battle.tracerCount} active tracers`;
      } else if (combat) {
        const ammo = combat.weapon.snapshot;
        weaponOutput.textContent = `${weaponDefinition.displayName} · ${ammo.magazine} / ${ammo.reserve}${ammo.reloading ? ' · RELOADING' : ''}`;
        combatReadout.textContent = `Grenades ${combat.grenades.count}${combat.grenades.equipped ? ' · THROW READY' : ''} · targets ${practiceRange?.combatants.filter((target) => target.status === 'alive').length ?? 0}/${practiceRange?.combatants.length ?? 0}`;
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
        friendlyCount: 8,
        enemyCount: 8,
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
      modeToggle.textContent = 'Return to combat practice';
      modeHeading.textContent = 'Midtown skirmish';
      viewport.setAttribute('aria-label', 'Bird’s-eye view of a live bot skirmish');
      hud.setAttribute('aria-label', 'Live bot skirmish status');
      pointerOutput.textContent = 'Bird’s-eye spectator · press Esc to pause';
      classOutput.textContent = 'Live seeded skirmish · 8 friendly bots vs 8 enemy bots';
      weaponOutput.textContent = 'ROUND STARTING';
      const remaining = Math.ceil(skirmishView.match.countdown.secondsRemaining);
      combatReadout.textContent = `Battle begins in ${remaining} seconds · 8 friendly · 8 enemy`;
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
      modeToggle.textContent = 'Watch 16-bot skirmish';
      modeHeading.textContent = 'Combat practice';
      viewport.setAttribute('aria-label', 'First-person combat practice range');
      hud.setAttribute('aria-label', 'Combat practice controls and status');
      pointerOutput.textContent = 'Click the scene to capture the mouse.';
      classOutput.textContent = `${MOVEMENT_PLAYGROUND_CLASS.name} · double jump and wall jump enabled`;
      skirmishReadout.hidden = true;
      root.dataset.viewMode = 'practice';
    }
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
      });
      if (playerCharacter) {
        playerCharacter.object.visible = true;
        playerCharacter.setPose({ dead: false });
      }
      weaponView?.setVisible(true);
      grenadeView?.setVisible(true);
      camera.up.set(0, 1, 0);
      player.render(1);
      modeHeading.textContent = 'Combat practice';
      viewport.setAttribute('aria-label', 'First-person combat practice range');
      hud.setAttribute('aria-label', 'Combat practice controls and status');
      modeToggle.hidden = false;
      joinMatchButton.textContent = 'Join 16-bot match';
      pointerOutput.textContent = 'Click the scene to capture the mouse.';
      deathOverlay.hidden = true;
      reviveReadout.hidden = true;
      skirmishReadout.hidden = true;
      root.dataset.viewMode = 'practice';
      return;
    }

    if (isSkirmishMode) handleModeToggle();
    pointerControls?.releaseLock();
    const generated = generateMap(createSkirmishShowcaseMap());
    const spawnCell = generated.navigationNodes
      .filter((cell) => cell.x === 0)
      .sort((a, b) => Math.abs(a.y - (generated.source.height - 1) / 2) - Math.abs(b.y - (generated.source.height - 1) / 2))[0]
      ?? generated.navigationNodes[0];
    if (!spawnCell) return;
    const mapSpawn = worldPosition(generated.source, spawnCell);
    const playerSpawn = { x: mapSpawn.x, y: 0, z: mapSpawn.z + generated.source.cellSize * 0.18 };
    skirmishView = new BotSkirmishView(view.scene, generated, {
      friendlyCount: 8,
      enemyCount: 8,
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
    modeHeading.textContent = 'Midtown match';
    viewport.setAttribute('aria-label', 'First-person view of a live Midtown match');
    hud.setAttribute('aria-label', 'Live Midtown match status and controls');
    modeToggle.hidden = true;
    joinMatchButton.textContent = 'Leave match';
    pointerOutput.textContent = 'Click the scene to capture the mouse.';
    classOutput.textContent = 'Round countdown · local player on the friendly squad';
    weaponOutput.textContent = 'ROUND STARTING';
    combatReadout.textContent = `Battle begins in ${countdown} seconds · 8 friendly · 8 enemy`;
    skirmishReadout.hidden = false;
    deathOverlay.hidden = true;
    root.dataset.viewMode = 'match';
    pointerControls?.requestLock();
  };
  modeToggle.addEventListener('click', handleModeToggle);
  joinMatchButton.addEventListener('click', handleJoinMatch);
  root.dataset.viewMode = 'practice';

  const handleResume = () => {
    if (!runtime.resume()) return;
    if (isPlayerMatchMode && skirmishView?.match.simulation.playerCombatant?.status === 'dead') return;
    pointerControls?.requestLock();
  };
  resumeButton.addEventListener('click', handleResume);
  runtime.start();

  let disposed = false;
  return {
    runtime,
    dispose() {
      if (disposed) return;
      disposed = true;
      resumeButton.removeEventListener('click', handleResume);
      modeToggle.removeEventListener('click', handleModeToggle);
      joinMatchButton.removeEventListener('click', handleJoinMatch);
      runtime.dispose();
      root.replaceChildren();
    },
  };
}

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('Missing application root');
const mountedApp = mountApp(appRoot);
if (import.meta.hot) import.meta.hot.dispose(() => mountedApp.dispose());
