<script setup lang="ts">
// 3D-сцена секции 02 страницы v2 вместо фото платы: узел собирается → стойка → ряд →
// зал → кампус → глобус (vendor/dcv-hero, three.js). Фото из слота — заставка,
// пока сцена грузится, и запасной вариант без WebGL2.
//
// Лента привязана к прокрутке, как в оригинале (780% высоты экрана). Секция
// [data-dcv-sticky] лежит в «треке» [data-dcv-track] с распоркой после неё и залипает
// (position: sticky); прогресс сцены — доля пройденной распорки. Пин на CSS, а не
// ScrollTrigger: высота страницы известна уже при SSR и не прыгает, когда сцена догрузится.
//
// Код сцены (~700 КБ) загружается, только когда секция подходит к экрану. Прогресса
// загрузки не показываем: до готовности видно фото, потом сцена проявляется поверх него.
import '~/vendor/dcv-hero/src/styles.css'

interface Hero {
  setProgress: (p: number) => void
  destroy: () => void
}

const root = ref<HTMLElement | null>(null)
const visual = ref<HTMLElement | null>(null)
const ready = ref(false)

let hero: Hero | null = null
let track: HTMLElement | null = null
let sticky: HTMLElement | null = null
let stickyTop = 0
let loadObserver: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let unmounted = false

// three.js работает только на WebGL2
function hasWebGL2(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  }
  catch {
    return false
  }
}

// Секция залипает так, чтобы панель сцены целиком была на экране:
// на десктопе — сразу под шапкой, на телефоне — низом панели к низу экрана.
function measure() {
  if (!root.value || !sticky) return
  const header = Number.parseFloat(getComputedStyle(sticky).getPropertyValue('--v2-header-h')) || 0
  const panelBottom = root.value.getBoundingClientRect().bottom - sticky.getBoundingClientRect().top
  stickyTop = Math.round(Math.min(header, window.innerHeight - panelBottom))
  sticky.style.top = `${stickyTop}px`
  update()
}

function update() {
  if (!hero || !track || !sticky) return
  const distance = track.offsetHeight - sticky.offsetHeight
  if (distance <= 0) return
  const progress = (stickyTop - track.getBoundingClientRect().top) / distance
  hero.setProgress(Math.min(1, Math.max(0, progress)))
}

// Сцены не будет — убираем распорку, чтобы фото не «стояло» восемь экранов.
function collapse() {
  if (!track) return
  const bottomBefore = track.getBoundingClientRect().bottom
  track.classList.add('is-static')
  if (sticky) sticky.style.top = ''
  const shift = bottomBefore - track.getBoundingClientRect().bottom
  if (bottomBefore < 0 && shift > 0) window.scrollBy(0, -shift)
}

async function load() {
  const { mountHero } = await import('~/vendor/dcv-hero/src/mount.js')
  if (unmounted || !visual.value) return
  hero = mountHero(visual.value, {
    onReady: () => (ready.value = true),
    // контекст отвалился — возвращаем заставку вместо мёртвого канваса
    onLost: () => {
      ready.value = false
      hero = null
    },
  }) as Hero | null
  if (!hero) {
    collapse()
    return
  }
  update()
}

onMounted(() => {
  track = root.value?.closest<HTMLElement>('[data-dcv-track]') ?? null
  sticky = root.value?.closest<HTMLElement>('[data-dcv-sticky]') ?? null
  if (!track || !sticky) return
  if (!hasWebGL2()) {
    collapse()
    return
  }

  measure()
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(sticky)
  window.addEventListener('resize', measure)
  window.addEventListener('scroll', update, { passive: true })

  // Сцена готова к показу не сразу: код + компиляция шейдеров занимают несколько секунд.
  // Поэтому начинаем заранее — но не за два экрана: секция идёт второй, и при таком запасе
  // бандл сцены (~1 МБ) грузился уже на первом экране, отнимая сеть у промо-блока.
  // Один экран запаса: к моменту, когда секция доходит до экрана, сцена обычно готова,
  // а пока не готова — виден постер.
  const start = () => {
    loadObserver = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return
      loadObserver?.disconnect()
      load().catch((err) => {
        console.warn('[dcv-hero] load failed', err)
        collapse()
      })
    }, { rootMargin: '100% 0px' })
    loadObserver.observe(track!)
  }

  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
})

onBeforeUnmount(() => {
  unmounted = true
  loadObserver?.disconnect()
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measure)
  window.removeEventListener('scroll', update)
  hero?.destroy()
  hero = null
  if (sticky) sticky.style.top = ''
})
</script>

<template>
  <div ref="root" class="dcv-hero v2-hero3d" :class="{ 'is-ready': ready }">
    <div ref="visual" class="dcv-visual">
      <div class="v2-hero3d__poster">
        <slot />
      </div>
      <div class="v2-hero3d__vignette" aria-hidden="true" />

      <div class="dcv-hud">
        <div class="dcv-hud__label"><b data-stage-index>01</b><span data-stage-label>Components</span></div>
        <div class="dcv-hud__title" data-stage-title>Every part engineered for density</div>
      </div>
      <!-- Лоадера нет: пока сцена грузится, видно фото, потом оно уступает место сцене. -->
      <div class="dcv-rail"><div class="dcv-rail__fill" data-progress /></div>
    </div>
  </div>
</template>

<style scoped>
/* Панель сцены встроена в тёмную секцию: без рамки и скругления, шрифты страницы. */
/* Панель занимает ровно тот блок, в который вставлена (figure с position: relative):
   на десктопе это колонка сетки, на телефоне — блок фиксированной высоты. Собственная
   высота .dcv-visual из стилей сцены здесь не нужна. */
.v2-hero3d {
    --dcv-bg: var(--v2-dark);
    --dcv-panel: var(--v2-dark);
    --dcv-sans: var(--v2-font-text);
    --dcv-display: var(--v2-font-display);
    --dcv-mono: var(--v2-mono);
    position: absolute;
    inset: 0;
    overflow: visible;
    background: transparent;
}

.v2-hero3d .dcv-visual {
    height: 100%;
    border: 0;
    border-radius: 0;
    background: var(--v2-dark);
}

.v2-hero3d__poster {
    position: absolute;
    inset: 0;
    z-index: 0;
    transition: opacity 0.6s ease;
}

.v2-hero3d__poster :deep(picture) {
    height: 100%;
}

.v2-hero3d__poster :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 75% 50%;
}

.v2-hero3d.is-ready .v2-hero3d__poster {
    opacity: 0;
}

/* Края панели растворяются в фоне секции — над канвасом, но под подписями и HUD. */
.v2-hero3d__vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
        linear-gradient(to right, var(--v2-dark), rgba(12, 12, 12, 0) 18%),
        linear-gradient(to left, var(--v2-dark), rgba(12, 12, 12, 0) 6%),
        linear-gradient(to bottom, var(--v2-dark), rgba(12, 12, 12, 0) 8%),
        linear-gradient(to top, var(--v2-dark), rgba(12, 12, 12, 0) 8%);
}

/* Десктоп: заголовок секции наезжает на левую часть панели и на невысоких экранах
   доходит почти до её низа — подпись стадии прижимаем к низу справа, чтобы не налезала. */
@media (min-width: 900px) {
    .v2-hero3d .dcv-hud {
        left: auto;
        right: 4.5%;
        bottom: 22px;
        max-width: 42%;
        text-align: right;
    }

    .v2-hero3d .dcv-hud__label {
        justify-content: flex-end;
    }
}

.v2-hero3d .dcv-hud,
.v2-hero3d .dcv-rail {
    transition: opacity 0.6s ease;
}

.v2-hero3d:not(.is-ready) .dcv-hud,
.v2-hero3d:not(.is-ready) .dcv-rail {
    opacity: 0;
}
</style>
