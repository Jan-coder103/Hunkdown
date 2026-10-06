import { EngineRuntime } from './engine/engine-runtime';
import { SceneView } from './engine/scene-view';
import { createMovementPlayground, MOVEMENT_PLAYGROUND_CLASS } from './game/player/movement-playground';
import { PlayerController } from './game/player/player-controller';
import { PointerLockControls } from './game/player/pointer-lock-controls';
import './style.css';

export function mountApp(root: HTMLElement) {
  root.innerHTML = `
    <main class="engine-shell">
      <div id="scene-viewport" class="scene-viewport" role="img" aria-label="First-person movement playground">
        <span class="crosshair" aria-hidden="true"></span>
      </div>
      <section class="engine-hud" aria-label="Movement playground controls">
        <p class="eyebrow">OPERATION HONKDOWN · PHASE 3</p>
        <h1>Movement playground</h1>
        <div class="state-row"><span class="state-dot" aria-hidden="true"></span><output id="engine-state">Starting</output></div>
        <p id="pointer-state" class="hint" aria-live="polite">Click the scene to capture the mouse.</p>
        <div class="control-list" aria-label="Controls">
          <span><kbd>W A S D</kbd> Move</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>Shift</kbd> Sprint</span>
          <span><kbd>C</kbd> Crouch / slide</span>
          <span><kbd>Q / E</kbd> Lean</span>
          <span><kbd>Right mouse</kbd> Aim</span>
        </div>
        <output id="class-state" class="class-state"></output>
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
  const diagnosticsOutput = root.querySelector<HTMLOutputElement>('#engine-diagnostics');
  const positionOutput = root.querySelector<HTMLOutputElement>('#position-readout');
  const pauseOverlay = root.querySelector<HTMLElement>('#pause-overlay');
  const resumeButton = root.querySelector<HTMLButtonElement>('#resume-button');
  if (
    !viewport || !stateOutput || !pointerOutput || !classOutput || !diagnosticsOutput ||
    !positionOutput || !pauseOverlay || !resumeButton
  ) {
    throw new Error('Missing movement playground element');
  }

  classOutput.textContent = `${MOVEMENT_PLAYGROUND_CLASS.name} · double jump and wall jump enabled`;
  let player: PlayerController | null = null;
  let pointerControls: PointerLockControls | null = null;

  const runtime = new EngineRuntime({
    createView: () => {
      const sceneView = new SceneView({ container: viewport });
      const playground = createMovementPlayground(sceneView.scene);
      player = new PlayerController(sceneView.camera, playground.world, {
        spawn: { x: 0, y: 0, z: 8 },
        crouchMode: MOVEMENT_PLAYGROUND_CLASS.crouchMode,
        capabilities: MOVEMENT_PLAYGROUND_CLASS.capabilities,
      });
      pointerControls = new PointerLockControls(sceneView.renderer.domElement as HTMLCanvasElement, {
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
          sceneView.render(interpolationAlpha);
        },
        dispose() {
          pointerControls?.dispose();
          pointerControls = null;
          player = null;
          playground.dispose();
          sceneView.dispose();
        },
      };
    },
    updateSimulation: (stepSeconds, _random, input) => {
      player?.update(stepSeconds, input, pointerControls?.isAiming ?? false);
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
