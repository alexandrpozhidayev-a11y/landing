<script setup lang="ts">
definePageMeta({ layout: 'v2' })

// Одна новость из админки: /news/<slug> (тексты на языке страницы, если перевода
// нет — английский, это решает API админки). Данные — через /api/news/:slug.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const slug = String(route.params.slug)

interface NewsItem {
  slug: string
  title: string
  excerpt: string | null
  image: string | null
  published_at: string | null
  body: string | null
}

const { data, error } = await useFetch<{ data: NewsItem }>(`/api/news/${encodeURIComponent(slug)}`, {
  query: { locale },
  key: `news-${slug}`,
  watch: [locale]
})

if (error.value || !data.value) {
  throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'News not found', fatal: true })
}

const post = computed(() => data.value!.data)

const date = computed(() => {
  const value = post.value.published_at
  if (!value) return ''
  return new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
})

// Полный текст: абзацы — по пустой строке, переносы внутри абзаца сохраняем (white-space: pre-line).
const paragraphs = computed(() => (post.value.body ?? '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean))

useHead(() => ({
  title: `${post.value.title} — Data Center Valley`,
  meta: post.value.excerpt ? [{ name: 'description', content: post.value.excerpt }] : []
}))
</script>

<template>
  <div>
    <Breadcrumb :current="t('nav.news')" />

    <article class="news-article">
      <div class="container news-article__inner">
        <NuxtLink :to="localePath('/news')" class="news-article__back">&larr; {{ t('home.news.allNews') }}</NuxtLink>

        <time v-if="date" class="news__date" :datetime="post.published_at ?? undefined">{{ date }}</time>
        <h1 class="news-article__title">{{ post.title }}</h1>
        <p v-if="post.excerpt" class="news-article__lead">{{ post.excerpt }}</p>

        <img v-if="post.image" :src="post.image" alt="" class="news-article__image">

        <div class="news-article__body">
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </div>
      </div>
    </article>

    <SectionCta
      :title="t('home.cta.title')"
      :note="t('home.cta.note')"
      :text="t('home.cta.text')"
      :button-text="t('home.cta.button')"
    />
  </div>
</template>
