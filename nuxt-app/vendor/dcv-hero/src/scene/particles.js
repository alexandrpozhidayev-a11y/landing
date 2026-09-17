import * as THREE from 'three'
import { DC, RACK, FLOOR_Y } from '../config.js'

// ---------------------------------------------------------------------------
//  Световые штрихи трафика по коридорам зала. Всё движение — в шейдере.
// ---------------------------------------------------------------------------

// Штрихи трафика по коридорам: тонкие светящиеся бруски, летят вдоль X по
// холодным коридорам и вдоль Z по поперечным проходам.
export function buildStreaks(count = 420) {
  const geo = new THREE.BoxGeometry(1, 1, 1)
  const lane = new Float32Array(count * 4) // x0/z0, направление(0 по X, 1 по Z), фаза, скорость
  const kind = new Float32Array(count)
  const aisleZ = []
  for (let k = -DC.PAIRS; k < DC.PAIRS; k++) aisleZ.push(k * DC.PAIR_PITCH + (DC.PAIR_PITCH + DC.BACK_OFFSET) / 2)
  const corrX = DC.CORRIDORS.map((c) => c * RACK.PITCH_X)
  for (let i = 0; i < count; i++) {
    const alongZ = Math.random() < 0.3
    if (alongZ) {
      lane[i * 4] = corrX[Math.floor(Math.random() * corrX.length)] + (Math.random() - 0.5) * 1.2
      lane[i * 4 + 1] = 1
    } else {
      lane[i * 4] = aisleZ[Math.floor(Math.random() * aisleZ.length)] + (Math.random() - 0.5) * 0.9
      lane[i * 4 + 1] = 0
    }
    lane[i * 4 + 2] = Math.random()
    lane[i * 4 + 3] = (0.5 + Math.random() * 1.2) * (Math.random() < 0.5 ? 1 : -1)
    kind[i] = Math.random() < 0.85 ? 0 : 1
  }
  geo.setAttribute('aLane', new THREE.InstancedBufferAttribute(lane, 4))
  geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1))
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uExtent: { value: (DC.COLS + 2) * RACK.PITCH_X },
    uExtentZ: { value: (DC.PAIRS + 0.5) * DC.PAIR_PITCH },
    uFloor: { value: FLOOR_Y },
    uCyan: { value: new THREE.Color(0x9fe3ff) },
    uMagenta: { value: new THREE.Color(0xffc27a) },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec4 aLane; attribute float aKind;
      uniform float uTime; uniform float uExtent; uniform float uExtentZ; uniform float uFloor;
      varying float vKind; varying float vFade;
      void main() {
        float alongZ = aLane.y;
        float ext = alongZ > 0.5 ? uExtentZ : uExtent;
        float u = fract(aLane.z + uTime * aLane.w * 0.06);
        float s = (u * 2.0 - 1.0) * ext;
        float len = 0.9 + abs(aLane.w) * 0.8;
        vec3 p = position * vec3(alongZ > 0.5 ? 0.02 : len, 0.012, alongZ > 0.5 ? len : 0.02);
        float y = uFloor + 0.35 + fract(aLane.z * 7.31) * 1.4;
        vec3 o = alongZ > 0.5 ? vec3(aLane.x, y, s) : vec3(s, y, aLane.x);
        vFade = 1.0 - smoothstep(0.75, 1.0, abs(u * 2.0 - 1.0));
        vKind = aKind;
        gl_Position = projectionMatrix * viewMatrix * vec4(p + o, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uCyan; uniform vec3 uMagenta;
      varying float vKind; varying float vFade;
      void main() {
        vec3 c = mix(uCyan, uMagenta, vKind);
        gl_FragColor = vec4(c * 2.2, uOpacity * vFade);
      }`,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const m = new THREE.Matrix4()
  for (let i = 0; i < count; i++) mesh.setMatrixAt(i, m)
  mesh.frustumCulled = false
  mesh.visible = false
  return { mesh, uniforms }
}
