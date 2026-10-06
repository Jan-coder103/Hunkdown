import { EngineRuntime } from './engine/engine-runtime';
import { Vector3 } from 'three';
import { SceneView } from './engine/scene-view';
import { createMovementPlayground, MOVEMENT_PLAYGROUND_CLASS } from './game/player/movement-playground';
import { PlayerController } from './game/player/player-controller';
import { PointerLockControls } from './game/player/pointer-lock-controls';
import { createWeaponModel, getWeaponDefinition } from './content/weapons/registry';
import { CombatFeedback } from './game/combat/combat-feedback';
import { createCombatPracticeRange } from './game/combat/combat-practice-range';
import { CombatSession } from './game/combat/combat-session';
import { GrenadeView, WeaponView } from './game/combat/weapon-view';
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
        <p class="eyebrow">OPERATION HONKDOWN · PHASE 4</p>
        <h1>Combat practice</h1>
        <div class="state-row"><span class="state-dot" aria-hidden="true"></span><output id="engine-state">Starting</output></div>
        <p id="pointer-state" class="hint" aria-live="polite">Click the scene to capture the mouse.</p>
        <div class="control-list" aria-label="Controls">
          <span><kbd>W A S D</kbd> Move</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>Left mouse</kbd> Fire / throw</span>
          <span><kbd>Right mouse</kbd> Aim</span>
          <span><kbd>R</kbd> Reload</span>
          <span><kbd>G</kbd> Equip grenade</span>
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
    </main>
  `;

  const viewport = root.querySelector<HTMLElement>('#scene-viewport');
  const stateOutput = root.querySelector<HTMLOutputElement>('#engine-state');
  const pointerOutput = root.querySelector<HTMLOutputElement>('#pointer-state');
  const classOutput = root.querySelector<HTMLOutputElement>('#class-state');
  const weaponOutput = root.querySelector<HTMLOutputElement>('#weapon-state');
  const combatReadout = root.querySelector<HTMLOutputElement>('#combat-readout');
  const diagnosticsOutput = root.querySelector<HTMLOutputElement>('#engine-diagnostics');
  const positionOutput = root.querySelector<HTMLOutputElement>('#position-readout');
  const hitMarker = root.querySelector<HTMLElement>('#hit-marker');
  const combatFlash = root.querySelector<HTMLElement>('#combat-flash');
  const pauseOverlay = root.querySelector<HTMLElement>('#pause-overlay');
  const resumeButton = root.querySelector<HTMLButtonElement>('#resume-button');
  if (
    !viewport || !stateOutput || !pointerOutput || !classOutput || !weaponOutput || !combatReadout ||
    !diagnosticsOutput || !positionOutput || !hitMarker || !combatFlash || !pauseOverlay || !resumeButton
  ) {
    throw new Error('Missing combat practice element');
  }

  classOutput.textContent = `${MOVEMENT_PLAYGROUND_CLASS.name} · double jump and wall jump enabled`;
  const weaponDefinition = getWeaponDefinition('honk-47');
  let player: PlayerController | null = null;
  let pointerControls: PointerLockControls | null = null;
  let combat: CombatSession | null = null;
  let practiceRange: ReturnType<typeof createCombatPracticeRange> | null = null;
  let weaponView: WeaponView | null = null;
  let grenadeView: GrenadeView | null = null;
  let sceneView: SceneView | null = null;
  const feedback = new CombatFeedback();
  const aimDirection = new Vector3();

  const runtime = new EngineRuntime({
    createView: () => {
      const view = new SceneView({ container: viewport });
      sceneView = view;
      const playground = createMovementPlayground(view.scene);
      practiceRange = createCombatPracticeRange(view.scene);
      combat = new CombatSession(playground.world, practiceRange.combatants, weaponDefinition);
      weaponView = new WeaponView(view.camera, createWeaponModel(weaponDefinition.id), weaponDefinition.reloadSeconds);
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
            : 'Click the scene to capture the mouse.';
          root.dataset.pointerLocked = String(locked);
        },
      });
      pointerControls.attach();

      return {
        render(interpolationAlpha: number) {
          player?.render(interpolationAlpha);
          if (combat && grenadeView && view.camera) {
            view.camera.getWorldDirection(aimDirection);
            const previewOrigin = view.camera.position.clone().addScaledVector(aimDirection, 0.45);
            grenadeView.updateTrajectory(
              combat.grenades.equipped ? combat.trajectory(previewOrigin, aimDirection) : [],
              combat.grenades.equipped,
            );
            grenadeView.updateProjectiles(combat.grenades.projectiles);
          }
          feedback.applyCameraShake(view.camera);
          view.render(interpolationAlpha);
        },
        dispose() {
          pointerControls?.dispose();
          pointerControls = null;
          grenadeView?.dispose();
          grenadeView = null;
          weaponView?.dispose();
          weaponView = null;
          practiceRange?.dispose();
          practiceRange = null;
          combat = null;
          sceneView = null;
          player = null;
          playground.dispose();
          view.dispose();
        },
      };
    },
    updateSimulation: (stepSeconds, random, input) => {
      player?.update(stepSeconds, input, pointerControls?.isAiming ?? false);
      feedback.update(stepSeconds);
      practiceRange?.update(stepSeconds);
      const activeCombat = combat;
      const camera = sceneView?.camera;
      if (!player || !activeCombat || !camera) return;
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
          player.applyRecoil(
            weaponDefinition.recoilPitchRadians * (event.aimed ? 0.75 : 1),
            (random() * 2 - 1) * weaponDefinition.recoilYawRadians,
          );
        } else if (event.type === 'reload-started') {
          weaponView?.beginReload();
        }
      }
      for (const shot of result.shots) {
        if (shot.targetId) {
          feedback.registerHit();
          hitMarker.classList.add('active');
          combatFlash.classList.add('active');
        }
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
      if (player) {
        positionOutput.textContent = `Position ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
      }
      if (combat) {
        const ammo = combat.weapon.snapshot;
        weaponOutput.textContent = `${weaponDefinition.displayName} · ${ammo.magazine} / ${ammo.reserve}${ammo.reloading ? ' · RELOADING' : ''}`;
        combatReadout.textContent = `Grenades ${combat.grenades.count}${combat.grenades.equipped ? ' · THROW READY' : ''} · targets ${practiceRange?.combatants.filter((target) => target.status === 'alive').length ?? 0}/${practiceRange?.combatants.length ?? 0}`;
      }
      hitMarker.classList.toggle('active', feedback.showHitFlash);
      combatFlash.classList.toggle('active', feedback.showHitFlash);
    },
  });

  const handleResume = () => {
    if (runtime.resume()) pointerControls?.requestLock();
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
      runtime.dispose();
      root.replaceChildren();
    },
  };
}

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('Missing application root');
const mountedApp = mountApp(appRoot);
if (import.meta.hot) import.meta.hot.dispose(() => mountedApp.dispose());
