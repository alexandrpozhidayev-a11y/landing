<script setup lang="ts">
// to — ссылка на новость (страница /news/<slug>); без неё стрелка ведёт в никуда, как раньше.
defineProps<{
  image?: string | null
  date: string
  title: string
  text: string
  to?: string
}>()
</script>

<template>
  <article class="news__row">
    <img v-if="image" :src="image" alt="" loading="lazy">
    <div class="news__row-head">
      <time class="news__date">{{ date }}</time>
      <h4>
        <NuxtLink v-if="to" :to="to" class="news__title-link">{{ title }}</NuxtLink>
        <template v-else>{{ title }}</template>
      </h4>
    </div>
    <p class="news__row-text">{{ text }}</p>
    <NuxtLink v-if="to" :to="to" class="news__row-arrow" :aria-label="title">&rarr;</NuxtLink>
    <a v-else href="#" class="news__row-arrow" aria-label="Read more">&rarr;</a>
  </article>
</template>
