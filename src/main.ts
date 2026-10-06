import { EngineRuntime } from './engine/engine-runtime';
import { SceneView } from './engine/scene-view';
import './style.css';

export function mountApp(root: HTMLElement) {
  root.innerHTML = `
    <main class="engine-shell">
      <div id="scene-viewport" class="scene-viewport" role="img" aria-label="Blank three-dimensional engine scene"></div>
      <section class="engine-hud" aria-label="Engine status">
        <p class="eyebrow">OPERATION HONKDOWN · CORE ENGINE</p>
        <h1>Engine shell</h1>
        <div class="state-row"><span class="state-dot" aria-hidden="true"></span><output id="engine-state">Starting</output></div>
        <p class="hint">Press <kbd>Esc</kbd> to pause or resume.</p>
        <output id="engine-diagnostics" class="diagnostics">Waiting for first frame…</output>
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
  const diagnosticsOutput = root.querySelector<HTMLOutputElement>('#engine-diagnostics');
  const pauseOverlay = root.querySelector<HTMLElement>('#pause-overlay');
  const resumeButton = root.querySelector<HTMLButtonElement>('#resume-button');
  if (!viewport || !stateOutput || !diagnosticsOutput || !pauseOverlay || !resumeButton) {
    throw new Error('Missing engine shell element');
  }

  const runtime = new EngineRuntime({
    createView: () => new SceneView({ container: viewport }),
    onStateChange: (state) => {
      stateOutput.textContent = state === 'running' ? 'Running' : state === 'paused' ? 'Paused' : state;
      pauseOverlay.hidden = state !== 'paused';
      root.dataset.engineState = state;
    },
    onDiagnostics: (snapshot) => {
      if (snapshot.frameCount % 10 !== 0) return;
      diagnosticsOutput.textContent = `${snapshot.framesPerSecond.toFixed(0)} FPS · ${snapshot.frameTimeMs.toFixed(1)} ms frame · ${snapshot.frameWorkMs.toFixed(2)} ms work · ${snapshot.simulationTimeMs.toFixed(2)} ms sim · ${snapshot.fixedSteps} fixed steps`;
    },
  });

  const handleResume = () => runtime.resume();
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
