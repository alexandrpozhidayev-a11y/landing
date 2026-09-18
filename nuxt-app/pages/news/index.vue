<script setup lang="ts">
definePageMeta({ layout: 'v2' })

const { t, locale } = useI18n()
const localePath = useLocalePath()

interface NewsItem {
  slug: string
  title: string
  excerpt: string | null
  image: string | null
  published_at: string | null
  is_featured: boolean
}

const { data } = await useFetch<{ data: NewsItem[] }>('/api/news', {
  query: { locale },
  watch: [locale],
  default: () => ({ data: [] })
})

const items = computed(() => data.value?.data ?? [])
const featured = computed(() => items.value.find(item => item.is_featured) ?? items.value[0])
const rows = computed(() => items.value.filter(item => item !== featured.value).slice(0, 3))
const more = computed(() => items.value.filter(item => item !== featured.value).slice(3))

function newsDate(value: string | null) {
  if (!value) return ''
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}.${month}.${year}`
}
</script>

<template>
  <div>
    <Breadcrumb :current="t('nav.news')" />

    <section class="news-page">
      <div class="container">
        <h1 class="news-page__title">{{ t('news_page.title') }}</h1>

        <div v-if="featured" class="news__card">
          <NewsFeatured
            :image="featured.image"
            :date="newsDate(featured.published_at)"
            :title="featured.title"
            :text="featured.excerpt ?? ''"
            :button-text="t('home.news.allNews')"
            :to="localePath(`/news/${featured.slug}`)"
          />
          <NewsRow
            v-for="item in rows"
            :key="item.slug"
            :image="item.image"
            :date="newsDate(item.published_at)"
            :title="item.title"
            :text="item.excerpt ?? ''"
            :to="localePath(`/news/${item.slug}`)"
          />

          <div v-if="more.length" class="news-page__more-grid">
            <NewsCompact
              v-for="item in more"
              :key="item.slug"
              :image="item.image ?? ''"
              :date="newsDate(item.published_at)"
              :title="item.title"
              :to="localePath(`/news/${item.slug}`)"
            />
          </div>
        </div>
      </div>
    </section>

  </div>
</template>
