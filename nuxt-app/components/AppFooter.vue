<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

function scrollTop() {
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <footer class="footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <div class="logo logo--white">
          <svg class="logo__mark" width="48" height="48" viewBox="0 0 40 40" fill="none">
            <rect x="1.25" y="1.25" width="37.5" height="37.5" stroke="white" stroke-width="2.5"/>
            <polygon points="6,2.5 34,2.5 20,26" fill="white"/>
          </svg>
          <span>{{ t('brand.name') }}<br>{{ t('brand.name2') }}<i class="logo__dot">.</i></span>
        </div>
        <p class="footer__desc">{{ t('footer.desc') }}</p>
      </div>

      <nav class="footer__col">
        <h4>{{ t('footer.solutions.title') }}</h4>
        <NuxtLink :to="localePath('/services')">{{ t('footer.solutions.colocation') }}</NuxtLink>
        <NuxtLink :to="localePath('/services')">{{ t('footer.solutions.buildToSuit') }}</NuxtLink>
        <NuxtLink :to="localePath('/services')">{{ t('footer.solutions.greenfield') }}</NuxtLink>
        <NuxtLink :to="localePath('/services')">{{ t('footer.solutions.partnerships') }}</NuxtLink>
      </nav>

      <nav class="footer__col">
        <h4>{{ t('footer.company.title') }}</h4>
        <NuxtLink :to="localePath('/about')">{{ t('nav.platform') }}</NuxtLink>
        <NuxtLink :to="localePath('/') + '#campus'">{{ t('nav.campus') }}</NuxtLink>
        <NuxtLink :to="localePath('/team')">{{ t('nav.team') }}</NuxtLink>
        <NuxtLink :to="localePath('/news')">{{ t('nav.news') }}</NuxtLink>
      </nav>

      <div class="footer__social">
        <SocialIcons :size="18" />
      </div>
    </div>

    <div class="container footer__bottom">
      <p class="footer__rights">&copy; 2026 <a href="#">{{ t('footer.brand') }}</a>. {{ t('footer.rights') }}</p>
      <button type="button" class="footer__top" @click="scrollTop">
        {{ t('footer.backToTop') }}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
    </div>
  </footer>
</template>
