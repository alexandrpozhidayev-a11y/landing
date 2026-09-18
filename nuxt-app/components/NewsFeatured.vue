<script setup lang="ts">
// to — ссылка на новость (страница /news/<slug>); без неё кнопка ведёт в никуда, как раньше.
defineProps<{
  image?: string | null
  date: string
  title: string
  text: string
  buttonText: string
  to?: string
}>()
</script>

<template>
  <article class="news__featured">
    <img v-if="image" :src="image" alt="" loading="lazy">
    <div class="news__featured-body">
      <time class="news__date">{{ date }}</time>
      <h3>
        <NuxtLink v-if="to" :to="to" class="news__title-link">{{ title }}</NuxtLink>
        <template v-else>{{ title }}</template>
      </h3>
      <p>{{ text }}</p>
      <NuxtLink v-if="to" :to="to" class="btn btn--outline btn--sm">{{ buttonText }}</NuxtLink>
      <a v-else href="#" class="btn btn--outline btn--sm">{{ buttonText }}</a>
    </div>
  </article>
</template>
