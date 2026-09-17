import * as THREE from 'three'
import { EARTH_R, HUB, FLOOR_Y } from '../config.js'

// ---------------------------------------------------------------------------
//  Земля в координатах сцены (метры). Шар касается пола кампуса в точке хаба:
//  хаб — начало координат, север — −Z, восток — +X, вверх — +Y. Поэтому подъём
//  камеры от кампуса до орбиты — один непрерывный полёт без подмены масштаба.
//
//  Географическая система G: ось Y — северный полюс, долгота 0 — ось X,
//  восточная долгота уходит в −Z.
// ---------------------------------------------------------------------------

const D2R = Math.PI / 180

export const EARTH_Y = FLOOR_Y - 1.0 - EARTH_R // центр шара — чуть ниже пола
export const EARTH_CENTER = new THREE.Vector3(0, EARTH_Y, 0)

export function geoDir(lon, lat, out = new THREE.Vector3()) {
  const la = lat * D2R
  const lo = lon * D2R
  return out.set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo))
}

// Базис хаба в G: восток, вверх, юг — это оси X, Y, Z сцены
const [hLon, hLat] = HUB.geo
const up = geoDir(hLon, hLat)
const east = new THREE.Vector3(-Math.sin(hLon * D2R), 0, -Math.cos(hLon * D2R))
const south = new THREE.Vector3().crossVectors(east, up)
// G → сцена: строки матрицы — оси сцены, выраженные в G
export const G2S = new THREE.Matrix3().set(east.x, east.y, east.z, up.x, up.y, up.z, south.x, south.y, south.z)
// сцена → G (для шейдеров: широта/долгота фрагмента)
export const S2G = G2S.clone().transpose()

const _v = new THREE.Vector3()

// [lon, lat] + высота над поверхностью → точка сцены
export function geoToScene(lon, lat, alt = 0, out = new THREE.Vector3()) {
  geoDir(lon, lat, _v).applyMatrix3(G2S)
  return out.copy(_v).multiplyScalar(EARTH_R + alt).add(EARTH_CENTER)
}

// Нормаль поверхности (направление «вверх») в точке сцены
export function upAt(p, out = new THREE.Vector3()) {
  return out.subVectors(p, EARTH_CENTER).normalize()
}

// Угловое расстояние между двумя [lon, lat], радианы
export function arcAngle(a, b) {
  const va = geoDir(a[0], a[1], new THREE.Vector3())
  const vb = geoDir(b[0], b[1], new THREE.Vector3())
  return va.angleTo(vb)
}

// Точка большого круга между a и b (t ∈ 0..1), направлением в G
export function slerpDir(a, b, t, out = new THREE.Vector3()) {
  const va = geoDir(a[0], a[1], new THREE.Vector3())
  const vb = geoDir(b[0], b[1], new THREE.Vector3())
  const w = va.angleTo(vb)
  if (w < 1e-6) return out.copy(va)
  const s = Math.sin(w)
  return out
    .copy(va)
    .multiplyScalar(Math.sin((1 - t) * w) / s)
    .addScaledVector(vb, Math.sin(t * w) / s)
}

// Направление в G → точка сцены на высоте alt
export function dirToScene(dirG, alt = 0, out = new THREE.Vector3()) {
  return out.copy(dirG).applyMatrix3(G2S).multiplyScalar(EARTH_R + alt).add(EARTH_CENTER)
}
