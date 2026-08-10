<script setup lang="ts">
defineProps<{ current: string }>()
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="container breadcrumb">
    <NuxtLink :to="localePath('/')" class="breadcrumb__back">&larr; {{ t('breadcrumb.back') }}</NuxtLink>
    <p class="breadcrumb__path">
      <NuxtLink :to="localePath('/')">{{ t('breadcrumb.main') }}</NuxtLink> / <span>{{ current }}</span>
    </p>
  </div>
</template>
