<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  text: string
  active?: boolean
  dot?: boolean
  buttonText?: string
}>(), {
  active: false,
  dot: false,
  buttonText: ''
})
</script>

<template>
  <div class="model-card" :class="{ 'model-card--active': active }">
    <span v-if="dot" class="model-card__dot"></span>
    <h3>{{ title }}</h3>
    <p>{{ text }}</p>
    <a v-if="buttonText" href="mailto:commercial@dc-valley.com" class="btn btn--outline btn--sm">{{ buttonText }}</a>
  </div>
</template>
