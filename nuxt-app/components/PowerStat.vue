<script setup lang="ts">
defineProps<{ label: string; value: string }>()
</script>

<template>
  <div class="power-stat">
    <span class="power-stat__label">{{ label }}</span>
    <span class="power-stat__value">{{ value }}</span>
  </div>
</template>
