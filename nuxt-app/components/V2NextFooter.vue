<script setup lang="ts">
// Финальный блок «08 — YOUR NEXT MOVE» вместе с подвалом. Один и тот же на главной
// и на внутренних страницах (новости, команда) — раньше внутри лежал только короткий
// подвал с логотипом, и низ страницы выглядел обрезанным.
//
// reveal: появление блоков при скролле есть только на главной (там же ставится .v2-js
// и живёт наблюдатель). На внутренних страницах наблюдателя нет, поэтому классы
// .v2-reveal туда не ставим — иначе после перехода с главной подвал остался бы скрытым.
// fadeDark: переход сверху — из тёмной секции; по умолчанию из светлого фона страницы.
// compact: подвал внутренних страниц — без заголовка «08 / Your next move» со стрелкой;
// призыв с кнопкой, услуги и нижняя строка остаются.
withDefaults(defineProps<{ reveal?: boolean, fadeDark?: boolean, compact?: boolean }>(), { reveal: false, fadeDark: false, compact: false })

const emit = defineEmits<{ contact: [MouseEvent] }>()

const { t } = useI18n()
const localePath = useLocalePath()

const contactMail = 'mailto:info@dc-valley.com'

const services = computed(() => (['colocation', 'buildToSuit', 'greenfield', 'partnerships'] as const)
  .map(id => t(`v2.next.services.${id}`)))
</script>

<template>
  <section class="v2-next v2-fade-top" :class="{ 'v2-fade-top--dark': fadeDark }" id="contact">
    <div class="v2-container" style="position: relative; z-index: 2;">
      <div v-if="!compact" class="v2-next__top">
        <div>
          <p class="v2-label" :class="{ 'v2-reveal': reveal }"><span class="v2-label__num">08</span> / {{ t('v2.next.label') }}</p>
          <h2 class="v2-display v2-display--xl v2-next__title" :class="{ 'v2-reveal': reveal }"><Lines :text="t('v2.next.title')" /></h2>
        </div>

        <svg class="v2-next__arrow" :class="{ 'v2-reveal': reveal }" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7" aria-hidden="true">
          <path d="M14 86 L86 14" />
          <path d="M30 14 H86 V70" />
        </svg>
      </div>

      <div class="v2-next__body">
        <div>
          <p class="v2-next__lead" :class="{ 'v2-reveal': reveal }"><Lines :text="t('v2.next.lead')" /></p>
          <a :href="contactMail" class="v2-btn v2-btn--ink" :class="{ 'v2-reveal': reveal }" @click="emit('contact', $event)">{{ t('v2.next.cta') }} <span aria-hidden="true">&#8599;</span></a>
        </div>

        <div class="v2-next__services">
          <span v-for="service in services" :key="service" class="v2-label" :class="{ 'v2-reveal': reveal }">{{ service }}</span>
        </div>
      </div>

      <hr class="v2-next__rule">

      <div class="v2-footer" :class="{ 'v2-reveal': reveal }">
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
            <NuxtLink :to="localePath('/#energy')">{{ t('v2.footer.vision') }}</NuxtLink> /
            <NuxtLink :to="localePath('/#campus')">{{ t('v2.footer.campus') }}</NuxtLink> /
            <a :href="contactMail" @click="emit('contact', $event)">{{ t('v2.footer.contact') }}</a>
          </p>

          <!-- Официальные аккаунты — тот же список, что и в подвале основного сайта -->
          <div class="v2-footer__socials">
            <SocialIcons :size="18" />
          </div>

          <p class="v2-label">&copy; Data Center Valley</p>
        </div>
      </div>
    </div>
  </section>
</template>
