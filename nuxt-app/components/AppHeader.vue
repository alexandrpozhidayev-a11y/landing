<script setup lang="ts">
const { t, locales, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()

const mobileOpen = ref(false)
function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}
function closeMobile() {
  mobileOpen.value = false
}

// Хиро-баннер на главной тёмный (видео herobackground.mp4) — пока не проскроллили,
// шапка накладывается поверх него прозрачно, с белым текстом.
// По имени маршрута, а не по пути: при смене языка путь и локаль обновляются
// не в один тик, и сравнение с localePath('/') на мгновение давало false —
// шапка успевала мигнуть белым поверх хиро.
const isHome = computed(() => String(route.name || '').split('___')[0] === 'index')
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 40
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
const overlay = computed(() => isHome.value && !scrolled.value)

const navLinks = computed(() => [
  { label: t('nav.platform'), to: localePath('/about') },
  { label: t('nav.campus'), to: localePath('/') + '#campus' },
  { label: t('nav.solutions'), to: localePath('/services') },
  // Team скрыт до наполнения контентом (в карточках пока «Фамилия/Имя/Отчество»).
  // Вернуть — раскомментировать здесь и в AppFooter.vue.
  // { label: t('nav.team'), to: localePath('/team') },
  { label: t('nav.news'), to: localePath('/news') }
])
</script>

<template>
  <header class="header" :class="{ 'header--overlay': isHome, 'header--transparent': overlay }">
    <div class="container header__content">
      <NuxtLink :to="localePath('/')" class="logo" :class="{ 'logo--white': overlay }">
        <svg class="logo__mark" width="48" height="48" viewBox="0 0 40 40" fill="none">
          <rect x="1.25" y="1.25" width="37.5" height="37.5" stroke="currentColor" stroke-width="2.5"/>
          <polygon points="6,2.5 34,2.5 20,26" fill="currentColor"/>
        </svg>
        <span>{{ t('brand.name') }}<br>{{ t('brand.name2') }}<i class="logo__dot">.</i></span>
      </NuxtLink>

      <nav class="nav">
        <NuxtLink v-for="link in navLinks" :key="link.label" :to="link.to" class="nav__link">{{ link.label }}</NuxtLink>
      </nav>

      <div class="header__actions">
        <div class="locale-switch">
          <NuxtLink
            v-for="loc in locales"
            :key="loc.code"
            :to="switchLocalePath(loc.code)"
            class="locale-switch__link"
            :class="{ 'is-active': loc.code === locale }"
          >{{ loc.code.toUpperCase() }}</NuxtLink>
        </div>
        <NuxtLink class="btn btn--primary btn--sm" :to="localePath('/about') + '#contact'">{{ t('nav.requestMeeting') }}</NuxtLink>
        <button aria-label="Toggle menu" class="menu-btn" :class="{ active: mobileOpen }" @click="toggleMobile">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>
  </header>

  <nav class="mobile-menu" :class="{ active: mobileOpen }">
    <NuxtLink v-for="link in navLinks" :key="link.label" :to="link.to" class="mobile-menu__link" @click="closeMobile">{{ link.label }}</NuxtLink>
    <a class="mobile-menu__link mobile-menu__link--cta" href="mailto:commercial@dc-valley.com" @click="closeMobile">{{ t('nav.requestMeeting') }}</a>
  </nav>
</template>

<style scoped>
.locale-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 4px;
}

.locale-switch__link {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-light);
  text-decoration: none;
}

.locale-switch__link.is-active {
  color: var(--color-primary);
}

.locale-switch__link:hover {
  color: var(--color-text);
}
</style>
