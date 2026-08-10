<script setup lang="ts">
defineProps<{
  image: string
  date: string
  title: string
  text: string
  buttonText: string
}>()
</script>

<template>
  <article class="news__featured">
    <img :src="image" alt="" loading="lazy">
    <div class="news__featured-body">
      <time class="news__date">{{ date }}</time>
      <h3>{{ title }}</h3>
      <p>{{ text }}</p>
      <a href="#" class="btn btn--outline btn--sm">{{ buttonText }}</a>
    </div>
  </article>
</template>
