import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three';

/** Rotation-only background: translation and far clipping cannot expose an edge. */
export function createSky() {
  const geometry = new SphereGeometry(1, 16, 8);
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      horizon: { value: new Color('#dce8df') },
      zenith: { value: new Color('#78b6dc') },
    },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: `
      uniform vec3 horizon;
      uniform vec3 zenith;
      varying vec3 direction;
      void main() {
        float height = max(normalize(direction).y, 0.0);
        gl_FragColor = vec4(mix(horizon, zenith, smoothstep(0.0, 0.85, height)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'gradient sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  return { mesh, dispose() { geometry.dispose(); material.dispose(); } };
}
