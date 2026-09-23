<script setup lang="ts">
// Строка перевода с "\n" -> текст с <br> (без v-html). Переносы в переводах задаются
// именно "\n", см. i18n/locales/v2/*.json.
const props = defineProps<{ text: string }>()

const parts = computed(() => props.text.split('\n'))
</script>

<template>
  <template v-for="(line, i) in parts" :key="i"><br v-if="i">{{ line }}</template>
</template>
