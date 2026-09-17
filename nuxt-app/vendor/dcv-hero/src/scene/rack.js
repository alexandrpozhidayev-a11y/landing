import * as THREE from 'three'
import { RACK } from '../config.js'
import { Buckets, box, cyl, tube, plane } from '../util/geo.js'

// ---------------------------------------------------------------------------
//  42U стойка. Локальный ноль — центр основания (низ стойки).
//  Герой-стойка собрана из отдельных частей (стойки растут из пола, панели
//  съезжаются), остальные — один меш для инстансинга.
// ---------------------------------------------------------------------------

const { W, D, H } = RACK
const V = (x, y, z) => new THREE.Vector3(x, y, z)

function postsBuckets(b, key = 'steel') {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(key, box(0.05, H, 0.05, [sx * 0.275, H / 2, sz * 0.55]))
}
function panelsBuckets(b) {
  b.add('steel', box(W, 0.1, D, [0, 0.05, 0]))
  b.add('steel', box(W, 0.08, D, [0, H - 0.04, 0]))
  // вентиляционные решётки на крышке
  b.add('perf', box(0.44, 0.002, 0.9, [0, H + 0.001, 0]))
  // ножки-ролики
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('black', cyl(0.03, 0.03, 0.02, 12, [sx * 0.22, 0.01, sz * 0.45], [0, 0, Math.PI / 2]))
}
function sideBuckets(b, sx) {
  b.add('steel', box(0.006, H - 0.18, D, [sx * 0.297, H / 2, 0]))
  // рёбра на боковине
  for (let i = 0; i < 3; i++) b.add('steel', box(0.01, H - 0.24, 0.02, [sx * 0.301, H / 2, -0.4 + i * 0.4]))
}
function railsBuckets(b, holes = true) {
  for (const sx of [-1, 1]) {
    // рейки — тёмный анодированный: светлый алюминий отражал софтбокс и белел
    b.add('alu', box(0.02, H - 0.18, 0.025, [sx * 0.245, H / 2, 0.40]))
    b.add('alu', box(0.02, H - 0.18, 0.025, [sx * 0.245, H / 2, -0.40]))
    // отверстия «U» на рейках — тёмные точки
    if (holes) for (let s = 0; s < RACK.SLOTS * 2; s++) b.add('black', box(0.022, 0.006, 0.006, [sx * 0.245, RACK.BASE + s * 0.04445 + 0.01, 0.405]))
  }
  // нумерация юнитов на левой передней рейке
  b.add('unitNumbers', plane(0.014, RACK.SLOTS * 2 * 0.04445, [-0.262, RACK.BASE + RACK.SLOTS * 0.04445, 0.414]))
}
function pduBuckets(b, ledKey = 'ledCyan') {
  b.add('black', box(0.045, H - 0.3, 0.07, [0.255, H / 2, -0.50]))
  for (let s = 0; s < RACK.SLOTS; s++) {
    b.add('plastic', box(0.03, 0.02, 0.006, [0.255, RACK.BASE + s * 0.0889 + 0.044, -0.462]))
    b.add('ledGreen', box(0.003, 0.005, 0.002, [0.242, RACK.BASE + s * 0.0889 + 0.052, -0.46]))
  }
  // кабельные жгуты и патч-корды сзади
  b.add('black', tube([V(-0.24, 0.12, -0.5), V(-0.245, H * 0.5, -0.52), V(-0.24, H - 0.12, -0.5)], 0.014, 8, 8))
  b.add('black', tube([V(-0.21, 0.12, -0.5), V(-0.215, H * 0.5, -0.53), V(-0.21, H - 0.12, -0.5)], 0.01, 8, 8))
  const cableKeys = ['cableOrange', 'cableBlue', 'cableBlue', 'cableOrange', 'cableYellow', 'cableBlue', 'cableOrange']
  cableKeys.forEach((key, i) => {
    const x = -0.185 + i * 0.011
    const w = 0.012 * Math.sin(i * 1.7)
    b.add(key, tube([V(x, 0.14, -0.47), V(x + w, H * 0.35, -0.49 - 0.015 * (i % 2)), V(x - w, H * 0.7, -0.48), V(x, H - 0.14, -0.47)], 0.0032, 14, 6))
  })
  // небольшой индикатор стойки над верхним узлом
  b.add(ledKey, box(0.03, 0.003, 0.003, [-0.2, H - 0.06, 0.575]))
}

export function buildHeroRack(mats) {
  const root = new THREE.Group()
  root.name = 'heroRack'
  const mk = (fn, name) => {
    const b = new Buckets()
    fn(b)
    const g = b.toGroup(mats)
    g.name = name
    root.add(g)
    return g
  }
  const posts = mk((b) => postsBuckets(b), 'posts')
  const panels = mk((b) => panelsBuckets(b), 'panels')
  const sideL = mk((b) => sideBuckets(b, -1), 'sideL')
  const sideR = mk((b) => sideBuckets(b, 1), 'sideR')
  const rails = mk((b) => railsBuckets(b), 'rails')
  const pdu = mk((b) => pduBuckets(b, 'heroCyan'), 'pdu')
  root.traverse((o) => {
    if (o.isMesh) o.receiveShadow = true
  })
  return { root, posts, panels, sideL, sideR, rails, pdu }
}

// Стойка для ряда — единый меш (используется как геометрия InstancedMesh)
export function buildLiteRack(mats, ledKey = 'ledCyan') {
  const b = new Buckets()
  postsBuckets(b)
  panelsBuckets(b)
  sideBuckets(b, -1)
  sideBuckets(b, 1)
  railsBuckets(b, false)
  pduBuckets(b, ledKey)
  return b.toMesh(mats)
}
