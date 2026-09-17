import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { COLORS } from '../config.js'

// ---------------------------------------------------------------------------
//  Свет: тёмная студия. Ключ — прямоугольный софтбокс, контровые — циан и
//  маджента (фирменные), заполняющий — холодная полусфера. Карта окружения
//  для отражений металла собирается из тех же панелей.
// ---------------------------------------------------------------------------

export function createEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = new THREE.Scene()
  const panel = (w, h, color, intensity, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }))
    m.position.set(...pos)
    m.lookAt(...(look || [0, 0, 0]))
    env.add(m)
  }
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0a0c10, side: THREE.BackSide })))
  panel(6, 6, 0xffffff, 3.0, [0, 6, 1]) // софтбокс сверху
  panel(4, 2, 0xffffff, 1.6, [0, 2.5, 6]) // фронтальный блик
  panel(3, 5, 0xffffff, 1.2, [-6, 2, 3]) // второй белый источник слева-спереди
  panel(5, 6, COLORS.cyan, 0.35, [-7, 2, -2]) // холодный контр слева — намёком
  panel(5, 6, 0xffe2cc, 0.18, [7, 1, -3]) // тёплый контр справа — нейтральный, намёком
  panel(8, 1, 0xffffff, 0.9, [0, 0.4, -8]) // тонкая полоса сзади (кромки)
  const tex = pmrem.fromScene(env, 0.04).texture
  pmrem.dispose()
  return tex
}

export function createLights(scene) {
  RectAreaLightUniformsLib.init()
  const g = new THREE.Group()
  g.name = 'lights'

  const key = new THREE.RectAreaLight(0xffffff, 4.5, 1.6, 1.2)
  key.position.set(0.9, 1.15, 0.95)
  key.lookAt(0, 0, 0)
  g.add(key)

  // контровые — сбоку-спереди: теней нет, и свет из-за корпуса просвечивал бы фронт
  const cyan = new THREE.PointLight(0x9fe3ff, 1.1, 0, 2)
  cyan.position.set(-1.35, 0.55, -0.25)
  g.add(cyan)

  // тёплый контровой сверху-сзади (был маджента — розовые кромки читались только на разнесённом виде)
  const magenta = new THREE.PointLight(0xffe2cc, 0.35, 0, 2)
  magenta.position.set(1.5, 1.25, -1.0)
  g.add(magenta)

  const hemi = new THREE.HemisphereLight(0x4a5262, 0x15171b, 1.5)
  g.add(hemi)

  // мягкий заполняющий со стороны камеры — чтобы фронт узла не проваливался в черноту
  const fill = new THREE.PointLight(0xe8eef6, 1.2, 0, 2)
  fill.position.set(0.9, 0.35, 1.5)
  g.add(fill)

  // мягкая направленная — тени в разнесённом виде
  const sun = new THREE.DirectionalLight(0xdfe8ff, 0.9)
  sun.position.set(1.0, 2.2, 1.3)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 6
  sun.shadow.camera.left = -0.9
  sun.shadow.camera.right = 0.9
  sun.shadow.camera.top = 0.9
  sun.shadow.camera.bottom = -0.9
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.01
  sun.shadow.radius = 3
  g.add(sun)
  g.add(sun.target)

  // потолочный свет холодного коридора — включается, когда в кадре стойка и ряд
  const aisle = new THREE.RectAreaLight(0xf2f6ff, 0, 2, 1)
  aisle.position.set(0.4, 1.8, 2.6)
  aisle.lookAt(0, -0.3, 0)
  g.add(aisle)

  // «луна» для кампуса — далёкие ряды не должны быть чёрными
  const moon = new THREE.DirectionalLight(0x6f86b0, 0.5)
  moon.position.set(-3, 10, 4)
  g.add(moon)

  scene.add(g)
  return { group: g, key, cyan, magenta, hemi, sun, moon, fill, aisle }
}
