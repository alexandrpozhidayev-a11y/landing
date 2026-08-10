<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <Breadcrumb :current="t('breadcrumb.infrastructure')" />

    <HeroCard
      :title="t('ai.hero.title')"
      :lead="t('ai.hero.lead')"
      mobile-image="/asset/images/AI/ai1.png"
      bg-image="/asset/images/AI/ai1.png"
    />

    <section class="power">
      <div class="container">
        <h2 class="power__title">{{ t('ai.power.title') }}</h2>
        <div class="power__grid">
          <PowerStat v-for="n in 8" :key="n" :label="t(`ai.power.stats.${n - 1}.label`)" :value="t(`ai.power.stats.${n - 1}.value`)" />
        </div>
      </div>

      <div class="power__map">
        <img src="/asset/images/AI/map.png" :alt="t('ai.mapAlt')" loading="lazy">
        <div class="power__map-card">
          <span class="power__map-card-title">{{ t('about.why.label') }}</span>
          <p class="power__map-card-text">{{ t('about.why.disclaimer') }}</p>
        </div>
      </div>
    </section>

    <WhyDataCenter
      :label="t('about.why.label')"
      :disclaimer="t('about.why.disclaimer')"
      image="/asset/images/AI/ai2.png"
      :text-muted="t('about.why.textMuted')"
      :text-strong="t('about.why.textStrong')"
      :button-text="t('about.why.cta')"
    />

    <SectionCta
      :title="t('home.cta.title')"
      :note="t('home.cta.note')"
      :text="t('home.cta.text')"
      :button-text="t('home.cta.button')"
    />
  </div>
</template>
