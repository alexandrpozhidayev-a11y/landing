<script setup lang="ts">
defineProps<{
  image?: string | null
  date: string
  title: string
  to?: string
}>()
</script>

<template>
  <article class="news-page__more-card">
    <img v-if="image" :src="image" alt="" loading="lazy">
    <time class="news__date">{{ date }}</time>
    <h4>
      <NuxtLink v-if="to" :to="to" class="news__title-link">{{ title }}</NuxtLink>
      <template v-else>{{ title }}</template>
    </h4>
    <NuxtLink v-if="to" :to="to" class="news__row-arrow" :aria-label="title">&rarr;</NuxtLink>
    <a v-else href="#" class="news__row-arrow" aria-label="Read more">&rarr;</a>
  </article>
</template>
