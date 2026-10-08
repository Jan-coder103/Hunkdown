import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserAudioPlatform } from '../src/game/audio/audio-manager';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('browser audio hosting paths', () => {
  it.each(['/', '/Hunkdown/'])('loads audio beneath the %s deployment base', async (base) => {
    vi.stubEnv('BASE_URL', base);
    const manifest = { version: 1, clips: {} };
    const bytes = new ArrayBuffer(4);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => manifest })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => bytes });
    vi.stubGlobal('fetch', fetchMock);
    const platform = createBrowserAudioPlatform();
    expect(await platform.loadManifest()).toEqual(manifest);
    expect(await platform.fetchClip('weapons/honk.wav')).toBe(bytes);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${base}audio/manifest.json`, `${base}audio/weapons/honk.wav`,
    ]);
  });
});
