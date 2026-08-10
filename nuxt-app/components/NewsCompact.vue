<script setup lang="ts">
defineProps<{
  image: string
  date: string
  title: string
}>()
</script>

<template>
  <article class="news-page__more-card">
    <img :src="image" alt="" loading="lazy">
    <time class="news__date">{{ date }}</time>
    <h4>{{ title }}</h4>
    <a href="#" class="news__row-arrow" aria-label="Read more">&rarr;</a>
  </article>
</template>
