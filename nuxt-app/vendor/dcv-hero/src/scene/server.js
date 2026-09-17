import * as THREE from 'three'
import { SERVER } from '../config.js'
import { Buckets, box, rbox, cyl, tube, fanHousing, fanBlade, merge, HALF } from '../util/geo.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ---------------------------------------------------------------------------
//  2U узел высокой плотности с прямым жидкостным охлаждением.
//  Компоновка спереди назад: бейзел → 8 NVMe-салазок → стена из 6 вентиляторов →
//  2 CPU с 16 DIMM → коллектор СЖО → 4 ускорителя с холодными плитами →
//  2 БП и разъёмы сзади. Каждая деталь — отдельная группа с двумя положениями:
//  home (собрано) и away (разнесённый вид), между ними едет скролл.
// ---------------------------------------------------------------------------

const { W, H, D } = SERVER
const ZF = D / 2 // передняя плоскость
const ZR = -D / 2 // задняя плоскость
const BOARD_TOP = -H / 2 + 0.004 + 0.006 + 0.0016 // дно + стойки + текстолит
const EXPLODE = 0.85

const V = (x, y, z) => new THREE.Vector3(x, y, z)

function part(name, group, home, away, order) {
  group.name = name
  group.userData.home = home
  group.userData.away = away
  group.userData.order = order // [start, end] по прогрессу
  group.position.copy(away)
  return group
}

// ---- корпус (не двигается) --------------------------------------------------
function buildBase(mats) {
  const b = new Buckets()
  // дно, борта, задняя стенка
  b.add('alu', box(W, 0.004, D, [0, -H / 2 + 0.002, 0]))
  b.add('alu', box(0.004, H, D, [-W / 2 + 0.002, 0, 0]))
  b.add('alu', box(0.004, H, D, [W / 2 - 0.002, 0, 0]))
  b.add('alu', box(W, H, 0.004, [0, 0, ZR + 0.002]))
  // «уши» для крепления в стойку + винты
  for (const sx of [-1, 1]) {
    b.add('aluLight', box(0.03, H, 0.004, [sx * (W / 2 + 0.015), 0, ZF - 0.006]))
    b.add('aluLight', cyl(0.004, 0.004, 0.006, 12, [sx * (W / 2 + 0.02), 0.028, ZF - 0.002], [HALF, 0, 0]))
    b.add('aluLight', cyl(0.004, 0.004, 0.006, 12, [sx * (W / 2 + 0.02), -0.028, ZF - 0.002], [HALF, 0, 0]))
    // направляющие по бортам
    b.add('alu', box(0.006, 0.016, D * 0.9, [sx * (W / 2 + 0.005), 0, -0.02]))
  }
  // стойки под плату
  for (const x of [-0.2, 0, 0.2]) for (const z of [-0.28, -0.08, 0.12]) b.add('copper', cyl(0.0025, 0.0025, 0.006, 8, [x, -H / 2 + 0.007, z]))
  // рамка стены вентиляторов
  b.add('black', box(W - 0.01, 0.004, 0.004, [0, H / 2 - 0.004, 0.16]))
  b.add('black', box(W - 0.01, 0.004, 0.004, [0, -H / 2 + 0.006, 0.16]))
  // задняя панель: сетевые порты, консоль, быстроразъёмы СЖО
  b.add('plastic', box(0.03, 0.014, 0.008, [-0.01, -0.012, ZR - 0.002]))
  b.add('plastic', box(0.03, 0.014, 0.008, [0.03, -0.012, ZR - 0.002]))
  b.add('plastic', box(0.014, 0.007, 0.006, [-0.045, -0.014, ZR - 0.002]))
  b.add('heroGreen', box(0.004, 0.002, 0.001, [-0.02, -0.003, ZR - 0.0065]))
  b.add('heroAmber', box(0.004, 0.002, 0.001, [0.02, -0.003, ZR - 0.0065]))
  for (const sx of [-1, 1]) {
    b.add('fitting', cyl(0.007, 0.007, 0.024, 16, [sx * 0.05, 0.02, ZR - 0.006], [HALF, 0, 0]))
    b.add('fitting', cyl(0.009, 0.009, 0.006, 16, [sx * 0.05, 0.02, ZR - 0.016], [HALF, 0, 0]))
  }
  // силовые кабели от БП к плате
  for (const sx of [-1, 1]) {
    b.add(
      'black',
      tube([V(sx * 0.165, -0.02, -0.30), V(sx * 0.16, -0.005, -0.24), V(sx * 0.10, 0.0, -0.16), V(sx * 0.03, -0.02, -0.14)], 0.0035, 20, 6),
    )
  }
  return b.toGroup(mats)
}

// ---- крышка -----------------------------------------------------------------
function buildLid(mats) {
  const b = new Buckets()
  const y = H / 2 - 0.0018
  // сплошная часть (над платой и вентиляторами) — та же порошковая сталь, что корпус
  b.add('lid', rbox(W - 0.006, 0.0035, 0.50, 0.0008, [0, y, -0.25 + 0.25 + 0.006]))
  // вентиляционная зона над ускорителями и БП
  b.add('perf', box(W - 0.05, 0.003, 0.125, [0, y, ZR + 0.07]))
  b.add('lid', box(W - 0.006, 0.0035, 0.012, [0, y, ZR + 0.006]))
  b.add('lid', box(0.022, 0.0035, 0.14, [-W / 2 + 0.014, y, ZR + 0.07]))
  b.add('lid', box(0.022, 0.0035, 0.14, [W / 2 - 0.014, y, ZR + 0.07]))
  // рёбра жёсткости
  for (const x of [-0.15, 0, 0.15]) b.add('lid', box(0.008, 0.0016, 0.46, [x, y + 0.0025, 0.0]))
  // защёлка, инвентарная наклейка, предупреждающая метка у БП
  b.add('plastic', box(0.03, 0.002, 0.014, [0.16, y + 0.0025, 0.2]))
  b.add('sticker', box(0.052, 0.0006, 0.02, [0.13, y + 0.0022, 0.05]))
  b.add('warn', box(0.022, 0.0006, 0.011, [-0.16, y + 0.0022, 0.16]))
  return b.toGroup(mats)
}

// ---- материнская плата ------------------------------------------------------
function buildBoard(mats) {
  const b = new Buckets()
  const y = -H / 2 + 0.004 + 0.006 + 0.0008
  b.add('pcb', box(W - 0.04, 0.0016, 0.44, [0, y, -0.08]))
  // VRM, дроссели, конденсаторы вокруг сокетов
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 8; i++) b.add('black', box(0.007, 0.006, 0.007, [sx * 0.115 - 0.028 + i * 0.008, y + 0.004, 0.105]))
    for (let i = 0; i < 6; i++) b.add('aluLight', cyl(0.003, 0.003, 0.008, 8, [sx * 0.115 - 0.02 + i * 0.008, y + 0.005, 0.118]))
    // сокет
    b.add('black', box(0.08, 0.0025, 0.08, [sx * 0.115, y + 0.002, 0.02]))
    // слоты DIMM
    for (let i = 0; i < 8; i++) {
      const x = sx * 0.115 + (i < 4 ? -1 : 1) * (0.052 + (i % 4) * 0.0105)
      b.add('black', box(0.0065, 0.004, 0.14, [x, y + 0.003, 0.02]))
    }
  }
  // чипсет, BMC, мелкие чипы
  b.add('black', box(0.02, 0.003, 0.02, [0, y + 0.0025, 0.1]))
  b.add('black', box(0.012, 0.003, 0.012, [0.03, y + 0.0025, 0.12]))
  for (let i = 0; i < 12; i++) b.add('black', box(0.004, 0.0015, 0.004, [-0.2 + i * 0.033, y + 0.002, 0.135]))
  // посадочные для ускорителей: коннекторы
  for (let i = 0; i < 4; i++) b.add('black', box(0.06, 0.004, 0.006, [-0.18 + i * 0.12, y + 0.003, -0.135]))
  return b.toGroup(mats)
}

// ---- процессор + холодная плита ---------------------------------------------
function buildCPU(mats) {
  const b = new Buckets()
  const y = BOARD_TOP
  b.add('plastic', box(0.076, 0.003, 0.076, [0, y + 0.0015, 0]))
  b.add('pcb', box(0.072, 0.002, 0.072, [0, y + 0.004, 0]))
  b.add('aluLight', rbox(0.066, 0.003, 0.066, 0.001, [0, y + 0.0065, 0]))
  // холодная плита: медное основание, микроканалы, крышка
  b.add('copper', rbox(0.082, 0.014, 0.082, 0.003, [0, y + 0.015, 0]))
  b.add('aluLight', rbox(0.084, 0.004, 0.084, 0.0015, [0, y + 0.024, 0]))
  // прижимная рамка и винты
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('black', cyl(0.003, 0.003, 0.006, 8, [sx * 0.045, y + 0.005, sz * 0.045]))
  // фитинги вход/выход (в сторону коллектора, -Z)
  for (const sx of [-1, 1]) {
    b.add('fitting', cyl(0.0035, 0.0035, 0.012, 12, [sx * 0.02, y + 0.031, -0.03]))
    b.add('fitting', cyl(0.005, 0.005, 0.004, 12, [sx * 0.02, y + 0.027, -0.03]))
  }
  return b.toGroup(mats)
}

// ---- модуль памяти с подсветкой ---------------------------------------------
function buildDIMM(mats, cyan) {
  const b = new Buckets()
  b.add('aluLight', rbox(0.0068, 0.031, 0.13, 0.0008, [0, 0, 0]))
  b.add('black', box(0.0072, 0.006, 0.12, [0, 0.008, 0]))
  b.add('black', box(0.0072, 0.006, 0.12, [0, -0.008, 0]))
  b.add('sticker', box(0.0074, 0.011, 0.046, [0, 0.003, 0.02]))
  return b.toGroup(mats)
}

// ---- ускоритель (модуль с холодной плитой) ----------------------------------
function buildGPU(mats) {
  const b = new Buckets()
  const y = BOARD_TOP
  b.add('pcb', box(0.10, 0.0025, 0.17, [0, y + 0.0012, 0]))
  b.add('black', box(0.05, 0.003, 0.05, [0, y + 0.004, 0.01]))
  for (let i = 0; i < 10; i++) b.add('black', box(0.004, 0.004, 0.004, [-0.04 + i * 0.009, y + 0.004, -0.07]))
  b.add('copper', rbox(0.092, 0.016, 0.15, 0.003, [0, y + 0.014, 0]))
  b.add('aluLight', rbox(0.094, 0.004, 0.152, 0.0015, [0, y + 0.024, 0]))
  // прорези в крышке (для рисунка)
  for (let i = 0; i < 5; i++) b.add('black', box(0.06, 0.0008, 0.0025, [0, y + 0.0265, -0.055 + i * 0.012]))
  b.add('sticker', box(0.034, 0.0008, 0.013, [0.022, y + 0.0265, 0.052]))
  for (const sx of [-1, 1]) {
    b.add('fitting', cyl(0.0035, 0.0035, 0.012, 12, [sx * 0.02, y + 0.031, 0.065]))
    b.add('fitting', cyl(0.005, 0.005, 0.004, 12, [sx * 0.02, y + 0.027, 0.065]))
  }
  return b.toGroup(mats)
}

// ---- контур СЖО: коллектор + трубки к каждой плите + выход назад ------------
function buildLoop(mats, cpuX, gpuX) {
  const b = new Buckets()
  const my = 0.014 // высота коллектора
  const mz = -0.105
  b.add('aluLight', cyl(0.0075, 0.0075, 0.45, 16, [0, my, mz], [0, 0, HALF]))
  b.add('fitting', cyl(0.009, 0.009, 0.012, 16, [-0.225, my, mz], [0, 0, HALF]))
  b.add('fitting', cyl(0.009, 0.009, 0.012, 16, [0.225, my, mz], [0, 0, HALF]))
  const fy = BOARD_TOP + 0.036 // верх фитинга
  const add = (pts) => b.add('tube', tube(pts, 0.0042, 28, 10))
  // к процессорам (фитинги на -Z стороне плиты, z = 0.02 - 0.03)
  for (const cx of cpuX) {
    for (const sx of [-1, 1]) {
      const x = cx + sx * 0.02
      b.add('fitting', cyl(0.004, 0.004, 0.01, 10, [x, my - 0.008, mz]))
      add([V(x, my - 0.01, mz), V(x, 0.03, mz + 0.03), V(x, 0.032, -0.03), V(x, fy + 0.006, -0.012), V(x, fy, -0.01)])
    }
  }
  // к ускорителям (фитинги на +Z стороне модуля, z = -0.21 + 0.065)
  for (const gx of gpuX) {
    for (const sx of [-1, 1]) {
      const x = gx + sx * 0.02
      b.add('fitting', cyl(0.004, 0.004, 0.01, 10, [x, my - 0.008, mz]))
      add([V(x, my - 0.01, mz), V(x, 0.03, mz - 0.012), V(x, 0.03, -0.132), V(x, fy + 0.006, -0.144), V(x, fy, -0.145)])
    }
  }
  // подача/обратка назад к быстроразъёмам
  for (const sx of [-1, 1]) {
    add([
      V(sx * 0.23, my, mz),
      V(sx * 0.235, 0.03, mz - 0.06),
      V(sx * 0.22, 0.032, -0.26),
      V(sx * 0.12, 0.028, -0.34),
      V(sx * 0.05, 0.02, -0.375),
    ])
  }
  return b.toGroup(mats)
}

// ---- вентилятор -------------------------------------------------------------
function buildFan(mats) {
  const b = new Buckets()
  b.add('plastic', fanHousing(0.074, 0.0335, 0.05))
  b.add('black', cyl(0.0125, 0.0125, 0.03, 20, [0, 0, 0], [HALF, 0, 0]))
  // стойки крыльчатки
  for (let i = 0; i < 4; i++) b.add('plastic', box(0.003, 0.034, 0.004, [0, 0.019, -0.022], [0, 0, (i / 4) * Math.PI * 2 + 0.4]))
  // декоративное кольцо-«гриль»
  b.add('aluLight', cyl(0.034, 0.034, 0.003, 32, [0, 0, 0.026], [HALF, 0, 0], true))
  const g = b.toGroup(mats)
  // крыльчатка: 7 лопастей одним мешем, вращается как целое
  const bladeList = []
  for (let i = 0; i < 7; i++) {
    const bg = fanBlade(0.012, 0.0325, 0.0012, 0.75)
    bg.rotateX(0.62) // угол атаки
    bg.rotateZ((i / 7) * Math.PI * 2)
    bladeList.push(bg)
  }
  const blades = new THREE.Mesh(merge(bladeList), mats.aluLight)
  g.add(blades)
  g.userData.blades = blades
  return g
}

// ---- NVMe-салазка -----------------------------------------------------------
function buildSled(mats) {
  const b = new Buckets()
  const zf = 0.0 // локальная передняя плоскость салазки
  b.add('black', box(0.048, 0.072, 0.145, [0, 0, zf - 0.0775]))
  b.add('alu', box(0.05, 0.011, 0.005, [0, 0.0325, zf]))
  b.add('alu', box(0.05, 0.011, 0.005, [0, -0.0325, zf]))
  b.add('alu', box(0.005, 0.076, 0.005, [-0.0225, 0, zf]))
  b.add('alu', box(0.005, 0.076, 0.005, [0.0225, 0, zf]))
  b.add('perfFine', box(0.04, 0.054, 0.0015, [0, 0, zf]))
  b.add('aluLight', box(0.03, 0.0035, 0.005, [-0.003, 0.0325, zf + 0.004]))
  b.add('plastic', box(0.007, 0.012, 0.004, [0.017, 0.028, zf + 0.003]))
  b.add('heroGreen', box(0.0035, 0.002, 0.001, [-0.016, -0.0325, zf + 0.003]))
  b.add('heroWhite', box(0.0035, 0.002, 0.001, [-0.009, -0.0325, zf + 0.003]))
  return b.toGroup(mats)
}

// ---- блок питания -----------------------------------------------------------
function buildPSU(mats) {
  const b = new Buckets()
  b.add('alu', rbox(0.10, 0.042, 0.11, 0.002, [0, 0, 0]))
  b.add('perfFine', box(0.09, 0.036, 0.0015, [0, 0, -0.0557]))
  b.add('aluLight', box(0.045, 0.004, 0.004, [0, 0.016, -0.06]))
  b.add('aluLight', box(0.004, 0.004, 0.006, [-0.02, 0.016, -0.057]))
  b.add('aluLight', box(0.004, 0.004, 0.006, [0.02, 0.016, -0.057]))
  b.add('plastic', box(0.026, 0.018, 0.004, [-0.03, -0.006, -0.057]))
  b.add('heroGreen', box(0.003, 0.003, 0.001, [0.038, -0.014, -0.0565]))
  return b.toGroup(mats)
}

// ---- бейзел -----------------------------------------------------------------
function buildBezel(mats) {
  const b = new Buckets()
  const t = 0.007
  b.add('alu', rbox(W + 0.02, 0.009, t, 0.0015, [0, H / 2 - 0.0045, 0]))
  b.add('alu', rbox(W + 0.02, 0.018, t, 0.0015, [0, -H / 2 + 0.009, 0]))
  b.add('alu', box(0.028, H, t, [-W / 2 + 0.004, 0, 0]))
  b.add('alu', box(0.028, H, t, [W / 2 - 0.004, 0, 0]))
  b.add('perf', box(W - 0.036, H - 0.027, 0.0015, [0, 0.0045, 0]))
  // световая полоса и статусные индикаторы
  b.add('heroCyan', box(0.12, 0.0016, 0.0012, [-0.12, -H / 2 + 0.0055, t / 2 + 0.0005]))
  b.add('heroGreen', box(0.003, 0.003, 0.0012, [W / 2 - 0.05, -H / 2 + 0.009, t / 2 + 0.0005]))
  b.add('heroWhite', box(0.003, 0.003, 0.0012, [W / 2 - 0.04, -H / 2 + 0.009, t / 2 + 0.0005]))
  b.add('heroAmber', box(0.003, 0.003, 0.0012, [W / 2 - 0.03, -H / 2 + 0.009, t / 2 + 0.0005]))
  b.add('sticker', box(0.026, 0.006, 0.0008, [W / 2 - 0.085, -H / 2 + 0.009, t / 2 + 0.0004]))
  b.add('aluLight', cyl(0.0035, 0.0035, 0.003, 12, [W / 2 - 0.018, -H / 2 + 0.009, t / 2], [HALF, 0, 0]))
  const g = b.toGroup(mats)
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.0131), mats.logo)
  logo.position.set(-0.10 + 0.035 + 0.16 / 2 + 0.02, -H / 2 + 0.0105, t / 2 + 0.0006)
  logo.position.x = 0.02
  g.add(logo)
  return g
}

// ---------------------------------------------------------------------------
export function buildHeroServer(mats) {
  const root = new THREE.Group()
  root.name = 'heroServer'
  const parts = []
  const fans = []
  const add = (g) => {
    root.add(g)
    parts.push(g)
    return g
  }

  add(part('base', buildBase(mats), V(0, 0, 0), V(0, 0, 0), [0, 0]))
  add(part('lid', buildLid(mats), V(0, 0, 0), V(0, 0.40 * EXPLODE, 0.02), [0.385, 0.435]))
  add(part('board', buildBoard(mats), V(0, 0, 0), V(0, 0.032 * EXPLODE, 0), [0.075, 0.15]))

  const cpuX = [-0.115, 0.115]
  cpuX.forEach((x, i) => {
    add(part(`cpu${i}`, buildCPU(mats), V(x, 0, 0.02), V(x + Math.sign(x) * 0.035, 0.075 * EXPLODE, 0.02), [0.115 + i * 0.02, 0.185 + i * 0.02]))
    for (let k = 0; k < 8; k++) {
      const dx = (k < 4 ? -1 : 1) * (0.052 + (k % 4) * 0.0105)
      const home = V(x + dx, BOARD_TOP + 0.0155 + 0.004, 0.02)
      const stair = k < 4 ? 3 - k : k - 4
      const away = V(x + dx + Math.sign(dx) * 0.012, home.y + (0.11 + stair * 0.016) * EXPLODE, 0.02)
      const n = i * 8 + k
      add(part(`dimm${n}`, buildDIMM(mats, i === 0), home, away, [0.15 + n * 0.006, 0.205 + n * 0.006]))
    }
  })

  const gpuX = [-0.18, -0.06, 0.06, 0.18]
  gpuX.forEach((x, i) => {
    add(part(`gpu${i}`, buildGPU(mats), V(x, 0, -0.21), V(x + (i < 2 ? -0.02 : 0.02), (0.165 + (i % 2) * 0.03) * EXPLODE, -0.21), [0.19 + i * 0.013, 0.26 + i * 0.013]))
  })

  add(part('loop', buildLoop(mats, cpuX, gpuX), V(0, 0, 0), V(0, 0.29 * EXPLODE, 0), [0.275, 0.345]))

  for (let i = 0; i < 6; i++) {
    const x = -0.195 + i * 0.078
    const fan = buildFan(mats)
    fans.push(fan.userData.blades)
    add(part(`fan${i}`, fan, V(x, 0, 0.185), V(x, 0.06 * EXPLODE, 0.185 + (0.10 + i * 0.01) * EXPLODE), [0.235 + i * 0.008, 0.295 + i * 0.008]))
  }

  for (let i = 0; i < 8; i++) {
    const x = -0.1925 + i * 0.055
    const stag = i % 2
    add(part(`nvme${i}`, buildSled(mats), V(x, 0, 0.37), V(x, -0.02 * stag * EXPLODE, 0.37 + (0.11 + stag * 0.04) * EXPLODE), [0.28 + i * 0.007, 0.34 + i * 0.007]))
  }

  ;[-0.165, 0.165].forEach((x, i) => {
    add(part(`psu${i}`, buildPSU(mats), V(x, -H / 2 + 0.023, ZR + 0.055), V(x, -H / 2 + 0.023 - 0.02 * EXPLODE, ZR + 0.055 - 0.16 * EXPLODE), [0.30 + i * 0.02, 0.36 + i * 0.02]))
  })

  add(part('bezel', buildBezel(mats), V(0, 0, ZF + 0.0035), V(0, 0.02 * EXPLODE, ZF + 0.0035 + 0.26 * EXPLODE), [0.415, 0.46]))

  for (const g of parts) {
    const minor = /^(dimm|fan|nvme)/.test(g.name)
    g.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = !minor
      o.receiveShadow = true
      if (!minor) o.layers.enable(1) // слой 1 — то, что видно в отражении пола
    })
  }

  // контур собранного корпуса — «чертёж», к которому слетаются детали
  const ghost = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.02, H, D + 0.01)),
    new THREE.LineDashedMaterial({ color: 0x9aa4b2, dashSize: 0.018, gapSize: 0.012, transparent: true, opacity: 0.4, depthWrite: false }),
  )
  ghost.computeLineDistances()
  root.add(ghost)

  return { root, parts, fans, ghost, static: buildStaticHero(parts) }
}

// Собранный узел одним мешем (группы по материалам): после сборки заменяет
// ~200 отдельных мешей деталей, пока узел стоит в стойке.
function buildStaticHero(parts) {
  const buckets = new Map()
  const m = new THREE.Matrix4()
  const inv = new THREE.Matrix4()
  const home = new THREE.Matrix4()
  for (const part of parts) {
    home.makeTranslation(part.userData.home.x, part.userData.home.y, part.userData.home.z)
    part.updateMatrixWorld(true)
    inv.copy(part.matrixWorld).invert()
    part.traverse((o) => {
      if (!o.isMesh) return
      // матрица меша относительно детали, деталь — в собранном положении
      m.copy(o.matrixWorld).premultiply(inv).premultiply(home)
      const g = o.geometry.clone().applyMatrix4(m)
      const list = buckets.get(o.material) || []
      list.push(g.index ? g.toNonIndexed() : g)
      buckets.set(o.material, list)
    })
  }
  const geos = []
  const materials = []
  for (const [mat, list] of buckets) {
    geos.push(mergeGeometries(list, false))
    materials.push(mat)
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos, true), materials)
  mesh.name = 'heroStatic'
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.visible = false
  mesh.layers.enable(1)
  return mesh
}

// Облегчённый узел для инстансинга: один меш с группами по материалам
export function buildLiteServer(mats) {
  const b = new Buckets()
  b.add('alu', box(W, H - 0.004, D, [0, 0, -0.004]))
  const zf = ZF + 0.0035
  b.add('alu', box(W + 0.02, 0.009, 0.007, [0, H / 2 - 0.0045, zf]))
  b.add('alu', box(W + 0.02, 0.018, 0.007, [0, -H / 2 + 0.009, zf]))
  b.add('alu', box(0.028, H, 0.007, [-W / 2 + 0.004, 0, zf]))
  b.add('alu', box(0.028, H, 0.007, [W / 2 - 0.004, 0, zf]))
  b.add('perf', box(W - 0.036, H - 0.027, 0.0015, [0, 0.0045, zf]))
  for (let i = 0; i < 8; i++) {
    const x = -0.1925 + i * 0.055
    b.add('plastic', box(0.048, 0.07, 0.004, [x, 0.0045, zf - 0.006]))
    b.add('aluLight', box(0.03, 0.0035, 0.004, [x - 0.003, 0.033, zf - 0.005]))
    b.add('ledWhite', box(0.0035, 0.002, 0.002, [x - 0.016, -0.028, zf - 0.005]))
  }
  b.add('ledCyan', box(0.12, 0.0016, 0.0012, [-0.12, -H / 2 + 0.0055, zf + 0.004]))
  b.add('ledGreen', box(0.003, 0.003, 0.0012, [W / 2 - 0.05, -H / 2 + 0.009, zf + 0.004]))
  b.add('ledWhite', box(0.003, 0.003, 0.0012, [W / 2 - 0.04, -H / 2 + 0.009, zf + 0.004]))
  b.add('ledAmber', box(0.003, 0.003, 0.0012, [W / 2 - 0.03, -H / 2 + 0.009, zf + 0.004]))
  b.add('sticker', box(0.026, 0.006, 0.0008, [W / 2 - 0.085, -H / 2 + 0.009, zf + 0.0039]))
  return b.toMesh(mats)
}
