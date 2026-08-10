<script setup lang="ts">
defineProps<{ label: string; value: string }>()
</script>

<template>
  <div class="hero__stat">
    <span class="hero__stat-label">{{ label }}</span>
    <span class="hero__stat-value">{{ value }}</span>
  </div>
</template>
