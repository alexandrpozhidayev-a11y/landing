<script setup lang="ts">
const { t, locales, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

const contactMail = 'mailto:info@dc-valley.com'
const contactModal = ref<{ open: () => void } | null>(null)

function openContact(event: MouseEvent) {
  if (!contactModal.value) return
  event.preventDefault()
  contactModal.value.open()
}

useHead({
  bodyAttrs: { class: 'v2-body' }
})
</script>

<template>
  <div class="v2 v2-page">
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
            :class="{ 'is-active': loc.code === locale }"
          >{{ loc.code === 'kk' ? 'KZ' : loc.code.toUpperCase() }}</NuxtLink>
          <span class="v2-header__sep" aria-hidden="true"></span>
          <NuxtLink :to="localePath('/team')" class="v2-header__link">{{ t('v2.header.team') }}</NuxtLink>
          <a :href="contactMail" class="v2-btn v2-btn--orange" @click="openContact">{{ t('v2.header.contact') }} <span aria-hidden="true">&#8599;</span></a>
        </nav>
      </div>
    </header>

    <main class="v2-page__main">
      <slot />
    </main>

    <footer class="v2-next v2-page__footer">
      <div class="v2-container">
        <div class="v2-footer">
          <NuxtLink :to="localePath('/')" class="v2-logo">
            <svg class="v2-logo__mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="37" height="37" stroke="currentColor" stroke-width="3" />
              <polygon points="7,3.5 33,3.5 20,25" fill="currentColor" />
            </svg>
            <span class="v2-logo__text">Data Center<br>Valley<i class="v2-logo__dot">.</i></span>
          </NuxtLink>

          <p class="v2-label">Data Center Valley<br>{{ t('v2.location') }}</p>

          <div class="v2-footer__right v2-footer__links">
            <p class="v2-label">
              <NuxtLink :to="localePath('/#energy')">{{ t('v2.footer.vision') }}</NuxtLink> /
              <NuxtLink :to="localePath('/#campus')">{{ t('v2.footer.campus') }}</NuxtLink> /
              <a :href="contactMail" @click="openContact">{{ t('v2.footer.contact') }}</a>
            </p>
            <div class="v2-footer__socials"><SocialIcons :size="18" /></div>
            <p class="v2-label">&copy; Data Center Valley</p>
          </div>
        </div>
      </div>
    </footer>

    <V2ContactModal ref="contactModal" />
  </div>
</template>

<style src="~/assets/css/v2.css"></style>

<style>
body.v2-body {
  background: #E8E8E3;
  overflow-x: clip;
}

.v2-page__main {
  padding-top: var(--v2-header-h);
}

.v2-page__footer {
  padding: clamp(32px, 5vw, 56px) 0;
}
</style>
