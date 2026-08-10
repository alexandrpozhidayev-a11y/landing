<script setup lang="ts">
defineProps<{
  label: string
  disclaimer: string
  image: string
  textMuted: string
  textStrong: string
  buttonText: string
}>()
</script>

<template>
  <section class="about-why">
    <div class="container">
      <div class="about-why__head">
        <span class="about-why__label">{{ label }}</span>
        <p class="about-why__disclaimer">{{ disclaimer }}</p>
      </div>

      <div class="about-why__row">
        <div class="about-why__image">
          <img :src="image" alt="Data Center Valley aerial view" loading="lazy">
        </div>
        <div class="about-why__content">
          <p>
            <span class="text-muted">{{ textMuted }}</span>
            <span class="text-strong">{{ textStrong }}</span>
          </p>
          <a href="mailto:commercial@dc-valley.com" class="btn btn--primary">{{ buttonText }}</a>
        </div>
      </div>
    </div>
  </section>
</template>
