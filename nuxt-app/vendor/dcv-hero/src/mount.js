// ---------------------------------------------------------------------------
//  [dc-valley.com] Обвязка сцены для страницы /v2 — вместо src/main.js оригинала.
//
//  Отличия от main.js:
//   - прогресс ленты приходит снаружи (setProgress 0..1): пин и скролл считает
//     страница (CSS sticky в components/V2Hero3d.vue), GSAP/ScrollTrigger не нужен;
//   - нет звука, дип-линка ?p= и глобального window.__dcv;
//   - есть destroy(): страница живёт в SPA и пересоздаётся при смене языка.
// ---------------------------------------------------------------------------
import { World } from './scene/world.js'
import { Labels } from './scene/labels.js'
import { MapLabels } from './scene/maplabels.js'
import { STAGES, T_END } from './config.js'

// visual — панель .dcv-visual с разметкой HUD (data-stage-*), линией прогресса
// (data-progress) и лоадером (.dcv-loader). Возвращает null, если сцену создать не удалось.
export function mountHero(visual, { onReady, onLost } = {}) {
  const stageIndex = visual.querySelector('[data-stage-index]')
  const stageLabel = visual.querySelector('[data-stage-label]')
  const stageTitle = visual.querySelector('[data-stage-title]')
  const fill = visual.querySelector('[data-progress]')
  const loader = visual.querySelector('.dcv-loader')
  const loaderText = loader && loader.querySelector('span')

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let world
  try {
    world = new World(visual, { reducedMotion })
  }
  catch (e) {
    // контекст не создался (чёрный список GPU, лимит контекстов)
    console.warn('[dcv-hero]', e)
    visual.querySelectorAll('.dcv-canvas').forEach(c => c.remove())
    return null
  }

  world.onWarm = (f) => {
    if (loaderText) loaderText.textContent = `Loading model ${Math.round(f * 100)}%`
  }
  const labels = new Labels(visual, world)
  const mapLabels = new MapLabels(visual, world)

  let current = null
  world.onFrame = (p) => {
    labels.update(p)
    mapLabels.update(p)
    if (fill) fill.style.transform = `scaleX(${(p / T_END).toFixed(4)})`
    let st = STAGES[0]
    for (const s of STAGES) if (p >= s.at) st = s
    if (st !== current) {
      current = st
      if (stageIndex) stageIndex.textContent = String(STAGES.indexOf(st) + 1).padStart(2, '0')
      if (stageLabel) stageLabel.textContent = st.label
      if (stageTitle) {
        stageTitle.textContent = st.title
        stageTitle.classList.remove('is-swap')
        void stageTitle.offsetWidth
        stageTitle.classList.add('is-swap')
      }
    }
    if (world.frames === 3) {
      if (loader) loader.classList.add('is-done')
      if (onReady) onReady()
    }
  }

  // Контекст может отвалиться (слабая видеокарта, спящий ноутбук): вместо белого
  // поля показываем заставку — за это отвечает onLost на стороне страницы.
  const canvas = world.renderer.domElement
  const onContextLost = (e) => {
    e.preventDefault()
    console.warn('[dcv-hero] WebGL context lost')
    world.destroyed = true
    if (onLost) onLost()
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  // рендерим только пока панель рядом с экраном
  const io = new IntersectionObserver(
    (entries) => {
      world.visible = entries[entries.length - 1].isIntersecting
    },
    { rootMargin: '200px' },
  )
  io.observe(visual)

  return {
    setProgress: p => world.setProgress(p),
    destroy() {
      io.disconnect()
      canvas.removeEventListener('webglcontextlost', onContextLost)
      labels.svg.remove()
      labels.layer.remove()
      mapLabels.layer.remove()
      world.destroy()
    },
  }
}
