import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SITE, FLOOR_Y, COLORS } from '../config.js'
import { box, cyl, Buckets } from '../util/geo.js'
import { inv, easeOutCubic, easeOutBack, smooth } from '../util/math.js'

// ---------------------------------------------------------------------------
//  Площадка кампуса: корпус героя (стены вырастают, крыша закрывается над
//  залом), соседние корпуса, чиллеры на крышах, подстанция с ЛЭП и земля
//  с дорогами и фонарями. Детализация нарочно низкая: всё это видно
//  с сотен метров, геометрия — десяток вызовов отрисовки.
// ---------------------------------------------------------------------------

const BASE = FLOOR_Y - 0.3 // низ стен — чуть ниже пола зала
const HALF_W = SITE.BW / 2
const HALF_D = SITE.BD / 2
export const HALL_Z = -0.7 // середина зала героя по Z
export const buildingZ = (k) => k * SITE.PITCH + HALL_Z

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

// Сэндвич-панели: светлые вертикальные ламели, синяя полоса поверху, тёмный цоколь
const wallTex = () =>
  canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#6f7885'
    ctx.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 8) {
      ctx.fillStyle = x % 16 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)'
      ctx.fillRect(x, 0, 1, h)
    }
    ctx.fillStyle = '#233f78'
    ctx.fillRect(0, 0, w, h * 0.2)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(0, h * 0.2, w, 1)
    ctx.fillStyle = '#2a2e35'
    ctx.fillRect(0, h * 0.93, w, h * 0.07)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, 2, h)
  })

// Верх чиллера: три вентилятора в решётках
const fanTex = () =>
  canvasTex(
    96,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#7b828a'
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 3; i++) {
        const cy = (h / 3) * (i + 0.5)
        ctx.fillStyle = '#23272d'
        ctx.beginPath()
        ctx.arc(w / 2, cy, w * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#a9b0b8'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.strokeStyle = 'rgba(160,168,176,0.5)'
        ctx.lineWidth = 1
        for (let r = 8; r < w * 0.4; r += 7) {
          ctx.beginPath()
          ctx.arc(w / 2, cy, r, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    },
    false,
  )

// Стена — плоскость длиной len, развёрнутая наружу; UV по длине тайлится каждые 7.5 м
function wall(len, h, pos, rotY) {
  const g = new THREE.PlaneGeometry(len, h)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 7.5))
  g.rotateY(rotY)
  g.translate(pos[0], pos[1], pos[2])
  return g
}

function shellParts(H) {
  const walls = [
    wall(SITE.BW, H, [0, H / 2, HALF_D], 0),
    wall(SITE.BW, H, [0, H / 2, -HALF_D], Math.PI),
    wall(SITE.BD, H, [HALF_W, H / 2, 0], Math.PI / 2),
    wall(SITE.BD, H, [-HALF_W, H / 2, 0], -Math.PI / 2),
  ]
  // светодиодная линия под парапетом
  const y = H - 2.6
  const led = [
    box(SITE.BW + 0.4, 0.22, 0.1, [0, y, HALF_D + 0.1]),
    box(SITE.BW + 0.4, 0.22, 0.1, [0, y, -HALF_D - 0.1]),
    box(0.1, 0.22, SITE.BD + 0.4, [HALF_W + 0.1, y, 0]),
    box(0.1, 0.22, SITE.BD + 0.4, [-HALF_W - 0.1, y, 0]),
  ]
  return { walls: mergeGeometries(walls), led: mergeGeometries(led) }
}

// Чиллеры на крыше: 4 блока по 12 модулей в два ряда
function chillerSpots() {
  const out = []
  for (const bx of [-78, -26, 26, 78]) {
    for (const z of [-4.6, 4.6]) {
      for (let i = 0; i < 12; i++) out.push([bx + (i - 5.5) * 2.6, z])
    }
  }
  return out
}

export function buildSite() {
  const root = new THREE.Group()
  root.name = 'site'
  root.visible = false

  const mats = {
    wall: new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.75, metalness: 0.25, side: THREE.DoubleSide }),
    roof: new THREE.MeshStandardMaterial({ color: 0x8c939b, roughness: 0.85, metalness: 0.1 }),
    led: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xd9eeff, emissiveIntensity: 3.2, roughness: 0.5 }),
    chillerSide: new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.7, metalness: 0.35 }),
    chillerTop: new THREE.MeshStandardMaterial({ map: fanTex(), roughness: 0.7, metalness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x4a5059, roughness: 0.6, metalness: 0.6 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xb3b8be, roughness: 0.9, metalness: 0.05 }),
  }
  const H = SITE.BH + 1.2 // стены с парапетом
  const ROOF = H - 0.35 // верх кровли (парапет выше на 0.35 м)

  // --- корпуса: стены вырастают, крыша закрывается полосами, потом чиллеры ---------
  // Все семь собираются одинаково, волной от героя: при взгляде сверху рост по
  // высоте не виден, и крыша, «вырастающая» целиком, просто выскакивала бы.
  const buildings = []
  for (let k = SITE.COUNT[0]; k <= SITE.COUNT[1]; k++) buildings.push(k)
  const start = (k) => 1.02 + Math.abs(k) * 0.008 // начало сборки корпуса k
  const shell = shellParts(H)
  const bodies = new THREE.InstancedMesh(mergeGeometries([shell.walls, shell.led], true), [mats.wall, mats.led], buildings.length)
  bodies.frustumCulled = false
  root.add(bodies)

  const STRIPS = 26
  const stripW = SITE.BW / STRIPS
  const roofGeo = new THREE.BoxGeometry(1, 0.5, SITE.BD + 0.2)
  const roof = new THREE.InstancedMesh(roofGeo, mats.roof, STRIPS * buildings.length)
  roof.frustumCulled = false
  root.add(roof)

  // --- чиллеры на всех крышах ----------------------------------------------------
  const spots = chillerSpots()
  const chGeo = new THREE.BoxGeometry(2.3, 2.2, 7)
  const chillers = new THREE.InstancedMesh(chGeo, [mats.chillerSide, mats.chillerSide, mats.chillerTop, mats.chillerSide, mats.chillerSide, mats.chillerSide], spots.length * buildings.length)
  chillers.frustumCulled = false
  root.add(chillers)

  // --- подстанция восточнее корпуса героя ------------------------------------------
  const sub = new Buckets()
  const SX = 205
  for (let i = 0; i < 3; i++) {
    for (const z of [-26, 26]) {
      const x = SX - 30 + i * 30
      sub.add('steel', box(7, 6.5, 9, [x, 3.25, z]))
      // радиаторы и вводы
      sub.add('steel', box(1.2, 5, 8, [x + 4.2, 2.5, z]))
      sub.add('steel', box(1.2, 5, 8, [x - 4.2, 2.5, z]))
      for (const dx of [-2, 0, 2]) sub.add('concrete', cyl(0.25, 0.35, 3, 6, [x + dx, 8, z]))
    }
  }
  // порталы ошиновки
  for (let i = 0; i < 4; i++) {
    const x = SX - 45 + i * 30
    for (const z of [-12, 12]) sub.add('steel', box(0.8, 16, 0.8, [x, 8, z]))
    sub.add('steel', box(0.8, 0.8, 25, [x, 15.6, 0]))
  }
  sub.add('steel', box(92, 0.3, 0.3, [SX - 1, 14, -6]))
  sub.add('steel', box(92, 0.3, 0.3, [SX - 1, 14, 6]))
  // здания управления
  sub.add('concrete', box(26, 6, 12, [SX + 5, 3, -58]))
  sub.add('concrete', box(14, 5, 10, [SX - 34, 2.5, 55]))
  const substation = sub.toGroup(mats)
  substation.position.y = BASE
  root.add(substation)

  // --- ЛЭП на восток ------------------------------------------------------------------
  const pyl = new Buckets()
  const pylonX = []
  for (let i = 0; i < 7; i++) pylonX.push(300 + i * 300)
  for (const x of pylonX) {
    pyl.add('steel', cyl(0.5, 3.2, 44, 4, [x, 22, 0], [0, Math.PI / 4, 0]))
    pyl.add('steel', box(1, 0.8, 22, [x, 40, 0]))
    pyl.add('steel', box(1, 0.8, 15, [x, 33, 0]))
  }
  const pylons = pyl.toGroup(mats)
  pylons.position.y = BASE
  root.add(pylons)
  const wire = []
  const attach = [
    [40, -10.5],
    [40, 10.5],
    [33, -7],
    [33, 7],
  ]
  const xs = [SX + 45, ...pylonX]
  for (let i = 0; i < xs.length - 1; i++) {
    for (const [y, z] of attach) {
      const y0 = i === 0 ? 15.6 : y
      for (let s = 0; s < 12; s++) {
        const a = s / 12
        const b = (s + 1) / 12
        const sag = (t) => -Math.sin(t * Math.PI) * 6
        wire.push(xs[i] + (xs[i + 1] - xs[i]) * a, BASE + y0 + (y - y0) * a + sag(a), z)
        wire.push(xs[i] + (xs[i + 1] - xs[i]) * b, BASE + y0 + (y - y0) * b + sag(b), z)
      }
    }
  }
  const wireGeo = new THREE.BufferGeometry()
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3))
  const wires = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x6b7480, transparent: true, opacity: 0.7 }))
  root.add(wires)

  // --- земля ------------------------------------------------------------------------------
  const ground = buildGround()
  root.add(ground.mesh)

  // На подъёме в космос вся площадка растворяется в цвете суши вместе с землёй:
  // иначе светлые корпуса и провода висят над синей заливкой и потом пропадают разом
  const fade = { uLand: ground.uniforms.uLand, uSiteFade: { value: 0 } }
  const dissolve = (m) => {
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, fade)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uLand; uniform float uSiteFade;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uLand, uSiteFade);')
    }
  }
  Object.values(mats).forEach(dissolve)
  dissolve(wires.material)

  // якорь подписи площадки
  const anchor = new THREE.Object3D()
  anchor.position.set(0, BASE + H + 3, HALL_Z)
  root.add(anchor)

  const _m = new THREE.Matrix4()
  const _p = new THREE.Vector3()
  const _q = new THREE.Quaternion()
  const _s = new THREE.Vector3()
  let dirty = true

  return {
    root,
    ground,
    anchor,
    mats,
    fade: fade.uSiteFade,
    // p — прогресс ленты
    update(p, t) {
      root.visible = p > 0.995
      if (!root.visible) {
        dirty = true
        return
      }
      ground.uniforms.uTime.value = t
      const animating = p < 1.2
      if (!animating && !dirty) return
      dirty = animating

      let nr = 0
      let nc = 0
      buildings.forEach((k, b) => {
        const a0 = start(k)
        const z0 = buildingZ(k)
        // стены вырастают из пола
        const wallE = easeOutCubic(inv(p, a0, a0 + 0.05))
        _p.set(0, BASE, z0)
        _s.set(1, Math.max(wallE, 0.001), 1)
        bodies.setMatrixAt(b, _m.compose(_p, _q.identity(), _s))

        // крыша закрывается от торцов к центру — у героя последней над его залом
        for (let i = 0; i < STRIPS; i++) {
          const x = -HALF_W + stripW * (i + 0.5)
          const a = a0 + 0.03 + 0.055 * (1 - Math.abs(x) / HALF_W)
          const e = easeOutCubic(inv(p, a, a + 0.03))
          _p.set(x, BASE + ROOF - 0.25 + 16 * (1 - e), z0)
          _s.set(Math.max(stripW * e + 0.02, 0.001), e > 0 ? 1 : 0.001, 1)
          roof.setMatrixAt(nr++, _m.compose(_p, _q.identity(), _s))
        }

        // чиллеры встают на закрытую крышу, волной вдоль корпуса
        for (const [x, z] of spots) {
          const a = a0 + 0.095 + 0.025 * ((x + HALF_W) / SITE.BW)
          const e = p > a ? easeOutBack(inv(p, a, a + 0.018), 1.3) : 0
          _p.set(x, BASE + ROOF + 1.1 * e, z + z0)
          const sc = Math.max(e, 0.001)
          _s.set(sc, sc, sc)
          chillers.setMatrixAt(nc++, _m.compose(_p, _q.identity(), _s))
        }
      })
      bodies.instanceMatrix.needsUpdate = true
      roof.instanceMatrix.needsUpdate = true
      chillers.instanceMatrix.needsUpdate = true
      bodies.visible = p > 1.02
      roof.visible = chillers.visible = p > 1.05

      const subE = easeOutCubic(inv(p, 1.09, 1.14))
      substation.scale.y = pylons.scale.y = Math.max(subE, 0.001)
      substation.visible = pylons.visible = subE > 0
      wires.visible = subE > 0.98

      ground.uniforms.uLights.value = smooth(inv(p, 1.07, 1.15))
    },
  }
}

// ---------------------------------------------------------------------------
//  Земля: ночная пустыня, асфальт площадки, дороги с разметкой, фонари.
//  Всё процедурно в одном шейдере на плоскости 40 км. На подъёме в космос
//  цвет уходит в цвет суши глобуса и плоскость растворяется.
// ---------------------------------------------------------------------------
function buildGround() {
  const uniforms = {
    uTime: { value: 0 },
    uBg: { value: new THREE.Color(COLORS.bg) },
    uFog: { value: 0 },
    uLights: { value: 0 },
    uAlpha: { value: 1 },
    uToLand: { value: 0 },
    uLand: { value: new THREE.Color(0x1b2548).multiplyScalar(1.12) }, // суша глобуса при взгляде сверху
    uPitch: { value: SITE.PITCH },
    uHallZ: { value: HALL_Z },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uBg; uniform float uFog; uniform float uLights;
      uniform float uAlpha; uniform float uToLand; uniform vec3 uLand; uniform float uPitch; uniform float uHallZ;
      varying vec3 vWorld;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { return noise(p) * 0.55 + noise(p * 2.13) * 0.28 + noise(p * 4.7) * 0.17; }
      // прямоугольник со сглаженным краем (в метрах)
      float rect(vec2 p, vec2 lo, vec2 hi, float soft) {
        vec2 a = smoothstep(lo - soft, lo + soft, p) * (1.0 - smoothstep(hi - soft, hi + soft, p));
        return a.x * a.y;
      }
      float lineAA(float d, float w) { float fw = fwidth(d); return 1.0 - smoothstep(w, w + fw * 1.5, abs(d)); }
      // фонари вдоль оси: расстояние до ближайшего по шагу
      float lamps(float along, float across, float step, float r) {
        float q = mod(along, step) - step * 0.5;
        float d2 = q * q + across * across;
        return exp(-d2 / (r * r));
      }

      void main() {
        vec2 p = vWorld.xz;
        // пустыня: пятна, промоины, едва заметная рябь
        float n = fbm(p * 0.004) * 0.7 + fbm(p * 0.03) * 0.3;
        vec3 col = mix(vec3(0.030, 0.022, 0.016), vec3(0.085, 0.062, 0.043), n);
        col *= 0.85 + 0.3 * noise(p * 0.25);

        // площадка: асфальт, под корпусами — светлые бетонные отмостки
        float site = rect(p, vec2(-158.0, -380.0), vec2(142.0, 378.0), 1.0);
        col = mix(col, vec3(0.020, 0.022, 0.026) * (0.9 + 0.2 * noise(p * 0.5)), site);
        float kz = floor((p.y - uHallZ) / uPitch + 0.5);
        float zc = p.y - uHallZ - kz * uPitch;
        float apron = rect(vec2(p.x, zc), vec2(-114.0, -44.0), vec2(114.0, 44.0), 0.6) * step(abs(kz), 3.5) * site;
        col = mix(col, vec3(0.055, 0.058, 0.062), apron);
        // разметка внутренних проездов между корпусами
        float lane = lineAA(abs(zc) - 49.5, 0.18) * step(abs(kz), 3.5) * rect(p, vec2(-150.0, -1e4), vec2(135.0, 1e4), 1.0);
        col = mix(col, vec3(0.30), lane * 0.55 * step(0.5, fract(p.x / 6.0)));

        // подстанция: щебень и ограждение
        float yard = rect(p, vec2(148.0, -72.0), vec2(262.0, 72.0), 0.8);
        col = mix(col, vec3(0.07, 0.066, 0.06) * (0.8 + 0.4 * noise(p * 1.7)), yard);
        float fence = (lineAA(p.x - 148.0, 0.12) + lineAA(p.x - 262.0, 0.12)) * step(abs(p.y), 72.0)
                    + (lineAA(p.y - 72.0, 0.12) + lineAA(p.y + 72.0, 0.12)) * step(abs(p.x - 205.0), 57.0);
        col += vec3(0.18, 0.2, 0.22) * fence;

        // магистраль вдоль Z и подъездная дорога на запад
        float roadZ = rect(vec2(p.x, 0.0), vec2(-184.0, -1.0), vec2(-166.0, 1.0), 0.5);
        float roadX = rect(vec2(0.0, p.y), vec2(-1.0, 412.0), vec2(1.0, 426.0), 0.5) * step(p.x, 300.0);
        float roads = max(roadZ, roadX);
        col = mix(col, vec3(0.016, 0.017, 0.02), roads);
        float dash = step(0.5, fract(p.y / 9.0)) * lineAA(p.x + 175.0, 0.15) * roadZ + step(0.5, fract(p.x / 9.0)) * lineAA(p.y - 419.0, 0.15) * roadX;
        col += vec3(0.35, 0.3, 0.2) * dash * 0.6;

        // фонари: вдоль дорог и по периметру площадки
        float L = 0.0;
        L += lamps(p.y, p.x + 186.0, 42.0, 1.5) + lamps(p.y, p.x + 164.0, 42.0, 1.5);
        L += lamps(p.x, p.y - 428.0, 42.0, 1.5) * step(p.x, 300.0);
        L += (lamps(p.y, p.x + 158.0, 36.0, 1.1) + lamps(p.y, p.x - 142.0, 36.0, 1.1)) * step(abs(p.y), 378.0);
        L += (lamps(p.x, p.y + 380.0, 36.0, 1.1) + lamps(p.x, p.y - 378.0, 36.0, 1.1)) * step(abs(p.x + 8.0), 150.0);
        L += (lamps(p.y, p.x - 148.0, 24.0, 1.0) + lamps(p.y, p.x - 262.0, 24.0, 1.0)) * step(abs(p.y), 72.0);
        // тёплые пятна света на асфальте вокруг ярких точек
        float pool = 0.0;
        pool += exp(-pow(mod(p.y, 42.0) - 21.0, 2.0) / 180.0) * exp(-pow(p.x + 175.0, 2.0) / 90.0);
        float lit = uLights * (1.0 - uToLand) * (1.0 - uToLand);
        col += vec3(0.65, 0.85, 1.4) * L * 3.2 * lit + vec3(0.10, 0.08, 0.05) * pool * lit;

        // дымка по расстоянию, как у FogExp2 сцены
        float d = length(vWorld - cameraPosition);
        float fog = 1.0 - exp(-pow(d * uFog, 2.0));
        col = mix(col, uBg, fog);

        // подъём в космос: земля становится сушей глобуса и растворяется
        col = mix(col, uLand, uToLand);
        float r = length(p);
        float a = (1.0 - smoothstep(14000.0, 20000.0, r)) * uAlpha;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = FLOOR_Y - 0.3
  mesh.renderOrder = -8
  mesh.frustumCulled = false
  mesh.name = 'ground'
  return { mesh, uniforms }
}
