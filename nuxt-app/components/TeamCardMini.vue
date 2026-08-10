<script setup lang="ts">
defineProps<{
  photo: string
  lastName: string
  firstName: string
  middleName: string
  role: string
}>()
</script>

<template>
  <article class="team-card">
    <img class="team-card__photo" :src="photo" :alt="`${lastName} ${firstName} ${middleName}`" loading="lazy">
    <h3 class="team-card__name">{{ lastName }}<br>{{ firstName }}<br>{{ middleName }}</h3>
    <p class="team-card__role">{{ role }}</p>
    <div class="team-card__social">
      <SocialIcons />
    </div>
  </article>
</template>
