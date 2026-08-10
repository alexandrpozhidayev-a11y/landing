<script setup lang="ts">
defineProps<{
  image: string
  date: string
  title: string
  text: string
}>()
</script>

<template>
  <article class="news__row">
    <img :src="image" alt="" loading="lazy">
    <div class="news__row-head">
      <time class="news__date">{{ date }}</time>
      <h4>{{ title }}</h4>
    </div>
    <p class="news__row-text">{{ text }}</p>
    <a href="#" class="news__row-arrow" aria-label="Read more">&rarr;</a>
  </article>
</template>
