import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const HALF = Math.PI / 2

function place(g, pos, rot) {
  if (rot) {
    if (rot[0]) g.rotateX(rot[0])
    if (rot[1]) g.rotateY(rot[1])
    if (rot[2]) g.rotateZ(rot[2])
  }
  if (pos) g.translate(pos[0], pos[1], pos[2])
  return g
}

export const box = (w, h, d, pos, rot) => place(new THREE.BoxGeometry(w, h, d), pos, rot)

export const rbox = (w, h, d, r, pos, rot, seg = 2) =>
  place(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), pos, rot)

export const cyl = (rt, rb, h, seg, pos, rot, open = false) =>
  place(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), pos, rot)

export const plane = (w, h, pos, rot) => place(new THREE.PlaneGeometry(w, h), pos, rot)

export const tube = (points, r, segs = 24, radial = 8, pos) =>
  place(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segs, r, radial, false), pos)

// Слить список геометрий в одну (все — с position/normal/uv)
export function merge(list) {
  let arr = list.filter(Boolean)
  if (!arr.length) return null
  // RoundedBox/Extrude — без индекса, Box/Cylinder/Tube — с индексом: уравниваем
  if (arr.some((x) => !x.index)) arr = arr.map((x) => (x.index ? x.toNonIndexed() : x))
  const g = mergeGeometries(arr, false)
  arr.forEach((x) => x.dispose())
  return g
}

// Меш из «корзин» по материалам: { matKey: [geo, geo...] } → один Mesh с группами
export function bucketsToMesh(buckets, mats) {
  const geos = []
  const materials = []
  for (const key of Object.keys(buckets)) {
    const g = merge(buckets[key])
    if (!g) continue
    geos.push(g)
    materials.push(mats[key])
  }
  if (!geos.length) return null
  const merged = mergeGeometries(geos.some((x) => !x.index) ? geos.map((x) => (x.index ? x.toNonIndexed() : x)) : geos, true)
  geos.forEach((x) => x.dispose())
  merged.computeBoundingSphere()
  return new THREE.Mesh(merged, materials)
}

// Группа мешей по материалам (когда нужны отдельные объекты на материал)
export function bucketsToGroup(buckets, mats) {
  const group = new THREE.Group()
  for (const key of Object.keys(buckets)) {
    const g = merge(buckets[key])
    if (!g) continue
    const m = new THREE.Mesh(g, mats[key])
    m.name = key
    group.add(m)
  }
  return group
}

export class Buckets {
  constructor() {
    this.b = {}
  }
  add(key, geo) {
    ;(this.b[key] ||= []).push(geo)
    return this
  }
  toMesh(mats) {
    return bucketsToMesh(this.b, mats)
  }
  toGroup(mats) {
    return bucketsToGroup(this.b, mats)
  }
}

// Квадратная рамка с круглым отверстием (корпус вентилятора) — экструзия Shape с дыркой
export function fanHousing(size, hole, depth, r = 0.006) {
  const s = size / 2
  const shape = new THREE.Shape()
  shape.moveTo(-s + r, -s)
  shape.lineTo(s - r, -s)
  shape.quadraticCurveTo(s, -s, s, -s + r)
  shape.lineTo(s, s - r)
  shape.quadraticCurveTo(s, s, s - r, s)
  shape.lineTo(-s + r, s)
  shape.quadraticCurveTo(-s, s, -s, s - r)
  shape.lineTo(-s, -s + r)
  shape.quadraticCurveTo(-s, -s, -s + r, -s)
  const holePath = new THREE.Path()
  holePath.absarc(0, 0, hole, 0, Math.PI * 2, true)
  shape.holes.push(holePath)
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 })
  g.translate(0, 0, -depth / 2)
  return g
}

// Лопасть вентилятора: изогнутый серп, экструдированный тонко и наклонённый
export function fanBlade(rIn, rOut, thick = 0.0012, sweep = 0.9) {
  const shape = new THREE.Shape()
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = rIn + (rOut - rIn) * t
    const a = sweep * t - 0.22
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    const r = rIn + (rOut - rIn) * t
    const a = sweep * t + 0.24 * (1 - t * 0.35)
    shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 4 })
  g.translate(0, 0, -thick / 2)
  return g
}

// Рёбра радиатора: n тонких пластин вдоль X
export function fins(n, w, h, d, gapAxis = 'x', pos = [0, 0, 0]) {
  const list = []
  const span = gapAxis === 'x' ? w : d
  const step = span / n
  const t = Math.max(0.0004, step * 0.42)
  for (let i = 0; i < n; i++) {
    const off = -span / 2 + step * (i + 0.5)
    if (gapAxis === 'x') list.push(box(t, h, d, [pos[0] + off, pos[1], pos[2]]))
    else list.push(box(w, h, t, [pos[0], pos[1], pos[2] + off]))
  }
  return merge(list)
}
