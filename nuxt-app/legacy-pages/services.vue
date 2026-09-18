<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <Breadcrumb :current="t('breadcrumb.services')" />

    <HeroCard
      :title="t('services.hero.title')"
      :lead="t('services.hero.lead')"
      mobile-image="/asset/images/about/about1.png"
    />

    <section class="services">
      <div class="container">
        <div class="services__grid">
          <ModelCard
            :title="t('services.cards.0.title')"
            :text="t('services.cards.0.text')"
            :button-text="t('services.cards.0.button')"
          />
          <ModelCard
            :title="t('services.cards.1.title')"
            :text="t('services.cards.1.text')"
            :button-text="t('services.cards.1.button')"
            active
          />
          <ModelCard
            :title="t('services.cards.2.title')"
            :text="t('services.cards.2.text')"
            :button-text="t('services.cards.2.button')"
          />
          <ModelCard
            :title="t('services.cards.3.title')"
            :text="t('services.cards.3.text')"
            :button-text="t('services.cards.3.button')"
          />
        </div>
      </div>
    </section>

    <SectionCta
      :title="t('services.cta.title')"
      :text="t('services.cta.text')"
      :button-text="t('services.cta.button')"
    />
  </div>
</template>
