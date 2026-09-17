import * as THREE from 'three'
import { EARTH_R, CITIES, ROUTES, HIGHLIGHT } from '../config.js'
import { COUNTRIES } from '../data/world.js'
import { EARTH_CENTER, S2G, dirToScene, slerpDir, arcAngle, geoToScene, geoDir } from '../util/earth.js'

// ---------------------------------------------------------------------------
//  Глобус финала: океан, страны, границы, атмосфера, звёзды, трассы и точки.
//  Все слои рисуются без теста глубины, строго по renderOrder, а обратную
//  сторону шара отсекает шейдер (точка за горизонтом камеры) — так нет
//  z-fighting'а на планетарных расстояниях и не нужен огромный буфер глубины.
// ---------------------------------------------------------------------------

const KM = 1000
const LAND_ALT = 3 * KM
const BORDER_ALT = 4 * KM
const ROUTE_ALT = 6 * KM
const MAX_EDGE = 1.5 // градусы: длиннее — треугольник делится (хорда не должна проседать под океан)

const COLORS = {
  ocean: new THREE.Color(0x0a1330),
  land: new THREE.Color(0x1b2548),
  border: new THREE.Color(0x3a4a7e),
  highlightA: new THREE.Color(0x2f5fbf), // подсветка стран: переливы от голубого…
  highlightB: new THREE.Color(0x7fa6e6), // …до почти белого (экспозиция 1.5 и ACES осветляют — значения нарочно темнее)
  fiber: new THREE.Color(0x2f6bff),
  caspian: new THREE.Color(0x35d46a),
  atmo: new THREE.Color(0x3d7bff),
}

// Прозрачная очередь three рисуется после непрозрачной, а слои шара должны лечь
// ПОД здания площадки на переходе. Поэтому они в непрозрачной очереди (порядок —
// renderOrder), а альфа-смешивание включено вручную.
const UNDERLAY = { transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor }

// Общие куски шейдеров: горизонт и широта/долгота
const HORIZON = /* glsl */ `
  uniform vec3 uCenter;
  // > 0 — точка на видимой стороне шара
  float facing(vec3 wp) { return dot(normalize(wp - uCenter), normalize(cameraPosition - wp)); }
`

function decodeRing(b64) {
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  const a = new Int16Array(buf.buffer)
  const pts = []
  for (let i = 0; i < a.length; i += 2) pts.push(new THREE.Vector2(a[i] / 100, a[i + 1] / 100))
  // замыкающая точка дублирует первую — триангуляции она мешает
  if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop()
  return pts
}

// Длина ребра в «градусах на местности» (долгота сжимается к полюсам)
const edgeLen = (a, b) => Math.hypot((a.x - b.x) * Math.cos(((a.y + b.y) / 2) * (Math.PI / 180)), a.y - b.y)

// Деление по длинному ребру, пока все рёбра короче MAX_EDGE
function subdivide(a, b, c, out, depth = 0) {
  const ab = edgeLen(a, b)
  const bc = edgeLen(b, c)
  const ca = edgeLen(c, a)
  const m = Math.max(ab, bc, ca)
  if (m <= MAX_EDGE || depth > 14) {
    out.push(a, b, c)
    return
  }
  if (m === ab) {
    const d = a.clone().lerp(b, 0.5)
    subdivide(a, d, c, out, depth + 1)
    subdivide(d, b, c, out, depth + 1)
  } else if (m === bc) {
    const d = b.clone().lerp(c, 0.5)
    subdivide(a, b, d, out, depth + 1)
    subdivide(a, d, c, out, depth + 1)
  } else {
    const d = c.clone().lerp(a, 0.5)
    subdivide(a, b, d, out, depth + 1)
    subdivide(d, b, c, out, depth + 1)
  }
}

function buildLand() {
  const slots = new Map(HIGHLIGHT.map((h, i) => [h.id, i + 1]))
  const pos = []
  const slot = []
  const border = []
  const v = new THREE.Vector3()
  const push = (arr, p, alt) => {
    geoToScene(p.x, p.y, alt, v)
    arr.push(v.x, v.y, v.z)
  }
  for (const c of COUNTRIES) {
    const s = slots.get(c.id) || 0
    for (const poly of c.polys) {
      const rings = poly.map(decodeRing)
      const [outer, ...holes] = rings
      if (outer.length < 3) continue
      const faces = THREE.ShapeUtils.triangulateShape(outer, holes)
      const all = [outer, ...holes].flat()
      const tris = []
      for (const [i, j, k] of faces) subdivide(all[i], all[j], all[k], tris)
      for (const p of tris) {
        push(pos, p, LAND_ALT)
        slot.push(s)
      }
      // границы: рёбра колец, длинные — дробим по большому кругу
      for (const r of rings) {
        for (let i = 0; i < r.length; i++) {
          const a = r[i]
          const b = r[(i + 1) % r.length]
          const n = Math.max(1, Math.ceil(edgeLen(a, b) / 1.0))
          for (let k = 0; k < n; k++) {
            push(border, a.clone().lerp(b, k / n), BORDER_ALT)
            push(border, a.clone().lerp(b, (k + 1) / n), BORDER_ALT)
          }
        }
      }
    }
  }
  const landGeo = new THREE.BufferGeometry()
  landGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  landGeo.setAttribute('aSlot', new THREE.Float32BufferAttribute(slot, 1))
  const borderGeo = new THREE.BufferGeometry()
  borderGeo.setAttribute('position', new THREE.Float32BufferAttribute(border, 3))
  return { landGeo, borderGeo }
}

// Трассы: трубки по большим кругам с лёгким подъёмом; радиус задаёт шейдер,
// чтобы толщина на экране не зависела от высоты камеры.
function buildRoutes() {
  // расстояние от хаба до каждой точки сети (км по трассе)
  const reach = { hub: 0 }
  const legs = []
  for (const r of ROUTES) {
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = r.path[i]
      const b = r.path[i + 1]
      const len = (arcAngle(CITIES[a], CITIES[b]) * EARTH_R) / KM
      const start = reach[a] ?? 0
      reach[b] = Math.min(reach[b] ?? Infinity, start + len)
      legs.push({ a, b, len, start, kind: r.kind, bend: r.bend || 0, fade: r.fadeEnd && i === r.path.length - 2 })
    }
  }
  const geos = []
  const tmp = new THREE.Vector3()
  const side = new THREE.Vector3()
  const va = new THREE.Vector3()
  const vb = new THREE.Vector3()
  for (const leg of legs) {
    const n = Math.max(16, Math.ceil(leg.len / 40))
    const pts = []
    const lift = Math.min(260, leg.len * 0.05) * KM
    // ось большого круга: сдвиг вдоль неё уводит трассу вбок от прямой
    side.crossVectors(geoDir(...CITIES[leg.a], va), geoDir(...CITIES[leg.b], vb)).normalize()
    for (let i = 0; i <= n; i++) {
      const t = i / n
      slerpDir(CITIES[leg.a], CITIES[leg.b], t, tmp)
      if (leg.bend) tmp.addScaledVector(side, Math.sin(t * Math.PI) * leg.bend * (leg.len / 6371)).normalize()
      pts.push(dirToScene(tmp, ROUTE_ALT + Math.sin(t * Math.PI) * lift))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const g = new THREE.TubeGeometry(curve, n * 2, 1, 5, false)
    const cnt = g.attributes.position.count
    const dist = new Float32Array(cnt)
    const col = new Float32Array(cnt * 4)
    const uv = g.attributes.uv
    const c = COLORS[leg.kind]
    for (let i = 0; i < cnt; i++) {
      const u = uv.getX(i)
      dist[i] = leg.start + u * leg.len
      col[i * 4] = c.r
      col[i * 4 + 1] = c.g
      col[i * 4 + 2] = c.b
      col[i * 4 + 3] = leg.fade ? 1 - THREE.MathUtils.smoothstep(u, 0.35, 1) : 1
    }
    g.setAttribute('aDist', new THREE.BufferAttribute(dist, 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 4))
    g.deleteAttribute('uv')
    geos.push(g)
  }
  return { geos, reach }
}

export function buildGlobe() {
  const group = new THREE.Group()
  group.name = 'globe'
  group.visible = false
  const uniforms = {
    uCenter: { value: EARTH_CENTER },
    uS2G: { value: S2G },
    uMap: { value: 0 }, // появление карты 0..1
    uTime: { value: 0 },
  }

  // --- звёзды: направления на бесконечности --------------------------------
  {
    const n = 1400
    const dirs = new Float32Array(n * 3)
    const seed = new Float32Array(n)
    const v = new THREE.Vector3()
    for (let i = 0; i < n; i++) {
      v.randomDirection()
      dirs.set([v.x, v.y, v.z], i * 3)
      seed[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uPixelRatio; varying float vA;
        void main() {
          vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 0.0);
          gl_Position = vec4(p.xy, p.w * 0.9999, p.w);
          gl_PointSize = (aSeed > 0.97 ? 2.2 : 1.2) * uPixelRatio;
          vA = 0.25 + 0.75 * aSeed * aSeed;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying float vA;
        void main() { gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * vA, uOpacity); }`,
    })
    const stars = new THREE.Points(g, mat)
    stars.frustumCulled = false
    stars.renderOrder = -30
    group.add(stars)
    group.userData.stars = mat
  }

  // --- океан -----------------------------------------------------------------
  const graticule = /* glsl */ `
    uniform mat3 uS2G;
    float gridLines(vec2 ll, float step) {
      vec2 q = ll / step;
      vec2 fw = max(fwidth(q), vec2(1e-5));
      vec2 d = abs(fract(q - 0.5) - 0.5) / fw;
      // густая сетка (ячейка меньше ~12 px) гаснет сама
      return (1.0 - smoothstep(0.0, 1.2, min(d.x, d.y))) * (1.0 - smoothstep(0.02, 0.05, max(fw.x, fw.y)));
    }
    // сетка 10° и мелкая 1° — на подъёме, пока до границ стран далеко, она даёт ощущение скорости
    float graticule(vec3 wp) {
      vec3 g = uS2G * normalize(wp - uCenter);
      vec2 ll = vec2(degrees(atan(-g.z, g.x)), degrees(asin(clamp(g.y, -1.0, 1.0))));
      return max(gridLines(ll, 10.0), gridLines(ll, 1.0) * 0.45);
    }
  `
  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R, 160, 80),
    new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uColor: { value: COLORS.ocean } },
      depthTest: false,
      depthWrite: false,
      ...UNDERLAY,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uMap;
        ${HORIZON} ${graticule}
        varying vec3 vWorld;
        void main() {
          float f = facing(vWorld);
          // к краю диска — светлее и холоднее, как атмосферная дымка
          vec3 c = uColor * (0.75 + 0.5 * pow(1.0 - clamp(f, 0.0, 1.0), 3.0));
          c += vec3(0.10, 0.16, 0.34) * graticule(vWorld) * 0.35;
          gl_FragColor = vec4(c, uMap);
          #include <colorspace_fragment>
        }`,
    }),
  )
  ocean.position.copy(EARTH_CENTER)
  ocean.renderOrder = -20
  ocean.frustumCulled = false
  group.add(ocean)

  // --- страны и границы --------------------------------------------------------
  const { landGeo, borderGeo } = buildLand()
  const highlight = new Float32Array(HIGHLIGHT.length + 1)
  const landMat = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uLand: { value: COLORS.land }, uHiA: { value: COLORS.highlightA }, uHiB: { value: COLORS.highlightB }, uHighlight: { value: highlight } },
    depthTest: false,
    depthWrite: false,
    ...UNDERLAY,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aSlot; varying vec3 vWorld; varying float vSlot;
      void main() { vWorld = position; vSlot = aSlot; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLand; uniform vec3 uHiA; uniform vec3 uHiB; uniform float uTime; uniform float uMap; uniform float uHighlight[${HIGHLIGHT.length + 1}];
      ${HORIZON} ${graticule}
      varying vec3 vWorld; varying float vSlot;
      void main() {
        float f = facing(vWorld);
        if (f < 0.0) discard;
        float h = uHighlight[int(vSlot + 0.5)];
        // подсвеченные страны переливаются: широкие медленные волны по долготе/широте
        vec3 g = uS2G * normalize(vWorld - uCenter);
        vec2 ll = vec2(degrees(atan(-g.z, g.x)), degrees(asin(clamp(g.y, -1.0, 1.0))));
        float w1 = 0.5 + 0.5 * sin(ll.x * 0.16 + ll.y * 0.22 - uTime * 0.55);
        float w2 = 0.5 + 0.5 * sin(ll.x * 0.41 - ll.y * 0.3 + uTime * 0.35);
        vec3 hi = mix(uHiA, uHiB, clamp(w1 * 0.65 + w2 * 0.35, 0.0, 1.0));
        vec3 c = mix(uLand * (0.85 + 0.3 * f), hi, h);
        c += vec3(0.12, 0.18, 0.36) * graticule(vWorld) * mix(0.18, 0.1, h);
        gl_FragColor = vec4(c, uMap);
        #include <colorspace_fragment>
      }`,
  })
  const land = new THREE.Mesh(landGeo, landMat)
  land.renderOrder = -19
  land.frustumCulled = false
  group.add(land)

  const borders = new THREE.LineSegments(
    borderGeo,
    new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uColor: { value: COLORS.border } },
      depthTest: false,
      depthWrite: false,
      ...UNDERLAY,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() { vWorld = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uMap;
        ${HORIZON}
        varying vec3 vWorld;
        void main() {
          float f = facing(vWorld);
          if (f < 0.0) discard;
          gl_FragColor = vec4(uColor, uMap * smoothstep(0.0, 0.15, f));
          #include <colorspace_fragment>
        }`,
    }),
  )
  borders.renderOrder = -18
  borders.frustumCulled = false
  group.add(borders)

  // --- атмосфера: аналитический ореол по расстоянию луча до центра шара ----------
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_R * 1.12, 96, 48),
    new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uColor: { value: COLORS.atmo }, uR: { value: EARTH_R } },
      depthTest: false,
      depthWrite: false,
      transparent: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec3 uCenter; uniform float uR; uniform float uMap;
        varying vec3 vWorld;
        void main() {
          vec3 dir = normalize(vWorld - cameraPosition);
          vec3 oc = uCenter - cameraPosition;
          float b = length(cross(dir, oc)) / uR; // прицельный параметр луча в радиусах
          float glow = b < 1.0 ? pow(b, 10.0) * 0.55 : exp(-(b - 1.0) * 38.0);
          gl_FragColor = vec4(uColor * glow * 1.4, uMap);
          #include <colorspace_fragment>
        }`,
    }),
  )
  atmo.position.copy(EARTH_CENTER)
  atmo.renderOrder = -17
  atmo.frustumCulled = false
  group.add(atmo)

  // --- трассы ----------------------------------------------------------------
  const { geos, reach } = buildRoutes()
  const routeGeo = mergeRoutes(geos)
  const routeUniforms = { ...uniforms, uReach: { value: 0 }, uRadius: { value: 20 * KM }, uOpacity: { value: 0 } }
  const routes = new THREE.Mesh(
    routeGeo,
    new THREE.ShaderMaterial({
      uniforms: routeUniforms,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertexShader: /* glsl */ `
        attribute float aDist; attribute vec4 aColor;
        uniform float uRadius;
        varying float vDist; varying vec4 vColor; varying vec3 vWorld;
        void main() {
          // трубка построена радиусом 1: сдвиг по нормали задаёт экранную толщину
          vec3 p = position + normal * (uRadius - 1.0);
          vDist = aDist; vColor = aColor; vWorld = p;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uReach; uniform float uTime; uniform float uOpacity;
        ${HORIZON}
        varying float vDist; varying vec4 vColor; varying vec3 vWorld;
        void main() {
          if (vDist > uReach || facing(vWorld) < -0.05) discard;
          // голова рисующейся линии ярче, по готовой бегут импульсы трафика
          float head = smoothstep(uReach - 380.0, uReach, vDist);
          float pulse = smoothstep(0.86, 1.0, fract((vDist - uTime * 520.0) / 700.0));
          vec3 c = vColor.rgb * (1.1 + 1.6 * pulse) + vec3(0.7, 0.85, 1.0) * head * 1.6;
          gl_FragColor = vec4(c, vColor.a * uOpacity);
          #include <colorspace_fragment>
        }`,
    }),
  )
  routes.renderOrder = -10
  routes.frustumCulled = false
  group.add(routes)

  // --- точки городов и хаб ---------------------------------------------------------
  const names = Object.keys(CITIES).filter((k) => k !== 'jct' && k !== 'caspian' && k !== 'xian')
  const dotPos = []
  const dotAttr = []
  const v = new THREE.Vector3()
  for (const k of names) {
    // хаб — у самой земли: камера проходит высоту трасс, и точка на 6 км оказалась бы «за горизонтом»
    geoToScene(CITIES[k][0], CITIES[k][1], k === 'hub' ? 30 : ROUTE_ALT, v)
    dotPos.push(v.x, v.y, v.z)
    const green = k === 'aktau' || k === 'sumgait'
    // x: км от хаба по трассе, y: вид (0 город, 1 зелёный, 2 хаб)
    dotAttr.push(reach[k] ?? 0, k === 'hub' ? 2 : green ? 1 : 0)
  }
  const dotGeo = new THREE.BufferGeometry()
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotPos, 3))
  dotGeo.setAttribute('aInfo', new THREE.Float32BufferAttribute(dotAttr, 2))
  const dotUniforms = {
    ...uniforms,
    uReach: routeUniforms.uReach,
    uPixelRatio: { value: 1 },
    uHub: { value: 0 },
    uFiber: { value: COLORS.fiber },
    uCaspian: { value: COLORS.caspian },
  }
  const dots = new THREE.Points(
    dotGeo,
    new THREE.ShaderMaterial({
      uniforms: dotUniforms,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      vertexShader: /* glsl */ `
        attribute vec2 aInfo;
        uniform float uReach; uniform float uPixelRatio; uniform float uHub;
        ${HORIZON}
        varying float vKind; varying float vA;
        void main() {
          vKind = aInfo.y;
          float isHub = step(1.5, aInfo.y);
          // город «зажигается», когда до него дошла трасса; хаб — по своему весу
          vA = mix(smoothstep(aInfo.x - 60.0, aInfo.x + 40.0, uReach), uHub, isHub);
          vA *= step(0.0, facing(position));
          gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
          gl_PointSize = mix(15.0 * (0.6 + 0.4 * vA), 64.0, isHub) * uPixelRatio;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uFiber; uniform vec3 uCaspian; uniform float uTime;
        varying float vKind; varying float vA;
        void main() {
          vec2 q = gl_PointCoord * 2.0 - 1.0;
          float r = length(q);
          vec3 base = vKind > 0.5 && vKind < 1.5 ? uCaspian : uFiber;
          if (vKind > 1.5) {
            // хаб: белое ядро, кольцо и расходящиеся волны
            float core = 1.0 - smoothstep(0.1, 0.14, r);
            float ring = 1.0 - smoothstep(0.012, 0.03, abs(r - 0.2));
            float wave = 0.0;
            for (int i = 0; i < 2; i++) {
              float ph = fract(uTime * 0.45 + float(i) * 0.5);
              wave += (1.0 - smoothstep(0.0, 0.03, abs(r - (0.2 + ph * 0.8)))) * (1.0 - ph);
            }
            vec3 c = vec3(1.0) * core * 2.4 + vec3(0.55, 0.8, 1.0) * ring * 1.8 + uFiber * wave * 1.8;
            gl_FragColor = vec4(c, max(max(core, ring), wave) * vA);
          } else {
            float disc = 1.0 - smoothstep(0.62, 0.8, r);
            float core = 1.0 - smoothstep(0.18, 0.34, r);
            vec3 c = mix(base * 1.4, vec3(1.0), core * 0.6);
            gl_FragColor = vec4(c, disc * vA);
          }
          #include <colorspace_fragment>
        }`,
    }),
  )
  dots.renderOrder = -9
  dots.frustumCulled = false
  group.add(dots)

  // сколько км трассы до самой дальней точки — для темпа прорисовки
  const maxReach = Math.max(...Object.values(reach))
  const highlightAt = [0, ...HIGHLIGHT.map((h) => reach[h.at] ?? 0)]

  return {
    group,
    uniforms,
    routeUniforms,
    dotUniforms,
    reach,
    maxReach,
    // уровень подсветки стран от текущего охвата трасс
    setReach(km, t) {
      routeUniforms.uReach.value = km
      for (let i = 1; i < highlight.length; i++) highlight[i] = THREE.MathUtils.smoothstep(km, highlightAt[i] + 20, highlightAt[i] + 450) * t
    },
    stars: group.userData.stars,
  }
}

function mergeRoutes(geos) {
  let total = 0
  let totalIdx = 0
  for (const g of geos) {
    total += g.attributes.position.count
    totalIdx += g.index.count
  }
  const pos = new Float32Array(total * 3)
  const nor = new Float32Array(total * 3)
  const dist = new Float32Array(total)
  const col = new Float32Array(total * 4)
  const idx = new Uint32Array(totalIdx)
  let o = 0
  let oi = 0
  for (const g of geos) {
    const n = g.attributes.position.count
    pos.set(g.attributes.position.array, o * 3)
    nor.set(g.attributes.normal.array, o * 3)
    dist.set(g.attributes.aDist.array, o)
    col.set(g.attributes.aColor.array, o * 4)
    const gi = g.index.array
    for (let i = 0; i < gi.length; i++) idx[oi + i] = gi[i] + o
    o += n
    oi += gi.length
    g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('aDist', new THREE.BufferAttribute(dist, 1))
  out.setAttribute('aColor', new THREE.BufferAttribute(col, 4))
  out.setIndex(new THREE.BufferAttribute(idx, 1))
  return out
}

