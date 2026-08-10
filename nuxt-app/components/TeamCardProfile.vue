<script setup lang="ts">
withDefaults(defineProps<{
  photo: string
  lastName: string
  firstName: string
  middleName: string
  role: string
  bio: string
  featured?: boolean
}>(), {
  featured: false
})
</script>

<template>
  <article class="team-page__card" :class="{ 'team-page__card--featured': featured }">
    <img :src="photo" :alt="`${lastName} ${firstName} ${middleName}`" loading="lazy">
    <h3>{{ lastName }}<br>{{ firstName }}<br>{{ middleName }}</h3>
    <p class="team-page__role">{{ role }}</p>
    <p class="team-page__bio">{{ bio }}</p>
  </article>
</template>
