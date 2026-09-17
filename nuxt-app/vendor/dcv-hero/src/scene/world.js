import * as THREE from 'three'
import { COLORS, RACK, slotY, FLOOR_Y, ROW, FACING, DC, SITE, T_END, EARTH_R } from '../config.js'
import { createMaterials } from './materials.js'
import { buildHeroServer, buildLiteServer } from './server.js'
import { buildHeroRack, buildLiteRack } from './rack.js'
import { buildDataCenter } from './datacenter.js'
import { ReflectiveFloor } from './floor.js'
import { createEnvironment, createLights } from './lights.js'
import { buildStreaks } from './particles.js'
import { buildBackdrop } from './backdrop.js'
import { buildSite, HALL_Z } from './site.js'
import { buildGlobe } from './globe.js'
import { EARTH_CENTER } from '../util/earth.js'
import { CameraRig } from './camera.js'
import { createPost } from './post.js'
import { TIERS, QualityGovernor, initialTier, measureRefresh, detectSoftwareGL, isMobile } from './quality.js'
import { GpuTimer } from './gputimer.js'
import { clamp, inv, smooth, easeOutCubic, easeOutBack, lerp, damp } from '../util/math.js'

// ---------------------------------------------------------------------------
//  Сцена целиком. Вход — сглаженный прогресс ленты p ∈ [0, T_END]; всё состояние
//  (детали, стойка, ряд, зал, площадка, глобус, свет, камера) — чистая функция от него.
// ---------------------------------------------------------------------------

const _m = new THREE.Matrix4()
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const FACING_Z = DC.PAIR_PITCH + DC.BACK_OFFSET
const log10 = (v) => Math.log10(Math.max(v, 1))
const SPACE_BG = new THREE.Color(0x020408)

export class World {
  constructor(container, { reducedMotion = false } = {}) {
    this.container = container
    this.reduced = reducedMotion
    this.pointer = { x: 0, y: 0 }
    this.target = 0
    this.p = 0
    this.override = null
    this.time = 0
    this.flow = 0
    this.fanAngle = 0
    this.tier = initialTier()
    // облегчённый режим (телефоны, программный рендер): простые материалы, один набор света, короче ряд
    this.lite = this.tier >= 2
    this.anchors = {}
    this.audio = null
    this.dragging = false
    this.dragTX = 0
    this.dragTY = 0
    this.dragX = 0
    this.dragY = 0

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NoToneMapping // ACES делает пост
    renderer.toneMappingExposure = 1.5
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.setClearColor(COLORS.bg, 1)
    renderer.info.autoReset = false
    renderer.domElement.classList.add('dcv-canvas')
    container.appendChild(renderer.domElement)
    this.renderer = renderer
    this.gpu = /debug/.test(location.search) ? new GpuTimer(renderer.getContext()) : null

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(COLORS.bg)
    scene.fog = new THREE.FogExp2(COLORS.bg, 0.0)
    this.scene = scene

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.03, 400)
    this.rig = new CameraRig(this.camera)

    scene.environment = createEnvironment(renderer)
    this.lights = createLights(scene)
    this.lightBase = {
      cyan: this.lights.cyan.position.clone(),
      magenta: this.lights.magenta.position.clone(),
      key: this.lights.key.position.clone(),
      fill: this.lights.fill.position.clone(),
    }

    const { mats, tex } = createMaterials({ lite: this.lite })
    this.mats = mats
    this.tex = tex

    // --- герой -----------------------------------------------------------
    this.heroRig = new THREE.Group()
    this.heroRig.name = 'heroRig'
    const hero = buildHeroServer(mats)
    this.hero = hero
    this.heroRig.add(hero.root)
    this.heroRig.add(hero.static)
    scene.add(this.heroRig)
    hero.parts.forEach((g) => (this.anchors[g.name] = g))
    // --- стойка героя ----------------------------------------------------
    const rack = buildHeroRack(mats)
    rack.root.position.set(0, FLOOR_Y, 0)
    scene.add(rack.root)
    this.rack = rack
    this.rackParts = [rack.posts, rack.panels, rack.sideL, rack.sideR, rack.rails, rack.pdu]
    this.anchors.rackTop = rack.panels
    this.anchors.pdu = rack.pdu

    // --- остальные узлы ряда героя и ряда напротив: один InstancedMesh ------
    const lite = buildLiteServer(mats)
    this.liteList = []
    for (let s = 0; s < RACK.SLOTS; s++) if (s !== RACK.HERO_SLOT) this.liteList.push({ i: 0, s, z: 0, rot: 0, order: 0 })
    this.heroRackCount = this.liteList.length
    const rest = []
    for (let i = ROW.FROM; i <= ROW.TO; i++) {
      if (i === 0) continue
      for (let s = 0; s < RACK.SLOTS; s++) rest.push({ i, s, z: 0, rot: 0, order: Math.abs(i) })
    }
    for (let i = FACING.FROM; i <= FACING.TO; i++) {
      for (let s = 0; s < RACK.SLOTS; s++) rest.push({ i, s, z: FACING_Z, rot: Math.PI, order: Math.abs(i) + 1.5 })
    }
    // по удалению от героя: на слабых устройствах дальние просто не рисуются (count)
    rest.sort((a, b) => Math.abs(a.i) - Math.abs(b.i))
    this.liteList.push(...rest)
    this.detailRange = this.lite ? 4 : ROW.TO
    this.liteCount = this.liteList.filter((e) => Math.abs(e.i) <= this.detailRange).length
    this.liteServers = new THREE.InstancedMesh(lite.geometry, lite.material, this.liteList.length)
    this.liteServers.frustumCulled = false
    scene.add(this.liteServers)

    // --- стойки ряда и ряда напротив (без стойки героя) -------------------
    this.rowList = []
    for (let i = ROW.FROM; i <= ROW.TO; i++) if (i !== 0) this.rowList.push({ i, z: 0, rot: 0, order: Math.abs(i) })
    for (let i = FACING.FROM; i <= FACING.TO; i++) this.rowList.push({ i, z: FACING_Z, rot: Math.PI, order: Math.abs(i) + 1.5 })
    this.rowList.sort((a, b) => Math.abs(a.i) - Math.abs(b.i))
    this.rowCount = this.rowList.filter((e) => Math.abs(e.i) <= this.detailRange).length
    const liteRack = buildLiteRack(mats, 'ledGreen')
    this.rowRacks = new THREE.InstancedMesh(liteRack.geometry, liteRack.material, this.rowList.length)
    this.rowRacks.frustumCulled = false
    this.rowRacks.visible = false
    this.liteServers.visible = false
    scene.add(this.rowRacks)


    // --- кампус ----------------------------------------------------------
    this.dc = buildDataCenter(mats, this.detailRange)
    scene.add(this.dc.mesh)

    // --- пол, задник, штрихи трафика ---------------------------------------
    this.floor = new ReflectiveFloor(renderer, 240, FLOOR_Y)
    scene.add(this.floor.mesh)
    this.backdrop = buildBackdrop()
    scene.add(this.backdrop)
    this.streaks = buildStreaks()
    scene.add(this.streaks.mesh)

    // --- площадка кампуса и глобус финала ----------------------------------------
    this.site = buildSite()
    scene.add(this.site.root)
    this.globe = buildGlobe()
    scene.add(this.globe.group)
    this.hallOn = true

    // --- пост, качество --------------------------------------------------
    this.post = createPost(renderer, scene, this.camera)
    // тени — один раз на сессию: переключение пересобирает все шейдеры (фриз)
    this.lights.sun.castShadow = !isMobile() && !detectSoftwareGL()
    this.governor = new QualityGovernor(this.tier, (t) => this.applyTier(t))

    // всё крупное — в слой отражения
    for (const o of [rack.root, this.liteServers, this.rowRacks, this.dc.mesh, this.streaks.mesh]) {
      o.traverse((m) => m.layers.enable(1))
    }

    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    container.addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect()
      this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
      this.pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1
      if (this.dragging) {
        this.dragTY = clamp(this.dragTY + (e.clientX - this.lastX) * 0.006, -0.75, 0.75)
        this.dragTX = clamp(this.dragTX + (e.clientY - this.lastY) * 0.003, -0.22, 0.22)
        this.lastX = e.clientX
        this.lastY = e.clientY
      }
    })
    container.addEventListener('pointerleave', () => {
      this.pointer.x = 0
      this.pointer.y = 0
      this.dragging = false
    })
    // орбита мышью на стадии узла (на тач-устройствах жест оставлен скроллу)
    container.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || !this.orbitOn) return
      this.dragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
    })
    this.onPointerUp = () => (this.dragging = false)
    window.addEventListener('pointerup', this.onPointerUp)

    this.update(0, 0.016)
    this.clock = new THREE.Clock()
    this.visible = true
    this.frames = 0
    this.ft = new Float32Array(120)
    this.ftN = 0
    this.onFrame = null
    this.loop = this.loop.bind(this)
    // прогрев — оптимизация: если он сорвался, сцена всё равно стартует (шейдеры соберутся по ходу)
    this.ready = this.warmup()
      .catch((e) => console.warn('[dcv-hero] warmup', e))
      .then(() => requestAnimationFrame(this.loop))
  }

  // Скомпилировать все шейдеры заранее (в т.ч. для скрытых пока объектов) и
  // замерить потолок частоты кадров браузера, пока ничего не рендерим.
  async warmup() {
    const dbg = /debug/.test(location.search) ? (n, t0) => console.log('[warm]', n, Math.round(performance.now() - t0), 'ms') : () => {}
    const tAll = performance.now()
    let tStage = tAll
    const hidden = [this.dc.mesh, this.streaks.mesh, this.liteServers, this.rowRacks, this.site.root, this.globe.group]
    hidden.forEach((o) => (o.visible = true))
    this.rackParts.forEach((g) => (g.visible = true))
    // Компилируем шейдеры по объектам, отдавая кадр между кусками: Safari не
    // умеет параллельную компиляцию, и один вызов на всю сцену замораживал
    // страницу на секунды. Прогресс уходит в лоадер.
    const nextFrame = () => new Promise((r) => requestAnimationFrame(r))
    const stages = this.lite ? ['lite'] : ['campus', 'row', 'hero']
    const chunks = this.scene.children.filter((o) => !o.isLight && o.visible)
    const total = stages.length * chunks.length
    let done = 0
    for (const stage of stages) {
      this.setLightStage(stage)
      for (const obj of chunks) {
        if (this.destroyed) return
        try {
          await this.renderer.compileAsync(obj, this.camera, this.scene)
        } catch (e) {
          this.renderer.compile(obj, this.camera, this.scene)
        }
        done++
        if (this.onWarm) this.onWarm(done / total)
        await nextFrame()
      }
    }
    dbg('compile stages', tStage)
    tStage = performance.now()
    this.post.warm()
    dbg('post.warm', tStage)
    tStage = performance.now()
    hidden.forEach((o) => (o.visible = false))
    this.governor.setRefresh(await measureRefresh())
    dbg('measureRefresh', tStage)
    dbg('warmup total', tAll)
    this.clock.start()
  }

  applyTier(t) {
    const T = TIERS[t]
    this.tier = t
    this.dpr = Math.min(window.devicePixelRatio || 1, T.dpr)
    this.renderer.setPixelRatio(this.dpr)
    this.floor.enabled = T.reflect > 0
    this.reflectScale = T.reflect
    this.post.setBloom(T.bloom)
    // [dc-valley.com] Всегда FXAA: SMAA компилируется ~12 с на встроенной графике,
    // а в движущейся сцене разницы почти не видно (на Retina оригинал и так брал FXAA).
    this.post.setAA('fxaa')
    this.streakFactor = T.streaks
    this.liteDirty = true
    this.resize()
  }

  resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.rig.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.post.setSize(w, h)
    if (this.reflectScale) this.floor.setSize(w * this.dpr, h * this.dpr, this.reflectScale)
    this.size = { w, h }
  }

  // p — прогресс скролла 0..1, растягивается на всю ленту
  setProgress(p) {
    this.target = clamp(p) * T_END
  }

  // Вся хореография — здесь. p — сглаженный прогресс ленты (0..T_END).
  update(p, dt) {
    const t = (this.time += dt)
    const { hero, mats } = this

    // зал под закрытой крышей не рисуем вовсе
    const hallOn = p < 1.14
    this.hallOn = hallOn
    this.heroRig.visible = hallOn

    // ---- детали героя: разлёт → сборка ----------------------------------
    for (const g of hero.parts) {
      const [a, b] = g.userData.order
      if (a === b) continue
      const e = easeOutCubic(inv(p, a, b))
      g.position.lerpVectors(g.userData.away, g.userData.home, e)
      g.position.y += Math.sin(e * Math.PI) * 0.012
      if (!this.reduced && e < 1) {
        const k = (1 - e) * 0.004
        g.position.y += Math.sin(t * 0.9 + g.userData.away.x * 9 + g.userData.away.z * 5) * k
      }
    }
    // контур-чертёж, вращение сборки, орбита мышью
    const lock = smooth(inv(p, 0.36, 0.48))
    hero.ghost.material.opacity = 0.4 * (1 - smooth(inv(p, 0.32, 0.44)))
    hero.ghost.visible = hero.ghost.material.opacity > 0.01
    const spin = this.reduced ? 0 : Math.sin(t * 0.13) * 0.11
    const dragW = smooth(inv(p, 0.36, 0.42)) * (1 - smooth(inv(p, 0.49, 0.52)))
    this.orbitOn = dragW > 0.5
    if (dragW < 0.01) {
      this.dragTX = 0
      this.dragTY = 0
    }
    this.dragY = damp(this.dragY, this.dragTY, 6, dt)
    this.dragX = damp(this.dragX, this.dragTX, 6, dt)
    this.heroRig.rotation.y = (spin + this.rig.sx * 0.12) * (1 - lock) + this.dragY * dragW
    this.heroRig.rotation.x = this.rig.sy * 0.04 * (1 - lock) + this.dragX * dragW
    this.heroRig.position.y = (this.reduced ? 0 : Math.sin(t * 0.5) * 0.006) * (1 - lock)
    this.container.classList.toggle('is-orbit', this.orbitOn)

    // ---- включение питания -----------------------------------------------
    const power = smooth(inv(p, 0.45, 0.49))
    const flowOn = smooth(inv(p, 0.345, 0.375))
    const flicker = power < 1 && power > 0 ? 0.85 + 0.15 * Math.sin(t * 70) : 1
    mats.heroCyan.emissiveIntensity = 2.2 * power * flicker
    mats.heroMagenta.emissiveIntensity = 1.6 * power * flicker
    mats.heroAmber.emissiveIntensity = 1.5 * power
    mats.heroWhite.emissiveIntensity = 1.3 * power
    mats.heroGreen.emissiveIntensity = 1.4 * power
    mats.logo.opacity = power
    mats.tubeUniforms.uFlowOn.value = flowOn
    this.flow += dt * 0.55 * flowOn
    mats.tubeUniforms.uFlow.value = this.flow
    const fanSpeed = (this.reduced ? 8 : 30) * power
    this.fanAngle += dt * fanSpeed
    for (const b of hero.fans) b.rotation.z = this.fanAngle

    // после сборки и рентгена узел рисуется одним мешем вместо ~200
    const staticOn = p > 0.52
    hero.root.visible = !staticOn
    hero.static.visible = staticOn
    this.rack.root.visible = hallOn

    // ---- стойка героя: растёт из пола -----------------------------------
    const r = this.rack
    const postE = easeOutCubic(inv(p, 0.51, 0.58))
    r.posts.scale.y = Math.max(postE, 0.001)
    r.posts.visible = postE > 0
    const railE = easeOutCubic(inv(p, 0.54, 0.6))
    r.rails.scale.y = Math.max(railE, 0.001)
    r.rails.visible = railE > 0
    const pduE = easeOutCubic(inv(p, 0.57, 0.63))
    r.pdu.scale.y = Math.max(pduE, 0.001)
    r.pdu.visible = pduE > 0
    const panE = easeOutBack(inv(p, 0.565, 0.63), 1.2)
    r.panels.scale.x = Math.max(panE, 0.001)
    r.panels.visible = inv(p, 0.565, 0.63) > 0
    const sideE = easeOutCubic(inv(p, 0.59, 0.655))
    r.sideL.position.x = -0.36 * (1 - sideE)
    r.sideR.position.x = 0.36 * (1 - sideE)
    r.sideL.visible = r.sideR.visible = sideE > 0

    // ---- узлы въезжают в стойку, ряд и ряд напротив поднимаются из пола ------
    const anyServers = p > 0.59 && hallOn
    this.liteServers.visible = anyServers
    this.rowRacks.visible = p > 0.69 && hallOn
    // до подъёма ряда рисуем только узлы стойки героя; после — ближние (count),
    // матрицы пересчитываем лишь пока что-то движется
    this.liteServers.count = p < 0.69 ? this.heroRackCount : this.liteCount
    this.rowRacks.count = this.rowCount
    if (anyServers && (p < 0.82 || this.liteDirty)) {
      this.liteDirty = false
      this.liteList.forEach(({ i, s, z, rot, order }, idx) => {
        if (idx >= this.liteCount) return
        const x = i * RACK.PITCH_X
        let y = FLOOR_Y + slotY(s)
        let zz = z
        let sc = 1
        if (i === 0 && z === 0) {
          // узлы встают в слоты от героя вверх и вниз: короткий въезд с фронта
          const d = Math.abs(s - RACK.HERO_SLOT)
          const e = inv(p, 0.595 + d * 0.008, 0.65 + d * 0.008)
          zz = 0.16 * (1 - easeOutCubic(e))
          sc *= e > 0 ? Math.min(1, easeOutBack(e, 1.1)) : 0.001
        } else {
          const e = easeOutCubic(inv(p, 0.7 + order * 0.003, 0.75 + order * 0.003))
          y -= (RACK.H + 0.15) * (1 - e)
        }
        _p.set(x, y, zz)
        _q.setFromAxisAngle(_up, rot)
        _s.set(Math.max(sc, 0.001), Math.max(sc, 0.001), Math.max(sc, 0.001))
        _m.compose(_p, _q, _s)
        this.liteServers.setMatrixAt(idx, _m)
      })
      this.liteServers.instanceMatrix.needsUpdate = true
      this.rowList.forEach(({ i, z, rot, order }, idx) => {
        if (idx >= this.rowCount) return
        const e = easeOutCubic(inv(p, 0.7 + order * 0.003, 0.75 + order * 0.003))
        _p.set(i * RACK.PITCH_X, FLOOR_Y - (RACK.H + 0.15) * (1 - e), z)
        _q.setFromAxisAngle(_up, rot)
        _m.compose(_p, _q, _s.set(1, 1, 1))
        this.rowRacks.setMatrixAt(idx, _m)
      })
      this.rowRacks.instanceMatrix.needsUpdate = true
    }

    // ---- зал: появление волной ---------------------------------------------------
    const dcVis = p > 0.68 && hallOn
    this.dc.mesh.visible = dcVis
    this.dc.uniforms.uReveal.value = smooth(inv(p, 0.69, 0.96)) * 1.08
    this.dc.uniforms.uPower.value = 2.0 // питание включено везде
    // дымка: густая в зале, редкая над площадкой, в космосе нет
    const fogSite = lerp(0.011, 0.00022, smooth(inv(p, 1.0, 1.1))) * (1 - smooth(inv(p, 1.16, 1.24)))
    this.scene.fog.density = p <= 1 ? lerp(0, 0.011, smooth(inv(p, 0.76, 0.96))) : fogSite

    // ---- пол ------------------------------------------------------------
    this.floor.uniforms.uStrength.value = 0.65 * (1 - smooth(inv(p, 0.78, 0.9)))
    this.floor.uniforms.uAisle.value = smooth(inv(p, 0.8, 0.94))
    this.floor.uniforms.uFade.value = lerp(0.35, 0.03, smooth(inv(p, 0.64, 0.92)))
    this.floor.mesh.visible = hallOn
    // когда вокруг зала встаёт корпус, пол обрезается по его контуру
    const clip = this.floor.uniforms.uClip.value
    if (p > 0.99) clip.set(-SITE.BW / 2, SITE.BW / 2, HALL_Z - SITE.BD / 2, HALL_Z + SITE.BD / 2)
    else clip.set(-1e5, 1e5, -1e5, 1e5)
    this.backdrop.visible = p < 1.02

    // ---- штрихи трафика -----------------------------------------------------
    const streakA = 0.6 * smooth(inv(p, 0.82, 0.95)) * (this.streakFactor ?? 1)
    this.streaks.mesh.visible = streakA > 0.01 && hallOn
    this.streaks.uniforms.uOpacity.value = streakA
    this.streaks.uniforms.uTime.value = t

    // ---- свет: источники живут только на своих стадиях -----------------------
    this.setLightStage(p < 0.5 ? 'hero' : p < 0.95 ? 'row' : 'campus')
    const k = 1 + 3.2 * smooth(inv(p, 0.5, 0.82))
    const dcFade = 1 - 0.85 * smooth(inv(p, 0.82, 0.96))
    const km = 1 + 1.8 * (k - 1)
    const L = this.lights
    L.cyan.position.copy(this.lightBase.cyan).multiplyScalar(k)
    L.magenta.position.copy(this.lightBase.magenta).multiplyScalar(k)
    L.fill.position.copy(this.lightBase.fill).multiplyScalar(k)
    L.key.position.copy(this.lightBase.key).multiplyScalar(km)
    L.key.lookAt(0, 0, 0)
    L.cyan.intensity = 1.1 * k * k * dcFade
    L.magenta.intensity = 0.35 * k * k * dcFade
    L.key.intensity = 4.5 * dcFade
    L.key.width = 1.6 * k
    L.key.height = 1.2 * k
    L.fill.intensity = 1.5 * k * k * dcFade
    // свет коридора: над фронтом стойки, растёт вширь вместе с рядом
    const ra = smooth(inv(p, 0.5, 0.62)) * (1 - smooth(inv(p, 0.86, 0.95)))
    const rw = smooth(inv(p, 0.62, 0.8))
    L.aisle.intensity = 9 * ra
    L.aisle.width = lerp(2, 9, rw)
    L.aisle.height = lerp(1, 1.6, rw)
    L.aisle.position.set(lerp(0.4, 1.4, rw), lerp(1.8, 2.8, rw), lerp(2.6, 4.2, rw))
    L.aisle.lookAt(lerp(0, 0.4, rw), -0.3, 0)
    L.hemi.intensity = lerp(1.5, 1.8, smooth(inv(p, 0.5, 0.8)))
    L.moon.intensity = lerp(0.5, 1.3, smooth(inv(p, 0.5, 0.9)))
    this.renderer.shadowMap.needsUpdate = p < 0.6

    // ---- камера -----------------------------------------------------------
    const parallax = this.reduced ? 0 : lerp(1, 0.25, smooth(inv(p, 0.84, 1)))
    const camDist = this.rig.update(p, dt, this.pointer, parallax)

    // ---- площадка и глобус: всё завязано на высоту камеры --------------------
    this.updateOrbit(p, t, camDist, fogSite)

    // ---- звук ---------------------------------------------------------------
    const away = 1 - smooth(inv(p, 1.0, 1.15))
    if (this.audio) this.audio.update(power * away, flowOn * away, 1 + 2 * smooth(inv(p, 0.6, 0.8)) * dcFade)
  }

  // Площадка → орбита. Переходы идут по логарифму высоты камеры: так они
  // занимают равные доли жеста и на сотнях метров, и на тысячах километров.
  updateOrbit(p, t, camDist, fog) {
    const { site, globe } = this
    site.update(p, t)
    const alt = this.camera.position.distanceTo(EARTH_CENTER) - EARTH_R
    const la = log10(alt)
    const g = site.ground.uniforms
    g.uFog.value = fog
    g.uToLand.value = smooth(inv(la, log10(1.1e3), log10(11e3)))
    // корпуса синеют чуть позже земли и уходят в заливку полностью до того, как площадка скрывается
    site.fade.value = smooth(inv(la, log10(1.1e3), log10(6.5e3)))
    g.uAlpha.value = 1 - smooth(inv(la, log10(9e3), log10(26e3)))
    if (g.uAlpha.value < 0.001) site.root.visible = false

    const mapOn = p > 1.165
    globe.group.visible = mapOn
    const space = smooth(inv(la, log10(150e3), log10(2500e3)))
    this.scene.background.set(COLORS.bg).lerp(SPACE_BG, space)
    if (!mapOn) return
    // шар проявляется под ещё непрозрачной землёй — к её растворению он уже целиком
    globe.uniforms.uMap.value = smooth(inv(la, log10(1.2e3), log10(5e3)))
    globe.uniforms.uTime.value = t
    globe.stars.uniforms.uOpacity.value = space
    globe.stars.uniforms.uPixelRatio.value = this.dpr || 1
    globe.dotUniforms.uPixelRatio.value = this.dpr || 1
    // точка хаба подхватывает площадку, пока та растворяется, — без пустого кадра
    globe.dotUniforms.uHub.value = smooth(inv(la, log10(2.5e3), log10(8e3)))
    // трассы прорисовываются от хаба, когда камера почти на месте
    const reach = (globe.maxReach + 600) * smooth(inv(p, 1.29, 1.45))
    globe.setReach(reach, 1)
    this.reach = reach
    globe.routeUniforms.uOpacity.value = smooth(inv(p, 1.27, 1.3))
    // толщина трассы ~2.5 px при любой высоте
    globe.routeUniforms.uRadius.value = camDist * 0.0012
  }

  // Каждый источник — это код в шейдере всех материалов; лишние выключаем.
  // Смена набора меняет программу, поэтому все три набора компилируются в warmup.
  setLightStage(stage) {
    if (this.lite) stage = 'lite'
    if (this.lightStage === stage) return
    this.lightStage = stage
    const L = this.lights
    if (stage === 'lite') {
      // телефон: ключ, свет коридора и заполняющий всегда; контровых точечных нет
      L.key.visible = L.aisle.visible = L.fill.visible = true
      L.cyan.visible = L.magenta.visible = false
      return
    }
    const hero = stage === 'hero'
    const row = stage === 'row'
    L.key.visible = hero || row
    L.aisle.visible = row
    L.cyan.visible = hero || row
    L.magenta.visible = hero || row
    L.fill.visible = hero || row
  }

  loop() {
    if (this.destroyed) return
    requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    if (!this.visible) return
    this.renderer.info.reset()
    this.ft[this.ftN++ % this.ft.length] = dt
    const target = this.override ?? this.target
    this.p = this.override != null ? target : damp(this.p, target, 7, dt)
    const t0 = performance.now()
    if (this.gpu) this.gpu.begin()
    this.update(this.p, dt)
    if (this.raw) this.renderer.render(this.scene, this.camera)
    else this.post.render(dt)
    this.cpuMs = performance.now() - t0
    if (this.gpu) this.gpu.end()
    this.governor.tick(dt)
    this.frames++
    if (this.frames <= 5 && /debug/.test(location.search)) console.log('[frame]', this.frames, Math.round(performance.now() - t0), 'ms', 'dpr', this.dpr, 'tier', this.tier)
    if (this.onFrame) this.onFrame(this.p, dt)
  }

  // [dc-valley.com] Добавлено при встраивании: страница живёт в SPA и пересоздаётся
  // (смена языка), поэтому сцену нужно уметь остановить — цикл, обработчики —
  // и сразу отпустить WebGL-контекст (на iOS их считаные штуки).
  destroy() {
    this.destroyed = true
    this.onFrame = null
    this.ro.disconnect()
    window.removeEventListener('pointerup', this.onPointerUp)
    this.post.composer.dispose()
    this.floor.rt.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }

  // Мировая точка объекта → координаты внутри панели (px)
  project(obj, out, offset) {
    if (offset) _p.copy(offset)
    else _p.set(0, 0, 0)
    obj.localToWorld(_p)
    _p.project(this.camera)
    out.x = (_p.x * 0.5 + 0.5) * this.size.w
    out.y = (-_p.y * 0.5 + 0.5) * this.size.h
    out.behind = _p.z > 1
    return out
  }

  // медианный fps по последним кадрам — устойчив к одиночным фризам
  fps() {
    const n = Math.min(this.ftN, this.ft.length)
    if (!n) return 0
    const a = Array.from(this.ft.subarray(0, n)).sort((x, y) => x - y)
    return 1 / a[n >> 1]
  }

  stats() {
    const i = this.renderer.info
    return { calls: i.render.calls, tris: i.render.triangles, tier: this.tier, dpr: this.dpr, fps: Math.round(this.fps()), cpuMs: +(this.cpuMs || 0).toFixed(1), gpuMs: this.gpu ? +this.gpu.median().toFixed(1) : null }
  }
}
