// ---------------------------------------------------------------------------
//  Адаптивное качество по фактическому времени кадра.
//
//  Главная ловушка: браузер может сам ограничить частоту кадров (Chrome в
//  энергосбережении на батарее — 30 fps, монитор 30 Гц, фоновая вкладка).
//  Тогда «30 fps» — не тормоза, и понижать качество бессмысленно: картинка
//  станет мыльной, а быстрее не будет. Поэтому:
//   1) до первого рендера меряем интервал пустого requestAnimationFrame —
//      это потолок; понижаемся только когда кадры реально пропускаются
//      относительно него;
//   2) каждое понижение обязано дать прирост; если не дало — откат и
//      блокировка на время (значит, упёрлись во внешний потолок);
//   3) ступени крутят только dpr / отражение / блум — ничего, что
//      пересобирает шейдеры (тени фиксируются один раз на старте).
// ---------------------------------------------------------------------------

// [dc-valley.com] Верхняя ступень — dpr 1.5, а не 2: на встроенной графике (Intel UHD)
// при dpr 2 буфер панели ~1844x1640 и WebGL-контекст падал (белое поле вместо сцены).
export const TIERS = [
  { dpr: 1.5, reflect: 0.5, bloom: 0.45, streaks: 1 },
  { dpr: 1.5, reflect: 0.35, bloom: 0.45, streaks: 1 },
  { dpr: 1.5, reflect: 0, bloom: 0.4, streaks: 0.6 },
  { dpr: 1.0, reflect: 0, bloom: 0, streaks: 0.35 },
]

// Проба делается один раз: вызывают её трижды, а каждый вызов — отдельный WebGL-контекст
// (на iOS их считаные штуки). Контекст пробы сразу отпускаем.
let softwareGL = null
export function detectSoftwareGL() {
  if (softwareGL != null) return softwareGL
  softwareGL = false
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return false
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : ''
    softwareGL = /swiftshader|llvmpipe|software|basic render/i.test(r)
    const lose = gl.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext()
  } catch (e) {
    softwareGL = false
  }
  return softwareGL
}

export const isMobile = () => /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 720

export function forcedTier() {
  const m = typeof location !== 'undefined' && location.search.match(/[?&]tier=([0-3])/)
  return m ? parseInt(m[1], 10) : null
}

export function initialTier() {
  const f = forcedTier()
  if (f != null) return f
  if (detectSoftwareGL()) return 3
  return isMobile() ? 2 : 0
}

// Интервал пустого rAF (мс) — потолок частоты кадров браузера
export function measureRefresh(frames = 24) {
  return new Promise((resolve) => {
    const t = []
    const step = () => {
      t.push(performance.now())
      if (t.length < frames) requestAnimationFrame(step)
      else {
        // медиана интервалов: первые кадры после загрузки бывают рваными
        const d = []
        for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1])
        d.sort((a, b) => a - b)
        resolve(Math.max(4, d[d.length >> 1]))
      }
    }
    requestAnimationFrame(step)
  })
}

const MAX_PAUSE = 3600000

const median = (arr) => {
  const a = Array.from(arr).sort((x, y) => x - y)
  return a[a.length >> 1]
}

export class QualityGovernor {
  constructor(tier, onChange) {
    this.tier = tier
    this.onChange = onChange
    this.refreshMs = 1000 / 60 // уточняется через setRefresh()
    this.floor = isMobile() || detectSoftwareGL() ? TIERS.length - 1 : 1 // ниже на десктопе не опускаемся
    this.samples = []
    this.started = performance.now()
    this.lastChange = this.started
    this.lockedUntil = 0
    // Паузы растут вдвое с каждым провалом. С постоянными паузами GPU «между ступенями»
    // (ступень 1 держит 60 fps, ступень 0 — только 30) качался туда-сюда каждые 15 секунд:
    // треть времени в просадке и пересоздание буферов на каждом переключении.
    this.upgradeAfter = 0 // раньше этого момента не повышаемся
    this.upgradeBackoff = 60000
    this.rollbackLock = 45000
    this.locked = forcedTier() != null || tier === TIERS.length - 1
    this.pending = null // { from, before } — проверка, что понижение помогло
    this.log = /debug/.test(location.search) ? (...a) => console.log('[quality]', ...a) : () => {}
    onChange(tier)
  }

  setRefresh(ms) {
    this.refreshMs = ms
    this.log('потолок частоты кадров', (1000 / ms).toFixed(0), 'fps')
  }

  apply(t, reason) {
    const next = Math.max(0, Math.min(TIERS.length - 1, t))
    if (next === this.tier) return
    this.log('ступень', this.tier, '→', next, reason)
    this.tier = next
    this.lastChange = performance.now()
    this.samples.length = 0
    this.onChange(next)
  }

  tick(dt) {
    if (this.locked) return
    const now = performance.now()
    if (now - this.started < 4000) return // прогрев: компиляция шейдеров, первый кадр пост-обработки
    if (typeof document !== 'undefined' && document.hidden) return
    this.samples.push(dt * 1000)
    if (this.samples.length < 90) return
    const frameMs = median(this.samples)
    this.samples.length = 0
    const ratio = frameMs / this.refreshMs // 1 — идём в потолок, 2 — пропускаем каждый второй кадр

    // Проверка результата предыдущего понижения
    if (this.pending) {
      const gained = this.pending.before / frameMs
      if (gained < 1.15) {
        // Быстрее не стало — упёрлись не в пиксели. Откат и пауза.
        this.log('понижение не помогло (', this.pending.before.toFixed(1), '→', frameMs.toFixed(1), 'мс) — откат, внешний потолок')
        const from = this.pending.from
        this.pending = null
        this.lockedUntil = now + this.rollbackLock
        this.rollbackLock = Math.min(this.rollbackLock * 2, MAX_PAUSE)
        this.apply(from, 'откат')
        return
      }
      this.pending = null
    }

    if (now < this.lockedUntil) return
    const sinceChange = now - this.lastChange

    if (ratio > 1.7 && sinceChange > 3000 && this.tier < this.floor) {
      this.pending = { from: this.tier, before: frameMs }
      // эта ступень не тянет: обратно пробуем не сразу (нагрузка зависит от стадии — позже может и потянуть)
      this.upgradeAfter = now + this.upgradeBackoff
      this.upgradeBackoff = Math.min(this.upgradeBackoff * 2, MAX_PAUSE)
      this.apply(this.tier + 1, `кадр ${frameMs.toFixed(1)} мс при потолке ${this.refreshMs.toFixed(1)}`)
    } else if (ratio < 1.15 && sinceChange > 10000 && this.tier > 0 && now >= this.upgradeAfter) {
      this.apply(this.tier - 1, 'запас есть')
    }
  }
}
