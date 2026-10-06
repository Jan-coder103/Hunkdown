import { REVISION } from 'three';
import { PROJECT } from './game/project';
import './style.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing application root');

app.innerHTML = `
  <section class="intro" aria-labelledby="title">
    <p class="eyebrow">TACTICAL CHICKENS · QUESTIONABLE DECISIONS</p>
    <h1 id="title">${PROJECT.name}</h1>
    <p class="tagline">${PROJECT.tagline}</p>
    <p class="description">Pastel city streets. Fully geared birds. A whole lot of honking.</p>
    <div class="status"><span class="dot" aria-hidden="true"></span> Phase 1 — ${PROJECT.phase}</div>
    <p class="note">The project is set up. The playable engine is the next development phase.</p>
    <dl>
      <div><dt>Battle target</dt><dd>${PROJECT.targetBotCount}+ bots</dd></div>
      <div><dt>Rendering</dt><dd>Three.js r${REVISION}</dd></div>
      <div><dt>Visual direction</dt><dd>Bright &amp; low-poly</dd></div>
    </dl>
  </section>
`;
