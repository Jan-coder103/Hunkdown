export const AUDIO_SOUND_IDS = Object.freeze([
  'gunshot',
  'explosion',
  'honk',
  'reload',
  'footstep',
  'hit',
  'ui',
] as const);

export type AudioSoundId = (typeof AUDIO_SOUND_IDS)[number];
export type AudioPosition = Readonly<{ x: number; y: number; z: number }>;

export type AudioPlayOptions = Readonly<{
  position?: AudioPosition;
  volume?: number;
}>;

export const MAX_ACTIVE_AUDIO_VOICES = 16;

export const SOUND_RULES: Readonly<Record<AudioSoundId, Readonly<{
  gain: number;
  maxVoices: number;
  minimumIntervalSeconds: number;
  spatial: boolean;
}>>> = Object.freeze({
  gunshot: Object.freeze({ gain: 0.42, maxVoices: 6, minimumIntervalSeconds: 0.09, spatial: true }),
  explosion: Object.freeze({ gain: 0.75, maxVoices: 3, minimumIntervalSeconds: 0.08, spatial: true }),
  honk: Object.freeze({ gain: 0.68, maxVoices: 3, minimumIntervalSeconds: 0.16, spatial: true }),
  reload: Object.freeze({ gain: 0.48, maxVoices: 2, minimumIntervalSeconds: 0.16, spatial: true }),
  footstep: Object.freeze({ gain: 0.28, maxVoices: 2, minimumIntervalSeconds: 0.24, spatial: true }),
  hit: Object.freeze({ gain: 0.45, maxVoices: 1, minimumIntervalSeconds: 0.09, spatial: false }),
  ui: Object.freeze({ gain: 0.34, maxVoices: 2, minimumIntervalSeconds: 0.08, spatial: false }),
});

export type AudioPlatform = Readonly<{
  createContext: () => AudioContext | null;
  loadManifest: () => Promise<unknown>;
  fetchClip: (relativePath: string) => Promise<ArrayBuffer | null>;
}>;

type AudioManifest = Readonly<{
  version: 1;
  clips: Readonly<Partial<Record<AudioSoundId, AudioClipRecord>>>;
}>;
type AudioClipRecord = Readonly<{ file: string; source: string; license: string }>;

type Voice = {
  soundId: AudioSoundId;
  source: AudioBufferSourceNode | null;
  released: boolean;
  nodes: AudioNode[];
};

/** Browser audio is unlocked on the first gesture and remains silent for clips absent from the manifest. */
export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private manifestPromise: Promise<AudioManifest | null> | null = null;
  private readonly clipPromises = new Map<AudioSoundId, Promise<AudioBuffer | null>>();
  private readonly voices = new Set<Voice>();
  private readonly lastRequestedAt = new Map<AudioSoundId, number>();
  private masterVolume = 1;
  private effectsVolume = 1;
  private disposed = false;

  constructor(private readonly platform: AudioPlatform = createBrowserAudioPlatform()) {}

  get isUnlocked(): boolean {
    return this.context?.state === 'running' && this.effectsGain !== null;
  }

  setVolumes(masterVolume: number, effectsVolume: number): void {
    if (!isUnitInterval(masterVolume) || !isUnitInterval(effectsVolume)) {
      throw new RangeError('Audio volumes must be between 0 and 1');
    }
    this.masterVolume = masterVolume;
    this.effectsVolume = effectsVolume;
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
    if (this.effectsGain) this.effectsGain.gain.value = this.effectsVolume;
  }

  async unlock(): Promise<boolean> {
    if (this.disposed) return false;
    if (!this.context) {
      try {
        this.context = this.platform.createContext();
      } catch {
        return false;
      }
    }
    const context = this.context;
    if (!context) return false;
    try {
      if (context.state === 'suspended') await context.resume();
      if (this.disposed || this.context !== context) return false;
      if (context.state !== 'running') return false;
      if (!this.masterGain || !this.effectsGain) {
        this.masterGain = context.createGain();
        this.effectsGain = context.createGain();
        this.effectsGain.connect(this.masterGain);
        this.masterGain.connect(context.destination);
        this.setVolumes(this.masterVolume, this.effectsVolume);
      }
      void this.loadManifest();
      return true;
    } catch {
      return false;
    }
  }

  updateListener(position: AudioPosition, forward: AudioPosition): void {
    const listener = this.context?.listener;
    if (!listener || this.context?.state !== 'running') return;
    // Firefox exposes the legacy listener methods without these AudioParams.
    if (listener.positionX && listener.positionY && listener.positionZ) {
      setAudioParam(listener.positionX, position.x);
      setAudioParam(listener.positionY, position.y);
      setAudioParam(listener.positionZ, position.z);
    } else {
      listener.setPosition(position.x, position.y, position.z);
    }
    if (
      listener.forwardX && listener.forwardY && listener.forwardZ
      && listener.upX && listener.upY && listener.upZ
    ) {
      setAudioParam(listener.forwardX, forward.x);
      setAudioParam(listener.forwardY, forward.y);
      setAudioParam(listener.forwardZ, forward.z);
      setAudioParam(listener.upX, 0);
      setAudioParam(listener.upY, 1);
      setAudioParam(listener.upZ, 0);
    } else {
      listener.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  /** Returns true when a bounded voice slot was reserved; missing files resolve as silence. */
  play(soundId: AudioSoundId, options: AudioPlayOptions = {}): boolean {
    const context = this.context;
    const effectsGain = this.effectsGain;
    if (this.disposed || !context || !effectsGain || context.state !== 'running') return false;
    if (options.volume !== undefined && !isUnitInterval(options.volume)) return false;

    const rules = SOUND_RULES[soundId];
    const now = context.currentTime;
    const last = this.lastRequestedAt.get(soundId);
    if (last !== undefined && now - last < rules.minimumIntervalSeconds) return false;
    let soundVoices = 0;
    for (const voice of this.voices) if (!voice.released && voice.soundId === soundId) soundVoices += 1;
    if (soundVoices >= rules.maxVoices || this.voices.size >= MAX_ACTIVE_AUDIO_VOICES) return false;

    const voice: Voice = { soundId, source: null, released: false, nodes: [] };
    this.voices.add(voice);
    this.lastRequestedAt.set(soundId, now);
    // Callers often pass live Three.js vectors; preserve the event's location
    // while its clip is fetched and decoded.
    const capturedOptions = { ...options, ...(options.position ? { position: { ...options.position } } : {}) };
    void this.startVoice(voice, capturedOptions).catch(() => this.releaseVoice(voice));
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const voice of this.voices) {
      try { voice.source?.stop(); } catch { /* A source may already have ended. */ }
      this.releaseVoice(voice);
    }
    this.voices.clear();
    try { this.masterGain?.disconnect(); } catch { /* Context teardown is best effort. */ }
    try { this.effectsGain?.disconnect(); } catch { /* Context teardown is best effort. */ }
    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.effectsGain = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }

  private async startVoice(voice: Voice, options: AudioPlayOptions): Promise<void> {
    const context = this.context;
    const effectsGain = this.effectsGain;
    if (!context || !effectsGain) return this.releaseVoice(voice);
    const buffer = await this.loadClip(voice.soundId, context);
    if (!buffer || this.disposed || context.state !== 'running' || voice.released) return this.releaseVoice(voice);

    const rules = SOUND_RULES[voice.soundId];
    const source = context.createBufferSource();
    voice.source = source;
    voice.nodes.push(source);
    const voiceGain = context.createGain();
    voice.nodes.push(voiceGain);
    source.buffer = buffer;
    voiceGain.gain.value = rules.gain * (options.volume ?? 1);
    source.connect(voiceGain);
    if (rules.spatial && options.position) {
      const panner = context.createPanner();
      voice.nodes.push(panner);
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3;
      panner.maxDistance = 90;
      panner.rolloffFactor = 1.2;
      setAudioParam(panner.positionX, options.position.x);
      setAudioParam(panner.positionY, options.position.y);
      setAudioParam(panner.positionZ, options.position.z);
      voiceGain.connect(panner);
      panner.connect(effectsGain);
    } else {
      voiceGain.connect(effectsGain);
    }
    source.onended = () => this.releaseVoice(voice);
    source.start();
  }

  private async loadClip(soundId: AudioSoundId, context: AudioContext): Promise<AudioBuffer | null> {
    let pending = this.clipPromises.get(soundId);
    if (!pending) {
      pending = (async () => {
        const manifest = await this.loadManifest();
        const clip = manifest?.clips[soundId];
        if (!clip) return null;
        const encoded = await this.platform.fetchClip(clip.file);
        if (!encoded) return null;
        return await context.decodeAudioData(encoded);
      })().catch(() => null);
      this.clipPromises.set(soundId, pending);
    }
    return pending;
  }

  private loadManifest(): Promise<AudioManifest | null> {
    if (!this.manifestPromise) {
      this.manifestPromise = this.platform.loadManifest()
        .then(parseAudioManifest)
        .catch(() => null);
    }
    return this.manifestPromise;
  }

  private releaseVoice(voice: Voice): void {
    if (voice.released) return;
    voice.released = true;
    if (voice.source) voice.source.onended = null;
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* Context teardown is best effort. */ }
    }
    voice.nodes.length = 0;
    voice.source = null;
    this.voices.delete(voice);
  }
}

export function createBrowserAudioPlatform(): AudioPlatform {
  return {
    createContext: () => {
      if (typeof globalThis.AudioContext === 'undefined') return null;
      return new AudioContext({ latencyHint: 'interactive' });
    },
    loadManifest: async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/manifest.json`);
      return response.ok ? response.json() as Promise<unknown> : null;
    },
    fetchClip: async (relativePath) => {
      const response = await fetch(`${import.meta.env.BASE_URL}audio/${relativePath}`);
      return response.ok ? response.arrayBuffer() : null;
    },
  };
}

function parseAudioManifest(value: unknown): AudioManifest | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.clips)) return null;
  const clips: Partial<Record<AudioSoundId, AudioClipRecord>> = {};
  for (const soundId of AUDIO_SOUND_IDS) {
    const entry = value.clips[soundId];
    if (!isRecord(entry)) continue;
    const file = entry.file;
    const source = entry.source;
    const license = entry.license;
    if (
      typeof file === 'string' && isSafeAudioPath(file)
      && isRequiredRecord(source) && isRequiredRecord(license)
    ) {
      clips[soundId] = Object.freeze({ file, source: source.trim(), license: license.trim() });
    }
  }
  return Object.freeze({ version: 1, clips: Object.freeze(clips) });
}

function isSafeAudioPath(path: string): boolean {
  return path.length > 0 && path.length <= 180
    && !path.startsWith('/')
    && !path.includes('..')
    && /^[a-zA-Z0-9/_-]+\.(wav|mp3|ogg|webm)$/i.test(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnitInterval(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isRequiredRecord(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 280;
}

function setAudioParam(parameter: AudioParam, value: number): void {
  parameter.value = value;
}
