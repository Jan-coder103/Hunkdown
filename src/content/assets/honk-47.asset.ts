import { createHonk47AssetLod } from '../weapons/honk-47.weapon';
import type { AssetDefinition } from './asset-types';

export const honk47Asset: AssetDefinition = Object.freeze({
  id: 'honk-47',
  displayName: 'Honk-47',
  category: 'weapon',
  bounds: { min: [-0.12, -0.25, -0.81] as const, max: [0.12, 0.21, 0.47] as const },
  collision: [{ id: 'rifle-envelope', center: [0, -0.02, -0.17] as const, size: [0.24, 0.46, 1.28] as const }],
  lodFactories: {
    close: () => createHonk47AssetLod(true),
    far: () => createHonk47AssetLod(false),
  },
});
