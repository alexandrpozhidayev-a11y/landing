<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

// TEMP (пока): главная упрощена по объёму до landing.html — Hero / Why / Models / CTA.
// Секции Camera, Team-preview и News-preview из "полной" версии убраны:
// сам контент этих разделов уже живёт на отдельных страницах (см. метки NuxtLink ниже),
// так что навигация не ломается. Когда контент/дизайн этих блоков будет готов —
// верните их сюда (были в git-истории этого файла) и добавьте якорь id="live-camera".
</script>

<template>
  <div>
    <!-- Hero: promo — Digital Bridge Kazakhstan 2026 -->
    <!-- TODO: ссылка "Buy ticket" временная (#), подставить реальный URL продажи билетов -->
    <section class="hero-promo" id="platform">
      <img class="hero-promo__bg" src="/asset/herobackground.png" :alt="t('home.heroPromo.imageAlt')">
      <div class="hero-promo__overlay" aria-hidden="true"></div>
      <div class="container hero-promo__inner">
        <h1 class="hero-promo__title" v-html="t('home.heroPromo.title')"></h1>
        <p class="hero-promo__text">
          <span class="hero-promo__text-accent">{{ t('home.heroPromo.textAccent') }}</span><span class="hero-promo__text-muted">{{ t('home.heroPromo.textMuted') }}</span>
        </p>
        <div class="hero-promo__actions">
          <a href="#" class="btn btn--accent">{{ t('home.heroPromo.cta') }}</a>
          <span class="hero-promo__date">{{ t('home.heroPromo.date') }}</span>
        </div>
      </div>
    </section>

    <!-- Hero (прежний, закомментирован — вернуть при необходимости)
    <section class="hero" id="platform">
      <div class="container">
        <h1 class="hero__title">{{ t('home.hero.title') }}</h1>
        <p class="hero__subtitle">
          <span class="text-strong">{{ t('home.hero.leadStrong') }}</span>
          <span class="text-muted">{{ t('home.hero.leadMuted') }}</span>
        </p>

        <div class="hero__actions">
          <a href="mailto:commercial@dc-valley.com" class="btn btn--primary">{{ t('home.hero.getStarted') }} &rarr;</a>
        </div>

        <div class="hero__meta">
          <span class="hero__place">{{ t('home.hero.place') }}</span>
          <span class="hero__coords">{{ t('home.hero.coords') }}</span>
        </div>

        <div class="hero__image">
          <img src="/asset/index_background.png" alt="Data Center Valley campus render">
          <div class="hero__stats">
            <HeroStat :label="t('home.hero.stats.power.label')" :value="t('home.hero.stats.power.value')" />
            <HeroStat :label="t('home.hero.stats.territory.label')" :value="t('home.hero.stats.territory.value')" />
            <HeroStat :label="t('home.hero.stats.tax.label')" :value="t('home.hero.stats.tax.value')" />
            <HeroStat :label="t('home.hero.stats.cost.label')" :value="t('home.hero.stats.cost.value')" />
          </div>
        </div>
      </div>
    </section>
    -->

    <!-- Why Data Center Valley -->
    <!-- LINK: якорь #campus — на него ведёт пункт меню "Campus" в AppHeader.vue -->
    <section class="location" id="campus">
      <div class="container">
        <div class="why">
          <div class="why__header">
            <span>{{ t('home.why.headerWhy') }}</span>
            <span>{{ t('home.why.headerData') }}</span>
            <span>{{ t('home.why.headerCenter') }}</span>
            <span>{{ t('home.why.headerValley') }}</span>
          </div>

          <div class="why__row">
            <div class="why__item">
              <h3 v-html="t('home.why.items.0.title')"></h3>
              <p>{{ t('home.why.items.0.text') }}</p>
            </div>
            <div class="why__item">
              <h3 v-html="t('home.why.items.1.title')"></h3>
              <p>{{ t('home.why.items.1.text') }}</p>
            </div>
          </div>

          <div class="why__row">
            <div class="why__item">
              <h3 v-html="t('home.why.items.2.title')"></h3>
              <p>{{ t('home.why.items.2.text') }}</p>
            </div>
            <div class="why__item">
              <h3 v-html="t('home.why.items.3.title')"></h3>
              <p>{{ t('home.why.items.3.text') }}</p>
            </div>
          </div>

          <div class="why__row">
            <div class="why__item">
              <h3 v-html="t('home.why.items.4.title')"></h3>
              <p>{{ t('home.why.items.4.text') }}</p>
            </div>
            <div class="why__image">
              <img src="/asset/photo.jpg" :alt="t('home.why.imageAlt')" loading="lazy">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Flexible models -->
    <section class="models" id="solutions">
      <div class="container">
        <h2 class="section-title">{{ t('home.models.title') }}</h2>
        <p class="models__subtitle">
          <span class="text-strong">{{ t('home.models.subtitleStrong') }}</span>
          <span class="text-muted">{{ t('home.models.subtitleMuted') }}</span>
        </p>

        <div class="models__row">
          <div class="models__left">
            <ModelCard :title="t('home.models.active.title')" :text="t('home.models.active.text')" active dot />
            <div class="models__list">
              <div class="models__list-item"><span>{{ t('home.models.list.0') }}</span></div>
              <div class="models__list-item"><span>{{ t('home.models.list.1') }}</span></div>
              <div class="models__list-item"><span>{{ t('home.models.list.2') }}</span></div>
            </div>
          </div>
          <img class="models__photo" src="/asset/flexible_1.png" alt="Data center server corridor" loading="lazy">
          <img class="models__photo" src="/asset/flexible_2.png" alt="Data center server racks" loading="lazy">
        </div>

        <!-- LINK: подробнее о решениях -> /ai -->
        <NuxtLink :to="localePath('/ai')" class="models__more">{{ t('home.models.learnMore') }} &rarr;</NuxtLink>
      </div>
    </section>

    <!-- TODO (позже): превью Team -> /team, превью News -> /news, Live Camera (#live-camera).
         Сами страницы team.vue / news.vue уже есть и доступны из шапки/футера. -->

    <!-- CTA -->
    <SectionCta
      v-if="false"
      :title="t('home.cta.title')"
      :note="t('home.cta.note')"
      :text="t('home.cta.text')"
      :button-text="t('home.cta.button')"
    >
      <template #decor>
        <div class="cta__decor" aria-hidden="true">
          <img src="/asset/111.png" alt="" loading="lazy">
        </div>
      </template>
    </SectionCta>
  </div>
</template>
