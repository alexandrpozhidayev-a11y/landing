import * as THREE from 'three'
import { inv, smooth, smoother, lerp, damp } from '../util/math.js'
import { EARTH_R } from '../config.js'
import { EARTH_CENTER, geoToScene, upAt } from '../util/earth.js'

// ---------------------------------------------------------------------------
//  Камера по ключевым кадрам прогресса. Между кадрами — Catmull-Rom по
//  позиции и цели, чтобы траектория была одной непрерывной кривой, а не
//  ломаной. Курсор даёт параллакс, пропорциональный дистанции до цели.
//  После площадки — полёт на орбиту: дистанция растёт по логарифму (от сотен
//  метров до тысяч километров за один жест), «верх» кадра — нормаль к шару.
// ---------------------------------------------------------------------------

const KEYS = [
  { p: 0.0, pos: [1.28, 0.72, 1.42], tgt: [0.0, 0.14, 0.02], fov: 30 }, // разнесённый вид, 3/4 сверху
  { p: 0.14, pos: [-1.05, 0.5, 1.2], tgt: [0.0, 0.08, 0.0], fov: 30 }, // облёт на другую сторону
  { p: 0.28, pos: [0.78, 0.36, 1.28], tgt: [0.0, 0.03, 0.1], fov: 31 }, // фронтальный 3/4
  { p: 0.38, pos: [0.36, 0.5, 0.78], tgt: [0.0, 0.0, -0.06], fov: 30 }, // сверху в открытый корпус: поток СЖО
  { p: 0.47, pos: [0.6, 0.16, 1.02], tgt: [-0.06, 0.0, 0.2], fov: 30 }, // бейзел крупно, включение
  { p: 0.56, pos: [0.85, 0.5, 2.7], tgt: [0.0, 0.15, 0.0], fov: 36 }, // отъезд: стойка растёт
  { p: 0.66, pos: [0.95, 0.35, 3.9], tgt: [0.05, 0.08, 0.0], fov: 36 }, // узлы въезжают
  { p: 0.77, pos: [4.4, 4.2, 5.8], tgt: [0.35, 0.0, 0.3], fov: 40 }, // ряд стоек и коридор сверху-сбоку
  { p: 0.87, pos: [1.0, 12.0, 12.0], tgt: [0.35, 0.0, -3.0], fov: 40 }, // подъём
  { p: 1.0, pos: [0.4, 70.0, 10.0], tgt: [0.4, 0.0, -8.0], fov: 36 }, // зал сверху
]

// Над залом камера не идёт по ключам (на каждом ключе она останавливается и
// рвётся с места), а одним движением: дистанция по логарифму, направление — сферически.
const AERIAL = { p: 1.16, pos: [-420, 360, 540], tgt: [40, 0, -60], fov: 38 } // площадка 3/4 сверху

// [dc-valley.com] Кадры выставлены под широкую панель (примерно 3:2). Когда панель уже —
// узкая колонка на десктопе, телефон, отдаление страницы — горизонтальный обзор при том же
// вертикальном fov сужается, и сцена вылезает за края. Компенсируем дистанцией: камеру
// отодвигаем ровно настолько, чтобы ширина кадра осталась прежней.
const BASE_ASPECT = 1.35
const MAX_WIDEN = 2.4

// Полёт на орбиту и кадр карты
const SPACE = { from: AERIAL.p, to: 1.36 }
const FRAME = { geo: [46.5, 49.5], halfWidth: 3400e3, tilt: 0.36, fov: 34 } // центр кадра, полуширина по горизонтали, наклон к югу (рад)

export class CameraRig {
  constructor(camera) {
    this.camera = camera
    this.posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.pos)), false, 'catmullrom', 0.0)
    this.tgtCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.tgt)), false, 'catmullrom', 0.0)
    this.pos = new THREE.Vector3()
    this.tgt = new THREE.Vector3()
    this.right = new THREE.Vector3()
    this.upv = new THREE.Vector3()
    this.px = 0
    this.py = 0
    this.sx = 0
    this.sy = 0
    this.fov = KEYS[0].fov
    this.up = new THREE.Vector3(0, 1, 0)
    this.aspect = 1.5
    // позы: зал сверху → площадка 3/4 → кадр карты (цель на шаре, взгляд «с юга»)
    const toPose = (k) => {
      const o = { tgt: new THREE.Vector3(...k.tgt), fov: k.fov }
      o.dir = new THREE.Vector3(...k.pos).sub(o.tgt)
      o.dist = o.dir.length()
      o.dir.normalize()
      return o
    }
    this.c0 = toPose(KEYS[KEYS.length - 1])
    this.s0 = toPose(AERIAL)
    this.s1 = { tgt: geoToScene(FRAME.geo[0], FRAME.geo[1], 0), fov: FRAME.fov }
    const n = upAt(this.s1.tgt)
    const north = geoToScene(FRAME.geo[0], FRAME.geo[1] + 0.5, 0).sub(this.s1.tgt).projectOnPlane(n).normalize()
    this.s1.dir = n.multiplyScalar(Math.cos(FRAME.tilt)).addScaledVector(north, -Math.sin(FRAME.tilt)).normalize()
    this.s1.dist = this.frameDist()
    this._q = new THREE.Quaternion()
    this._qa = new THREE.Quaternion()
    this._d = new THREE.Vector3()
  }

  // Дистанция финального кадра: карта должна влезть по ширине при любом аспекте
  frameDist() {
    const t = Math.tan(THREE.MathUtils.degToRad(FRAME.fov / 2)) * Math.max(this.aspect, 0.7)
    return FRAME.halfWidth / t
  }

  // Поза между a и b: дистанция по логарифму, направление — slerp (sDir),
  // цель — lerp (sTgt, по умолчанию доля пройденной дистанции). Возвращает fov.
  blendPose(a, b, s, sDir = s, sTgt = null) {
    const d = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), s))
    this._qa.setFromUnitVectors(a.dir, b.dir)
    this._q.identity().slerp(this._qa, sDir)
    this._d.copy(a.dir).applyQuaternion(this._q)
    // квадрат доли: на малых высотах цель почти не уходит от хаба, иначе он липнет к краю кадра
    const wt = sTgt ?? THREE.MathUtils.clamp((d - a.dist) / (b.dist - a.dist), 0, 1) ** 2
    this.tgt.lerpVectors(a.tgt, b.tgt, wt)
    this.pos.copy(this.tgt).addScaledVector(this._d, d)
    return lerp(a.fov, b.fov, s)
  }

  // Подъём над корпусом (1 < p ≤ AERIAL.p)
  climbPose(p) {
    const s = smoother(inv(p, KEYS[KEYS.length - 1].p, AERIAL.p))
    this.up.set(0, 1, 0)
    return this.blendPose(this.c0, this.s0, s, s, s)
  }

  // Полёт на орбиту (p > SPACE.from). Цель смещается к центру кадра пропорционально
  // пройденной дистанции: хаб всё время в кадре и лишь к концу уезжает вправо.
  spacePose(p) {
    const s = smoother(inv(p, SPACE.from, SPACE.to))
    this.s1.dist = this.frameDist()
    const fov = this.blendPose(this.s0, this.s1, s, smooth(inv(s, 0.0, 0.75)))
    upAt(this.pos, this.up)
    return fov
  }

  // прогресс → параметр кривой: сегмент i, внутри — сглаженная доля
  param(p) {
    let i = 0
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++
    const a = KEYS[i]
    const b = KEYS[i + 1]
    const t = smoother(inv(p, a.p, b.p))
    return { u: (i + t) / (KEYS.length - 1), fov: lerp(a.fov, b.fov, t) }
  }

  update(p, dt, pointer, parallaxScale = 1) {
    let fov
    if (p > SPACE.from) {
      fov = this.spacePose(p)
    } else if (p > KEYS[KEYS.length - 1].p) {
      fov = this.climbPose(p)
    } else {
      const k = this.param(p)
      fov = k.fov
      this.posCurve.getPoint(k.u, this.pos)
      this.tgtCurve.getPoint(k.u, this.tgt)
      this.up.set(0, 1, 0)
    }

    // [dc-valley.com] Узкая панель — отодвигаем камеру вдоль её же оси. Кадр карты (spacePose)
    // уже считает дистанцию от аспекта в frameDist(), второй раз его не трогаем.
    if (p <= SPACE.from && this.aspect < BASE_ASPECT) {
      const widen = Math.min(BASE_ASPECT / Math.max(this.aspect, 0.2), MAX_WIDEN)
      this._d.subVectors(this.pos, this.tgt)
      this.pos.copy(this.tgt).addScaledVector(this._d, widen)
    }

    // параллакс от курсора — с инерцией
    this.sx = damp(this.sx, pointer.x, 4, dt)
    this.sy = damp(this.sy, pointer.y, 4, dt)
    const dist = this.pos.distanceTo(this.tgt)
    this.camera.position.copy(this.pos)
    this.camera.up.copy(this.up)
    this.camera.lookAt(this.tgt)
    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0)
    this.upv.setFromMatrixColumn(this.camera.matrixWorld, 1)
    const amp = 0.045 * dist * parallaxScale
    this.camera.position.addScaledVector(this.right, this.sx * amp).addScaledVector(this.upv, -this.sy * amp * 0.7)
    this.camera.lookAt(this.tgt.x + this.sx * amp * 0.25, this.tgt.y - this.sy * amp * 0.15, this.tgt.z)

    // ближняя и дальняя плоскости — от масштаба кадра: до площадки прежние,
    // на орбите дальняя — за горизонт шара
    let near = 0.03
    let far = 400
    if (p > 1) {
      const alt = Math.max(0, this.camera.position.distanceTo(EARTH_CENTER) - EARTH_R)
      const horizon = Math.sqrt(alt * (2 * EARTH_R + alt))
      near = Math.max(0.03, dist * 0.005)
      far = Math.max(400, dist * 12, horizon * 1.15)
    }
    if (Math.abs(this.camera.fov - fov) > 0.01 || this.camera.near !== near || this.camera.far !== far) {
      this.camera.fov = fov
      this.camera.near = near
      this.camera.far = far
      this.camera.updateProjectionMatrix()
    }
    return dist
  }
}
