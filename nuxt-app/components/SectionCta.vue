<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  note?: string
  text: string
  buttonText: string
}>(), {
  note: ''
})
</script>

<template>
  <section class="cta" id="contact">
    <div class="container">
      <div class="cta__top">
        <h2 class="cta__title" v-html="title"></h2>
        <p v-if="note" class="cta__note" v-html="note"></p>
      </div>

      <div class="cta__row">
        <p class="cta__text">{{ text }}</p>
        <a href="mailto:commercial@dc-valley.com" class="btn btn--dark">{{ buttonText }} &rarr;</a>
      </div>
    </div>

    <slot name="decor" />
  </section>
</template>
