import * as THREE from 'three'
import { RACK, DC, ROW, FACING, FLOOR_Y } from '../config.js'

// ---------------------------------------------------------------------------
//  Кампус: тысячи стоек одним InstancedMesh. Каждая появляется волной от героя
//  (uReveal против per-instance aDelay), подсветка фронта — своим оттенком.
// ---------------------------------------------------------------------------

// detail — сколько стоек в каждую сторону от героя строится отдельно, детально;
// ровно под них в кампусе делается вырез, остальное заполняют инстансы (иначе
// на облегчённом режиме по бокам ряда зияла пустота)
export function buildDataCenter(mats, detail = ROW.TO) {
  const geo = new THREE.BoxGeometry(RACK.W - 0.01, RACK.H, RACK.D)
  geo.translate(0, RACK.H / 2, 0)
  // группы BoxGeometry: +x, -x, +y, -y, +z (фронт), -z
  const materials = [mats.dcSide, mats.dcSide, mats.dcTop, mats.dcSide, mats.dcFront, mats.dcSide]

  const positions = []
  const rot = []
  const tint = []
  const delays = []
  const hero = []
  const isCorridor = (i) => DC.CORRIDORS.some((c) => Math.abs(i - c) <= 1)
  for (let k = -DC.PAIRS; k <= DC.PAIRS; k++) {
    for (const back of [false, true]) {
      const z = k * DC.PAIR_PITCH + (back ? DC.BACK_OFFSET : 0)
      for (let i = -DC.COLS; i <= DC.COLS; i++) {
        if (isCorridor(i)) continue
        // ряд героя и ряд напротив через коридор строятся отдельно, детально
        if (k === 0 && !back && Math.abs(i) <= detail) continue
        if (k === 1 && back && Math.abs(i) <= detail) continue
        const x = i * RACK.PITCH_X
        positions.push(x, FLOOR_Y, z)
        rot.push(back ? Math.PI : 0)
        // оттенок: холодные коридоры циан, каждая третья пара — маджента
        // почти все — холодно-белые, редкие янтарные (обслуживание), часть тёмных
        const amber = Math.random() < 0.1
        const dim = Math.random() < 0.08 ? 0.05 : 0.6 + Math.random() * 0.4
        tint.push((amber ? 1.0 : 0.75) * dim, (amber ? 0.7 : 0.92) * dim, (amber ? 0.35 : 1.0) * dim)
        // порядок появления: сначала достраивается ряд героя и ряд за его спиной
        // (вдоль X), остальные ряды — позже, когда камера уже поднялась над ними
        const maxX = DC.COLS * RACK.PITCH_X
        const maxZ = DC.PAIRS * DC.PAIR_PITCH
        const heroPair = k === 0 || (k === 1 && back) // ряд героя, его спина и ряд напротив
        hero.push(heroPair ? 1 : 0)
        const d = (heroPair ? 0 : 0.55 + 0.45 * (Math.abs(z) / maxZ)) + 0.3 * (Math.abs(x) / maxX)
        delays.push(Math.min(d, 1.0))
      }
    }
  }
  const count = positions.length / 3
  const mesh = new THREE.InstancedMesh(geo, materials, count)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const s = new THREE.Vector3(1, 1, 1)
  const p = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  const delayAttr = new Float32Array(count)
  const heroAttr = new Float32Array(count)
  const tintAttr = new Float32Array(count * 3)
  for (let n = 0; n < count; n++) {
    p.set(positions[n * 3], positions[n * 3 + 1], positions[n * 3 + 2])
    q.setFromAxisAngle(up, rot[n])
    m.compose(p, q, s)
    mesh.setMatrixAt(n, m)
    // нормализованная задержка + лёгкий шум, чтобы фронт волны не был идеальным кругом
    delayAttr[n] = delays[n] * 0.9 + Math.random() * 0.04
    heroAttr[n] = hero[n]
    tintAttr[n * 3] = tint[n * 3]
    tintAttr[n * 3 + 1] = tint[n * 3 + 1]
    tintAttr[n * 3 + 2] = tint[n * 3 + 2]
  }
  geo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delayAttr, 1))
  geo.setAttribute('aHero', new THREE.InstancedBufferAttribute(heroAttr, 1))
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tintAttr, 3))
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  mesh.visible = false

  const uniforms = { uReveal: { value: 0 }, uPower: { value: 0 }, uMaxX: { value: DC.COLS * RACK.PITCH_X } }
  const patch = (mat, emissiveTint) => {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aDelay; attribute vec3 aTint; attribute float aHero;
          uniform float uReveal; uniform float uPower; uniform float uMaxX;
          varying float vReveal; varying vec3 vTint; varying float vPower;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float rv = smoothstep(aDelay, aDelay + 0.10, uReveal);
          // вырастает из пола с лёгким перелётом
          float grow = rv < 1.0 ? rv * (1.0 + 0.25 * sin(rv * 3.14159)) : 1.0;
          transformed.y = transformed.y * grow - 0.03;
          vReveal = rv; vTint = aTint;
          // включение питания: волна от подстанции (справа) налево; ряд героя горит всегда
          float xn = (instanceMatrix[3].x + uMaxX) / (2.0 * uMaxX);
          vPower = max(aHero, smoothstep(1.0 - xn - 0.08, 1.0 - xn + 0.04, uPower));`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vReveal; varying vec3 vTint; varying float vPower;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          ${emissiveTint ? 'totalEmissiveRadiance *= vTint * smoothstep(0.6, 1.0, vReveal) * (0.06 + 0.94 * vPower);' : ''}`,
        )
    }
    mat.customProgramCacheKey = () => (emissiveTint ? 'dc-front' : 'dc-plain')
  }
  // материалы кампуса — свои экземпляры, чтобы патч не задел общие
  const side = mats.dcSide.clone()
  const top = mats.dcTop.clone()
  const front = mats.dcFront.clone()
  patch(side, false)
  patch(top, false)
  patch(front, true)
  mesh.material = [side, side, top, side, front, side]

  return { mesh, uniforms, count }
}
