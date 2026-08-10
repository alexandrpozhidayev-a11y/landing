<script setup lang="ts">
const props = defineProps<{
  title: string
  lead: string
  mobileImage: string
  bgImage?: string
}>()

const cardStyle = computed(() => {
  if (!props.bgImage) return {}
  return { '--hero-card-bg': `url(${props.bgImage})` }
})
</script>

<template>
  <section class="about-hero">
    <div class="container">
      <div class="about-hero__card" :style="cardStyle">
        <h1 class="about-hero__title">{{ title }}</h1>
        <p class="about-hero__lead">{{ lead }}</p>
        <img class="about-hero__image-mobile" :src="mobileImage" alt="Data Center Valley campus render">
      </div>
    </div>
  </section>
</template>
