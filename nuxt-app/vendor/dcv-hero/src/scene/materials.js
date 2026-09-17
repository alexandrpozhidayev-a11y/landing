import * as THREE from 'three'
import { COLORS } from '../config.js'
import * as T from '../util/textures.js'

// Все материалы сцены — общие, чтобы одинаковые поверхности шли одним шейдером.
export function createMaterials({ lite = false } = {}) {
  const tex = {
    hex: T.hexPerf(10, 0.64),
    hexFine: T.hexPerf(14, 0.6),
    brushed: T.brushed('x'),
    brushedZ: T.brushed('y'),
    pcb: T.pcb(),
    rackFront: T.rackFront(),
    rackTop: T.rackTop(),
    logo: T.label('DATA CENTER VALLEY'),
    sticker: T.sticker(),
    unitNumbers: T.unitNumbers(),
  }
  tex.brushed.repeat.set(2, 2)
  tex.brushedZ.repeat.set(2, 2)

  const std = (o) => new THREE.MeshStandardMaterial(o)
  // На телефонах MeshPhysical (анизотропия, лак) втрое дороже в компиляции и
  // заметно дороже на пиксель; там те же материалы собираются как Standard.
  const phys = (o) => {
    if (!lite) return new THREE.MeshPhysicalMaterial(o)
    const { anisotropy, anisotropyRotation, clearcoat, clearcoatRoughness, transmission, ...rest } = o
    return new THREE.MeshStandardMaterial(rest)
  }

  const led = (hex, intensity = 0) =>
    std({ color: 0x000000, emissive: hex, emissiveIntensity: intensity, roughness: 0.4, metalness: 0 })

  const mats = {
    // анодированный алюминий корпуса — тёмный, с анизотропной шлифовкой
    alu: phys({
      color: 0x34373d,
      metalness: 0.55,
      roughness: 0.58,
      roughnessMap: tex.brushed,
      envMapIntensity: 0.8,
    }),
    // крышка: матовее корпуса, чтобы плоская пластина не ловила софтбокс целиком
    lid: phys({ color: 0x33363c, metalness: 0.4, roughness: 0.72, roughnessMap: tex.brushed, envMapIntensity: 0.6 }),
    // светлый металл: рейки, радиаторы
    aluLight: phys({
      color: 0x8b9199,
      metalness: 0.9,
      roughness: 0.5,
      roughnessMap: tex.brushed,
      anisotropy: 0.35,
      envMapIntensity: 1.1,
    }),
    steel: phys({ color: 0x2a2e36, metalness: 0.6, roughness: 0.7, envMapIntensity: 0.7 }),
    black: std({ color: 0x15171b, metalness: 0.15, roughness: 0.72 }),
    plastic: std({ color: 0x272a31, metalness: 0.05, roughness: 0.55 }),
    pcb: std({ map: tex.pcb, color: 0xffffff, metalness: 0.2, roughness: 0.6 }),
    copper: phys({ color: 0xd68f5c, metalness: 1.0, roughness: 0.26, envMapIntensity: 1.2 }),
    perf: phys({
      color: 0x3a3e46,
      metalness: 0.85,
      roughness: 0.48,
      alphaMap: tex.hex,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      envMapIntensity: 0.9,
    }),
    perfFine: phys({
      color: 0x33373f,
      metalness: 0.85,
      roughness: 0.5,
      alphaMap: tex.hexFine,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    }),
    // LED героя — интенсивность анимируется (включаются при сборке)
    heroCyan: led(COLORS.cyan, 0),
    heroMagenta: led(COLORS.magenta, 0),
    heroAmber: led(COLORS.amber, 0),
    heroWhite: led(0xd8f4ff, 0),
    heroGreen: led(0x7dff9c, 0),
    // LED остальных узлов — всегда горят
    ledCyan: led(COLORS.cyan, 1.5),
    ledMagenta: led(COLORS.magenta, 1.4),
    ledWhite: led(0xd8f4ff, 0.8),
    ledGreen: led(0x7dff9c, 1.1),
    ledAmber: led(COLORS.amber, 1.0),
    // наклейки, предупреждающие метки, патч-корды, нумерация юнитов
    sticker: std({ map: tex.sticker, color: 0xffffff, roughness: 0.6, metalness: 0 }),
    warn: std({ color: 0xf0c330, roughness: 0.6, metalness: 0 }),
    cableOrange: std({ color: 0xff7a1a, roughness: 0.6, metalness: 0 }),
    cableBlue: std({ color: 0x2f6fe6, roughness: 0.6, metalness: 0 }),
    cableYellow: std({ color: 0xe8c547, roughness: 0.6, metalness: 0 }),
    unitNumbers: new THREE.MeshBasicMaterial({ map: tex.unitNumbers, transparent: true, toneMapped: false, opacity: 0.85, depthWrite: false }),
    // трубки СЖО: полупрозрачный силикон, по ним бежит подсвеченный поток
    tube: phys({
      color: 0x7fd6ff,
      metalness: 0,
      roughness: 0.18,
      transparent: true,
      opacity: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.2,
      depthWrite: false,
    }),
    fitting: phys({ color: 0xb8bcc4, metalness: 1, roughness: 0.25 }),
    // логотип на бейзеле
    logo: new THREE.MeshBasicMaterial({
      map: tex.logo,
      transparent: true,
      color: new THREE.Color(COLORS.cyan).multiplyScalar(1.0),
      toneMapped: false,
      depthWrite: false,
      opacity: 0,
    }),
    // дальние стойки кампуса
    dcSide: std({ color: 0x2a2e37, metalness: 0.5, roughness: 0.65 }),
    dcTop: std({ map: tex.rackTop, color: 0xffffff, metalness: 0.6, roughness: 0.6 }),
    dcFront: std({
      color: 0x1e2128,
      metalness: 0.6,
      roughness: 0.55,
      emissive: 0xffffff,
      emissiveMap: tex.rackFront,
      emissiveIntensity: 1.5,
    }),
  }

  // поток теплоносителя: бегущая светящаяся полоса вдоль трубки
  mats.tubeUniforms = { uFlow: { value: 0 }, uFlowOn: { value: 0 } }
  mats.tube.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mats.tubeUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vTubeUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTubeUv = uv;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec2 vTubeUv;\nuniform float uFlow;\nuniform float uFlowOn;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float fl = fract(vTubeUv.x * 2.0 - uFlow);
        float pulse = smoothstep(0.55, 1.0, fl) * smoothstep(1.0, 0.97, fl);
        totalEmissiveRadiance += vec3(0.25, 0.85, 1.0) * (0.35 + 2.4 * pulse) * uFlowOn;`,
      )
  }

  return { mats, tex }
}
