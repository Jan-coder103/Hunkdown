import { describe, expect, it, vi } from 'vitest';
import {
  AudioManager,
  MAX_ACTIVE_AUDIO_VOICES,
  type AudioPlatform,
} from '../src/game/audio/audio-manager';

class FakeParam {
  value = 0;
}

class FakeNode {
  connections: unknown[] = [];
  connect(destination: unknown): void { this.connections.push(destination); }
  disconnect(): void { this.connections.length = 0; }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakePanner extends FakeNode {
  panningModel = 'equalpower';
  distanceModel = 'inverse';
  refDistance = 1;
  maxDistance = 10000;
  rolloffFactor = 1;
  positionX = new FakeParam();
  positionY = new FakeParam();
  positionZ = new FakeParam();
}

class FakeSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onended?.());
}

class FakeContext {
  state: AudioContextState = 'suspended';
  currentTime = 1;
  destination = new FakeNode() as unknown as AudioNode;
  listener = {
    positionX: new FakeParam(), positionY: new FakeParam(), positionZ: new FakeParam(),
    forwardX: new FakeParam(), forwardY: new FakeParam(), forwardZ: new FakeParam(),
    upX: new FakeParam(), upY: new FakeParam(), upZ: new FakeParam(),
  } as unknown as AudioListener;
  readonly sources: FakeSource[] = [];
  readonly gains: FakeGain[] = [];
  readonly panners: FakePanner[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain(): GainNode {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }
  createPanner(): PannerNode {
    const panner = new FakePanner();
    this.panners.push(panner);
    return panner as unknown as PannerNode;
  }
  createBufferSource(): AudioBufferSourceNode {
    const source = new FakeSource();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }
  decodeAudioData = vi.fn(async () => ({ duration: 0.25 }) as AudioBuffer);
}

function makeAudioHarness(manifest: unknown = {
  version: 1,
  clips: { gunshot: { file: 'gunshot.ogg', source: 'user supplied', license: 'CC0' } },
}) {
  const context = new FakeContext();
  const platform: AudioPlatform = {
    createContext: () => context as unknown as AudioContext,
    loadManifest: vi.fn(async () => manifest),
    fetchClip: vi.fn(async () => new ArrayBuffer(8)),
  };
  return { manager: new AudioManager(platform), context, platform };
}

async function letAudioTasksSettle(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('AudioManager', () => {
  it('preserves an event position during loading and disconnects ended voice nodes', async () => {
    const { manager, context } = makeAudioHarness();
    await manager.unlock();
    const position = { x: 4, y: 5, z: 6 };
    manager.play('gunshot', { position });
    position.x = 99;
    await letAudioTasksSettle();
    expect(context.panners[0]?.positionX.value).toBe(4);
    const source = context.sources[0]!;
    source.onended?.();
    expect(source.connections).toHaveLength(0);
    expect(source.onended).toBeNull();
    expect(context.gains[2]?.connections).toHaveLength(0);
    expect(context.panners[0]?.connections).toHaveLength(0);
    manager.dispose();
  });

  it('does not reconnect audio when disposed during a pending unlock', async () => {
    const { manager, context } = makeAudioHarness();
    let resume!: () => void;
    context.resume = vi.fn(() => new Promise<void>((resolve) => { resume = resolve; }));
    const unlocked = manager.unlock();
    manager.dispose();
    resume();
    expect(await unlocked).toBe(false);
    expect(context.gains).toHaveLength(0);
    expect(manager.isUnlocked).toBe(false);
  });

  it('releases voice nodes and capacity when playback fails', async () => {
    const { manager, context } = makeAudioHarness();
    await manager.unlock();
    const createSource = context.createBufferSource.bind(context);
    context.createBufferSource = () => {
      const source = createSource();
      (source as unknown as FakeSource).start.mockImplementation(() => { throw new Error('Playback failed'); });
      return source;
    };
    for (let index = 0; index < 8; index += 1) {
      context.currentTime += 0.1;
      expect(manager.play('gunshot', { position: { x: 0, y: 0, z: 0 } })).toBe(true);
      await letAudioTasksSettle();
    }
    expect(context.sources).toHaveLength(8);
    expect(context.sources.every((source) => source.connections.length === 0)).toBe(true);
    expect(context.panners.every((panner) => panner.connections.length === 0)).toBe(true);
    manager.dispose();
  });

  it('unlocks after a gesture and applies separate volume buses', async () => {
    const { manager, context } = makeAudioHarness();
    expect(manager.isUnlocked).toBe(false);
    expect(await manager.unlock()).toBe(true);
    expect(await manager.unlock()).toBe(true);
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.gains).toHaveLength(2);
    expect(manager.isUnlocked).toBe(true);
    manager.setVolumes(0.6, 0.25);
    expect(context.gains[0]?.gain.value).toBe(0.6);
    expect(context.gains[1]?.gain.value).toBe(0.25);
    manager.dispose();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('plays manifested spatial clips through the effects bus and updates the listener', async () => {
    const { manager, context, platform } = makeAudioHarness();
    await manager.unlock();
    manager.updateListener({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: -1 });
    expect(manager.play('gunshot', { position: { x: 4, y: 5, z: 6 } })).toBe(true);
    await vi.waitFor(() => expect(context.sources).toHaveLength(1));

    expect(platform.fetchClip).toHaveBeenCalledWith('gunshot.ogg');
    expect(context.panners).toHaveLength(1);
    expect(context.panners[0]?.positionX.value).toBe(4);
    expect(context.panners[0]?.positionY.value).toBe(5);
    expect(context.panners[0]?.positionZ.value).toBe(6);
    expect(context.listener.positionY.value).toBe(2);
    expect(context.listener.forwardZ.value).toBe(-1);
    expect(context.sources[0]?.start).toHaveBeenCalledOnce();
    context.sources[0]?.onended?.();
    manager.dispose();
  });

  it('keeps missing clips silent without issuing clip requests', async () => {
    const { manager, context, platform } = makeAudioHarness({ version: 1, clips: {} });
    await manager.unlock();
    expect(manager.play('honk')).toBe(true);
    await letAudioTasksSettle();
    expect(platform.fetchClip).not.toHaveBeenCalled();
    expect(context.sources).toHaveLength(0);
    manager.dispose();
  });

  it('ignores clip paths without complete source and license records', async () => {
    const { manager, context, platform } = makeAudioHarness({
      version: 1,
      clips: {
        honk: { file: '../outside.ogg', source: 'user supplied', license: 'CC0' },
        gunshot: { file: 'shot.ogg', source: '', license: 'CC0' },
      },
    });
    await manager.unlock();
    expect(manager.play('honk')).toBe(true);
    expect(manager.play('gunshot')).toBe(true);
    await letAudioTasksSettle();
    expect(platform.fetchClip).not.toHaveBeenCalled();
    expect(context.sources).toHaveLength(0);
    manager.dispose();
  });

  it('caps overlapping voices by event and across the whole mix', async () => {
    const clips = Object.fromEntries([
      'gunshot', 'explosion', 'honk', 'reload', 'footstep', 'hit', 'ui',
    ].map((id) => [id, { file: `${id}.ogg`, source: 'user supplied', license: 'CC0' }]));
    const { manager, context } = makeAudioHarness({ version: 1, clips });
    await manager.unlock();

    for (let index = 0; index < 6; index += 1) {
      context.currentTime += 0.1;
      expect(manager.play('gunshot')).toBe(true);
    }
    context.currentTime += 0.1;
    expect(manager.play('gunshot')).toBe(false);

    for (let index = 0; index < 3; index += 1) {
      context.currentTime += 0.25;
      expect(manager.play('explosion')).toBe(true);
      context.currentTime += 0.25;
      expect(manager.play('honk')).toBe(true);
    }
    for (let index = 0; index < 2; index += 1) {
      context.currentTime += 0.25;
      expect(manager.play('reload')).toBe(true);
      context.currentTime += 0.25;
      expect(manager.play('footstep')).toBe(true);
    }
    context.currentTime += 0.25;
    expect(manager.play('hit')).toBe(false);
    expect(manager.play('ui')).toBe(false);
    expect(MAX_ACTIVE_AUDIO_VOICES).toBe(16);
    manager.dispose();
  });
});
