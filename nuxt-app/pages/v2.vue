<script setup lang="ts">
import { h, type FunctionalComponent } from 'vue'

// V2 — новая главная, черновик на согласование (макет "DCV / Final for approval / Desktop").
// Живёт отдельной страницей /v2, боевая главная (pages/index.vue) не тронута.
//
// Тексты — в отдельных файлах i18n/locales/v2/{en,kk,ru}.json (ключи v2.*),
// подключены в nuxt.config.ts рядом с основными. Переносы строк в переводах — "\n"
// (см. Lines ниже). Название бренда (Data Center Valley) не переводится.
//
// Картинки: /public/asset/v2/*. Подписи-плашки (ENERGY INFRASTRUCTURE, PHASE ONE / 191.8 HA,
// PLAY THE FILM) вшиты в сами изображения, поэтому оверлеев в разметке нет —
// если плашки понадобится сделать живыми, их нужно будет убрать из картинок.

definePageMeta({
  layout: false
})

const { t, locales, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

// Строка перевода с "\n" -> текст с <br> (без v-html).
const Lines: FunctionalComponent<{ text: string }> = props =>
  props.text.split('\n').flatMap((line, i) => (i ? [h('br'), line] : [line]))
Lines.props = ['text']

useHead(() => ({
  title: t('v2.meta.title'),
  htmlAttrs: { lang: locale.value },
  // Черновик: открывается только по прямой ссылке. Ссылок на /v2 с сайта нет,
  // а noindex не даёт поисковикам проиндексировать её, если ссылка утечёт.
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  link: [
    { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: 'anonymous', href: '/asset/fonts/v2/roboto-condensed-latin.woff2' },
    { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: 'anonymous', href: '/asset/fonts/v2/space-grotesk-latin.woff2' }
  ],
  bodyAttrs: { class: 'v2-body' },
  // Класс v2-js ставится до первой отрисовки: без него .v2-reveal не прячутся,
  // и без JS (или у поисковика) весь текст виден сразу.
  script: [{ key: 'v2-js', innerHTML: "document.documentElement.classList.add('v2-js')" }]
}))

const num = (i: number) => String(i + 1).padStart(2, '0')

const stats = computed(() => (['land', 'phase', 'energy'] as const).map(id => ({
  label: t(`v2.hero.stats.${id}.label`),
  rows: [1, 2].map(n => ({
    value: t(`v2.hero.stats.${id}.value${n}`),
    note: t(`v2.hero.stats.${id}.note${n}`)
  }))
})))

const energySteps = computed(() => (['connect', 'build', 'expand'] as const).map(id => ({
  title: t(`v2.energy.steps.${id}.title`),
  text: t(`v2.energy.steps.${id}.text`)
})))

const engineeredMeta = computed(() => (['density', 'cooling', 'modular'] as const)
  .map((id, i) => `${num(i)} — ${t(`v2.engineered.meta.${id}`)}`))

const placeFacts = computed(() => (['phase', 'expansion', 'energy'] as const).map((id, i) => ({
  label: `${num(i)} / ${t(`v2.place.facts.${id}.label`)}`,
  lines: [t(`v2.place.facts.${id}.line1`), t(`v2.place.facts.${id}.line2`)]
})))

// 7 опор проекта: в макете 01–04 в левой колонке, 05–07 в правой.
// more — раскрывающееся описание (наведение / тап). В макете его нет:
// ЧЕРНОВИК, собран только из фактов этой же страницы — заменить на утверждённый текст.
const foundationIds = ['power', 'scale', 'location', 'connectivity', 'flexibility', 'partnership', 'horizon'] as const

const foundations = computed(() => foundationIds.map((id, i) => ({
  num: num(i),
  title: t(`v2.foundations.items.${id}.title`),
  text: t(`v2.foundations.items.${id}.text`),
  more: t(`v2.foundations.items.${id}.more`)
})))

// Раскрытие описаний. На устройствах с мышью — по наведению (чистый CSS :hover),
// по клику/тапу/Enter — закрепить или закрыть, как в FAQ: открыт один пункт.
// Состояние — в атрибуте data-open, а не в :class: у пунктов есть класс появления
// is-in, который Vue стёр бы при перерисовке класса.
const openFoundation = ref<string | null>(null)

function toggleFoundation(num: string) {
  openFoundation.value = openFoundation.value === num ? null : num
}

// Навели/тапнули на другой пункт — закреплённый ранее закрываем.
function onFoundationEnter(num: string) {
  if (openFoundation.value && openFoundation.value !== num) openFoundation.value = null
}

const foundationsLeft = computed(() => foundations.value.slice(0, 4))
const foundationsRight = computed(() => foundations.value.slice(4))

// Портреты и биографии заказчик добавит позже — пока карточки-заглушки D / C / V.
// role — ключ в v2.people.roles.
const basePeople = [
  { n: '01', letter: 'D', role: 'leadership' },
  { n: '02', letter: 'C', role: 'engineering' },
  { n: '03', letter: 'V', role: 'partnerships' }
]

// TEST: временные карточки, чтобы проверить слайдер (при трёх на десктопе он стоит).
// Удалить, когда появятся реальные профили (и их роли в v2/*.json).
const testPeople = [
  { n: '04', letter: 'D', role: 'energy' },
  { n: '05', letter: 'C', role: 'finance' },
  { n: '06', letter: 'V', role: 'legal' }
]

const people = [...basePeople, ...testPeople]

const services = computed(() => (['colocation', 'buildToSuit', 'greenfield', 'partnerships'] as const)
  .map(id => t(`v2.next.services.${id}`)))

const contactMail = 'mailto:commercial@dc-valley.com'

// Слайдер команды — нативный горизонтальный скролл со scroll-snap, без стрелок:
// листается свайпом, колесом/тачпадом, клавиатурой (фокус на ленте) и перетаскиванием мышью.
//
// Зацикливание: если карточки не помещаются, на клиенте лента рендерится трижды —
// [копии][оригиналы][копии] — и стоит на оригиналах. Когда прокрутка останавливается
// в одной из копий, лента мгновенно переставляется на ту же карточку в оригиналах
// (на глаз незаметно). Копии aria-hidden; при SSR их нет — только оригиналы.
// Если все карточки помещаются (напр. 3 на десктопе), лента просто стоит.
const peopleTrack = ref<HTMLElement | null>(null)
const peopleLoop = ref(false)
const peopleDragging = ref(false)
let drag: { x: number; left: number } | null = null
let peopleObserver: ResizeObserver | null = null
let settleTimer: ReturnType<typeof setTimeout> | undefined

const peopleSlides = computed(() => {
  const cards = people.map(p => ({
    ...p,
    tag: t('v2.people.tag', { n: p.n }),
    role: t(`v2.people.roles.${p.role}`)
  }))
  const originals = cards.map(p => ({ ...p, key: p.n, clone: false }))
  if (!peopleLoop.value) return originals
  const copies = (prefix: string) => cards.map(p => ({ ...p, key: `${prefix}:${p.n}`, clone: true }))
  return [...copies('before'), ...originals, ...copies('after')]
})

// step — шаг карточки (ширина + зазор), set — ширина одного полного набора.
// Меряем дробно (getBoundingClientRect): offsetLeft округляет до целых, и на
// ширине набора ошибка копится — лента переносилась бы не на ту карточку.
function peopleMetrics() {
  const el = peopleTrack.value
  if (!el || el.children.length < 2) return null
  const r0 = el.children[0].getBoundingClientRect()
  const r1 = el.children[1].getBoundingClientRect()
  const step = r1.left - r0.left
  return { el, step, set: step * people.length, gap: step - r0.width }
}

function jumpPeople(left: number) {
  peopleTrack.value?.scrollTo({ left, behavior: 'instant' })
}

async function syncPeopleLoop() {
  const m = peopleMetrics()
  if (!m) return
  const need = m.set - m.gap > m.el.clientWidth + 1
  if (need !== peopleLoop.value) {
    peopleLoop.value = need
    await nextTick()
  }
  // После включения петли или ресайза — встаём на первую карточку оригиналов.
  if (need) {
    const fresh = peopleMetrics()
    if (fresh) jumpPeople(fresh.set)
  }
}

// Прокрутка остановилась в копиях — переносим на ту же карточку в оригиналах.
// Границы с запасом в полкарточки, чтобы субпиксельные сдвиги snap не давали ложный перенос.
function normalizePeople() {
  if (!peopleLoop.value || drag) return
  const m = peopleMetrics()
  if (!m) return
  const x = m.el.scrollLeft
  const half = m.step / 2
  if (x < m.set - half) jumpPeople(x + m.set)
  else if (x >= 2 * m.set - half) jumpPeople(x - m.set)
}

function onPeopleScroll() {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(normalizePeople, 140)
}

function onPeopleDown(e: PointerEvent) {
  const el = peopleTrack.value
  // Тач и перо листают нативно; вручную тянем только мышью.
  if (!el || e.pointerType !== 'mouse' || !peopleLoop.value) return
  drag = { x: e.clientX, left: el.scrollLeft }
  peopleDragging.value = true
  el.setPointerCapture(e.pointerId)
}

function onPeopleMove(e: PointerEvent) {
  if (!drag || !peopleTrack.value) return
  peopleTrack.value.scrollLeft = drag.left - (e.clientX - drag.x)
}

function onPeopleUp() {
  if (!drag) return
  // Снимаем класс — возвращается scroll-snap, лента доезжает до ближайшей карточки,
  // после остановки срабатывает normalizePeople.
  drag = null
  peopleDragging.value = false
  onPeopleScroll()
}

// Появление блоков при скролле — как на terafab.ai: .v2-reveal проявляется и
// поднимается на 12px, когда входит в экран (один раз). Соседние .v2-reveal
// внутри одного родителя идут лесенкой: +0.07s на каждый, максимум 0.4s.
// При prefers-reduced-motion всё показывается сразу.
const pageRoot = ref<HTMLElement | null>(null)
let revealObserver: IntersectionObserver | null = null

function setupReveal() {
  const root = pageRoot.value
  if (!root) return
  document.documentElement.classList.add('v2-js')
  const els = Array.from(root.querySelectorAll<HTMLElement>('.v2-reveal'))

  els.forEach((el) => {
    const siblings = Array.from(el.parentElement?.children ?? []).filter(c => c.classList.contains('v2-reveal'))
    const i = siblings.indexOf(el)
    if (i > 0) el.style.setProperty('--v2-reveal-delay', `${Math.min(i * 0.07, 0.4)}s`)
  })

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-in'))
    return
  }
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('is-in')
      revealObserver?.unobserve(entry.target)
    }
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' })
  els.forEach(el => revealObserver!.observe(el))

  window.addEventListener('scroll', onRevealScroll, { passive: true })
  onRevealScroll()
}

// Конец страницы: подвал стоит в последних ~70px, а наблюдатель засчитывает элемент
// только выше нижних 8% экрана — у самого низа подвал не проявился бы никогда.
// Поэтому, докрутив до конца, проявляем всё, что уже на экране.
let revealRaf = 0

function revealAtPageEnd() {
  revealRaf = 0
  const atEnd = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2
  if (!atEnd) return
  pageRoot.value?.querySelectorAll<HTMLElement>('.v2-reveal:not(.is-in)').forEach((el) => {
    if (el.getBoundingClientRect().top >= window.innerHeight) return
    el.classList.add('is-in')
    revealObserver?.unobserve(el)
  })
}

function onRevealScroll() {
  if (!revealRaf) revealRaf = requestAnimationFrame(revealAtPageEnd)
}

onMounted(() => {
  setupReveal()
  if (!peopleTrack.value) return
  peopleObserver = new ResizeObserver(() => { syncPeopleLoop() })
  peopleObserver.observe(peopleTrack.value)
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  window.removeEventListener('scroll', onRevealScroll)
  cancelAnimationFrame(revealRaf)
  peopleObserver?.disconnect()
  clearTimeout(settleTimer)
})
</script>

<template>
  <div ref="pageRoot" class="v2">
    <!-- ШАПКА -->
    <header class="v2-header">
      <div class="v2-container v2-header__inner">
        <NuxtLink :to="localePath('/')" class="v2-logo">
          <svg class="v2-logo__mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="37" height="37" stroke="currentColor" stroke-width="3" />
            <polygon points="7,3.5 33,3.5 20,25" fill="currentColor" />
          </svg>
          <span class="v2-logo__text">Data Center<br>Valley<i class="v2-logo__dot">.</i></span>
        </NuxtLink>

        <nav class="v2-header__nav">
          <NuxtLink
            v-for="loc in locales"
            :key="loc.code"
            :to="switchLocalePath(loc.code)"
            class="v2-header__link"
            data-locale
            :class="{ 'is-active': loc.code === locale }"
          >{{ loc.code === 'kk' ? 'KZ' : loc.code.toUpperCase() }}</NuxtLink>

          <span class="v2-header__sep" aria-hidden="true"></span>

          <NuxtLink :to="localePath('/team')" class="v2-header__link">{{ t('v2.header.team') }}</NuxtLink>

          <a :href="contactMail" class="v2-btn v2-btn--orange">{{ t('v2.header.contact') }} <span aria-hidden="true">&#8599;</span></a>
        </nav>
      </div>
    </header>

    <!-- HERO -->
    <section class="v2-hero">
      <div class="v2-hero__stage">
        <!-- Картинка от линии шапки до правого края экрана -->
        <figure class="v2-hero__media">
          <!-- LCP: грузится сразу, с preload высокого приоритета -->
          <NuxtPicture
            src="/asset/v2/hero.png"
            width="1020"
            height="820"
            format="webp"
            sizes="xs:100vw sm:100vw md:72vw lg:72vw xl:72vw"
            legacy-format="jpeg"
            loading="eager"
            :preload="{ fetchPriority: 'high' }"
            :img-attrs="{ fetchpriority: 'high' }"
            :alt="t('v2.hero.imageAlt')"
          />
        </figure>

        <div class="v2-container v2-hero__overlay">
          <div class="v2-hero__copy">
            <p class="v2-label">{{ t('v2.location') }} / 51&deg;43&prime; N</p>
            <h1 class="v2-display v2-display--xl v2-hero__title">Data<br>Center<br>Valley.</h1>
            <p class="v2-lead v2-hero__lead"><Lines :text="t('v2.hero.lead')" /></p>
          </div>

          <!-- Показатели проекта: панель лежит на низу картинки -->
          <div class="v2-hero__stats">
            <div v-for="stat in stats" :key="stat.label" class="v2-stat">
              <p class="v2-label v2-stat__label">{{ stat.label }}</p>
              <div v-for="row in stat.rows" :key="row.value" class="v2-stat__row">
                <span class="v2-stat__value">{{ row.value }}</span>
                <span class="v2-stat__note">{{ row.note }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 01 — ENERGY STRATEGY -->
    <section class="v2-section" id="energy">
      <div class="v2-container">
        <div class="v2-section__head">
          <p class="v2-label v2-reveal"><span class="v2-label__num">01</span> / {{ t('v2.energy.label') }}</p>
          <div>
            <h2 class="v2-display v2-reveal v2-display--lg"><Lines :text="t('v2.energy.title')" /></h2>
            <p class="v2-lead v2-reveal" style="margin-top: 22px;"><Lines :text="t('v2.energy.lead')" /></p>
          </div>
        </div>

        <!-- Подпись «ENERGY INFRASTRUCTURE / CONCEPT VISUALIZATION» вшита в изображение -->
        <figure class="v2-figure">
          <NuxtPicture src="/asset/v2/1block.png" format="webp" width="1344" height="470" sizes="xs:100vw sm:100vw md:100vw lg:1344px" legacy-format="jpeg" loading="lazy" :alt="t('v2.energy.imageAlt')" />
        </figure>

        <div class="v2-cols v2-cols--3">
          <div v-for="step in energySteps" :key="step.title" class="v2-col v2-reveal">
            <h3 class="v2-col__title">{{ step.title }}</h3>
            <p class="v2-col__text">{{ step.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 02 — ENGINEERED FOR WHAT COMES NEXT -->
    <section class="v2-section v2-dark v2-fade-top v2-fade-bottom v2-engineered">
      <div class="v2-container v2-engineered__inner">
        <div class="v2-engineered__copy">
          <p class="v2-label v2-reveal"><span class="v2-label__num">02</span> / {{ t('v2.engineered.label') }}</p>
          <h2 class="v2-display v2-reveal v2-display--lg v2-engineered__title" style="margin-top: 22px;"><Lines :text="t('v2.engineered.title')" /></h2>
          <p class="v2-lead v2-reveal v2-engineered__lead"><Lines :text="t('v2.engineered.lead')" /></p>
        </div>

        <!-- На десктопе — слой под текстом почти на всю секцию, заголовок наезжает на плату -->
        <figure class="v2-engineered__media">
          <NuxtPicture src="/asset/v2/2.png" format="webp" width="1440" height="960" sizes="xs:100vw sm:100vw md:100vw lg:1440px" legacy-format="jpeg" loading="lazy" :alt="t('v2.engineered.imageAlt')" />
        </figure>

        <div class="v2-engineered__bottom">
          <div class="v2-engineered__meta">
            <p v-for="item in engineeredMeta" :key="item" class="v2-label v2-reveal">{{ item }}</p>
          </div>

          <p class="v2-label v2-reveal v2-engineered__caption">{{ t('v2.engineered.caption') }}</p>
        </div>
      </div>
    </section>

    <!-- 03 — A PLACE TO SCALE -->
    <section class="v2-section" id="campus">
      <div class="v2-container">
        <div class="v2-place__head">
          <h2 class="v2-display v2-reveal v2-display--lg"><Lines :text="t('v2.place.title')" /></h2>
          <div>
            <p class="v2-label v2-reveal"><span class="v2-label__num">03</span> / {{ t('v2.location') }}</p>
            <p class="v2-place__intro v2-reveal">{{ t('v2.place.intro') }}</p>
          </div>
        </div>

        <!-- Плашки «PHASE ONE / 191.8 HA» и «EXPANSION / ~1,300 HA» вшиты в изображение -->
        <figure class="v2-figure">
          <NuxtPicture src="/asset/v2/3.png" format="webp" width="1440" height="520" sizes="xs:100vw sm:100vw md:100vw lg:1344px" legacy-format="jpeg" loading="lazy" :alt="t('v2.place.imageAlt')" />
        </figure>

        <div class="v2-place__note">
          <p class="v2-label v2-reveal">{{ t('v2.place.noteLabel') }}</p>
          <p class="v2-place__note-text v2-reveal">{{ t('v2.place.noteText') }}</p>
        </div>

        <div class="v2-cols v2-cols--3">
          <div v-for="fact in placeFacts" :key="fact.label" class="v2-col v2-reveal">
            <p class="v2-label" style="margin-bottom: 12px;">{{ fact.label }}</p>
            <p class="v2-col__line">{{ fact.lines[0] }}</p>
            <p class="v2-col__line v2-col__line--muted">{{ fact.lines[1] }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 04 — THE FOUNDATIONS -->
    <section class="v2-section">
      <div class="v2-container">
        <div class="v2-section__head">
          <p class="v2-label v2-reveal"><span class="v2-label__num">04</span> / {{ t('v2.foundations.label') }}</p>
          <h2 class="v2-display v2-reveal v2-display--lg"><Lines :text="t('v2.foundations.title')" /></h2>
        </div>

        <div class="v2-foundations">
          <div>
            <div
              v-for="item in foundationsLeft"
              :key="item.num"
              class="v2-foundation v2-reveal"
              :data-open="openFoundation === item.num || undefined"
              @mouseenter="onFoundationEnter(item.num)"
            >
              <span class="v2-foundation__num">{{ item.num }}</span>
              <div>
                <h3 class="v2-foundation__title">
                  <button
                    type="button"
                    class="v2-foundation__trigger"
                    :aria-expanded="openFoundation === item.num"
                    :aria-controls="`foundation-more-${item.num}`"
                    @click="toggleFoundation(item.num)"
                  >
                    <span>{{ item.title }}</span>
                    <span class="v2-foundation__icon" aria-hidden="true"></span>
                  </button>
                </h3>
                <p class="v2-foundation__text">{{ item.text }}</p>
                <div :id="`foundation-more-${item.num}`" class="v2-foundation__more">
                  <div class="v2-foundation__more-inner">
                    <p>{{ item.more }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div
              v-for="item in foundationsRight"
              :key="item.num"
              class="v2-foundation v2-reveal"
              :data-open="openFoundation === item.num || undefined"
              @mouseenter="onFoundationEnter(item.num)"
            >
              <span class="v2-foundation__num">{{ item.num }}</span>
              <div>
                <h3 class="v2-foundation__title">
                  <button
                    type="button"
                    class="v2-foundation__trigger"
                    :aria-expanded="openFoundation === item.num"
                    :aria-controls="`foundation-more-${item.num}`"
                    @click="toggleFoundation(item.num)"
                  >
                    <span>{{ item.title }}</span>
                    <span class="v2-foundation__icon" aria-hidden="true"></span>
                  </button>
                </h3>
                <p class="v2-foundation__text">{{ item.text }}</p>
                <div :id="`foundation-more-${item.num}`" class="v2-foundation__more">
                  <div class="v2-foundation__more-inner">
                    <p>{{ item.more }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 05 — THE PEOPLE BEHIND DCV -->
    <section class="v2-section" id="team">
      <div class="v2-container">
        <div class="v2-section__head">
          <p class="v2-label v2-reveal"><span class="v2-label__num">05</span> / {{ t('v2.people.label') }}</p>
          <div>
            <h2 class="v2-display v2-reveal v2-display--lg"><Lines :text="t('v2.people.title')" /></h2>
            <p class="v2-lead v2-reveal" style="margin-top: 22px;">{{ t('v2.people.lead') }}</p>
          </div>
        </div>

        <div class="v2-reveal">
        <div
          ref="peopleTrack"
          class="v2-people"
          :class="{ 'is-scrollable': peopleLoop, 'is-dragging': peopleDragging }"
          tabindex="0"
          role="region"
          :aria-label="t('v2.people.label')"
          @pointerdown="onPeopleDown"
          @pointermove="onPeopleMove"
          @pointerup="onPeopleUp"
          @pointercancel="onPeopleUp"
          @scroll.passive="onPeopleScroll"
        >
          <article
            v-for="person in peopleSlides"
            :key="person.key"
            class="v2-person"
            :aria-hidden="person.clone ? 'true' : undefined"
          >
            <div class="v2-person__frame">
              <span class="v2-person__watermark" aria-hidden="true">{{ person.letter }}</span>
              <span class="v2-person__tag v2-person__tag--top">{{ person.tag }}</span>
              <span class="v2-person__plus" aria-hidden="true">+</span>
              <span class="v2-person__tag v2-person__tag--bottom">{{ t('v2.people.portrait') }}</span>
            </div>
            <p class="v2-label v2-person__role">{{ person.role }}</p>
            <h3 class="v2-person__name">{{ t('v2.people.name') }}</h3>
            <p class="v2-person__bio">{{ t('v2.people.bio') }}</p>
          </article>
        </div>
        </div>

        <p class="v2-label v2-reveal v2-people__footnote">{{ t('v2.people.footnote') }}</p>
      </div>
    </section>

    <!-- 06 — A CLOSER LOOK -->
    <section class="v2-section v2-dark v2-fade-top">
      <div class="v2-container">
        <div class="v2-section__head">
          <p class="v2-label v2-reveal"><span class="v2-label__num">06</span> / {{ t('v2.film.label') }}</p>
          <h2 class="v2-display v2-reveal v2-display--lg"><Lines :text="t('v2.film.title')" /></h2>
        </div>

        <!-- TODO: кнопка «PLAY THE FILM» пока часть изображения; при появлении ролика
             заменить <figure> на видеоплеер и вынести кнопку в разметку. -->
        <figure class="v2-figure">
          <NuxtPicture src="/asset/v2/6block.png" format="webp" width="1344" height="756" sizes="xs:100vw sm:100vw md:100vw lg:1344px" legacy-format="jpeg" loading="lazy" :alt="t('v2.film.imageAlt')" />
          <figcaption class="v2-film__caption v2-reveal">
            <span class="v2-label">{{ t('v2.film.caption1') }}</span>
            <span class="v2-label">{{ t('v2.film.caption2') }}</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 07 — YOUR NEXT MOVE + подвал -->
    <section class="v2-next v2-fade-top v2-fade-top--dark" id="contact">
      <div class="v2-container" style="position: relative; z-index: 2;">
        <div class="v2-next__top">
          <div>
            <p class="v2-label v2-reveal"><span class="v2-label__num">07</span> / {{ t('v2.next.label') }}</p>
            <h2 class="v2-display v2-reveal v2-display--xl v2-next__title"><Lines :text="t('v2.next.title')" /></h2>
          </div>

          <svg class="v2-next__arrow v2-reveal" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" aria-hidden="true">
            <path d="M14 86 L86 14" />
            <path d="M30 14 H86 V70" />
          </svg>
        </div>

        <div class="v2-next__body">
          <div>
            <p class="v2-next__lead v2-reveal"><Lines :text="t('v2.next.lead')" /></p>
            <a :href="contactMail" class="v2-btn v2-btn--ink v2-reveal">{{ t('v2.next.cta') }} <span aria-hidden="true">&#8599;</span></a>
          </div>

          <div class="v2-next__services">
            <span v-for="service in services" :key="service" class="v2-label v2-reveal">{{ service }}</span>
          </div>
        </div>

        <hr class="v2-next__rule">

        <div class="v2-footer v2-reveal">
          <NuxtLink :to="localePath('/')" class="v2-logo">
            <svg class="v2-logo__mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="37" height="37" stroke="currentColor" stroke-width="3" />
              <polygon points="7,3.5 33,3.5 20,25" fill="currentColor" />
            </svg>
            <span class="v2-logo__text">Data Center<br>Valley<i class="v2-logo__dot">.</i></span>
          </NuxtLink>

          <p class="v2-label">
            Data Center Valley<br>
            {{ t('v2.location') }}
          </p>

          <div class="v2-footer__right v2-footer__links">
            <p class="v2-label">
              <a href="#energy">{{ t('v2.footer.vision') }}</a> /
              <a href="#campus">{{ t('v2.footer.campus') }}</a> /
              <a :href="contactMail">{{ t('v2.footer.contact') }}</a>
            </p>
            <p class="v2-label">&copy; Data Center Valley</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped src="~/assets/css/v2.css"></style>

<style>
/* Не scoped: фон страницы за пределами контента (bounce-зона скролла). */
body.v2-body {
  background: #E8E8E3;
}
</style>
