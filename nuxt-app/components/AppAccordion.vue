<script setup lang="ts">
interface AccordionItem {
  title: string
  text: string
  list?: string[]
}

const props = withDefaults(defineProps<{
  items: AccordionItem[]
  defaultOpen?: number
}>(), {
  defaultOpen: 0
})

const openIndex = ref(props.defaultOpen)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? -1 : i
}
</script>

<template>
  <div class="accordion">
    <div v-for="(item, i) in items" :key="i" class="accordion__item" :class="{ 'is-open': openIndex === i }">
      <button type="button" class="accordion__trigger" :aria-expanded="openIndex === i" @click="toggle(i)">
        <span>{{ item.title }}</span>
        <span class="accordion__icon">
          <svg width="12" height="15" viewBox="0 0 16 20" fill="none"><path d="M8.87747 19.1406L8.00049 20L7.12253 19.1406L1.37568e-06 12.1631L0.877961 11.2715L1.75592 10.3789L6.74766 15.2695L6.74766 -4.04433e-07L9.25332 -2.94907e-07L9.25332 15.2686L14.2441 10.3789L15.122 11.2715L16 12.1631L8.87747 19.1406Z" fill="#4797FF"/></svg>
        </span>
      </button>
      <div class="accordion__panel">
        <p>{{ item.text }}</p>
        <ul v-if="item.list" class="accordion__list">
          <li v-for="(li, li2) in item.list" :key="li2">{{ li }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
