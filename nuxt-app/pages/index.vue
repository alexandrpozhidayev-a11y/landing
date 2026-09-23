<script setup lang="ts">
// Главная страница сайта — дизайн «v2» (макет "DCV / Final for approval / Desktop").
// Раньше жила черновиком на /v2; прежняя главная и страницы About / Services / AI / FAQ
// убраны в legacy-pages/ (старые адреса редиректят сюда, см. routeRules в nuxt.config.ts).
//
// Тексты — в отдельных файлах i18n/locales/v2/{en,kk,ru}.json (ключи v2.*),
// подключены в nuxt.config.ts рядом с основными. Переносы строк в переводах — "\n"
// (см. Lines ниже). Название бренда (Data Center Valley) не переводится.
//
// Картинки: /public/asset/v2/* (десктоп) и /public/asset/v2/mobile/* (свои кадры
// для телефона, до 599px) — выводятся через <V2Picture>. Подписи-плашки
// (ENERGY INFRASTRUCTURE, PHASE ONE / 191.8 HA, PLAY THE FILM) вшиты в десктопные
// изображения, поэтому оверлеев в разметке нет — если плашки понадобится сделать
// живыми, их нужно будет убрать из картинок. В мобильных кадрах плашек нет.

definePageMeta({
  layout: false
})

const { t, locales, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

useHead(() => ({
  title: t('v2.meta.title'),
  htmlAttrs: { lang: locale.value },
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

// Новости из админки (через /api/news). Страница пререндерится при сборке, когда
// админки рядом нет, поэтому грузим на клиенте; блок появляется, когда пришли данные.
interface NewsItem {
  slug: string
  title: string
  excerpt: string | null
  image: string | null
  published_at: string | null
  is_featured: boolean
}

const { data: newsData } = useFetch<{ data: NewsItem[] }>('/api/news', {
  query: { locale },
  server: false,
  lazy: true,
  default: () => ({ data: [] })
})

const newsItems = computed(() => newsData.value?.data ?? [])
const newsFeatured = computed(() => newsItems.value.find(n => n.is_featured) ?? newsItems.value[0])
const newsRest = computed(() => newsItems.value.filter(n => n !== newsFeatured.value).slice(0, 3))

// Дата как на старом сайте — ДД.ММ.ГГГГ на всех языках (в en «09/11/2026» читается двояко).
function newsDate(value: string | null) {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

// Contact us / Let’s talk / Contact открывают модалку с формой (V2ContactModal,
// письмо уходит на info@ через /api/contact). mailto — запасной путь, пока
// страница не ожила (JS ещё не загрузился или выключен).
const contactMail = 'mailto:info@dc-valley.com'
const contactModal = ref<{ open: () => void } | null>(null)

function openContact(event: MouseEvent) {
  if (!contactModal.value) return
  event.preventDefault()
  contactModal.value.open()
}

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

// Видео в секции 06 — концепт-фильм (asset/v2/video.mp4), отдельный файл от промо-ролика
// на первом экране. Играет, только когда блок на экране: иначе браузер зря декодирует кадры.
const filmVideo = ref<HTMLVideoElement | null>(null)
let filmObserver: IntersectionObserver | null = null
const filmPlaying = ref(false)
const filmMuted = ref(true)
const filmDuration = ref(0)
// Пауза по кнопке — чтобы наблюдатель не запустил ролик снова при прокрутке.
const filmStopped = ref(false)

const filmTime = computed(() => {
  const total = Math.round(filmDuration.value)
  if (!total) return '--:--'
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
})

function toggleFilm() {
  const video = filmVideo.value
  if (!video) return
  if (video.paused || video.muted) {
    video.muted = false
    filmMuted.value = false
    filmStopped.value = false
    video.play().catch(() => {})
  } else {
    filmStopped.value = true
    video.pause()
  }
}

function setupFilmVideo() {
  const video = filmVideo.value
  if (!video) return
  filmObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !filmStopped.value) video.play().catch(() => {})
      else video.pause()
    }
  }, { rootMargin: '200px' })
  filmObserver.observe(video)
}

// Шапка над промо-блоком — прозрачная и светлая (как на старом сайте), ниже — обычная.
const overHero = ref(true)
const heroEl = ref<HTMLElement | null>(null)

function onHeaderScroll() {
  const hero = heroEl.value
  if (!hero) return
  const headerH = Number.parseFloat(getComputedStyle(pageRoot.value!).getPropertyValue('--v2-header-h')) || 0
  overHero.value = hero.getBoundingClientRect().bottom > headerH
}

onMounted(() => {
  setupReveal()
  setupFilmVideo()
  window.addEventListener('scroll', onHeaderScroll, { passive: true })
  window.addEventListener('resize', onHeaderScroll)
  onHeaderScroll()
  if (!peopleTrack.value) return
  peopleObserver = new ResizeObserver(() => { syncPeopleLoop() })
  peopleObserver.observe(peopleTrack.value)
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  filmObserver?.disconnect()
  window.removeEventListener('scroll', onRevealScroll)
  window.removeEventListener('scroll', onHeaderScroll)
  window.removeEventListener('resize', onHeaderScroll)
  cancelAnimationFrame(revealRaf)
  peopleObserver?.disconnect()
  clearTimeout(settleTimer)
})
</script>

<template>
  <div ref="pageRoot" class="v2">
    <!-- ШАПКА -->
    <header class="v2-header" :class="{ 'is-over-hero': overHero }">
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

          <a :href="contactMail" class="v2-btn v2-btn--orange" @click="openContact">{{ t('v2.header.contact') }} <span aria-hidden="true">&#8599;</span></a>
        </nav>
      </div>
    </header>

    <!-- HERO — промо-блок Digital Bridge Kazakhstan 2026 со старого сайта (pages/index.vue).
         Разметка и стили общие (.hero-promo в assets/css/style.css), тексты — home.heroPromo.*.
         Отступы по бокам — v2-container, чтобы текст встал по сетке остальных секций. -->
    <section ref="heroEl" class="hero-promo" id="platform">
      <!-- Фон декоративный: до загрузки видео показывается poster (первый кадр ролика). -->
      <video
        class="hero-promo__bg"
        src="/asset/v2/hero.mp4"
        poster="/asset/v2/hero-poster.jpg"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      ></video>
      <div class="hero-promo__overlay" aria-hidden="true"></div>
      <div class="v2-container hero-promo__inner">
        <h1 class="hero-promo__title" v-html="t('home.heroPromo.title')"></h1>
        <p class="hero-promo__text">{{ t('home.heroPromo.text') }}</p>
        <div class="hero-promo__actions">
          <a href="https://digitalbridge.ai/ru/#tickets" target="_blank" rel="noopener" class="btn btn--accent">{{ t('home.heroPromo.cta') }}</a>
          <span class="hero-promo__date">{{ t('home.heroPromo.date') }}</span>
        </div>
      </div>
    </section>

    <!-- Прежний первый экран (фото здания + панель цифр). Оставлен на будущее:
         если понадобится вернуть, раскомментировать и убрать блок выше. -->
    <!--
    <section class="v2-hero">
      <div class="v2-hero__stage">
        Картинка от линии шапки до правого края экрана; LCP, грузилась сразу с preload.
        <figure class="v2-hero__media">
          <V2Picture
            src="/asset/v2/hero.png"
            :width="1020"
            :height="820"
            sizes="xs:100vw sm:100vw md:72vw lg:72vw xl:72vw"
            mobile-src="/asset/v2/mobile/hero.png"
            :mobile-width="250"
            :mobile-height="400"
            priority
            :alt="t('v2.hero.imageAlt')"
          />
        </figure>

        <div class="v2-container v2-hero__overlay">
          <div class="v2-hero__copy">
            <p class="v2-label">{{ t('v2.location') }} / 51&deg;43&prime; N</p>
            <h1 class="v2-display v2-display--xl v2-hero__title">Data<br>Center<br>Valley.</h1>
            <p class="v2-lead v2-hero__lead"><Lines :text="t('v2.hero.lead')" /></p>
          </div>

          Показатели проекта: панель лежит на низу картинки.
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
    -->

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
          <V2Picture src="/asset/v2/1block.png" :width="1344" :height="470" sizes="xs:100vw sm:100vw md:100vw lg:1344px" mobile-src="/asset/v2/mobile/1block.png" :mobile-width="342" :mobile-height="320" :alt="t('v2.energy.imageAlt')" />
        </figure>

        <div class="v2-cols v2-cols--3">
          <div v-for="step in energySteps" :key="step.title" class="v2-col v2-reveal">
            <h3 class="v2-col__title">{{ step.title }}</h3>
            <p class="v2-col__text">{{ step.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 02 — ENGINEERED FOR WHAT COMES NEXT.
         3D-сцена (V2Hero3d) привязана к прокрутке: секция залипает, пока идёт лента,
         длину ленты задаёт распорка после секции. -->
    <div class="v2-engineered-track" data-dcv-track>
    <section class="v2-section v2-dark v2-fade-top v2-fade-bottom v2-engineered" data-dcv-sticky>
      <div class="v2-container v2-engineered__inner">
        <div class="v2-engineered__copy">
          <p class="v2-label v2-reveal"><span class="v2-label__num">02</span> / {{ t('v2.engineered.label') }}</p>
          <h2 class="v2-display v2-reveal v2-display--lg v2-engineered__title" style="margin-top: 22px;"><Lines :text="t('v2.engineered.title')" /></h2>
          <p class="v2-lead v2-reveal v2-engineered__lead"><Lines :text="t('v2.engineered.lead')" /></p>
        </div>

        <!-- 3D-сцена: на десктопе — справа под текстом на высоту экрана, на телефоне — между
             текстом и подписями. Фото платы — заставка, пока сцена грузится, и вариант без WebGL2. -->
        <figure class="v2-engineered__media">
          <V2Hero3d>
            <V2Picture src="/asset/v2/2.png" :width="1440" :height="960" sizes="xs:100vw sm:100vw md:100vw lg:1440px" mobile-src="/asset/v2/mobile/2.png" :mobile-width="342" :mobile-height="360" :alt="t('v2.engineered.imageAlt')" />
          </V2Hero3d>
        </figure>

        <div class="v2-engineered__bottom">
          <p class="v2-label v2-reveal v2-engineered__caption">{{ t('v2.engineered.caption') }}</p>
        </div>
      </div>
    </section>
      <div class="v2-engineered-track__spacer" aria-hidden="true" />
    </div>

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
          <V2Picture src="/asset/v2/3.jpg" :width="1280" :height="694" sizes="xs:100vw sm:100vw md:100vw lg:1280px" mobile-src="/asset/v2/3.jpg" :mobile-width="1280" :mobile-height="694" :alt="t('v2.place.imageAlt')" />
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
    <!-- Тёмная секция: если следом идут новости (светлые, как меню), снизу растворяем её
         в светлый фон; без новостей дальше сразу оранжевый финал со своим переходом. -->
    <section class="v2-section v2-dark v2-fade-top" :class="{ 'v2-fade-bottom': newsFeatured }">
      <div class="v2-container">
        <div class="v2-section__head">
          <p class="v2-label v2-reveal"><span class="v2-label__num">06</span> / {{ t('v2.film.label') }}</p>
          <h2 class="v2-display v2-reveal v2-display--lg"><Lines :text="t('v2.film.title')" /></h2>
        </div>

        <figure class="v2-figure">
          <!-- preload="none": сервер отдаёт файл целиком (докачки по кускам нет), поэтому при
               "metadata" браузер тянул все 8.5 МБ ещё на первом экране. Теперь ролик грузится,
               только когда блок подходит к экрану; до этого длительность на кнопке неизвестна
               и там стоит «--:--», но кнопку в этот момент ещё не видно. -->
          <div class="v2-film">
            <video
              ref="filmVideo"
              class="v2-film__video"
              src="/asset/v2/video.mp4"
              poster="/asset/v2/film.jpg"
              muted
              loop
              playsinline
              preload="none"
              :aria-label="t('v2.film.imageAlt')"
              @loadedmetadata="filmDuration = $event.target.duration"
              @play="filmPlaying = true"
              @pause="filmPlaying = false"
            ></video>
            <!-- Кнопка из макета: ролик крутится без звука как превью, по клику —
                 со звуком; повторный клик ставит на паузу. -->
            <button type="button" class="v2-film__play" @click="toggleFilm">
              <span>{{ filmPlaying && !filmMuted ? t('v2.film.pause') : t('v2.film.play') }}</span>
              <span class="v2-film__dot" aria-hidden="true">&bull;</span>
              <span>{{ filmTime }}</span>
            </button>
          </div>
          <figcaption class="v2-film__caption v2-reveal">
            <span class="v2-label">{{ t('v2.film.caption1') }}</span>
            <span class="v2-label">{{ t('v2.film.caption2') }}</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- 07 — NEWS. Блок со старого сайта (разметка и стили .news__card из assets/css/style.css),
         данные — из админки: главная новость крупно и ещё до трёх строками, каждая ведёт на
         свою страницу /news/<slug>. Пока новостей нет (или админка недоступна) — блока нет. -->
    <section v-if="newsFeatured" class="v2-section v2-news" id="news">
      <div class="v2-container">
        <div class="v2-section__head">
          <p class="v2-label"><span class="v2-label__num">07</span> / {{ t('home.news.title') }}</p>
          <div class="v2-news__head">
            <h2 class="v2-display v2-display--lg">{{ t('home.news.title') }}.</h2>
            <NuxtLink :to="localePath('/news')" class="v2-news__all">{{ t('home.news.allNews') }} <span aria-hidden="true">&#8599;</span></NuxtLink>
          </div>
        </div>

        <div class="news__card">
          <NewsFeatured
            :image="newsFeatured.image"
            :date="newsDate(newsFeatured.published_at)"
            :title="newsFeatured.title"
            :text="newsFeatured.excerpt ?? ''"
            :button-text="t('home.news.seeMore')"
            :to="localePath(`/news/${newsFeatured.slug}`)"
          />
          <NewsRow
            v-for="item in newsRest"
            :key="item.slug"
            :image="item.image"
            :date="newsDate(item.published_at)"
            :title="item.title"
            :text="item.excerpt ?? ''"
            :to="localePath(`/news/${item.slug}`)"
          />
        </div>
      </div>
    </section>

    <!-- 08 — YOUR NEXT MOVE + подвал (тот же компонент, что на внутренних страницах).
         Переход сверху — из фона предыдущей секции: светлой (новости) или тёмной (фильм). -->
    <V2NextFooter reveal :fade-dark="!newsFeatured" @contact="openContact" />

    <V2ContactModal ref="contactModal" />
  </div>
</template>

<style scoped src="~/assets/css/v2.css"></style>

<style>
/* Не scoped: фон страницы за пределами контента (bounce-зона скролла). */
/* overflow-x: clip вместо hidden из style.css: hidden может сделать body контейнером
   прокрутки, и тогда не работает position: sticky (залипание секции с 3D-сценой). */
body.v2-body {
  background: #E8E8E3;
  overflow-x: clip;
}
</style>
