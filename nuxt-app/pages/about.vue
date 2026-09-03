<script setup lang="ts">
const { t, tm, rt, messages } = useI18n()

const accordionItems = computed(() => {
  let items = tm('about.gov.accordion') as any[]
  if (!Array.isArray(items) || items.length === 0) {
    items = (messages.value.en as any)?.about?.gov?.accordion || []
  }
  // tm() отдаёт сообщения скомпилированными (AST) — в строку их разворачивает rt().
  return items.map((item: any) => ({ title: rt(item.title), text: rt(item.text) }))
})
</script>

<template>
  <div>
    <Breadcrumb :current="t('breadcrumb.platform')" />

    <HeroCard
      :title="t('about.hero.title')"
      :lead="t('about.hero.lead')"
      mobile-image="/asset/images/about/about1.png"
    />

    <WhyDataCenter
      :label="t('about.why.label')"
      :disclaimer="t('about.why.disclaimer')"
      image="/asset/images/about/about2.png"
      :text-muted="t('about.why.textMuted')"
      :text-strong="t('about.why.textStrong')"
      :button-text="t('about.why.cta')"
    />

    <!-- Strategic Geography -->
    <section class="geo">
      <div class="container">
        <h2 class="section-title" v-html="t('about.geo.title')"></h2>
        <p class="geo__text">{{ t('about.geo.text') }}</p>
        <div class="geo__map">
          <img src="/asset/images/about/map.png" :alt="t('about.geo.mapAlt')" loading="lazy">
        </div>
      </div>
    </section>

    <!-- National Priority & Government Support -->
    <section class="gov">
      <div class="container gov__row">
        <img class="gov__emblem" src="/asset/images/about/emblem.png" :alt="t('about.gov.emblemAlt')">
        <div class="gov__body">
          <h2 class="section-title" v-html="t('about.gov.title')"></h2>
          <AppAccordion :items="accordionItems" :default-open="1" />
        </div>
      </div>
    </section>

    <SectionCta
      :title="t('home.cta.title')"
      :note="t('home.cta.note')"
      :text="t('home.cta.text')"
      :button-text="t('home.cta.button')"
    />
  </div>
</template>
