<script setup lang="ts">
const { t } = useI18n()
const filterOpen = ref(false)
</script>

<template>
  <div>
    <Breadcrumb :current="t('nav.team')" />

    <section class="team-page">
      <div class="container">
        <div class="team-page__head">
          <h1 class="team-page__title">{{ t('team_page.title') }}</h1>
          <button type="button" class="team-page__filter" :class="{ 'is-open': filterOpen }" @click="filterOpen = !filterOpen">
            <span>{{ t('team_page.filter') }}</span>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>

        <div class="team-page__grid">
          <TeamCardProfile
            v-for="n in 9"
            :key="n"
            :featured="n === 1"
            photo="/asset/face.png"
            :last-name="t(`team_page.members.${n - 1}.lastName`)"
            :first-name="t(`team_page.members.${n - 1}.firstName`)"
            :middle-name="t(`team_page.members.${n - 1}.middleName`)"
            :role="t(`team_page.members.${n - 1}.role`)"
            :bio="t(`team_page.members.${n - 1}.bio`)"
          />
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
