<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <Breadcrumb :current="t('nav.news')" />

    <section class="news-page">
      <div class="container">
        <h1 class="news-page__title">{{ t('news_page.title') }}</h1>

        <div class="news__card">
          <NewsFeatured
            image="https://picsum.photos/seed/dcv-news-0/700/460"
            :date="t('home.news.featured.date')"
            :title="t('home.news.featured.title')"
            :text="t('home.news.featured.text')"
            :button-text="t('home.news.allNews')"
          />
          <NewsRow
            image="https://picsum.photos/seed/dcv-news-1/300/220"
            :date="t('home.news.rows.0.date')"
            :title="t('home.news.rows.0.title')"
            :text="t('home.news.rows.0.text')"
          />
          <NewsRow
            image="https://picsum.photos/seed/dcv-news-2/300/220"
            :date="t('home.news.rows.1.date')"
            :title="t('home.news.rows.1.title')"
            :text="t('home.news.rows.1.text')"
          />
          <NewsRow
            image="https://picsum.photos/seed/dcv-news-3/300/220"
            :date="t('home.news.rows.2.date')"
            :title="t('home.news.rows.2.title')"
            :text="t('home.news.rows.2.text')"
          />

          <div class="news-page__more-grid">
            <NewsCompact
              v-for="n in 3"
              :key="n"
              :image="`https://picsum.photos/seed/dcv-news-${n + 3}/360/220`"
              :date="t(`news_page.more.${n - 1}.date`)"
              :title="t(`news_page.more.${n - 1}.title`)"
            />
          </div>
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
